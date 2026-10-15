"use strict";

/**
 * Upload e entrega de arquivos.
 *
 * - Aceita somente JPEG e PNG, verificados pelo conteúdo (assinatura), não pela extensão.
 * - Remove metadados EXIF/XMP (ex.: localização GPS de fotos de celular).
 * - Grava com nome aleatório fora de qualquer pasta pública.
 * - A entrega passa por /api/files/:id, que verifica condomínio e permissão.
 */

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const { FileAsset } = require("../models");
const { HttpError, unprocessable } = require("./errors");

function detectImageType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length > 8 && png.every((b, i) => buf[i] === b)) return "image/png";
  return null;
}

/**
 * Remove metadados de um JPEG: APP1 (EXIF/XMP), APP13 (IPTC), APP2 "MPF"
 * (imagens secundárias) e qualquer dado após o fim da imagem (EOI), onde
 * alguns celulares anexam outra imagem ou vídeo com EXIF próprio.
 * Devolve `null` se a estrutura não puder ser lida com segurança — o envio é
 * recusado em vez de gravar o arquivo original (falha fechada).
 */
function stripJpegMetadata(buf) {
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) return null;
    // Bytes 0xFF de preenchimento antes de um marcador são permitidos pela norma.
    while (i + 1 < buf.length && buf[i + 1] === 0xff) i += 1;
    if (i + 1 >= buf.length) return null;
    const marker = buf[i + 1];
    if (marker === 0xd9) return Buffer.concat([...out, Buffer.from([0xff, 0xd9])]);
    if (marker === 0xda) {
      // Dados comprimidos: 0xFF só aparece como 0xFF00 (escape), RSTn ou um
      // novo marcador. Copia até o EOI e descarta qualquer coisa depois dele.
      let j = i + 2;
      while (j + 1 < buf.length && !(buf[j] === 0xff && buf[j + 1] === 0xd9)) j += 1;
      if (j + 1 >= buf.length) return null;
      out.push(buf.subarray(i, j + 2));
      return Buffer.concat(out);
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) return null;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    const isMpf = marker === 0xe2 && buf.toString("latin1", i + 4, i + 8) === "MPF\0";
    const isMetadata = marker === 0xe1 || marker === 0xed || isMpf;
    if (!isMetadata) out.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

/** Remove chunks de metadados (eXIf, tEXt, iTXt, zTXt) de um PNG; `null` se malformado. */
function stripPngMetadata(buf) {
  const out = [buf.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("latin1", i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) return null;
    if (!["eXIf", "tEXt", "iTXt", "zTXt"].includes(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === "IEND") return Buffer.concat(out);
  }
  return null;
}

function createFileService(config) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 20 },
  });

  /** Middleware multer que converte erros em mensagens amigáveis. */
  function single(field) {
    const mw = upload.single(field);
    return (req, res, next) =>
      mw(req, res, (err) => {
        if (!err) return next();
        if (err.code === "LIMIT_FILE_SIZE") {
          const mb = Math.round(config.maxUploadBytes / 1024 / 1024);
          return next(new HttpError(413, `A imagem deve ter no máximo ${mb} MB.`));
        }
        return next(unprocessable("Não foi possível processar o arquivo enviado."));
      });
  }

  async function store(file, { owner, condominium, kind, access, allowedUsers = [] }) {
    if (!file) return null;
    const mime = detectImageType(file.buffer);
    if (!mime) throw unprocessable("Envie uma imagem JPG ou PNG.");
    const clean = mime === "image/jpeg" ? stripJpegMetadata(file.buffer) : stripPngMetadata(file.buffer);
    if (!clean) throw unprocessable("Não foi possível processar esta imagem. Tente outra foto.");
    const storageName = `${crypto.randomBytes(16).toString("hex")}${mime === "image/png" ? ".png" : ".jpg"}`;
    await fs.mkdir(config.uploadDir, { recursive: true });
    await fs.writeFile(path.join(config.uploadDir, storageName), clean, { mode: 0o600 });
    return FileAsset.create({
      owner,
      condominium,
      kind,
      access,
      allowedUsers,
      storageName,
      mime,
      size: clean.length,
    });
  }

  async function remove(fileId) {
    if (!fileId) return;
    const asset = await FileAsset.findById(fileId);
    if (!asset) return;
    await fs.rm(path.join(config.uploadDir, asset.storageName), { force: true });
    await asset.deleteOne();
  }

  function absolutePath(asset) {
    // storageName é gerado pelo servidor; basename evita qualquer travessia de diretório.
    return path.join(config.uploadDir, path.basename(asset.storageName));
  }

  return { single, store, remove, absolutePath };
}

module.exports = { createFileService, detectImageType, stripJpegMetadata, stripPngMetadata };
