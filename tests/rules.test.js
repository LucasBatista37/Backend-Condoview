"use strict";

const { setup, teardown, createCondo, createUser, futureDate, models, request } = require("./helpers");

let app, A, B;
beforeAll(async () => {
  ({ app } = await setup());
  const condoA = await createCondo("A");
  const condoB = await createCondo("B");
  A = {
    condo: condoA,
    sindico: await createUser(app, { condo: condoA, role: "sindico" }),
    m101a: await createUser(app, { condo: condoA, apartamento: "101", nome: "Ana" }),
    m101b: await createUser(app, { condo: condoA, apartamento: "101", nome: "Bruno" }),
    m102: await createUser(app, { condo: condoA, apartamento: "102" }),
    semUnidade: await createUser(app, { condo: condoA }),
  };
  B = { condo: condoB, sindico: await createUser(app, { condo: condoB, role: "sindico" }) };
});
afterAll(teardown);

describe("Reservas — regras de horário e concorrência", () => {
  test("recusa data no passado, término antes do início e área inexistente", async () => {
    const base = { area: "Churrasqueira", horarioInicio: "10:00", horarioFim: "12:00" };
    expect((await request(app).post("/api/reserves").set(A.m102.auth).send({ ...base, dia: "2020-01-01" })).status).toBe(422);
    expect((await request(app).post("/api/reserves").set(A.m102.auth).send({ ...base, dia: futureDate(4), horarioFim: "09:00" })).status).toBe(422);
    expect((await request(app).post("/api/reserves").set(A.m102.auth).send({ ...base, dia: futureDate(4), area: "Heliponto" })).status).toBe(422);
    expect((await request(app).post("/api/reserves").set(A.m102.auth).send({ ...base, dia: "2026-02-30" })).status).toBe(422);
  });

  test("duas aprovações simultâneas de horários conflitantes: só uma vence", async () => {
    const dia = futureDate(10);
    const r1 = await request(app).post("/api/reserves").set(A.m101a.auth).send({ area: "Churrasqueira", dia, horarioInicio: "12:00", horarioFim: "16:00" });
    const r2 = await request(app).post("/api/reserves").set(A.m102.auth).send({ area: "Churrasqueira", dia, horarioInicio: "14:00", horarioFim: "18:00" });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const [a1, a2] = await Promise.all([
      request(app).post(`/api/reserves/${r1.body.id}/approve`).set(A.sindico.auth),
      request(app).post(`/api/reserves/${r2.body.id}/approve`).set(A.sindico.auth),
    ]);
    const statuses = [a1.status, a2.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(await models.Reserve.countDocuments({ dia, area: "Churrasqueira", status: "Aprovada" })).toBe(1);
  });

  test("não permite pedir horário que conflita com reserva aprovada", async () => {
    const dia = futureDate(11);
    const r = await request(app).post("/api/reserves").set(A.m101a.auth).send({ area: "Salão de festas", dia, horarioInicio: "18:00", horarioFim: "23:00" });
    await request(app).post(`/api/reserves/${r.body.id}/approve`).set(A.sindico.auth);
    const res = await request(app).post("/api/reserves").set(A.m102.auth).send({ area: "Salão de festas", dia, horarioInicio: "22:00", horarioFim: "23:30" });
    expect(res.status).toBe(409);
    // horário adjacente é permitido
    const adj = await request(app).post("/api/reserves").set(A.m102.auth).send({ area: "Salão de festas", dia, horarioInicio: "15:00", horarioFim: "18:00" });
    expect(adj.status).toBe(201);
  });

  test("cancelamento libera e não pode ser repetido", async () => {
    const r = await request(app).post("/api/reserves").set(A.m102.auth).send({ area: "Churrasqueira", dia: futureDate(12), horarioInicio: "08:00", horarioFim: "09:00" });
    expect((await request(app).post(`/api/reserves/${r.body.id}/cancel`).set(A.m102.auth)).status).toBe(200);
    expect((await request(app).post(`/api/reserves/${r.body.id}/cancel`).set(A.m102.auth)).status).toBe(409);
    expect((await request(app).post(`/api/reserves/${r.body.id}/approve`).set(A.sindico.auth)).status).toBe(409);
  });
});

describe("Assembleias — elegibilidade e voto único", () => {
  let assembly;
  test("somente gestor cria e abre a votação", async () => {
    const payload = {
      title: "Assembleia ordinária",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      voterScope: "unit",
      pautas: [{ tema: "Pintura da fachada", descricao: "Aprovar orçamento" }],
    };
    expect((await request(app).post("/api/assemblies").set(A.m101a.auth).send(payload)).status).toBe(403);
    const res = await request(app).post("/api/assemblies").set(A.sindico.auth).send(payload);
    expect(res.status).toBe(201);
    assembly = res.body;
    const pautaId = assembly.pautas[0].id;
    // ainda agendada: não vota
    expect((await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(A.m101a.auth).send({ pautaId, choice: "Sim" })).status).toBe(409);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/open`).set(A.m101a.auth)).status).toBe(403);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/open`).set(B.sindico.auth)).status).toBe(409);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/open`).set(A.sindico.auth)).status).toBe(200);
  });

  test("um voto por unidade: o segundo morador da mesma unidade é recusado", async () => {
    const pautaId = assembly.pautas[0].id;
    expect((await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(A.m101a.auth).send({ pautaId, choice: "Sim" })).status).toBe(201);
    const dup = await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(A.m101b.auth).send({ pautaId, choice: "Não" });
    expect(dup.status).toBe(409);
    expect(dup.body.errors[0]).toMatch(/unidade já votou/);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(A.m101a.auth).send({ pautaId, choice: "Não" })).status).toBe(409);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(A.semUnidade.auth).send({ pautaId, choice: "Sim" })).status).toBe(422);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(B.sindico.auth).send({ pautaId, choice: "Sim" })).status).toBe(404);
  });

  test("votos simultâneos da mesma unidade contam uma vez", async () => {
    const pautaId = assembly.pautas[0].id;
    const extra1 = await createUser(app, { condo: A.condo, apartamento: "303" });
    const extra2 = await createUser(app, { condo: A.condo, apartamento: "303" });
    const results = await Promise.all([
      request(app).post(`/api/assemblies/${assembly.id}/votes`).set(extra1.auth).send({ pautaId, choice: "Sim" }),
      request(app).post(`/api/assemblies/${assembly.id}/votes`).set(extra2.auth).send({ pautaId, choice: "Sim" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  test("parciais só para gestor; resultado para todos após encerrar", async () => {
    const asMorador = await request(app).get(`/api/assemblies/${assembly.id}`).set(A.m102.auth);
    expect(asMorador.body.pautas[0].resultado).toBeUndefined();
    const asSindico = await request(app).get(`/api/assemblies/${assembly.id}`).set(A.sindico.auth);
    expect(asSindico.body.pautas[0].resultado.Sim).toBe(2);
    expect((await request(app).post(`/api/assemblies/${assembly.id}/close`).set(A.sindico.auth)).status).toBe(200);
    const after = await request(app).get(`/api/assemblies/${assembly.id}`).set(A.m102.auth);
    expect(after.body.pautas[0].resultado).toEqual({ Sim: 2, Não: 0, Abstenção: 0 });
    expect(JSON.stringify(after.body)).not.toMatch(/voterKey|"user"/);
    const pautaId = assembly.pautas[0].id;
    expect((await request(app).post(`/api/assemblies/${assembly.id}/votes`).set(A.m102.auth).send({ pautaId, choice: "Sim" })).status).toBe(409);
  });
});

describe("Visitantes — QR validado no servidor", () => {
  let invite;
  test("QR não contém dados pessoais", async () => {
    const res = await request(app).post("/api/visitors").set(A.m102.auth).send({ visitorName: "Carlos Visitante", dia: futureDate(0), horario: "23:59" });
    expect(res.status).toBe(201);
    invite = res.body;
    expect(invite.qrPayload).toMatch(/^CV1\.[a-f0-9]{24}\.[A-Za-z0-9_-]{32}$/);
    expect(invite.qrPayload).not.toMatch(/Carlos|102/);
  });

  test("morador não valida convites (somente portaria/gestão)", async () => {
    expect((await request(app).post("/api/visitors/validate").set(A.m101a.auth).send({ payload: invite.qrPayload })).status).toBe(403);
  });

  test("QR adulterado é recusado", async () => {
    const tampered = invite.qrPayload.slice(0, -2) + (invite.qrPayload.endsWith("AA") ? "BB" : "AA");
    const res = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: tampered });
    expect(res.body.valid).toBe(false);
    const forged = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: JSON.stringify({ data: "01/01/2030", hora: "10:00" }) });
    expect(forged.body.valid).toBe(false);
  });

  test("convite de A não é aceito na portaria de B", async () => {
    const res = await request(app).post("/api/visitors/validate").set(B.sindico.auth).send({ payload: invite.qrPayload });
    expect(res.body.valid).toBe(false);
    expect(res.body.invite).toBeNull();
  });

  test("uso único: entra uma vez; segunda leitura é recusada", async () => {
    const ok = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: invite.qrPayload });
    expect(ok.body.valid).toBe(true);
    const again = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: invite.qrPayload });
    expect(again.body.valid).toBe(false);
    expect(again.body.reason).toMatch(/utilizado/);
  });

  test("convite expirado e convite revogado são recusados", async () => {
    const res = await request(app).post("/api/visitors").set(A.m102.auth).send({ visitorName: "Expirado da Silva", dia: futureDate(0), horario: "23:59" });
    await models.VisitorInvite.updateOne({ _id: res.body.id }, { validFrom: new Date(Date.now() - 3 * 86400000), validUntil: new Date(Date.now() - 1000) });
    const exp = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: res.body.qrPayload });
    expect(exp.body.valid).toBe(false);
    expect(exp.body.reason).toMatch(/expirado/i);

    const r2 = await request(app).post("/api/visitors").set(A.m102.auth).send({ visitorName: "Revogado Souza", dia: futureDate(0), horario: "23:59" });
    expect((await request(app).post(`/api/visitors/${r2.body.id}/revoke`).set(A.m101a.auth)).status).toBe(404);
    expect((await request(app).post(`/api/visitors/${r2.body.id}/revoke`).set(A.m102.auth)).status).toBe(200);
    const rev = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: r2.body.qrPayload });
    expect(rev.body.valid).toBe(false);
  });

  test("convite para data futura ainda não vale hoje", async () => {
    const res = await request(app).post("/api/visitors").set(A.m102.auth).send({ visitorName: "Futuro Lima", dia: futureDate(5), horario: "10:00" });
    const v = await request(app).post("/api/visitors/validate").set(A.sindico.auth).send({ payload: res.body.qrPayload });
    expect(v.body.valid).toBe(false);
  });

  test("outro morador não recupera o QR do convite", async () => {
    expect((await request(app).get(`/api/visitors/${invite.id}/qr`).set(A.m101a.auth)).status).toBe(404);
    expect((await request(app).get(`/api/visitors/${invite.id}/qr`).set(A.m102.auth)).status).toBe(200);
  });
});
