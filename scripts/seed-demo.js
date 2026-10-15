"use strict";

/**
 * Popula um banco LOCAL com dados de demonstração claramente fictícios,
 * para desenvolvimento, testes manuais e capturas de tela.
 * Recusa-se a rodar em produção ou contra bancos remotos.
 */

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const m = require("../src/models");
const { nowInZone, zonedToUtc } = require("../src/lib/time");

const DEMO_PASSWORD = "Demo12345";

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function seedDemo({ timeZone = "America/Sao_Paulo" } = {}) {
  const today = nowInZone(timeZone).date;
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const condo = await m.Condominium.create({
    name: "Residencial Jardim das Flores",
    address: "Rua das Acácias, 250 — Centro",
    phone: "1130000000",
    email: "contato@exemplo.com",
    description: "Condomínio de demonstração (dados fictícios).",
    areas: ["Salão de festas", "Churrasqueira", "Quadra", "Piscina"],
  });
  const mk = (nome, email, role, apartamento) =>
    m.User.create({ nome, email, senha: hash, role, apartamento, condominium: condo._id, isVerified: true });

  const sindico = await mk("Helena Duarte", "sindica@demo.condoview", "sindico", "ADM");
  const morador = await mk("Rafael Costa", "morador@demo.condoview", "morador", "Bloco A · 101");
  const vizinha = await mk("Camila Nunes", "camila@demo.condoview", "morador", "Bloco A · 204");
  const vizinho = await mk("Diego Martins", "diego@demo.condoview", "morador", "Bloco B · 302");

  const ago = (h) => new Date(Date.now() - h * 3600 * 1000);
  await m.Notice.create([
    { condominium: condo._id, author: sindico._id, title: "Manutenção da caixa d'água", message: "Na quinta-feira, das 8h às 12h, o abastecimento será interrompido para limpeza da caixa d'água. Reserve água com antecedência.", createdAt: ago(3) },
    { condominium: condo._id, author: sindico._id, title: "Nova regra para a churrasqueira", message: "A partir deste mês, as reservas da churrasqueira devem terminar até as 22h.", createdAt: ago(30) },
    { condominium: condo._id, author: sindico._id, title: "Coleta seletiva", message: "Os contêineres de recicláveis agora ficam ao lado da garagem do Bloco B.", createdAt: ago(80) },
  ]);

  await m.Reserve.create([
    { condominium: condo._id, user: morador._id, nomeUsuario: morador.nome, apartamento: morador.apartamento, area: "Salão de festas", descricao: "Aniversário da família", dia: addDays(today, 6), horarioInicio: "18:00", horarioFim: "23:00", status: "Aprovada", decidedBy: sindico._id, decidedAt: ago(5) },
    { condominium: condo._id, user: morador._id, nomeUsuario: morador.nome, apartamento: morador.apartamento, area: "Churrasqueira", descricao: "Almoço com amigos", dia: addDays(today, 12), horarioInicio: "12:00", horarioFim: "16:00", status: "Pendente" },
    { condominium: condo._id, user: vizinha._id, nomeUsuario: vizinha.nome, apartamento: vizinha.apartamento, area: "Quadra", descricao: "Futebol", dia: addDays(today, 2), horarioInicio: "19:00", horarioFim: "20:30", status: "Pendente" },
  ]);

  await m.Maintenance.create([
    { condominium: condo._id, user: morador._id, usuarioNome: morador.nome, apartamento: morador.apartamento, type: "Hidráulica", descriptionMaintenance: "Vazamento no registro do corredor do 1º andar.", dataMaintenance: addDays(today, 3), status: "Pendente", createdAt: ago(20), history: [{ status: "Pendente", by: morador._id, note: "Solicitação aberta", at: ago(20) }] },
    { condominium: condo._id, user: vizinho._id, usuarioNome: vizinho.nome, apartamento: vizinho.apartamento, type: "Iluminação", descriptionMaintenance: "Lâmpada queimada na escada do Bloco B.", dataMaintenance: addDays(today, 1), status: "Aprovada", createdAt: ago(50), history: [{ status: "Pendente", by: vizinho._id, at: ago(50) }, { status: "Aprovada", by: sindico._id, note: "Eletricista agendado", at: ago(26) }] },
  ]);

  await m.Occurrence.create([
    { condominium: condo._id, userId: morador._id, usuarioNome: morador.nome, apartamento: morador.apartamento, motivo: "Barulho após as 22h", descricao: "Som alto vindo do andar de cima no sábado.", data: addDays(today, -2), status: "Em análise", resposta: "Vamos conversar com a unidade.", createdAt: ago(40), history: [{ status: "Aberta", by: morador._id, at: ago(40) }, { status: "Em análise", by: sindico._id, note: "Vamos conversar com a unidade.", at: ago(10) }] },
    { condominium: condo._id, userId: vizinha._id, usuarioNome: vizinha.nome, apartamento: vizinha.apartamento, motivo: "Vaga ocupada", descricao: "Carro desconhecido na vaga 204.", data: addDays(today, -1), status: "Aberta", createdAt: ago(6), history: [{ status: "Aberta", by: vizinha._id, at: ago(6) }] },
  ]);

  await m.Package.create([
    { condominium: condo._id, recipient: morador._id, usuarioNome: morador.nome, apartment: morador.apartamento, title: "Caixa média — Correios", description: "Deixada na portaria", receivedBy: sindico._id, receivedAt: ago(2) },
    { condominium: condo._id, recipient: morador._id, usuarioNome: morador.nome, apartment: morador.apartamento, title: "Envelope", status: "Retirada", receivedBy: sindico._id, receivedAt: ago(72), pickedUpAt: ago(60), pickedUpConfirmedBy: sindico._id, pickedUpNote: "Retirado pelo morador" },
    { condominium: condo._id, recipient: vizinha._id, usuarioNome: vizinha.nome, apartment: vizinha.apartamento, title: "Pacote de mercado", receivedBy: sindico._id, receivedAt: ago(1) },
  ]);

  const assembly = await m.Assembly.create({
    condominium: condo._id,
    createdBy: sindico._id,
    title: "Assembleia geral ordinária",
    description: "Prestação de contas e obras do segundo semestre.",
    scheduledAt: zonedToUtc(addDays(today, 0), "19:30", timeZone),
    location: "Salão de festas",
    voterScope: "unit",
    status: "Em votação",
    openedAt: ago(1),
    pautas: [
      { tema: "Pintura da fachada", descricao: "Aprovar o orçamento de R$ 48.000 em 6 parcelas." },
      { tema: "Instalação de bicicletário", descricao: "Uso de 4 vagas de visitantes no subsolo." },
    ],
  });
  await m.Vote.create([
    { condominium: condo._id, assembly: assembly._id, pauta: assembly.pautas[0]._id, voterKey: `unit:${vizinha.apartamento.toUpperCase()}`, user: vizinha._id, choice: "Sim" },
    { condominium: condo._id, assembly: assembly._id, pauta: assembly.pautas[0]._id, voterKey: `unit:${vizinho.apartamento.toUpperCase()}`, user: vizinho._id, choice: "Não" },
  ]);
  await m.Assembly.create({
    condominium: condo._id, createdBy: sindico._id, title: "Assembleia extraordinária — segurança",
    description: "Câmeras na garagem.", scheduledAt: zonedToUtc(addDays(today, 15), "20:00", timeZone),
    location: "Salão de festas", voterScope: "unit", status: "Agendada",
    pautas: [{ tema: "Instalação de câmeras", descricao: "Três orçamentos recebidos." }],
  });

  const visit = zonedToUtc(addDays(today, 1), "15:00", timeZone);
  await m.VisitorInvite.create({
    condominium: condo._id, host: morador._id, hostName: morador.nome, apartamento: morador.apartamento,
    visitorName: "Marina Alves", scheduledFor: visit, validFrom: zonedToUtc(addDays(today, 1), "00:00", timeZone),
    validUntil: new Date(visit.getTime() + 86400000), nonce: crypto.randomBytes(16).toString("hex"),
  });

  await m.ChatMessage.create([
    { condominium: condo._id, userId: sindico._id, userName: sindico.nome, message: "Bom dia! Lembrando da assembleia hoje às 19h30 no salão.", createdAt: ago(4) },
    { condominium: condo._id, userId: vizinha._id, userName: vizinha.nome, message: "Alguém encontrou uma chave com chaveiro azul perto da piscina?", createdAt: ago(3) },
    { condominium: condo._id, userId: vizinho._id, userName: vizinho.nome, message: "Vi uma na portaria agora há pouco.", createdAt: ago(2.5) },
    { condominium: condo._id, userId: morador._id, userName: morador.nome, message: "Obrigado pelo aviso da caixa d'água!", createdAt: ago(1) },
  ]);

  // Conta recém-criada, ainda sem condomínio (para demonstrar o estado de espera).
  await m.User.create({ nome: "Paula Nova", email: "nova@demo.condoview", senha: hash, isVerified: true });

  return { condo, users: { sindico, morador, vizinha, vizinho }, password: DEMO_PASSWORD };
}

module.exports = { seedDemo, DEMO_PASSWORD };

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const { load } = require("../src/config/env");
  (async () => {
    const config = load();
    if (config.isProd) throw new Error("seed-demo não roda em produção.");
    if (!/^mongodb:\/\/(localhost|127\.0\.0\.1)/.test(config.mongoUri || ""))
      throw new Error("seed-demo só roda contra um MongoDB local (mongodb://localhost...).");
    await mongoose.connect(config.mongoUri);
    const out = await seedDemo({ timeZone: config.condoTimeZone });
    console.log(`Dados de demonstração criados em "${out.condo.name}". Senha das contas demo: ${out.password}`);
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
