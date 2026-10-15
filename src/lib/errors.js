"use strict";

class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (msg, opts) => new HttpError(400, msg, opts);
const unauthorized = (msg = "Sua sessão expirou. Entre novamente.", opts) =>
  new HttpError(401, msg, { code: "unauthenticated", ...opts });
const forbidden = (msg = "Você não tem permissão para esta ação.", opts) =>
  new HttpError(403, msg, { code: "forbidden", ...opts });
const notFound = (msg = "Registro não encontrado.", opts) =>
  new HttpError(404, msg, { code: "not_found", ...opts });
const conflict = (msg, opts) => new HttpError(409, msg, { code: "conflict", ...opts });
const unprocessable = (msg, opts) => new HttpError(422, msg, { code: "validation", ...opts });

/** Envolve handlers async para que erros cheguem ao middleware de erro. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  asyncHandler,
};
