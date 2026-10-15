"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const models = require("../models");
const { asyncHandler, unauthorized } = require("../lib/errors");
const { validate, rules } = require("../lib/validate");
const serialize = require("../lib/serialize");
const { deleteAccount } = require("../lib/account");
const { nowInZone } = require("../lib/time");
const { isManager } = require("../middlewares/auth");
const { BCRYPT_COST } = require("./auth");

module.exports = function meRoutes(ctx) {
  const { auth, files, config } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth);

  router.get("/", (req, res) => res.json(serialize.me(req.user)));

  router.patch(
    "/",
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        nome: rules.string({ label: "Nome", min: 3, max: 120, required: false }),
        telefone: rules.string({ label: "Telefone", max: 20, required: false }),
      });
      if (data.telefone !== undefined && data.telefone && !/^\+?\d{10,13}$/.test(data.telefone.replace(/\D/g, "")))
        throw require("../lib/errors").unprocessable("Telefone inválido. Use DDD + número.");
      if (data.telefone !== undefined) data.telefone = data.telefone.replace(/\D/g, "");
      Object.assign(req.user, data);
      await req.user.save();
      res.json(serialize.me(req.user));
    })
  );

  router.put(
    "/password",
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        senhaAtual: rules.string({ label: "Senha atual", max: 128, trim: false }),
        novaSenha: rules.password({ label: "Nova senha" }),
      });
      const user = await models.User.findById(req.user._id).select("+senha");
      if (!(await bcrypt.compare(data.senhaAtual, user.senha)))
        throw unauthorized("A senha atual está incorreta.", { code: "invalid_password" });
      user.senha = await bcrypt.hash(data.novaSenha, BCRYPT_COST);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      // Devolve um novo token para manter este aparelho conectado.
      res.json({ message: "Senha alterada.", token: auth.signSession(user) });
    })
  );

  router.put(
    "/photo",
    files.single("photo"),
    asyncHandler(async (req, res) => {
      if (!req.file) throw require("../lib/errors").unprocessable("Selecione uma imagem.");
      const asset = await files.store(req.file, {
        owner: req.user._id,
        condominium: req.user.condominium,
        kind: "profile",
        access: "condo",
      });
      const old = req.user.profileImage;
      req.user.profileImage = asset._id;
      await req.user.save();
      if (old) await files.remove(old);
      res.json(serialize.me(req.user));
    })
  );

  router.put(
    "/fcm-token",
    asyncHandler(async (req, res) => {
      const { token } = validate(req.body, { token: rules.string({ label: "Token", max: 4096 }) });
      // Um token de aparelho pertence a um único usuário por vez.
      await models.User.updateMany({ fcmToken: token, _id: { $ne: req.user._id } }, { $set: { fcmToken: null } });
      await models.User.updateOne({ _id: req.user._id }, { $set: { fcmToken: token } });
      res.json({ ok: true });
    })
  );

  router.delete(
    "/",
    asyncHandler(async (req, res) => {
      const { senha } = validate(req.body, { senha: rules.string({ label: "Senha", max: 128, trim: false }) });
      const user = await models.User.findById(req.user._id).select("+senha");
      if (!(await bcrypt.compare(senha, user.senha)))
        throw unauthorized("Senha incorreta.", { code: "invalid_password" });
      await deleteAccount(user, files);
      res.json({ message: "Conta excluída." });
    })
  );

  /** Resumo para a tela inicial: somente dados que o usuário pode ver. */
  router.get(
    "/summary",
    asyncHandler(async (req, res) => {
      const user = req.user;
      if (!user.condominium) return res.json({ condominium: null, linked: false });
      const condoId = user.condominium;
      const condo = await models.Condominium.findById(condoId);
      const today = nowInZone(config.condoTimeZone).date;

      const [notices, myPackages, myReserves, openAssemblies] = await Promise.all([
        models.Notice.find({ condominium: condoId }).sort({ createdAt: -1 }).limit(3).populate("author", "nome"),
        models.Package.countDocuments({ condominium: condoId, recipient: user._id, status: "Aguardando retirada" }),
        models.Reserve.find({
          condominium: condoId,
          user: user._id,
          status: { $in: ["Pendente", "Aprovada"] },
          dia: { $gte: today },
        })
          .sort({ dia: 1, horarioInicio: 1 })
          .limit(3),
        models.Assembly.find({ condominium: condoId, status: "Em votação" }).sort({ scheduledAt: 1 }).limit(3),
      ]);

      const myOpenRequests = await Promise.all([
        models.Maintenance.countDocuments({ condominium: condoId, user: user._id, status: { $in: ["Pendente", "Aprovada"] } }),
        models.Occurrence.countDocuments({ condominium: condoId, userId: user._id, status: { $ne: "Resolvida" } }),
      ]);

      let management = null;
      if (isManager(user)) {
        const [reserves, maintenance, occurrences, packages, reports] = await Promise.all([
          models.Reserve.countDocuments({ condominium: condoId, status: "Pendente" }),
          models.Maintenance.countDocuments({ condominium: condoId, status: "Pendente" }),
          models.Occurrence.countDocuments({ condominium: condoId, status: { $ne: "Resolvida" } }),
          models.Package.countDocuments({ condominium: condoId, status: "Aguardando retirada" }),
          models.ChatReport.countDocuments({ condominium: condoId, status: "Aberta" }),
        ]);
        management = {
          pendingReserves: reserves,
          pendingMaintenance: maintenance,
          openOccurrences: occurrences,
          packagesAwaiting: packages,
          openReports: reports,
        };
      }

      res.json({
        linked: true,
        condominium: condo ? serialize.condominium(condo) : null,
        recentNotices: notices.map(serialize.notice),
        packagesAwaiting: myPackages,
        upcomingReserves: myReserves.map((r) => serialize.reserve(r)),
        votingAssemblies: openAssemblies.map((a) => serialize.assembly(a)),
        myOpenMaintenance: myOpenRequests[0],
        myOpenOccurrences: myOpenRequests[1],
        management,
      });
    })
  );

  return router;
};
