"use strict";

const express = require("express");
const models = require("../models");
const { asyncHandler, notFound, unprocessable, conflict, forbidden } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const serialize = require("../lib/serialize");

/** Dados do condomínio do usuário e gestão de moradores (somente gestores). */
module.exports = function condoRoutes(ctx) {
  const { auth } = ctx;
  const router = express.Router();
  // Só nos caminhos deste módulo (montado em "/"): não interfere em /files, /chat etc.
  router.use(["/condominium", "/residents"], auth.requireAuth, auth.requireCondo);

  router.get(
    "/condominium",
    asyncHandler(async (req, res) => {
      const condo = await models.Condominium.findById(req.condoId);
      if (!condo) throw notFound("Condomínio não encontrado.");
      res.json(serialize.condominium(condo));
    })
  );

  router.patch(
    "/condominium",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        name: rules.string({ label: "Nome", min: 3, max: 120, required: false }),
        address: rules.string({ label: "Endereço", min: 5, max: 200, required: false }),
        phone: rules.string({ label: "Telefone", max: 30, required: false }),
        email: rules.email({ required: false }),
        description: rules.string({ label: "Descrição", max: 1000, required: false }),
      });
      if (Array.isArray(req.body.areas)) {
        const areas = req.body.areas
          .filter((a) => typeof a === "string")
          .map((a) => a.trim())
          .filter((a) => a.length >= 2 && a.length <= 60);
        if (areas.length === 0 || areas.length > 30) throw unprocessable("Informe de 1 a 30 áreas comuns.");
        data.areas = [...new Set(areas)];
      }
      const condo = await models.Condominium.findByIdAndUpdate(req.condoId, { $set: data }, { new: true, runValidators: true });
      res.json(serialize.condominium(condo));
    })
  );

  // ------------------------------------------------------------ Moradores
  router.get(
    "/residents",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const users = await models.User.find({ condominium: req.condoId }).sort({ apartamento: 1, nome: 1 });
      res.json(users.map(serialize.resident));
    })
  );

  // Vincula uma conta já cadastrada (por e-mail) ao condomínio do gestor.
  router.post(
    "/residents/link",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        email: rules.email(),
        apartamento: rules.string({ label: "Unidade", min: 1, max: 20 }),
      });
      const user = await models.User.findOne({ email: data.email });
      if (!user)
        throw notFound("Não encontramos uma conta com este e-mail. Peça ao morador para criar a conta no app primeiro.");
      if (user.condominium && String(user.condominium) !== String(req.condoId))
        throw conflict("Esta conta já está vinculada a outro condomínio.");
      if (String(user._id) === String(req.user._id)) throw forbidden("Você não pode alterar o próprio vínculo.");
      user.condominium = req.condoId;
      user.apartamento = data.apartamento;
      await user.save();
      res.status(201).json(serialize.resident(user));
    })
  );

  router.patch(
    "/residents/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const data = validate(req.body, {
        apartamento: rules.string({ label: "Unidade", min: 1, max: 20 }),
      });
      const user = await models.User.findOneAndUpdate(
        { _id: req.params.id, condominium: req.condoId },
        { $set: { apartamento: data.apartamento } },
        { new: true }
      );
      if (!user) throw notFound("Morador não encontrado.");
      res.json(serialize.resident(user));
    })
  );

  // Desvincula o morador: ele perde o acesso aos dados do condomínio imediatamente.
  router.delete(
    "/residents/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      if (String(req.params.id) === String(req.user._id)) throw forbidden("Você não pode remover o próprio vínculo.");
      const user = await models.User.findOne({ _id: req.params.id, condominium: req.condoId });
      if (!user) throw notFound("Morador não encontrado.");
      if (["sindico", "administrador"].includes(user.role))
        throw forbidden("Gestores só podem ser desvinculados pela administração da plataforma.");
      user.condominium = null;
      user.apartamento = "";
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.fcmToken = null;
      await user.save();
      res.json({ message: "Morador desvinculado." });
    })
  );

  return router;
};
