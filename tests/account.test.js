"use strict";

const { setup, teardown, createCondo, createUser, futureDate, jpegWithExif, PASSWORD, models, request } = require("./helpers");

let app;
beforeAll(async () => ({ app } = await setup()));
afterAll(teardown);

describe("Exclusão de conta", () => {
  test("pelo app: exige senha e remove os dados do usuário", async () => {
    const condo = await createCondo();
    const sindico = await createUser(app, { condo, role: "sindico" });
    const u = await createUser(app, { condo, apartamento: "11" });
    await request(app).post("/api/reserves").set(u.auth).send({ area: "Churrasqueira", dia: futureDate(3), horarioInicio: "10:00", horarioFim: "12:00" });
    await request(app).post("/api/maintenance").set(u.auth).field("tipo", "Elétrica").field("descricao", "Tomada sem energia").field("dataDesejada", futureDate(2));
    await request(app).post("/api/visitors").set(u.auth).send({ visitorName: "Fulano Teste", dia: futureDate(1), horario: "10:00" });
    const msg = await request(app).post("/api/chat/messages").set(u.auth).send({ message: "Mensagem pessoal" });
    await request(app).post("/api/packages").set(sindico.auth).field("recipientId", String(u.user._id)).field("title", "Pacote");

    expect((await request(app).delete("/api/me").set(u.auth).send({ senha: "errada123" })).status).toBe(401);
    expect((await request(app).delete("/api/me").set(u.auth).send({ senha: PASSWORD })).status).toBe(200);

    expect(await models.User.exists({ _id: u.user._id })).toBeNull();
    expect(await models.Reserve.countDocuments({ user: u.user._id })).toBe(0);
    expect(await models.Maintenance.countDocuments({ user: u.user._id })).toBe(0);
    expect(await models.VisitorInvite.countDocuments({ host: u.user._id })).toBe(0);
    expect(await models.Package.countDocuments({ recipient: u.user._id })).toBe(0);
    const m = await models.ChatMessage.findById(msg.body.id);
    expect(m.message).toBe("");
    expect(m.userName).toBe("Conta excluída");
    expect(String(m.userId)).not.toBe(String(u.user._id));
    expect((await request(app).get("/api/me").set(u.auth)).status).toBe(401);
  });

  test("votos permanecem no resultado, sem identificar quem votou", async () => {
    const condo = await createCondo("Votos");
    const sindico = await createUser(app, { condo, role: "sindico" });
    const u = await createUser(app, { condo, apartamento: "7" });
    const created = await request(app).post("/api/assemblies").set(sindico.auth).send({
      title: "Assembleia",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      voterScope: "user",
      pautas: [{ tema: "Pauta única", descricao: "Teste" }],
    });
    const { id, pautas } = created.body;
    await request(app).post(`/api/assemblies/${id}/open`).set(sindico.auth);
    const v = await request(app).post(`/api/assemblies/${id}/votes`).set(u.auth).send({ pautaId: pautas[0].id, choice: "Sim" });
    expect(v.status).toBe(201);

    expect((await request(app).delete("/api/me").set(u.auth).send({ senha: PASSWORD })).status).toBe(200);

    const votes = await models.Vote.find({ assembly: id }).lean();
    expect(votes).toHaveLength(1);
    expect(votes[0].choice).toBe("Sim");
    expect(votes[0].user).toBeUndefined();
    expect(JSON.stringify(votes[0])).not.toContain(String(u.user._id));
  });

  test("gestor que exclui a conta não leva junto a foto da encomenda de outro morador", async () => {
    const condo = await createCondo("Gestor sai");
    const sindico = await createUser(app, { condo, role: "sindico" });
    const morador = await createUser(app, { condo, apartamento: "3" });
    const pkg = await request(app).post("/api/packages").set(sindico.auth)
      .field("recipientId", String(morador.user._id)).field("title", "Caixa")
      .attach("image", jpegWithExif(), { filename: "p.jpg", contentType: "image/jpeg" });
    expect(pkg.status).toBe(201);
    expect((await request(app).delete("/api/me").set(sindico.auth).send({ senha: PASSWORD })).status).toBe(200);

    const stored = await models.Package.findById(pkg.body.id).lean();
    expect(stored.receivedBy).toBeUndefined();
    const list = await request(app).get("/api/packages").set(morador.auth);
    const url = list.body.find((p) => p.id === pkg.body.id).imageUrl;
    expect(url).toBeTruthy();
    expect((await request(app).get(url).set(morador.auth)).status).toBe(200);
  });

  test("pela página web (exigência do Google Play)", async () => {
    const u = await createUser(app);
    const page = await request(app).get("/conta/excluir");
    expect(page.status).toBe(200);
    expect(page.text).toMatch(/Excluir conta/);
    const wrong = await request(app).post("/conta/excluir").type("form").send({ email: u.email, senha: "errada", confirm: "yes" });
    expect(wrong.status).toBe(401);
    const ok = await request(app).post("/conta/excluir").type("form").send({ email: u.email, senha: PASSWORD, confirm: "yes" });
    expect(ok.status).toBe(200);
    expect(await models.User.exists({ _id: u.user._id })).toBeNull();
  });
});

