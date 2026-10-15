"use strict";

const express = require("express");
const { ChatMessage, ChatReport, User } = require("../models");
const { asyncHandler, notFound, unprocessable, forbidden } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const serialize = require("../lib/serialize");
const { isManager } = require("../middlewares/auth");

/**
 * Chat geral do condomínio.
 *
 * - Isolado por condomínio.
 * - Paginação por cursor (`before`), mais recentes primeiro.
 * - `clientId` torna o envio idempotente: reenvios após falha de rede não duplicam.
 * - Moderação: denúncia de mensagens, bloqueio de usuários (oculta as mensagens
 *   deles para quem bloqueou) e remoção por autor ou gestor.
 */
module.exports = function chatRoutes(ctx) {
  const { auth, files, notify } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth, auth.requireCondo);

  router.get(
    "/messages",
    asyncHandler(async (req, res) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
      const filter = { condominium: req.condoId };
      if (typeof req.query.before === "string") {
        const before = new Date(req.query.before);
        if (!Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
      }
      if (req.user.blockedUsers?.length) filter.userId = { $nin: req.user.blockedUsers };
      const list = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limit);
      res.json({ messages: list.map(serialize.chatMessage), hasMore: list.length === limit });
    })
  );

  router.post(
    "/messages",
    files.single("image"),
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        message: rules.string({ label: "Mensagem", max: 1000, required: false }),
        clientId: rules.string({ label: "Identificador", max: 64, required: false }),
      });
      if (!data.message && !req.file) throw unprocessable("Escreva uma mensagem ou anexe uma imagem.");

      if (data.clientId) {
        const existing = await ChatMessage.findOne({ condominium: req.condoId, userId: req.user._id, clientId: data.clientId });
        if (existing) return res.status(200).json(serialize.chatMessage(existing));
      }

      const asset = await files.store(req.file, {
        owner: req.user._id,
        condominium: req.condoId,
        kind: "chat",
        access: "condo",
      });
      let msg;
      try {
        msg = await ChatMessage.create({
          condominium: req.condoId,
          userId: req.user._id,
          userName: req.user.nome,
          message: data.message || "",
          image: asset?._id || null,
          clientId: data.clientId,
        });
      } catch (err) {
        if (err.code === 11000 && data.clientId) {
          if (asset) await files.remove(asset._id);
          const existing = await ChatMessage.findOne({ condominium: req.condoId, userId: req.user._id, clientId: data.clientId });
          return res.status(200).json(serialize.chatMessage(existing));
        }
        throw err;
      }
      notify.fire(
        notify.condo(
          req.condoId,
          { title: "Nova mensagem no chat do condomínio", body: `${req.user.nome} enviou uma mensagem.`, data: { type: "chat" } },
          { exceptUser: req.user._id }
        )
      );
      res.status(201).json(serialize.chatMessage(msg));
    })
  );

  router.delete(
    "/messages/:id",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const msg = await ChatMessage.findOne({ _id: req.params.id, condominium: req.condoId });
      if (!msg) throw notFound("Mensagem não encontrada.");
      if (String(msg.userId) !== String(req.user._id) && !isManager(req.user))
        throw forbidden("Você só pode apagar as próprias mensagens.");
      if (msg.image) await files.remove(msg.image);
      msg.message = "";
      msg.image = null;
      msg.deletedAt = new Date();
      msg.deletedBy = req.user._id;
      await msg.save();
      await ChatReport.updateMany({ message: msg._id }, { $set: { status: "Resolvida" } });
      res.json(serialize.chatMessage(msg));
    })
  );

  router.post(
    "/messages/:id/report",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const { reason } = validate(req.body, { reason: rules.string({ label: "Motivo", min: 3, max: 300 }) });
      const msg = await ChatMessage.findOne({ _id: req.params.id, condominium: req.condoId });
      if (!msg) throw notFound("Mensagem não encontrada.");
      await ChatReport.updateOne(
        { message: msg._id, reporter: req.user._id },
        { $setOnInsert: { condominium: req.condoId, reason, status: "Aberta" } },
        { upsert: true }
      );
      notify.fire(notify.managers(req.condoId, { title: "Mensagem denunciada no chat", body: "Revise a denúncia no app.", data: { type: "report" } }));
      res.status(201).json({ message: "Denúncia enviada à administração do condomínio." });
    })
  );

  router.get(
    "/reports",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const reports = await ChatReport.find({ condominium: req.condoId, status: "Aberta" })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("message")
        .populate("reporter", "nome apartamento");
      res.json(
        reports.map((r) => ({
          id: String(r._id),
          reason: r.reason,
          createdAt: r.createdAt,
          reporterName: r.reporter?.nome || "",
          message: r.message ? serialize.chatMessage(r.message) : null,
        }))
      );
    })
  );

  router.post(
    "/reports/:id/resolve",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const r = await ChatReport.findOneAndUpdate(
        { _id: req.params.id, condominium: req.condoId },
        { $set: { status: "Resolvida" } },
        { new: true }
      );
      if (!r) throw notFound("Denúncia não encontrada.");
      res.json({ message: "Denúncia marcada como resolvida." });
    })
  );

  // Bloqueio pessoal: oculta as mensagens do usuário bloqueado para quem bloqueou.
  router.get(
    "/blocks",
    asyncHandler(async (req, res) => {
      const users = await User.find({ _id: { $in: req.user.blockedUsers || [] } }).select("nome");
      res.json(users.map((u) => ({ id: String(u._id), nome: u.nome })));
    })
  );

  router.post(
    "/blocks/:userId",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.userId);
      if (String(req.params.userId) === String(req.user._id)) throw unprocessable("Você não pode bloquear a si mesmo.");
      const target = await User.exists({ _id: req.params.userId, condominium: req.condoId });
      if (!target) throw notFound("Usuário não encontrado.");
      await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedUsers: req.params.userId } });
      res.status(201).json({ message: "Usuário bloqueado. As mensagens dele não aparecerão mais para você." });
    })
  );

  router.delete(
    "/blocks/:userId",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.userId);
      await User.updateOne({ _id: req.user._id }, { $pull: { blockedUsers: req.params.userId } });
      res.json({ message: "Usuário desbloqueado." });
    })
  );

  return router;
};
