"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { htmlPage } = require("../lib/html");
const { deleteAccount } = require("../lib/account");
const { DUMMY_HASH } = require("./auth");

/**
 * Página web de exclusão de conta, exigida pelo Google Play para apps com
 * criação de conta (o usuário precisa conseguir pedir a exclusão sem o app).
 * Sem JavaScript; protegida por limite de tentativas.
 */
module.exports = function accountPage(ctx) {
  const { files, limiters } = ctx;
  const router = express.Router();
  router.use(express.urlencoded({ extended: false, limit: "10kb" }));

  const form = (msg = "") =>
    htmlPage(
      "Excluir conta do Condoview",
      `${msg}
<p>Ao excluir sua conta, removemos seus dados de cadastro, foto, reservas, solicitações de manutenção, ocorrências, convites de visitantes e encomendas registradas para você. Suas mensagens no chat são apagadas. Votos em assembleias permanecem apenas no total da votação, sem identificar você.</p>
<p class="muted">Você também pode excluir a conta pelo aplicativo, em Perfil → Excluir conta.</p>
<form method="post" action="/conta/excluir" autocomplete="off">
  <label for="email">E-mail da conta</label>
  <input id="email" name="email" type="email" required maxlength="160">
  <label for="senha">Senha</label>
  <input id="senha" name="senha" type="password" required maxlength="128">
  <label><input type="checkbox" name="confirm" value="yes" required style="width:auto"> Entendo que a exclusão é permanente.</label>
  <button type="submit">Excluir minha conta</button>
</form>`
    );

  router.get("/conta/excluir", (_req, res) => res.type("html").send(form()));

  router.post("/conta/excluir", limiters.auth, async (req, res, next) => {
    try {
      const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const senha = typeof req.body.senha === "string" ? req.body.senha : "";
      if (req.body.confirm !== "yes" || !email || !senha) {
        return res.status(422).type("html").send(form('<p style="color:#B3261E">Preencha todos os campos e confirme.</p>'));
      }
      const user = await User.findOne({ email }).select("+senha");
      const ok = await bcrypt.compare(senha, user ? user.senha : DUMMY_HASH);
      if (!user || !ok) {
        return res.status(401).type("html").send(form('<p style="color:#B3261E">E-mail ou senha incorretos.</p>'));
      }
      await deleteAccount(user, files);
      res.type("html").send(htmlPage("Conta excluída", "<p>Sua conta e os dados associados foram excluídos.</p>"));
    } catch (err) {
      next(err);
    }
  });

  return router;
};
