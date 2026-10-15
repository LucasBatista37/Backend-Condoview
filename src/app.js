"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const { createAuth } = require("./middlewares/auth");
const { createFileService } = require("./lib/files");
const { createMailer } = require("./lib/mailer");
const { createNotifier } = require("./lib/notifier");
const { HttpError } = require("./lib/errors");

// Proteção contra injeção NoSQL: a query string é lida no modo "simple" (sem
// objetos aninhados como ?status[$ne]=x) e toda entrada passa por validate(),
// que só aceita tipos primitivos esperados antes de chegar a um filtro.
mongoose.set("strictQuery", true);

function createApp(config, overrides = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.set("trust proxy", 1); // atrás do proxy do provedor (Render)

  const auth = createAuth(config);
  const files = createFileService(config);
  const mailer = overrides.mailer || createMailer(config);
  const notify = overrides.notify || createNotifier(config);

  const limiters = {
    auth: rateLimit({
      windowMs: config.rateLimit.authWindowMs,
      limit: config.rateLimit.authMax,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { errors: ["Muitas tentativas. Aguarde alguns minutos e tente novamente."] },
    }),
    api: rateLimit({
      windowMs: config.rateLimit.apiWindowMs,
      limit: config.rateLimit.apiMax,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { errors: ["Muitas requisições. Aguarde um pouco."] },
    }),
  };
  const ctx = { config, auth, files, mailer, notify, limiters };

  app.use(helmet());
  // O app Android não depende de CORS; apenas origens web explicitamente configuradas.
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
  if (!config.isTest) {
    // Loga apenas método, rota, status e tempo — nunca corpo ou cabeçalho de autorização.
    app.use(morgan(config.isProd ? ":method :url :status :response-time ms" : "dev"));
  }
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/", (_req, res) => res.json({ name: "Condoview API", status: "ok" }));

  app.use(require("./routes/accountPage")(ctx));

  const api = express.Router();
  api.use(limiters.api);
  api.use("/auth", require("./routes/auth")(ctx));
  api.use("/me", require("./routes/me")(ctx));
  api.use("/", require("./routes/condo")(ctx));
  api.use("/notices", require("./routes/notices")(ctx));
  api.use("/reserves", require("./routes/reserves")(ctx));
  api.use("/", require("./routes/requests")(ctx));
  api.use("/assemblies", require("./routes/assemblies")(ctx));
  api.use("/visitors", require("./routes/visitors")(ctx));
  api.use("/chat", require("./routes/chat")(ctx));
  api.use("/files", require("./routes/files")(ctx));
  app.use("/api", api);

  app.use((_req, res) => res.status(404).json({ errors: ["Rota não encontrada."] }));

  // Tratamento central de erros: mensagens amigáveis, sem detalhes internos.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ errors: err.details || [err.message], code: err.code });
    }
    if (err?.type === "entity.parse.failed") return res.status(400).json({ errors: ["Requisição inválida."] });
    if (err?.type === "entity.too.large") return res.status(413).json({ errors: ["Conteúdo grande demais."] });
    if (err?.name === "CastError" || err?.name === "ValidationError")
      return res.status(422).json({ errors: ["Dados inválidos."] });
    console.error("[erro]", err?.stack || err);
    return res.status(500).json({ errors: ["Erro interno. Tente novamente em instantes."] });
  });

  app.locals.ctx = ctx;
  return app;
}

module.exports = { createApp };
