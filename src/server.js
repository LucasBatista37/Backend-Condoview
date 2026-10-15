"use strict";

require("dotenv").config();

const mongoose = require("mongoose");
const { load } = require("./config/env");
const { createApp } = require("./app");

async function main() {
  const config = load();
  if (!config.mongoUri) throw new Error("Configure MONGODB_URI (ou DB_USER/DB_PASS).");
  await mongoose.connect(config.mongoUri);
  console.log("Banco de dados conectado.");
  const app = createApp(config);
  const server = app.listen(config.port, () => console.log(`Condoview API na porta ${config.port}`));
  // Mantém conexões ociosas por mais tempo que o balanceador do provedor,
  // evitando que clientes reaproveitem conexões já fechadas.
  server.keepAliveTimeout = 65 * 1000;
  server.headersTimeout = 66 * 1000;
}

main().catch((err) => {
  console.error("Falha ao iniciar:", err.message);
  process.exit(1);
});
