"use strict";

const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const { VisitorInvite } = require("../models");
const { asyncHandler, notFound, conflict, unprocessable } = require("../lib/errors");
const { validate, rules, assertObjectId } = require("../lib/validate");
const { zonedToUtc, nowInZone } = require("../lib/time");
const serialize = require("../lib/serialize");
const { isManager } = require("../middlewares/auth");

/**
 * Convites de visitantes com QR Code validado no servidor.
 *
 * - O QR contém apenas `CV1.<id>.<assinatura>` — nenhum dado pessoal.
 * - A assinatura é um HMAC com segredo do servidor: não dá para forjar nem
 *   adulterar o código.
 * - Validade (mantendo a regra original de 24 horas): do início do dia da
 *   visita até 24 horas após o horário agendado, no fuso do condomínio.
 * - Uso único por padrão; o morador pode revogar a qualquer momento.
 * - A validação na portaria registra a entrada de forma atômica, então o
 *   mesmo QR não é aceito duas vezes além do limite.
 */
module.exports = function visitorRoutes(ctx) {
  const { auth, config } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth, auth.requireCondo);

  const sign = (id, nonce) =>
    crypto.createHmac("sha256", config.inviteSecret).update(`${id}.${nonce}`).digest("base64url").slice(0, 32);
  const payloadFor = (invite) => `CV1.${invite._id}.${sign(String(invite._id), invite.nonce)}`;

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filter = { condominium: req.condoId };
      if (!isManager(req.user) || req.query.scope === "mine") filter.host = req.user._id;
      const list = await VisitorInvite.find(filter).sort({ scheduledFor: -1 }).limit(100);
      res.json(list.map(serialize.invite));
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        visitorName: rules.string({ label: "Nome do visitante", min: 3, max: 120 }),
        dia: rules.date({ label: "Data da visita" }),
        horario: rules.time({ label: "Horário da visita" }),
      });
      const now = nowInZone(config.condoTimeZone);
      if (data.dia < now.date) throw unprocessable("A data da visita não pode estar no passado.");
      const scheduledFor = zonedToUtc(data.dia, data.horario, config.condoTimeZone);
      const maxAhead = Date.now() + 90 * 24 * 60 * 60 * 1000;
      if (scheduledFor.getTime() > maxAhead) throw unprocessable("Convites podem ser criados com até 90 dias de antecedência.");

      const invite = await VisitorInvite.create({
        condominium: req.condoId,
        host: req.user._id,
        hostName: req.user.nome,
        apartamento: req.user.apartamento || "",
        visitorName: data.visitorName,
        scheduledFor,
        validFrom: zonedToUtc(data.dia, "00:00", config.condoTimeZone),
        validUntil: new Date(scheduledFor.getTime() + 24 * 60 * 60 * 1000),
        maxUses: 1,
        nonce: crypto.randomBytes(16).toString("hex"),
      });
      res.status(201).json({ ...serialize.invite(invite), qrPayload: payloadFor(invite) });
    })
  );

  // Somente o anfitrião pode recuperar o QR do próprio convite.
  router.get(
    "/:id/qr",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const invite = await VisitorInvite.findOne({ _id: req.params.id, condominium: req.condoId, host: req.user._id }).select("+nonce");
      if (!invite) throw notFound("Convite não encontrado.");
      if (invite.revokedAt) throw conflict("Este convite foi revogado.");
      res.json({ ...serialize.invite(invite), qrPayload: payloadFor(invite) });
    })
  );

  router.post(
    "/:id/revoke",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const filter = { _id: req.params.id, condominium: req.condoId };
      if (!isManager(req.user)) filter.host = req.user._id;
      const invite = await VisitorInvite.findOneAndUpdate(
        { ...filter, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { new: true }
      );
      if (!invite) throw notFound("Convite não encontrado ou já revogado.");
      res.json(serialize.invite(invite));
    })
  );

  // Portaria/gestão: valida o QR e registra a entrada.
  router.post(
    "/validate",
    auth.requireManager,
    asyncHandler(async (req, res) => {
      const { payload } = validate(req.body, { payload: rules.string({ label: "Código", max: 200 }) });
      const reject = (reason, invite) =>
        res.status(200).json({ valid: false, reason, invite: invite ? serialize.invite(invite) : null });

      const parts = payload.trim().split(".");
      if (parts.length !== 3 || parts[0] !== "CV1" || !mongoose.Types.ObjectId.isValid(parts[1]))
        return reject("Este QR Code não é um convite do Condoview.");
      // Assinatura: exatamente 32 caracteres base64url (comprimento fixo em bytes
      // para a comparação em tempo constante).
      if (!/^[A-Za-z0-9_-]{32}$/.test(parts[2])) return reject("Convite inválido ou adulterado.");

      const invite = await VisitorInvite.findOne({ _id: parts[1] }).select("+nonce");
      const expected = Buffer.from(invite ? sign(String(invite._id), invite.nonce) : "0".repeat(32), "latin1");
      const given = Buffer.from(parts[2], "latin1");
      const sigOk = crypto.timingSafeEqual(expected, given) && Boolean(invite);
      if (!sigOk) return reject("Convite inválido ou adulterado.");
      if (String(invite.condominium) !== String(req.condoId)) return reject("Este convite é de outro condomínio.");
      if (invite.revokedAt) return reject("Convite revogado pelo morador.", invite);

      const now = new Date();
      if (now < invite.validFrom) return reject("O convite ainda não está válido (a visita é em outra data).", invite);
      if (now > invite.validUntil) return reject("Convite expirado.", invite);

      const updated = await VisitorInvite.findOneAndUpdate(
        { _id: invite._id, revokedAt: null, $expr: { $lt: ["$uses", "$maxUses"] } },
        { $inc: { uses: 1 }, $push: { entries: { at: now, by: req.user._id } } },
        { new: true }
      );
      if (!updated) return reject("Este convite já foi utilizado.", invite);
      res.json({ valid: true, reason: "Entrada liberada.", invite: serialize.invite(updated) });
    })
  );

  return router;
};
