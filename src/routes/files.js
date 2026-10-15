"use strict";

const express = require("express");
const { FileAsset } = require("../models");
const { asyncHandler, notFound } = require("../lib/errors");
const { assertObjectId } = require("../lib/validate");
const { isManager } = require("../middlewares/auth");

/**
 * Entrega de arquivos com verificação de acesso. Não há pasta pública de uploads.
 * Respostas negativas usam 404 para não revelar a existência do arquivo.
 */
module.exports = function fileRoutes(ctx) {
  const { auth, files } = ctx;
  const router = express.Router();
  router.use(auth.requireAuth);

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      assertObjectId(req.params.id);
      const asset = await FileAsset.findById(req.params.id);
      if (!asset) throw notFound("Arquivo não encontrado.");

      const user = req.user;
      const isOwner = String(asset.owner) === String(user._id);
      const sameCondo = asset.condominium && user.condominium && String(asset.condominium) === String(user.condominium);
      let allowed = isOwner;
      if (!allowed && sameCondo) {
        if (asset.access === "condo") allowed = true;
        else if (isManager(user)) allowed = true;
        else if (asset.allowedUsers.some((u) => String(u) === String(user._id))) allowed = true;
      }
      if (!allowed) throw notFound("Arquivo não encontrado.");

      res.set({
        "Content-Type": asset.mime,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      });
      res.sendFile(files.absolutePath(asset), (err) => {
        if (err && !res.headersSent) res.status(404).json({ errors: ["Arquivo não encontrado."] });
      });
    })
  );

  return router;
};
