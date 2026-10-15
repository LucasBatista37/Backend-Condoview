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
  app.listen(config.port, () => console.log(`Condoview API na porta ${config.port}`));
}

main().catch((err) => {
  console.error("Falha ao iniciar:", err.message);
  process.exit(1);
});
