"use strict";

/**
 * Serializadores: definem exatamente o que sai pela API.
 * Nunca devolvem hash de senha, token FCM, dados de recuperação ou nonce de convites.
 */

const id = (v) => (v ? String(v._id || v) : null);
const fileUrl = (fileId) => (fileId ? `/api/files/${id(fileId)}` : null);

function me(user) {
  return {
    id: id(user),
    nome: user.nome,
    email: user.email,
    telefone: user.telefone || "",
    apartamento: user.apartamento || "",
    role: user.role,
    condominium: id(user.condominium),
    profileImageUrl: fileUrl(user.profileImage),
    isVerified: Boolean(user.isVerified),
  };
}

function resident(user) {
  return {
    id: id(user),
    nome: user.nome,
    email: user.email,
    telefone: user.telefone || "",
    apartamento: user.apartamento || "",
    role: user.role,
    profileImageUrl: fileUrl(user.profileImage),
  };
}

function condominium(c) {
  return {
    id: id(c),
    name: c.name,
    address: c.address,
    email: c.email || "",
    phone: c.phone || "",
    description: c.description || "",
    areas: c.areas || [],
  };
}

function notice(n) {
  return {
    id: id(n),
    title: n.title,
    message: n.message,
    authorName: n.author?.nome || null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

function reserve(r, { includeOwner = true } = {}) {
  return {
    id: id(r),
    area: r.area,
    descricao: r.descricao || "",
    dia: r.dia,
    horarioInicio: r.horarioInicio,
    horarioFim: r.horarioFim,
    status: r.status,
    motivoRejeicao: r.motivoRejeicao || "",
    ...(includeOwner ? { userId: id(r.user), nomeUsuario: r.nomeUsuario, apartamento: r.apartamento || "" } : {}),
    createdAt: r.createdAt,
  };
}

function maintenance(m) {
  return {
    id: id(m),
    userId: id(m.user),
    usuarioNome: m.usuarioNome,
    apartamento: m.apartamento || "",
    tipo: m.type,
    descricao: m.descriptionMaintenance,
    dataDesejada: m.dataMaintenance,
    imageUrl: fileUrl(m.image),
    status: m.status,
    history: (m.history || []).map((h) => ({ status: h.status, note: h.note || "", at: h.at })),
    createdAt: m.createdAt,
  };
}

function occurrence(o) {
  return {
    id: id(o),
    userId: id(o.userId),
    usuarioNome: o.usuarioNome || "",
    apartamento: o.apartamento || "",
    motivo: o.motivo,
    descricao: o.descricao,
    data: o.data,
    imageUrl: fileUrl(o.image),
    status: o.status,
    resposta: o.resposta || "",
    history: (o.history || []).map((h) => ({ status: h.status, note: h.note || "", at: h.at })),
    createdAt: o.createdAt,
  };
}

function pkg(p) {
  return {
    id: id(p),
    recipientId: id(p.recipient),
    usuarioNome: p.usuarioNome,
    apartamento: p.apartment || "",
    title: p.title,
    description: p.description || "",
    receivedAt: p.receivedAt,
    imageUrl: fileUrl(p.image),
    status: p.status,
    pickedUpAt: p.pickedUpAt,
    pickedUpNote: p.pickedUpNote || "",
  };
}

function assembly(a, { results, myVotes } = {}) {
  return {
    id: id(a),
    title: a.title,
    description: a.description || "",
    scheduledAt: a.scheduledAt,
    location: a.location || "",
    voterScope: a.voterScope,
    status: a.status,
    pautas: (a.pautas || []).map((p) => ({
      id: id(p),
      tema: p.tema,
      descricao: p.descricao || "",
      ...(results ? { resultado: results[id(p)] || { Sim: 0, Não: 0, Abstenção: 0 } } : {}),
      ...(myVotes ? { meuVoto: myVotes[id(p)] || null } : {}),
    })),
    openedAt: a.openedAt || null,
    closedAt: a.closedAt || null,
  };
}

function invite(i) {
  const now = Date.now();
  let situacao = "Válido";
  if (i.revokedAt) situacao = "Revogado";
  else if (i.uses >= i.maxUses) situacao = "Utilizado";
  else if (now > i.validUntil.getTime()) situacao = "Expirado";
  else if (now < i.validFrom.getTime()) situacao = "Agendado";
  return {
    id: id(i),
    visitorName: i.visitorName,
    hostName: i.hostName,
    apartamento: i.apartamento || "",
    scheduledFor: i.scheduledFor,
    validFrom: i.validFrom,
    validUntil: i.validUntil,
    maxUses: i.maxUses,
    uses: i.uses,
    situacao,
    revokedAt: i.revokedAt,
  };
}

function chatMessage(m) {
  const deleted = Boolean(m.deletedAt);
  return {
    id: id(m),
    userId: id(m.userId),
    userName: m.userName,
    message: deleted ? "" : m.message,
    imageUrl: deleted ? null : fileUrl(m.image),
    deleted,
    clientId: m.clientId || null,
    createdAt: m.createdAt,
  };
}

module.exports = {
  id,
  fileUrl,
  me,
  resident,
  condominium,
  notice,
  reserve,
  maintenance,
  occurrence,
  pkg,
  assembly,
  invite,
  chatMessage,
};
