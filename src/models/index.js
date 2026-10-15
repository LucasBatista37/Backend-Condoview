"use strict";

/**
 * Modelos do Condoview.
 *
 * Regra geral: todo registro de negócio pertence a um condomínio (`condominium`)
 * e as consultas SEMPRE filtram por ele a partir do usuário autenticado — nunca
 * a partir de campos enviados pelo cliente.
 *
 * Os nomes dos modelos (e, portanto, das coleções) foram mantidos em relação à
 * versão anterior para não exigir renomeação de coleções em produção.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const ROLES = ["morador", "sindico", "administrador"];
const MANAGER_ROLES = ["sindico", "administrador"];

// ---------------------------------------------------------------- Condomínio
const CondominiumSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    cnpj: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 30 },
    description: { type: String, default: "", maxlength: 1000 },
    // Áreas comuns disponíveis para reserva.
    areas: { type: [String], default: ["Salão de festas", "Churrasqueira", "Quadra", "Piscina"] },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Usuário
const UserSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    senha: { type: String, required: true, select: false },
    telefone: { type: String, trim: true, maxlength: 20 },
    apartamento: { type: String, trim: true, maxlength: 20 },
    profileImage: { type: ObjectId, ref: "FileAsset", default: null },
    role: { type: String, enum: ROLES, default: "morador" },
    condominium: { type: ObjectId, ref: "Condominium", default: null, index: true },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    // Incrementado em logout, troca de senha, bloqueio e desvínculo: invalida tokens antigos.
    tokenVersion: { type: Number, default: 0 },
    fcmToken: { type: String, default: null, select: false },
    blockedUsers: { type: [{ type: ObjectId, ref: "User" }], default: [] },
    passwordReset: {
      type: new Schema(
        {
          codeHash: String,
          expiresAt: Date,
          // Tentativas erradas e códigos emitidos são contados por janela de 1 h,
          // e NÃO zeram quando um novo código é pedido.
          attempts: { type: Number, default: 0 },
          issued: { type: Number, default: 0 },
          windowStart: Date,
        },
        { _id: false }
      ),
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.virtual("isManager").get(function isManager() {
  return MANAGER_ROLES.includes(this.role);
});

// ---------------------------------------------------------------- Arquivos
const FileAssetSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", default: null, index: true },
    owner: { type: ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["profile", "chat", "maintenance", "occurrence", "package"], required: true },
    // condo: qualquer membro do condomínio; private: dono, gestores e allowedUsers.
    access: { type: String, enum: ["condo", "private"], required: true },
    allowedUsers: { type: [{ type: ObjectId, ref: "User" }], default: [] },
    storageName: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Avisos
const NoticeSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    author: { type: ObjectId, ref: "User" },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    // Mantido por compatibilidade com registros antigos.
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Reservas
const RESERVE_STATUS = ["Pendente", "Aprovada", "Rejeitada", "Cancelada"];
const ReserveSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    user: { type: ObjectId, ref: "User", required: true, index: true },
    nomeUsuario: { type: String, required: true },
    apartamento: { type: String, default: "" },
    area: { type: String, required: true, trim: true, maxlength: 60 },
    descricao: { type: String, default: "", trim: true, maxlength: 500 },
    // Data local do condomínio (YYYY-MM-DD) e horários HH:mm.
    dia: { type: String, required: true },
    horarioInicio: { type: String, required: true },
    horarioFim: { type: String, required: true },
    status: { type: String, enum: RESERVE_STATUS, default: "Pendente" },
    motivoRejeicao: { type: String, default: "", maxlength: 300 },
    decidedBy: { type: ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
ReserveSchema.index({ condominium: 1, area: 1, dia: 1, status: 1 });

// Trava curta por (condomínio, área, dia) para serializar aprovações concorrentes.
const ReserveLockSchema = new Schema({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 30 },
});

// ---------------------------------------------------------------- Histórico genérico
const HistorySchema = new Schema(
  {
    status: String,
    note: { type: String, default: "", maxlength: 500 },
    by: { type: ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ---------------------------------------------------------------- Manutenção
const MAINTENANCE_STATUS = ["Pendente", "Aprovada", "Rejeitada", "Concluída"];
const MaintenanceSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    user: { type: ObjectId, ref: "User", required: true, index: true },
    usuarioNome: { type: String, required: true },
    apartamento: { type: String, default: "" },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    descriptionMaintenance: { type: String, required: true, trim: true, maxlength: 2000 },
    dataMaintenance: { type: String, required: true }, // data desejada (YYYY-MM-DD)
    image: { type: ObjectId, ref: "FileAsset", default: null },
    status: { type: String, enum: MAINTENANCE_STATUS, default: "Pendente" },
    history: { type: [HistorySchema], default: [] },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Ocorrências
const OCCURRENCE_STATUS = ["Aberta", "Em análise", "Resolvida"];
const OccurrenceSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    userId: { type: ObjectId, ref: "User", required: true, index: true },
    usuarioNome: { type: String, default: "" },
    apartamento: { type: String, default: "" },
    motivo: { type: String, required: true, trim: true, maxlength: 120 },
    descricao: { type: String, required: true, trim: true, maxlength: 2000 },
    data: { type: String, required: true }, // data do fato (YYYY-MM-DD)
    image: { type: ObjectId, ref: "FileAsset", default: null },
    status: { type: String, enum: OCCURRENCE_STATUS, default: "Aberta" },
    resposta: { type: String, default: "", maxlength: 2000 },
    history: { type: [HistorySchema], default: [] },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Encomendas
const PACKAGE_STATUS = ["Aguardando retirada", "Retirada"];
const PackageSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    recipient: { type: ObjectId, ref: "User", required: true, index: true },
    usuarioNome: { type: String, required: true },
    apartment: { type: String, default: "" },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    receivedAt: { type: Date, default: Date.now },
    receivedBy: { type: ObjectId, ref: "User" },
    image: { type: ObjectId, ref: "FileAsset", default: null },
    status: { type: String, enum: PACKAGE_STATUS, default: "Aguardando retirada" },
    pickedUpAt: { type: Date, default: null },
    pickedUpConfirmedBy: { type: ObjectId, ref: "User", default: null },
    pickedUpNote: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Assembleias
const ASSEMBLY_STATUS = ["Agendada", "Em votação", "Encerrada"];
const PautaSchema = new Schema({
  tema: { type: String, required: true, trim: true, maxlength: 160 },
  descricao: { type: String, default: "", trim: true, maxlength: 2000 },
});
const AssemblySchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    createdBy: { type: ObjectId, ref: "User" },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 4000 },
    scheduledAt: { type: Date, required: true },
    location: { type: String, default: "", trim: true, maxlength: 160 },
    // Quem vota: um voto por usuário ou um voto por unidade (apartamento).
    voterScope: { type: String, enum: ["user", "unit"], default: "unit" },
    status: { type: String, enum: ASSEMBLY_STATUS, default: "Agendada" },
    pautas: { type: [PautaSchema], default: [] },
    openedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

const VOTE_CHOICES = ["Sim", "Não", "Abstenção"];
const VoteSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true },
    assembly: { type: ObjectId, ref: "Assembly", required: true },
    pauta: { type: ObjectId, required: true },
    voterKey: { type: String, required: true },
    // Removido (anonimizado) quando o eleitor exclui a conta.
    user: { type: ObjectId, ref: "User" },
    choice: { type: String, enum: VOTE_CHOICES, required: true },
  },
  { timestamps: true }
);
VoteSchema.index({ assembly: 1, pauta: 1, voterKey: 1 }, { unique: true });

// ---------------------------------------------------------------- Visitantes
const VisitorInviteSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    host: { type: ObjectId, ref: "User", required: true, index: true },
    hostName: { type: String, required: true },
    apartamento: { type: String, default: "" },
    visitorName: { type: String, required: true, trim: true, maxlength: 120 },
    scheduledFor: { type: Date, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    maxUses: { type: Number, default: 1, min: 1, max: 10 },
    uses: { type: Number, default: 0 },
    entries: {
      type: [new Schema({ at: Date, by: { type: ObjectId, ref: "User" } }, { _id: false })],
      default: [],
    },
    nonce: { type: String, required: true, select: false },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------- Chat
const ChatMessageSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    userId: { type: ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    message: { type: String, default: "", maxlength: 1000 },
    image: { type: ObjectId, ref: "FileAsset", default: null },
    // Identificador gerado no app para evitar mensagens duplicadas em reenvios.
    clientId: { type: String, maxlength: 64 },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);
ChatMessageSchema.index({ condominium: 1, createdAt: -1 });
ChatMessageSchema.index(
  { condominium: 1, userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: "string" } } }
);

const ChatReportSchema = new Schema(
  {
    condominium: { type: ObjectId, ref: "Condominium", required: true, index: true },
    message: { type: ObjectId, ref: "ChatMessage", required: true },
    reporter: { type: ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ["Aberta", "Resolvida"], default: "Aberta" },
  },
  { timestamps: true }
);
ChatReportSchema.index({ message: 1, reporter: 1 }, { unique: true });

module.exports = {
  ROLES,
  MANAGER_ROLES,
  RESERVE_STATUS,
  MAINTENANCE_STATUS,
  OCCURRENCE_STATUS,
  PACKAGE_STATUS,
  ASSEMBLY_STATUS,
  VOTE_CHOICES,
  Condominium: mongoose.model("Condominium", CondominiumSchema),
  User: mongoose.model("User", UserSchema),
  FileAsset: mongoose.model("FileAsset", FileAssetSchema),
  Notice: mongoose.model("Notice", NoticeSchema),
  Reserve: mongoose.model("Reserve", ReserveSchema),
  ReserveLock: mongoose.model("ReserveLock", ReserveLockSchema),
  Maintenance: mongoose.model("Maintenance", MaintenanceSchema),
  Occurrence: mongoose.model("Ocorrencia", OccurrenceSchema),
  Package: mongoose.model("Package", PackageSchema),
  Assembly: mongoose.model("Assembly", AssemblySchema),
  Vote: mongoose.model("Vote", VoteSchema),
  VisitorInvite: mongoose.model("VisitorInvite", VisitorInviteSchema),
  ChatMessage: mongoose.model("ChatMessage", ChatMessageSchema),
  ChatReport: mongoose.model("ChatReport", ChatReportSchema),
};
