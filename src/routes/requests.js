"use strict";

const express = require("express");
const { Maintenance, Occurrence, Package, User } = require("../models");
const { asyncHandler, notFound, conflict, unprocessable } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const serialize = require("../lib/serialize");
const { isManager } = require("../middlewares/auth");

/**
 * Manutenção, ocorrências e encomendas.
 *
 * Privacidade: o morador vê apenas os próprios registros; gestores veem os do
 * condomínio. Fotos anexadas são privadas (autor/destinatário + gestores).
 */

const MAINTENANCE_TRANSITIONS = {
  Pendente: ["Aprovada", "Rejeitada"],
  Aprovada: ["Concluída"],
  Rejeitada: [],
  Concluída: [],
};
const OCCURRENCE_TRANSITIONS = {
  Aberta: ["Em análise", "Resolvida"],
  "Em análise": ["Resolvida"],
  Resolvida: [],
};

module.exports = function requestRoutes(ctx) {
  const { auth, files, notify } = ctx;
  const router = express.Router();
  // Só nos caminhos deste módulo (montado em "/"): não interfere em /files, /chat etc.
  router.use(["/maintenance", "/occurrences", "/packages"], auth.requireAuth, auth.requireCondo);

  const scopeFilter = (req, ownerField) => {
    const filter = { condominium: req.condoId };
    if (!isManager(req.user) || req.query.scope === "mine") filter[ownerField] = req.user._id;
    return filter;
  };

  // ------------------------------------------------------------ Manutenção
  router.get(
    "/maintenance",
    asyncHandler(async (req, res) => {
      const filter = scopeFilter(req, "user");
      if (typeof req.query.status === "string" && MAINTENANCE_TRANSITIONS[req.query.status]) filter.status = req.query.status;
      const list = await Maintenance.find(filter).sort({ createdAt: -1 }).limit(200);
      res.json(list.map(serialize.maintenance));
    })
  );

  router.post(
    "/maintenance",
    files.single("image"),
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        tipo: rules.string({ label: "Tipo", min: 3, max: 80 }),
        descricao: rules.string({ label: "Descrição", min: 5, max: 2000 }),
        dataDesejada: rules.date({ label: "Data desejada" }),
      });
      const asset = await files.store(req.file, {
        owner: req.user._id,
        condominium: req.condoId,
        kind: "maintenance",
        access: "private",
      });
      const item = await Maintenance.create({
        condominium: req.condoId,
        user: req.user._id,
        usuarioNome: req.user.nome,
        apartamento: req.user.apartamento || "",
        type: data.tipo,
        descriptionMaintenance: data.descricao,
        dataMaintenance: data.dataDesejada,
        image: asset?._id || null,
        status: "Pendente",
        history: [{ status: "Pendente", by: req.user._id, note: "Solicitação aberta" }],
      });
      notify.fire(notify.managers(req.condoId, { title: "Nova solicitação de manutenção", body: data.tipo, data: { type: "maintenance", id: item.id } }));
      res.status(201).json(serialize.maintenance(item));
    })
  );

  router.post(
    "/maintenance/:id/status",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const data = validate(req.body, {
        status: rules.oneOf(["Aprovada", "Rejeitada", "Concluída"], { label: "Situação" }),
        note: rules.string({ label: "Observação", max: 500, required: false }),
      });
      const item = await Maintenance.findOne({ _id: req.params.id, condominium: req.condoId });
      if (!item) throw notFound("Solicitação não encontrada.");
      if (!MAINTENANCE_TRANSITIONS[item.status].includes(data.status))
        throw conflict(`Não é possível mudar de "${item.status}" para "${data.status}".`);
      item.status = data.status;
      item.history.push({ status: data.status, note: data.note || "", by: req.user._id });
      await item.save();
      notify.fire(notify.user(item.user, { title: `Manutenção: ${data.status.toLowerCase()}`, body: item.type, data: { type: "maintenance", id: item.id } }));
      res.json(serialize.maintenance(item));
    })
  );

  // ------------------------------------------------------------ Ocorrências
  router.get(
    "/occurrences",
    asyncHandler(async (req, res) => {
      const filter = scopeFilter(req, "userId");
      if (typeof req.query.status === "string" && OCCURRENCE_TRANSITIONS[req.query.status]) filter.status = req.query.status;
      const list = await Occurrence.find(filter).sort({ createdAt: -1 }).limit(200);
      res.json(list.map(serialize.occurrence));
    })
  );

  router.post(
    "/occurrences",
    files.single("image"),
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        motivo: rules.string({ label: "Motivo", min: 3, max: 120 }),
        descricao: rules.string({ label: "Descrição", min: 5, max: 2000 }),
        data: rules.date({ label: "Data do ocorrido" }),
      });
      const asset = await files.store(req.file, {
        owner: req.user._id,
        condominium: req.condoId,
        kind: "occurrence",
        access: "private",
      });
      const item = await Occurrence.create({
        condominium: req.condoId,
        userId: req.user._id,
        usuarioNome: req.user.nome,
        apartamento: req.user.apartamento || "",
        ...data,
        image: asset?._id || null,
        status: "Aberta",
        history: [{ status: "Aberta", by: req.user._id, note: "Ocorrência registrada" }],
      });
      notify.fire(notify.managers(req.condoId, { title: "Nova ocorrência registrada", body: data.motivo, data: { type: "occurrence", id: item.id } }));
      res.status(201).json(serialize.occurrence(item));
    })
  );

  router.post(
    "/occurrences/:id/status",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const data = validate(req.body, {
        status: rules.oneOf(["Em análise", "Resolvida"], { label: "Situação" }),
        resposta: rules.string({ label: "Resposta", max: 2000, required: false }),
      });
      const item = await Occurrence.findOne({ _id: req.params.id, condominium: req.condoId });
      if (!item) throw notFound("Ocorrência não encontrada.");
      if (!OCCURRENCE_TRANSITIONS[item.status].includes(data.status))
        throw conflict(`Não é possível mudar de "${item.status}" para "${data.status}".`);
      item.status = data.status;
      if (data.resposta) item.resposta = data.resposta;
      item.history.push({ status: data.status, note: data.resposta || "", by: req.user._id });
      await item.save();
      notify.fire(notify.user(item.userId, { title: `Ocorrência: ${data.status.toLowerCase()}`, body: item.motivo, data: { type: "occurrence", id: item.id } }));
      res.json(serialize.occurrence(item));
    })
  );

  // ------------------------------------------------------------ Encomendas
  router.get(
    "/packages",
    asyncHandler(async (req, res) => {
      const filter = scopeFilter(req, "recipient");
      if (typeof req.query.status === "string" && ["Aguardando retirada", "Retirada"].includes(req.query.status))
        filter.status = req.query.status;
      const list = await Package.find(filter).sort({ receivedAt: -1 }).limit(200);
      res.json(list.map(serialize.pkg));
    })
  );

  router.post(
    "/packages",
    auth.requireManager,
    files.single("image"),
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        recipientId: rules.objectId({ label: "Destinatário" }),
        title: rules.string({ label: "Descrição curta", min: 3, max: 120 }),
        description: rules.string({ label: "Observações", max: 500, required: false }),
      });
      // O destinatário precisa pertencer ao MESMO condomínio do gestor.
      const recipient = await User.findOne({ _id: data.recipientId, condominium: req.condoId });
      if (!recipient) throw unprocessable("Destinatário não encontrado neste condomínio.");
      const asset = await files.store(req.file, {
        owner: req.user._id,
        condominium: req.condoId,
        kind: "package",
        access: "private",
        allowedUsers: [recipient._id],
      });
      const item = await Package.create({
        condominium: req.condoId,
        recipient: recipient._id,
        usuarioNome: recipient.nome,
        apartment: recipient.apartamento || "",
        title: data.title,
        description: data.description || "",
        receivedBy: req.user._id,
        image: asset?._id || null,
      });
      notify.fire(notify.user(recipient._id, { title: "Chegou uma encomenda para você", body: "Retire na portaria.", data: { type: "package", id: item.id } }));
      res.status(201).json(serialize.pkg(item));
    })
  );

  router.post(
    "/packages/:id/pickup",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const { note } = validate(req.body, { note: rules.string({ label: "Retirado por", max: 200, required: false }) });
      const item = await Package.findOneAndUpdate(
        { _id: req.params.id, condominium: req.condoId, status: "Aguardando retirada" },
        { $set: { status: "Retirada", pickedUpAt: new Date(), pickedUpConfirmedBy: req.user._id, pickedUpNote: note || "" } },
        { new: true }
      );
      if (!item) {
        const exists = await Package.exists({ _id: req.params.id, condominium: req.condoId });
        if (!exists) throw notFound("Encomenda não encontrada.");
        throw conflict("Esta encomenda já foi retirada.");
      }
      res.json(serialize.pkg(item));
    })
  );

  router.delete(
    "/packages/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const item = await Package.findOne({ _id: req.params.id, condominium: req.condoId });
      if (!item) throw notFound("Encomenda não encontrada.");
      if (item.status !== "Aguardando retirada") throw conflict("Encomendas já retiradas ficam no histórico.");
      if (item.image) await files.remove(item.image);
      await item.deleteOne();
      res.json({ message: "Registro de encomenda excluído." });
    })
  );

  return router;
};
