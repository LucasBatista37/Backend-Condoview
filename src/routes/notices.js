"use strict";

const express = require("express");
const { Notice } = require("../models");
const { asyncHandler, notFound } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const serialize = require("../lib/serialize");

module.exports = function noticeRoutes(ctx) {
  const { auth, notify } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth, auth.requireCondo);

  const schema = (required) => ({
    title: rules.string({ label: "Título", min: 3, max: 120, required }),
    message: rules.string({ label: "Mensagem", min: 5, max: 4000, required }),
  });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
      const filter = { condominium: req.condoId };
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ title: rx }, { message: rx }];
      }
      const notices = await Notice.find(filter).sort({ createdAt: -1 }).limit(100).populate("author", "nome");
      res.json(notices.map(serialize.notice));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const notice = await Notice.findOne({ _id: req.params.id, condominium: req.condoId }).populate("author", "nome");
      if (!notice) throw notFound("Aviso não encontrado.");
      res.json(serialize.notice(notice));
    })
  );

  router.post(
    "/",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, schema(true));
      const notice = await Notice.create({ ...data, condominium: req.condoId, author: req.user._id });
      await notice.populate("author", "nome");
      notify.fire(
        notify.condo(req.condoId, { title: "Novo aviso do condomínio", body: data.title, data: { type: "notice", id: notice.id } }, { exceptUser: req.user._id })
      );
      res.status(201).json(serialize.notice(notice));
    })
  );

  router.patch(
    "/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const data = validate(req.body, schema(false));
      const notice = await Notice.findOneAndUpdate(
        { _id: req.params.id, condominium: req.condoId },
        { $set: data },
        { new: true, runValidators: true }
      ).populate("author", "nome");
      if (!notice) throw notFound("Aviso não encontrado.");
      res.json(serialize.notice(notice));
    })
  );

  router.delete(
    "/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const result = await Notice.deleteOne({ _id: req.params.id, condominium: req.condoId });
      if (result.deletedCount === 0) throw notFound("Aviso não encontrado.");
      res.json({ message: "Aviso excluído." });
    })
  );

  return router;
};