describe("Resumo da tela inicial", () => {
  test("traz somente dados do próprio usuário e pendências para gestor", async () => {
    const condo = await createCondo("Resumo");
    const sindico = await createUser(app, { condo, role: "administrador" });
    const a = await createUser(app, { condo, apartamento: "1" });
    const b = await createUser(app, { condo, apartamento: "2" });
    await request(app).post("/api/notices").set(sindico.auth).send({ title: "Aviso geral", message: "Conteúdo do aviso" });
    await request(app).post("/api/packages").set(sindico.auth).field("recipientId", String(a.user._id)).field("title", "Pacote A");
    await request(app).post("/api/reserves").set(b.auth).send({ area: "Churrasqueira", dia: futureDate(3), horarioInicio: "10:00", horarioFim: "12:00" });

    const sa = await request(app).get("/api/me/summary").set(a.auth);
    expect(sa.body.packagesAwaiting).toBe(1);
    expect(sa.body.upcomingReserves).toHaveLength(0);
    expect(sa.body.recentNotices[0].title).toBe("Aviso geral");
    expect(sa.body.management).toBeNull();

    const sb = await request(app).get("/api/me/summary").set(b.auth);
    expect(sb.body.packagesAwaiting).toBe(0);
    expect(sb.body.upcomingReserves).toHaveLength(1);

    const ss = await request(app).get("/api/me/summary").set(sindico.auth);
    expect(ss.body.management.pendingReserves).toBe(1);
    expect(ss.body.management.packagesAwaiting).toBe(1);
  });
});

describe("Limite de tentativas", () => {
  test("login é limitado por IP", async () => {
    const { setup: setup2 } = require("./helpers");
    // instância separada com limite baixo, compartilhando o mesmo banco
    const { load } = require("../src/config/env");
    const { createApp } = require("../src/app");
    const limited = createApp({ ...load(), rateLimit: { authWindowMs: 60000, authMax: 3, apiWindowMs: 60000, apiMax: 1000 } });
    void setup2;
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await request(limited).post("/api/auth/login").send({ email: "x@teste.dev", senha: "Errada123" });
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
  });
});

describe("Cabeçalhos e erros", () => {
  test("cabeçalhos de segurança e sem X-Powered-By", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  test("rotas antigas sem autenticação não existem mais", async () => {
    for (const [m, p] of [
      ["get", "/api/users/admin/all"],
      ["post", "/api/users/admin/associate"],
      ["post", "/api/users/save-fcm-token"],
      ["post", "/api/users/send-notification"],
      ["post", "/api/users/admin/create-condominium"],
      ["get", "/api/users/admin/reserve"],
    ]) {
      const res = await request(app)[m](p).send({});
      expect([401, 404]).toContain(res.status);
    }
  });

  test("JSON malformado devolve 400 sem stack trace", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{ruim");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });
});
