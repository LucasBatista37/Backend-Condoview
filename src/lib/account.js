"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const models = require("../models");

/**
 * Exclusão de conta: remove o usuário e os dados pessoais associados.
 *
 * - Excluídos: reservas, solicitações de manutenção, ocorrências, convites de
 *   visitantes, encomendas destinadas ao usuário, denúncias feitas por ele,
 *   imagens enviadas e foto de perfil.
 * - Mensagens do chat: conteúdo e imagem apagados; autor "Conta excluída" com
 *   identificador aleatório por mensagem (não agrupáveis).
 * - Ações como gestor em registros de terceiros: mantidas sem o autor; fotos
 *   anexadas a encomendas de outros moradores continuam para o destinatário.
 * - Votos em assembleias: mantidos sem vínculo com a pessoa (o resultado da
 *   assembleia não pode mudar retroativamente); sem id do usuário nem na
 *   chave do eleitor.
 * - Avisos publicados como gestor: mantidos, sem o autor.
 */
async function deleteAccount(user, files) {
  const uid = user._id;
  const fileIds = [];

  const collect = async (Model, filter, field = "image") => {
    if (field) {
      const docs = await Model.find(filter).select(field);
      docs.forEach((d) => d[field] && fileIds.push(d[field]));
    }
    await Model.deleteMany(filter);
  };

  await collect(models.Reserve, { user: uid }, null);
  await collect(models.Maintenance, { user: uid });
  await collect(models.Occurrence, { userId: uid });
  await collect(models.Package, { recipient: uid });
  await models.VisitorInvite.deleteMany({ host: uid });
  await models.ChatReport.deleteMany({ reporter: uid });

  const msgs = await models.ChatMessage.find({ userId: uid }).select("image");
  msgs.forEach((m) => m.image && fileIds.push(m.image));
  // Cada mensagem recebe um autor aleatório: o texto some e as mensagens
  // deixam de poder ser agrupadas como sendo da mesma pessoa.
  for (const m of msgs) {
    await models.ChatMessage.updateOne(
      { _id: m._id },
      {
        $set: { userId: new mongoose.Types.ObjectId(), message: "", image: null, userName: "Conta excluída", deletedAt: new Date() },
        $unset: { clientId: 1 },
      }
    );
  }
  // Votos: o total apurado não muda, mas nada aponta mais para a pessoa.
  // No modo "um voto por morador" a chave do eleitor continha o id do usuário;
  // ela é trocada por um valor aleatório (mantém o índice único por pauta).
  const personalVotes = await models.Vote.find({
    $or: [{ user: uid }, { voterKey: `user:${uid}` }],
  }).select("voterKey");
  for (const v of personalVotes) {
    const update = { $unset: { user: 1 } };
    if (v.voterKey === `user:${uid}`) {
      update.$set = { voterKey: `removido:${crypto.randomBytes(12).toString("hex")}` };
    }
    await models.Vote.updateOne({ _id: v._id }, update);
  }
  await models.Notice.updateMany({ author: uid }, { $unset: { author: 1 } });

  // Ações feitas como gestor em registros de outras pessoas (aprovações,
  // históricos, recebimento de encomendas, entradas de visitantes): o registro
  // continua, sem apontar para a conta excluída.
  await models.Reserve.updateMany({ decidedBy: uid }, { $set: { decidedBy: null } });
  for (const Model of [models.Maintenance, models.Occurrence]) {
    await Model.updateMany({ "history.by": uid }, { $unset: { "history.$[h].by": 1 } }, { arrayFilters: [{ "h.by": uid }] });
  }
  await models.Package.updateMany({ receivedBy: uid }, { $unset: { receivedBy: 1 } });
  await models.Package.updateMany({ pickedUpConfirmedBy: uid }, { $set: { pickedUpConfirmedBy: null } });
  await models.Assembly.updateMany({ createdBy: uid }, { $unset: { createdBy: 1 } });
  await models.VisitorInvite.updateMany({ "entries.by": uid }, { $unset: { "entries.$[e].by": 1 } }, { arrayFilters: [{ "e.by": uid }] });
  await models.ChatMessage.updateMany({ deletedBy: uid }, { $set: { deletedBy: null } });
  await models.FileAsset.updateMany({ allowedUsers: uid }, { $pull: { allowedUsers: uid } });
  await models.User.updateMany({ blockedUsers: uid }, { $pull: { blockedUsers: uid } });

  if (user.profileImage) fileIds.push(user.profileImage);
  // Fotos que o gestor anexou a encomendas de outros moradores continuam
  // existindo para quem as recebeu; só deixam de ter a conta como dona.
  const keep = new Set(
    (await models.Package.find({ condominium: user.condominium, recipient: { $ne: uid }, image: { $ne: null } }).select("image")).map((p) => String(p.image))
  );
  const ownedFiles = await models.FileAsset.find({ owner: uid }).select("_id");
  for (const f of ownedFiles) {
    if (keep.has(String(f._id))) {
      await models.FileAsset.updateOne({ _id: f._id }, { $set: { owner: new mongoose.Types.ObjectId() } });
    } else {
      fileIds.push(f._id);
    }
  }

  const unique = [...new Set(fileIds.filter(Boolean).map(String))];
  for (const fid of unique) await files.remove(fid);

  await models.User.deleteOne({ _id: uid });
}

module.exports = { deleteAccount };
