"use strict";

/**
 * Cria um condomínio e define o primeiro gestor (síndico/administrador).
 * A criação de condomínios não é exposta na API pública de propósito.
 *
 * Uso:
 *   node scripts/create-condominium.js --nome "Residencial X" --endereco "Rua Y, 10" \
 *        --gestor email@exemplo.com --papel sindico [--unidade ADM]
 *
 * O gestor precisa já ter criado (e confirmado) a conta no aplicativo.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { load } = require("../src/config/env");
const { Condominium, User } = require("../src/models");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

(async () => {
  const nome = arg("nome");
  const endereco = arg("endereco");
  const gestor = (arg("gestor") || "").toLowerCase().trim();
  const papel = arg("papel") || "sindico";
  if (!nome || !endereco || !gestor || !["sindico", "administrador"].includes(papel)) {
    console.error('Uso: --nome "..." --endereco "..." --gestor email --papel sindico|administrador [--unidade X]');
    process.exit(1);
  }
  const config = load();
  await mongoose.connect(config.mongoUri);
  const user = await User.findOne({ email: gestor });
  if (!user) throw new Error("Usuário gestor não encontrado. Ele precisa criar a conta no app primeiro.");
  if (user.condominium) throw new Error("Este usuário já está vinculado a um condomínio.");
  const condo = await Condominium.create({ name: nome, address: endereco });
  user.condominium = condo._id;
  user.role = papel;
  user.apartamento = arg("unidade") || user.apartamento || "";
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  console.log(`Condomínio criado (${condo._id}). ${user.email} agora é ${papel}.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("Erro:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
