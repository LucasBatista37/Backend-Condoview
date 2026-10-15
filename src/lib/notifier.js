"use strict";

const fs = require("fs");
const { User } = require("../models");

/**
 * Notificações push via Firebase Cloud Messaging.
 * Opcional: sem credenciais o envio é ignorado (o restante da API funciona).
 * Os destinatários são sempre limitados ao condomínio do evento.
 * O texto evita dados sensíveis porque aparece na tela de bloqueio.
 */
function createNotifier(config) {
  const sent = [];
  let messaging = null;

  if (!config.isTest) {
    try {
      let credentials = null;
      if (config.firebase.serviceAccountJson) credentials = JSON.parse(config.firebase.serviceAccountJson);
      else if (fs.existsSync(config.firebase.serviceAccountPath))
        credentials = JSON.parse(fs.readFileSync(config.firebase.serviceAccountPath, "utf8"));
      if (credentials) {
        const { initializeApp, cert, getApps } = require("firebase-admin/app");
        const { getMessaging } = require("firebase-admin/messaging");
        const app = getApps()[0] || initializeApp({ credential: cert(credentials) });
        messaging = getMessaging(app);
      }
    } catch (err) {
      console.error("[push] Firebase não inicializado:", err.message);
    }
  }

  async function toUsers(filter, { title, body, data = {} }) {
    const users = await User.find({ ...filter, fcmToken: { $ne: null } }).select("+fcmToken");
    const tokens = users.map((u) => u.fcmToken).filter(Boolean);
    if (config.isTest) {
      sent.push({ filter, title, body, count: tokens.length });
      return;
    }
    if (!messaging || tokens.length === 0) return;
    try {
      const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
      const res = await messaging.sendEachForMulticast({ tokens, notification: { title, body }, data: stringData });
      // Remove tokens inválidos para não reenviar.
      const invalid = res.responses
        .map((r, i) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code || "") ? tokens[i] : null))
        .filter(Boolean);
      if (invalid.length) await User.updateMany({ fcmToken: { $in: invalid } }, { $set: { fcmToken: null } });
    } catch (err) {
      console.error("[push] falha ao enviar:", err.message);
    }
  }

  const notify = {
    sent,
    get enabled() {
      return Boolean(messaging);
    },
    condo: (condoId, payload, { exceptUser } = {}) =>
      toUsers({ condominium: condoId, ...(exceptUser ? { _id: { $ne: exceptUser } } : {}) }, payload),
    managers: (condoId, payload) =>
      toUsers({ condominium: condoId, role: { $in: ["sindico", "administrador"] } }, payload),
    user: (userId, payload) => toUsers({ _id: userId }, payload),
  };
  // Disparo sem bloquear a resposta HTTP.
  notify.fire = (promise) => {
    Promise.resolve(promise).catch((err) => console.error("[push]", err.message));
  };
  return notify;
}

module.exports = { createNotifier };
