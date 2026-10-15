"use strict";

const express = require("express");
const mongoose = require("mongoose");
const { Assembly, Vote } = require("../models");
const { asyncHandler, notFound, conflict, unprocessable } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const serialize = require("../lib/serialize");
const { isManager } = require("../middlewares/auth");

/**
 * Assembleias e votação.
 *
 * - Ciclo: Agendada → Em votação → Encerrada (controlado pelo gestor).
 * - Eleitor: definido na criação. "unit" = um voto por unidade (apartamento);
 *   "user" = um voto por conta. Duplicidade é impedida por índice único
 *   (assembleia, pauta, eleitor) no banco.
 * - Votos não podem ser alterados. Moradores veem o resultado agregado após o
 *   encerramento; gestores acompanham as parciais. O registro individual fica
 *   no servidor para auditoria e não é exposto pela API.
 */
module.exports = function assemblyRoutes(ctx) {
  const { auth, notify } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth, auth.requireCondo);

  function parsePautas(raw) {
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20)
      throw unprocessable("Inclua de 1 a 20 pautas.");
    return raw.map((p, i) =>
      validate(p, {
        tema: rules.string({ label: `Tema da pauta ${i + 1}`, min: 3, max: 160 }),
        descricao: rules.string({ label: `Descrição da pauta ${i + 1}`, max: 2000, required: false }),
      })
    );
  }

  async function results(assemblyId) {
    const rows = await Vote.aggregate([
      { $match: { assembly: new mongoose.Types.ObjectId(String(assemblyId)) } },
      { $group: { _id: { pauta: "$pauta", choice: "$choice" }, n: { $sum: 1 } } },
    ]);
    const out = {};
    rows.forEach((r) => {
      const key = String(r._id.pauta);
      out[key] = out[key] || { Sim: 0, Não: 0, Abstenção: 0 };
      out[key][r._id.choice] = r.n;
    });
    return out;
  }

  function voterKey(assembly, user) {
    if (assembly.voterScope === "unit") {
      if (!user.apartamento) return null;
      return `unit:${user.apartamento.trim().toUpperCase()}`;
    }
    return `user:${user._id}`;
  }

  async function myVotes(assembly, user) {
    const key = voterKey(assembly, user);
    if (!key) return {};
    const votes = await Vote.find({ assembly: assembly._id, voterKey: key });
    return Object.fromEntries(votes.map((v) => [String(v.pauta), v.choice]));
  }

  async function load(req) {
    assertObjectId(req.params.id);
    const a = await Assembly.findOne({ _id: req.params.id, condominium: req.condoId });
    if (!a) throw notFound("Assembleia não encontrada.");
    return a;
  }

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const list = await Assembly.find({ condominium: req.condoId }).sort({ scheduledAt: -1 }).limit(100);
      res.json(list.map((a) => serialize.assembly(a)));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const a = await load(req);
      // Parciais só para gestores; moradores veem o resultado após o encerramento.
      const showResults = a.status === "Encerrada" || (a.status === "Em votação" && isManager(req.user));
      res.json({
        ...serialize.assembly(a, {
          results: showResults ? await results(a._id) : null,
          myVotes: await myVotes(a, req.user),
        }),
        canVote: a.status === "Em votação" && Boolean(voterKey(a, req.user)),
        voterHint:
          a.voterScope === "unit" && !req.user.apartamento
            ? "Sua unidade ainda não foi cadastrada. Fale com o síndico para poder votar."
            : a.voterScope === "unit"
              ? "Um voto por unidade: o primeiro voto registrado pela sua unidade é o que vale."
              : "Um voto por morador cadastrado.",
      });
    })
  );

  router.post(
    "/",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        title: rules.string({ label: "Título", min: 3, max: 160 }),
        description: rules.string({ label: "Descrição", max: 4000, required: false }),
        scheduledAt: rules.isoDateTime({ label: "Data e hora" }),
        location: rules.string({ label: "Local", max: 160, required: false }),
        voterScope: rules.oneOf(["user", "unit"], { label: "Tipo de votação", required: false }),
      });
      const pautas = parsePautas(req.body.pautas);
      const a = await Assembly.create({
        ...data,
        voterScope: data.voterScope || "unit",
        pautas,
        condominium: req.condoId,
        createdBy: req.user._id,
        status: "Agendada",
      });
      notify.fire(notify.condo(req.condoId, { title: "Nova assembleia agendada", body: data.title, data: { type: "assembly", id: a.id } }, { exceptUser: req.user._id }));
      res.status(201).json(serialize.assembly(a));
    })
  );

  router.patch(
    "/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const a = await load(req);
      if (a.status !== "Agendada") throw conflict("Só é possível editar assembleias que ainda não abriram a votação.");
      const data = validate(req.body, {
        title: rules.string({ label: "Título", min: 3, max: 160, required: false }),
        description: rules.string({ label: "Descrição", max: 4000, required: false }),
        scheduledAt: rules.isoDateTime({ label: "Data e hora", required: false }),
        location: rules.string({ label: "Local", max: 160, required: false }),
        voterScope: rules.oneOf(["user", "unit"], { label: "Tipo de votação", required: false }),
      });
      Object.assign(a, data);
      if (req.body.pautas !== undefined) a.pautas = parsePautas(req.body.pautas);
      await a.save();
      res.json(serialize.assembly(a));
    })
  );

  router.delete(
    "/:id",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const a = await load(req);
      if (a.status !== "Agendada") throw conflict("Assembleias com votação aberta ou encerrada não podem ser excluídas.");
      await a.deleteOne();
      res.json({ message: "Assembleia excluída." });
    })
  );

  router.post(
    "/:id/open",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const a = await Assembly.findOneAndUpdate(
        { _id: assertObjectId(req.params.id), condominium: req.condoId, status: "Agendada" },
        { $set: { status: "Em votação", openedAt: new Date() } },
        { new: true }
      );
      if (!a) throw conflict("A votação só pode ser aberta em assembleias agendadas.");
      notify.fire(notify.condo(req.condoId, { title: "Votação aberta", body: a.title, data: { type: "assembly", id: a.id } }, { exceptUser: req.user._id }));
      res.json(serialize.assembly(a));
    })
  );

  router.post(
    "/:id/close",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const a = await Assembly.findOneAndUpdate(
        { _id: assertObjectId(req.params.id), condominium: req.condoId, status: "Em votação" },
        { $set: { status: "Encerrada", closedAt: new Date() } },
        { new: true }
      );
      if (!a) throw conflict("Só é possível encerrar uma votação em andamento.");
      res.json(serialize.assembly(a, { results: await results(a._id) }));
    })
  );

  router.post(
    "/:id/votes",
    asyncHandler(async (req, res) => {
      const a = await load(req);
      const data = validate(req.body, {
        pautaId: rules.objectId({ label: "Pauta" }),
        choice: rules.oneOf(["Sim", "Não", "Abstenção"], { label: "Voto" }),
      });
      if (a.status !== "Em votação") throw conflict("A votação desta assembleia não está aberta.");
      const pauta = a.pautas.id(data.pautaId);
      if (!pauta) throw notFound("Pauta não encontrada.");
      const key = voterKey(a, req.user);
      if (!key) throw unprocessable("Sua unidade não está cadastrada. Fale com o síndico para poder votar.");
      try {
        await Vote.create({
          condominium: req.condoId,
          assembly: a._id,
          pauta: pauta._id,
          voterKey: key,
          user: req.user._id,
          choice: data.choice,
        });
      } catch (err) {
        if (err.code === 11000)
          throw conflict(
            a.voterScope === "unit" ? "Sua unidade já votou nesta pauta." : "Você já votou nesta pauta."
          );
        throw err;
      }
      res.status(201).json({ pautaId: String(pauta._id), choice: data.choice });
    })
  );

  return router;
};
