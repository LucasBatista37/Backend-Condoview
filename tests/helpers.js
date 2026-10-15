"use strict";

const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { load } = require("../src/config/env");
const { createApp } = require("../src/app");
const models = require("../src/models");

const PASSWORD = "Senha1234";
let mongod;

async function setup(overrides = {}) {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const config = {
    ...load(),
    uploadDir: fs.mkdtempSync(path.join(os.tmpdir(), "condoview-test-")),
    ...overrides,
  };
  const app = createApp(config);
  return { app, config, ctx: app.locals.ctx };
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function createCondo(name = "Condomínio A") {
  return models.Condominium.create({ name, address: "Rua Teste, 100", areas: ["Salão de festas", "Churrasqueira"] });
}

const hashed = bcrypt.hashSync(PASSWORD, 4);
async function createUser(app, { condo = null, role = "morador", apartamento = "", nome } = {}) {
  const email = `${crypto.randomBytes(5).toString("hex")}@teste.dev`;
  const user = await models.User.create({
    nome: nome || `Usuário ${role}`,
    email,
    senha: hashed,
    role,
    condominium: condo ? condo._id : null,
    apartamento,
    isVerified: true,
  });
  const res = await request(app).post("/api/auth/login").send({ email, senha: PASSWORD });
  if (res.status !== 200) throw new Error(`login falhou: ${res.status} ${JSON.stringify(res.body)}`);
  const token = res.body.token;
  return { user, token, email, auth: { Authorization: `Bearer ${token}` } };
}

/** Pequeno JPEG válido com segmento EXIF falso contendo "GPS". */
function jpegWithExif() {
  const exifPayload = Buffer.concat([Buffer.from("Exif\0\0"), Buffer.from("GPSLatitude-23.5505")]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(exifPayload.length + 2, 2);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app1,
    exifPayload,
    Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x00, 0x00]), // segmento DQT mínimo
    Buffer.from([0xff, 0xda, 0x00, 0x02]),
    Buffer.from([0x11, 0x22, 0x33]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

/** Data (AAAA-MM-DD) no fuso do condomínio, `days` dias a partir de hoje. */
function futureDate(days = 3) {
  const { nowInZone } = require("../src/lib/time");
  const today = nowInZone("America/Sao_Paulo").date;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { setup, teardown, createCondo, createUser, jpegWithExif, futureDate, PASSWORD, models, request };
