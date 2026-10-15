"use strict";

const jwt = require("jsonwebtoken");
const { User, MANAGER_ROLES } = require("../models");
const { unauthorized, forbidden, asyncHandler } = require("../lib/errors");

const ALGORITHM = "HS256";

function createAuth(config) {
  function signSession(user) {
    return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0, typ: "session" }, config.jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: config.jwtExpiresIn,
    });
  }

  function signPurpose(payload, purpose, expiresIn) {
    return jwt.sign({ ...payload, typ: purpose }, config.jwtSecret, { algorithm: ALGORITHM, expiresIn });
  }

  function verifyPurpose(token, purpose) {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });
    if (decoded.typ !== purpose) throw new Error("Tipo de token inválido");
    return decoded;
  }

  /**
   * Exige sessão válida. A identidade e o papel vêm SEMPRE do banco, nunca do corpo
   * da requisição. Tokens de usuários bloqueados, removidos ou com versão antiga
   * (logout, troca de senha, desvínculo) são recusados.
   */
  const requireAuth = asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw unauthorized("Faça login para continuar.");

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });
    } catch {
      throw unauthorized();
    }
    if (decoded.typ !== "session" || !decoded.sub) throw unauthorized();

    const user = await User.findById(decoded.sub);
    if (!user || user.isBlocked || (user.tokenVersion || 0) !== decoded.tv) throw unauthorized();

    req.user = user;
    next();
  });

  /** Exige que o usuário esteja vinculado a um condomínio. */
  const requireCondo = (req, _res, next) => {
    if (!req.user?.condominium) {
      return next(
        forbidden("Sua conta ainda não está vinculada a um condomínio. Peça ao síndico para liberar seu acesso.", {
          code: "no_condominium",
        })
      );
    }
    req.condoId = req.user.condominium;
    next();
  };

  const requireManager = (req, _res, next) => {
    if (!MANAGER_ROLES.includes(req.user?.role)) {
      return next(forbidden("Somente o síndico ou a administração pode fazer isso."));
    }
    next();
  };

  return { signSession, signPurpose, verifyPurpose, requireAuth, requireCondo, requireManager };
}

const isManager = (user) => MANAGER_ROLES.includes(user?.role);

module.exports = { createAuth, isManager };
