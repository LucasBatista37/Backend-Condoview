"use strict";

const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { asyncHandler, unauthorized, forbidden, HttpError, badRequest } = require("../lib/errors");
const { validate, rules } = require("../lib/validate");
const serialize = require("../lib/serialize");
const { htmlPage } = require("../lib/html");

const BCRYPT_COST = 12;
// Hash fixo usado quando o e-mail não existe, para igualar o tempo de resposta.
const DUMMY_HASH = bcrypt.hashSync("condoview-dummy-password-1", 10);

function hashCode(code, secret) {
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

module.exports = function authRoutes(ctx) {
  const { config, auth, mailer, limiters } = ctx;
  const router = express.Router();

  async function sendVerification(user) {
    const token = auth.signPurpose({ sub: String(user._id) }, "verify-email", "24h");
    const link = `${config.publicBaseUrl}/api/auth/verify/${token}`;
    await mailer.send({
      to: user.email,
      subject: "Confirme seu e-mail no Condoview",
      text: `Olá, ${user.nome}!\n\nConfirme seu e-mail para ativar sua conta no Condoview:\n${link}\n\nO link vale por 24 horas. Se você não criou esta conta, ignore esta mensagem.`,
    });
  }

  // Cadastro: o papel é sempre "morador" e a conta nasce sem condomínio.
  // O vínculo com o condomínio é feito pelo síndico (rota /api/residents/link).
  router.post(
    "/register",
    limiters.auth,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        nome: rules.string({ label: "Nome", min: 3, max: 120 }),
        email: rules.email(),
        senha: rules.password(),
      });
      if (config.requireEmailVerification && !mailer.isConfigured)
        throw new HttpError(503, "Cadastro temporariamente indisponível. Tente novamente mais tarde.");

      const existing = await User.findOne({ email: data.email });
      if (existing) {
        // Mesma resposta para não revelar quais e-mails já estão cadastrados.
        await mailer.send({
          to: existing.email,
          subject: "Tentativa de cadastro no Condoview",
          text: "Alguém tentou criar uma conta com este e-mail, que já está cadastrado. Se foi você, use \"Esqueci minha senha\" no aplicativo.",
        });
      } else {
        const user = await User.create({
          nome: data.nome,
          email: data.email,
          senha: await bcrypt.hash(data.senha, BCRYPT_COST),
          role: "morador",
          condominium: null,
          isVerified: !config.requireEmailVerification,
        });
        if (config.requireEmailVerification) await sendVerification(user);
      }
      res.status(201).json({
        message: config.requireEmailVerification
          ? "Conta criada! Enviamos um link de confirmação para o seu e-mail."
          : "Conta criada! Você já pode entrar.",
        requiresVerification: config.requireEmailVerification,
      });
    })
  );

  router.post(
    "/resend-verification",
    limiters.auth,
    asyncHandler(async (req, res) => {
      const { email } = validate(req.body, { email: rules.email() });
      const user = await User.findOne({ email });
      if (user && !user.isVerified) await sendVerification(user);
      res.json({ message: "Se houver uma conta pendente com este e-mail, enviamos um novo link." });
    })
  );

  router.get(
    "/verify/:token",
    asyncHandler(async (req, res) => {
      let ok = false;
      try {
        const decoded = auth.verifyPurpose(req.params.token, "verify-email");
        const user = await User.findById(decoded.sub);
        if (user) {
          if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
          }
          ok = true;
        }
      } catch {
        ok = false;
      }
      res
        .status(ok ? 200 : 400)
        .type("html")
        .send(
          htmlPage(
            ok ? "E-mail confirmado" : "Link inválido",
            ok
              ? "<p>Seu e-mail foi confirmado. Volte ao aplicativo Condoview e entre com sua conta.</p>"
              : "<p>Este link é inválido ou expirou. No aplicativo, tente entrar novamente para receber um novo link.</p>"
          )
        );
    })
  );

  router.post(
    "/login",
    limiters.auth,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        email: rules.email(),
        senha: rules.string({ label: "Senha", max: 128, trim: false }),
      });
      const user = await User.findOne({ email: data.email }).select("+senha");
      const valid = await bcrypt.compare(data.senha, user ? user.senha : DUMMY_HASH);
      if (!user || !valid) throw unauthorized("E-mail ou senha incorretos.", { code: "invalid_credentials" });
      if (user.isBlocked) throw forbidden("Sua conta está bloqueada. Fale com a administração do condomínio.", { code: "blocked" });
      if (!user.isVerified)
        throw forbidden("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.", { code: "email_not_verified" });

      res.json({ token: auth.signSession(user), user: serialize.me(user) });
    })
  );

  router.post(
    "/forgot-password",
    limiters.auth,
    asyncHandler(async (req, res) => {
      const { email } = validate(req.body, { email: rules.email() });
      const user = await User.findOne({ email });
      if (user) {
        const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
        user.passwordReset = {
          codeHash: hashCode(code, config.jwtSecret),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          attempts: 0,
        };
        await user.save();
        await mailer.send({
          to: user.email,
          subject: "Código para redefinir sua senha no Condoview",
          text: `Seu código é ${code}. Ele vale por 15 minutos.\n\nSe você não pediu a redefinição, ignore esta mensagem; sua senha continua a mesma.`,
        });
      }
      res.json({ message: "Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos." });
    })
  );

  router.post(
    "/reset-password",
    limiters.auth,
    asyncHandler(async (req, res) => {
      const data = validate(req.body, {
        email: rules.email(),
        code: rules.string({ label: "Código", min: 6, max: 6 }),
        senha: rules.password({ label: "Nova senha" }),
      });
      const user = await User.findOne({ email: data.email }).select("+passwordReset");
      const reset = user?.passwordReset;
      const invalid = () => badRequest("Código inválido ou expirado.", { code: "invalid_code" });
      if (!reset?.codeHash || reset.expiresAt < new Date() || reset.attempts >= 5) throw invalid();

      const expected = Buffer.from(reset.codeHash, "hex");
      const given = Buffer.from(hashCode(data.code, config.jwtSecret), "hex");
      if (!crypto.timingSafeEqual(expected, given)) {
        user.passwordReset.attempts += 1;
        user.markModified("passwordReset");
        await user.save();
        throw invalid();
      }
      user.senha = await bcrypt.hash(data.senha, BCRYPT_COST);
      user.passwordReset = null;
      user.isVerified = true; // quem recebeu o código comprovou acesso ao e-mail
      user.tokenVersion = (user.tokenVersion || 0) + 1; // encerra sessões antigas
      await user.save();
      res.json({ message: "Senha redefinida. Entre com a nova senha." });
    })
  );

  // Encerra todas as sessões do usuário (o token atual deixa de valer).
  router.post(
    "/logout",
    auth.requireAuth,
    asyncHandler(async (req, res) => {
      await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 }, $set: { fcmToken: null } });
      res.json({ message: "Sessão encerrada." });
    })
  );

  return router;
};

module.exports.BCRYPT_COST = BCRYPT_COST;
module.exports.DUMMY_HASH = DUMMY_HASH;
