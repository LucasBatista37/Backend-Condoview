"use strict";

const express = require("express");
const { Reserve, ReserveLock, Condominium } = require("../models");
const { asyncHandler, notFound, conflict, unprocessable } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const { nowInZone, toMinutes, overlaps } = require("../lib/time");
const serialize = require("../lib/serialize");
const { isManager } = require("../middlewares/auth");

const ACTIVE = ["Pendente", "Aprovada"];

/**
 * Regras de reserva:
 * - O morador solicita (status Pendente); o gestor aprova ou rejeita.
 * - Não é possível solicitar horário que conflite com reserva já APROVADA.
 * - Na aprovação, o conflito é verificado novamente sob uma trava por
 *   (condomínio, área, dia), evitando duas aprovações simultâneas do mesmo horário.
 * - Datas e horários são do fuso do condomínio; não se reserva no passado.
 * - Duração mínima de 30 minutos e máxima de 12 horas (limites conservadores).
 */
module.exports = function reserveRoutes(ctx) {
  const { auth, config, notify } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth, auth.requireCondo);

  async function withLock(key, fn) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await ReserveLock.create({ key });
        try {
          return await fn();
        } finally {
          await ReserveLock.deleteOne({ key });
        }
      } catch (err) {
        if (err.code !== 11000) throw err;
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    throw conflict("Outra operação está em andamento para este horário. Tente novamente.");
  }

  async function findApprovedConflict(condoId, { area, dia, horarioInicio, horarioFim }, excludeId) {
    const sameDay = await Reserve.find({
      condominium: condoId,
      area,
      dia,
      status: "Aprovada",
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    return sameDay.find((r) => overlaps(horarioInicio, horarioFim, r.horarioInicio, r.horarioFim));
  }

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filter = { condominium: req.condoId };
      const scope = isManager(req.user) && req.query.scope !== "mine" ? "all" : "mine";
      if (scope === "mine") filter.user = req.user._id;
      if (typeof req.query.status === "string" && ["Pendente", "Aprovada", "Rejeitada", "Cancelada"].includes(req.query.status))
        filter.status = req.query.status;
      const list = await Reserve.find(filter).sort({ dia: -1, horarioInicio: -1 }).limit(200);
      res.json(list.map((r) => serialize.reserve(r)));
    })
  );

  // Ocupação de uma área num dia (sem nomes de moradores).
  router.get(
    "/availability",
    asyncHandler(async (req, res) => {
      const { area, dia } = validate(req.query, {
        area: rules.string({ label: "Área", max: 60 }),
        dia: rules.date({ label: "Data" }),
      });
      const list = await Reserve.find({ condominium: req.condoId, area, dia, status: { $in: ACTIVE } }).sort({ horarioInicio: 1 });
      res.json(list.map((r) => ({ horarioInicio: r.horarioInicio, horarioFim: r.horarioFim, status: r.status })));
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        area: rules.string({ label: "Área", min: 2, max: 60 }),
        dia: rules.date({ label: "Data" }),
        horarioInicio: rules.time({ label: "Horário de início" }),
        horarioFim: rules.time({ label: "Horário de término" }),
        descricao: rules.string({ label: "Descrição", max: 500, required: false }),
      });
      const condo = await Condominium.findById(req.condoId);
      if (condo?.areas?.length && !condo.areas.includes(data.area)) throw unprocessable("Área comum inválida.");

      const duration = toMinutes(data.horarioFim) - toMinutes(data.horarioInicio);
      if (duration <= 0) throw unprocessable("O término deve ser depois do início.");
      if (duration < 30) throw unprocessable("A reserva deve ter pelo menos 30 minutos.");
      if (duration > 12 * 60) throw unprocessable("A reserva pode ter no máximo 12 horas.");

      const now = nowInZone(config.condoTimeZone);
      if (data.dia < now.date || (data.dia === now.date && data.horarioInicio <= now.time))
        throw unprocessable("Escolha uma data e horário futuros.");

      if (await findApprovedConflict(req.condoId, data))
        throw conflict("Já existe uma reserva aprovada neste horário. Escolha outro horário.");

      const mineSame = await Reserve.find({ condominium: req.condoId, user: req.user._id, area: data.area, dia: data.dia, status: "Pendente" });
      if (mineSame.some((r) => overlaps(data.horarioInicio, data.horarioFim, r.horarioInicio, r.horarioFim)))
        throw conflict("Você já tem uma solicitação pendente para este horário.");

      const reserve = await Reserve.create({
        ...data,
        descricao: data.descricao || "",
        condominium: req.condoId,
        user: req.user._id,
        nomeUsuario: req.user.nome,
        apartamento: req.user.apartamento || "",
        status: "Pendente",
      });
      notify.fire(
        notify.managers(req.condoId, { title: "Nova solicitação de reserva", body: `${data.area} em ${data.dia.split("-").reverse().join("/")}`, data: { type: "reserve", id: reserve.id } })
      );
      res.status(201).json(serialize.reserve(reserve));
    })
  );

  async function loadInCondo(req) {
    assertObjectId(req.params.id);
    const reserve = await Reserve.findOne({ _id: req.params.id, condominium: req.condoId });
    if (!reserve) throw notFound("Reserva não encontrada.");
    return reserve;
  }

  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      const reserve = await loadInCondo(req);
      if (String(reserve.user) !== String(req.user._id) && !isManager(req.user))
        throw notFound("Reserva não encontrada.");
      if (!ACTIVE.includes(reserve.status)) throw conflict("Esta reserva não pode mais ser cancelada.");
      reserve.status = "Cancelada";
      await reserve.save();
      res.json(serialize.reserve(reserve));
    })
  );

  router.post(
    "/:id/approve",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const reserve = await loadInCondo(req);
      if (reserve.status !== "Pendente") throw conflict(`Esta reserva já está ${reserve.status.toLowerCase()}.`);
      const updated = await withLock(`${req.condoId}:${reserve.area}:${reserve.dia}`, async () => {
        if (await findApprovedConflict(req.condoId, reserve, reserve._id))
          throw conflict("Já existe outra reserva aprovada que conflita com este horário.");
        const r = await Reserve.findOneAndUpdate(
          { _id: reserve._id, status: "Pendente" },
          { $set: { status: "Aprovada", decidedBy: req.user._id, decidedAt: new Date() } },
          { new: true }
        );
        if (!r) throw conflict("A reserva foi alterada por outra pessoa. Atualize a lista.");
        return r;
      });
      notify.fire(notify.user(updated.user, { title: "Reserva aprovada", body: `${updated.area} em ${updated.dia.split("-").reverse().join("/")}`, data: { type: "reserve", id: updated.id } }));
      res.json(serialize.reserve(updated));
    })
  );

  router.post(
    "/:id/reject",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const { motivo } = validate(req.body, { motivo: rules.string({ label: "Motivo", max: 300, required: false }) });
      const reserve = await loadInCondo(req);
      if (reserve.status !== "Pendente") throw conflict(`Esta reserva já está ${reserve.status.toLowerCase()}.`);
      reserve.status = "Rejeitada";
      reserve.motivoRejeicao = motivo || "";
      reserve.decidedBy = req.user._id;
      reserve.decidedAt = new Date();
      await reserve.save();
      notify.fire(notify.user(reserve.user, { title: "Reserva não aprovada", body: `${reserve.area} em ${reserve.dia.split("-").reverse().join("/")}`, data: { type: "reserve", id: reserve.id } }));
      res.json(serialize.reserve(reserve));
    })
  );

  return router;
};
