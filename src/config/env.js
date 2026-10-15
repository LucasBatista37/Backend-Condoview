"use strict";

/**
 * Centraliza e valida a configuração do servidor.
 * Falha cedo quando algo essencial está ausente, em vez de subir um servidor inseguro.
 */

const path = require("path");

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

function required(name, { minLength = 1 } = {}) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(
      `Variável de ambiente ${name} ausente ou curta demais (mínimo ${minLength} caracteres).`
    );
  }
  return value;
}

function buildMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  // Compatibilidade com a configuração antiga (DB_USER / DB_PASS / cluster0).
  if (process.env.DB_USER && process.env.DB_PASS) {
    const host = process.env.DB_HOST || "cluster0.ftely.mongodb.net";
    const user = encodeURIComponent(process.env.DB_USER);
    const pass = encodeURIComponent(process.env.DB_PASS);
    return `mongodb+srv://${user}:${pass}@${host}/?retryWrites=true&w=majority&appName=Cluster0`;
  }
  return null;
}

function load() {
  const jwtSecret = isTest
    ? process.env.JWT_SECRET || "test-secret-test-secret-test-secret-000"
    : required("JWT_SECRET", { minLength: 32 });

  return {
    nodeEnv: NODE_ENV,
    isProd,
    isTest,
    port: Number(process.env.PORT) || 5000,
    mongoUri: buildMongoUri(),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    // Segredo usado para assinar os QR Codes de visitantes (derivado do JWT se não informado).
    inviteSecret: process.env.INVITE_SECRET || `${jwtSecret}:visitor-invites`,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${Number(process.env.PORT) || 5000}`).replace(/\/$/, ""),
    corsOrigins: (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "storage")),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024,
    condoTimeZone: process.env.CONDO_TIMEZONE || "America/Sao_Paulo",
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
    mail: {
      host: process.env.SMTP_HOST || null,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || process.env.EMAIL_USER || null,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || null,
      service: process.env.SMTP_HOST ? null : process.env.EMAIL_USER ? "gmail" : null,
      from: process.env.MAIL_FROM || process.env.EMAIL_USER || null,
    },
    firebase: {
      serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null,
      serviceAccountPath:
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(__dirname, "..", "..", "serviceAccountKey.json"),
    },
    rateLimit: {
      authWindowMs: Number(process.env.RATE_AUTH_WINDOW_MS) || 15 * 60 * 1000,
      authMax: Number(process.env.RATE_AUTH_MAX) || (isTest ? 1000 : 20),
      apiWindowMs: Number(process.env.RATE_API_WINDOW_MS) || 15 * 60 * 1000,
      apiMax: Number(process.env.RATE_API_MAX) || (isTest ? 100000 : 600),
    },
  };
}

module.exports = { load };
