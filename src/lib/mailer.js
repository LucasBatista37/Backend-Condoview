"use strict";

const nodemailer = require("nodemailer");

/**
 * Envio de e-mails transacionais (verificação de conta e recuperação de senha).
 * Em testes, as mensagens ficam em memória (outbox). Em desenvolvimento sem SMTP,
 * o conteúdo é exibido no console. Em produção sem SMTP, `isConfigured` é falso
 * e as rotas que dependem de e-mail respondem 503.
 */
function createMailer(config) {
  const outbox = [];
  const { mail } = config;
  const configured = Boolean(mail.user && mail.pass && (mail.host || mail.service));

  let transporter = null;
  if (configured && !config.isTest) {
    transporter = nodemailer.createTransport(
      mail.host
        ? { host: mail.host, port: mail.port, secure: mail.secure, auth: { user: mail.user, pass: mail.pass } }
        : { service: mail.service, auth: { user: mail.user, pass: mail.pass } }
    );
  }

  async function send({ to, subject, text, html }) {
    if (config.isTest) {
      outbox.push({ to, subject, text, html });
      return;
    }
    if (!transporter) {
      if (!config.isProd) {
        // Somente fora de produção: facilita testes locais sem SMTP.
        console.info(`[mail:dev] Para: ${to}\nAssunto: ${subject}\n${text}`);
        return;
      }
      throw new Error("SMTP não configurado");
    }
    await transporter.sendMail({ from: `"Condoview" <${mail.from}>`, to, subject, text, html });
  }

  return {
    send,
    outbox,
    get isConfigured() {
      return configured || !config.isProd;
    },
  };
}

module.exports = { createMailer };
