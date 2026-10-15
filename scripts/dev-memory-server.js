"use strict";

/**
 * Servidor de desenvolvimento com MongoDB em memória e dados de demonstração.
 * Útil para rodar o app localmente sem banco real. Nada é persistido.
 *   node scripts/dev-memory-server.js   (PORT padrão 5000)
 */

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.JWT_SECRET = process.env.JWT_SECRET || require("crypto").randomBytes(48).toString("base64url");
process.env.REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION || "false";

const os = require("os");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { load } = require("../src/config/env");
const { createApp } = require("../src/app");
const { seedDemo } = require("./seed-demo");

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((mdl) => mdl.syncIndexes()));
  const config = { ...load(), uploadDir: fs.mkdtempSync(path.join(os.tmpdir(), "condoview-dev-")) };
  const seeded = await seedDemo({ timeZone: config.condoTimeZone });
  createApp(config).listen(config.port, "0.0.0.0", () => {
    console.log(`API de desenvolvimento em http://localhost:${config.port}`);
    console.log(`Contas demo (senha ${seeded.password}): sindica@demo.condoview, morador@demo.condoview, nova@demo.condoview`);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
