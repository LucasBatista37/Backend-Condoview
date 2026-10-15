"use strict";

const crypto = require("crypto");
const models = require("../models");

/**
 * Exclusão de conta: remove o usuário e os dados pessoais associados.
 *
 * - Excluídos: reservas, solicitações de manutenção, ocorrências, convites de
 *   visitantes, encomendas destinadas ao usuário, denúncias feitas por ele,
 *   imagens enviadas e foto de perfil.
 * - Mensagens do chat: o conteúdo é apagado e o autor passa a "Conta excluída".
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
  await models.ChatMessage.updateMany(
    { userId: uid },
    { $set: { message: "", image: null, userName: "Conta excluída", deletedAt: new Date() } }
  );
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
  await models.User.updateMany({ blockedUsers: uid }, { $pull: { blockedUsers: uid } });

  if (user.profileImage) fileIds.push(user.profileImage);
  const ownedFiles = await models.FileAsset.find({ owner: uid }).select("_id");
  ownedFiles.forEach((f) => fileIds.push(f._id));

  const unique = [...new Set(fileIds.filter(Boolean).map(String))];
  for (const fid of unique) await files.remove(fid);

  await models.User.deleteOne({ _id: uid });
}

module.exports = { deleteAccount };
