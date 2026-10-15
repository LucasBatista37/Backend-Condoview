"use strict";

const { setup, teardown, createCondo, createUser, futureDate, jpegWithExif, models, request } = require("./helpers");

/**
 * Isolamento entre condomínios e autorização por papel.
 * Cenário: condomínio A e B, cada um com síndico e morador.
 */

let app;
let A, B;
beforeAll(async () => {
  ({ app } = await setup());
  const condoA = await createCondo("Condomínio A");
  const condoB = await createCondo("Condomínio B");
  A = {
    condo: condoA,
    sindico: await createUser(app, { condo: condoA, role: "sindico", apartamento: "ADM" }),
    morador: await createUser(app, { condo: condoA, apartamento: "101" }),
    vizinho: await createUser(app, { condo: condoA, apartamento: "102" }),
  };
  B = {
    condo: condoB,
    sindico: await createUser(app, { condo: condoB, role: "administrador", apartamento: "ADM" }),
    morador: await createUser(app, { condo: condoB, apartamento: "201" }),
  };
});
afterAll(teardown);

describe("Usuário sem condomínio", () => {
  test("não acessa dados de nenhum condomínio", async () => {
    const solto = await createUser(app);
    for (const path of ["/api/notices", "/api/reserves", "/api/maintenance", "/api/chat/messages", "/api/condominium"]) {
      const res = await request(app).get(path).set(solto.auth);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("no_condominium");
    }
  });
});

describe("Avisos", () => {
  let noticeA;
  test("somente gestor publica", async () => {
    const denied = await request(app).post("/api/notices").set(A.morador.auth).send({ title: "Aviso falso", message: "Mensagem falsa" });
    expect(denied.status).toBe(403);
    const ok = await request(app).post("/api/notices").set(A.sindico.auth).send({ title: "Manutenção do elevador", message: "Na sexta pela manhã." });
    expect(ok.status).toBe(201);
    noticeA = ok.body;
  });

  test("condomínio B não vê, edita nem exclui aviso de A", async () => {
    const list = await request(app).get("/api/notices").set(B.morador.auth);
    expect(list.body.find((n) => n.id === noticeA.id)).toBeUndefined();
    expect((await request(app).get(`/api/notices/${noticeA.id}`).set(B.sindico.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/notices/${noticeA.id}`).set(B.sindico.auth).send({ title: "Invadido" })).status).toBe(404);
    expect((await request(app).delete(`/api/notices/${noticeA.id}`).set(B.sindico.auth)).status).toBe(404);
    const still = await models.Notice.findById(noticeA.id);
    expect(still.title).toBe("Manutenção do elevador");
  });

  test("morador de A lê o aviso", async () => {
    const list = await request(app).get("/api/notices").set(A.morador.auth);
    expect(list.body.map((n) => n.id)).toContain(noticeA.id);
  });
});

describe("Reservas", () => {
  let reserveA;
  test("morador cria; campos de status/usuário do payload são ignorados", async () => {
    const res = await request(app)
      .post("/api/reserves")
      .set(A.morador.auth)
      .send({ area: "Salão de festas", dia: futureDate(5), horarioInicio: "18:00", horarioFim: "22:00", status: "Aprovada", user: String(A.vizinho.user._id), condominium: String(B.condo._id) });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Pendente");
    expect(res.body.userId).toBe(String(A.morador.user._id));
    const doc = await models.Reserve.findById(res.body.id);
    expect(String(doc.condominium)).toBe(String(A.condo._id));
    reserveA = res.body;
  });

  test("morador não aprova a própria reserva", async () => {
    expect((await request(app).post(`/api/reserves/${reserveA.id}/approve`).set(A.morador.auth)).status).toBe(403);
  });

  test("síndico de B não aprova reserva de A", async () => {
    expect((await request(app).post(`/api/reserves/${reserveA.id}/approve`).set(B.sindico.auth)).status).toBe(404);
  });

  test("vizinho não vê nem cancela reserva de outro morador", async () => {
    const list = await request(app).get("/api/reserves").set(A.vizinho.auth);
    expect(list.body.find((r) => r.id === reserveA.id)).toBeUndefined();
    expect((await request(app).post(`/api/reserves/${reserveA.id}/cancel`).set(A.vizinho.auth)).status).toBe(404);
  });

  test("disponibilidade não expõe nomes", async () => {
    const res = await request(app).get(`/api/reserves/availability?area=${encodeURIComponent("Salão de festas")}&dia=${reserveA.dia}`).set(A.vizinho.auth);
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual({ horarioInicio: "18:00", horarioFim: "22:00", status: "Pendente" });
  });

  test("filtro com operador na query string não vaza registros", async () => {
    const res = await request(app).get("/api/reserves?status[$ne]=x").set(A.vizinho.auth);
    expect(res.status).toBe(200);
    expect(res.body.find((r) => r.id === reserveA.id)).toBeUndefined();
  });
});

describe("Manutenção, ocorrências e encomendas", () => {
  test("morador só vê as próprias solicitações; gestor vê todas do condomínio", async () => {
    const m = await request(app).post("/api/maintenance").set(A.morador.auth).field("tipo", "Hidráulica").field("descricao", "Vazamento na pia").field("dataDesejada", futureDate(2));
    expect(m.status).toBe(201);
    const vizinho = await request(app).get("/api/maintenance").set(A.vizinho.auth);
    expect(vizinho.body.find((x) => x.id === m.body.id)).toBeUndefined();
    const sindico = await request(app).get("/api/maintenance").set(A.sindico.auth);
    expect(sindico.body.find((x) => x.id === m.body.id)).toBeTruthy();
    const outro = await request(app).get("/api/maintenance").set(B.sindico.auth);
    expect(outro.body.find((x) => x.id === m.body.id)).toBeUndefined();
    expect((await request(app).post(`/api/maintenance/${m.body.id}/status`).set(A.morador.auth).send({ status: "Aprovada" })).status).toBe(403);
    expect((await request(app).post(`/api/maintenance/${m.body.id}/status`).set(B.sindico.auth).send({ status: "Aprovada" })).status).toBe(404);
  });

  test("transições inválidas de status são recusadas", async () => {
    const m = await request(app).post("/api/maintenance").set(A.morador.auth).field("tipo", "Elétrica").field("descricao", "Lâmpada queimada").field("dataDesejada", futureDate(2));
    expect((await request(app).post(`/api/maintenance/${m.body.id}/status`).set(A.sindico.auth).send({ status: "Concluída" })).status).toBe(409);
    expect((await request(app).post(`/api/maintenance/${m.body.id}/status`).set(A.sindico.auth).send({ status: "Aprovada" })).status).toBe(200);
    const done = await request(app).post(`/api/maintenance/${m.body.id}/status`).set(A.sindico.auth).send({ status: "Concluída", note: "Trocada" });
    expect(done.status).toBe(200);
    expect(done.body.history.map((h) => h.status)).toEqual(["Pendente", "Aprovada", "Concluída"]);
  });

  test("ocorrência de um morador é privada", async () => {
    const o = await request(app).post("/api/occurrences").set(A.morador.auth).field("motivo", "Barulho").field("descricao", "Som alto depois das 22h").field("data", futureDate(0));
    expect(o.status).toBe(201);
    const vizinho = await request(app).get("/api/occurrences").set(A.vizinho.auth);
    expect(vizinho.body.find((x) => x.id === o.body.id)).toBeUndefined();
  });

  test("encomenda: só gestor registra, destinatário precisa ser do mesmo condomínio", async () => {
    expect(
      (await request(app).post("/api/packages").set(A.morador.auth).field("recipientId", String(A.vizinho.user._id)).field("title", "Caixa")).status
    ).toBe(403);
    const cross = await request(app).post("/api/packages").set(A.sindico.auth).field("recipientId", String(B.morador.user._id)).field("title", "Caixa");
    expect(cross.status).toBe(422);
    const ok = await request(app)
      .post("/api/packages")
      .set(A.sindico.auth)
      .field("recipientId", String(A.morador.user._id))
      .field("title", "Caixa Correios")
      .attach("image", jpegWithExif(), { filename: "foto.jpg", contentType: "image/jpeg" });
    expect(ok.status).toBe(201);

    // destinatário vê e acessa a foto; vizinho não vê a encomenda nem a foto
    const mine = await request(app).get("/api/packages").set(A.morador.auth);
    expect(mine.body.map((p) => p.id)).toContain(ok.body.id);
    const theirs = await request(app).get("/api/packages").set(A.vizinho.auth);
    expect(theirs.body.map((p) => p.id)).not.toContain(ok.body.id);
    expect((await request(app).get(ok.body.imageUrl).set(A.morador.auth)).status).toBe(200);
    expect((await request(app).get(ok.body.imageUrl).set(A.vizinho.auth)).status).toBe(404);
    expect((await request(app).get(ok.body.imageUrl).set(B.sindico.auth)).status).toBe(404);
    expect((await request(app).get(ok.body.imageUrl)).status).toBe(401);

    // retirada confirmada só uma vez
    expect((await request(app).post(`/api/packages/${ok.body.id}/pickup`).set(A.sindico.auth).send({ note: "Retirado pelo morador" })).status).toBe(200);
    expect((await request(app).post(`/api/packages/${ok.body.id}/pickup`).set(A.sindico.auth)).status).toBe(409);
  });
});

describe("Moradores", () => {
  test("morador não lista nem vincula moradores", async () => {
    expect((await request(app).get("/api/residents").set(A.morador.auth)).status).toBe(403);
    expect((await request(app).post("/api/residents/link").set(A.morador.auth).send({ email: "x@teste.dev", apartamento: "1" })).status).toBe(403);
  });

  test("síndico não puxa morador de outro condomínio", async () => {
    const res = await request(app).post("/api/residents/link").set(A.sindico.auth).send({ email: B.morador.email, apartamento: "999" });
    expect(res.status).toBe(409);
  });

  test("lista do síndico contém apenas o próprio condomínio e não expõe dados sensíveis", async () => {
    const res = await request(app).get("/api/residents").set(A.sindico.auth);
    const ids = res.body.map((u) => u.id);
    expect(ids).toContain(String(A.morador.user._id));
    expect(ids).not.toContain(String(B.morador.user._id));
    expect(JSON.stringify(res.body)).not.toMatch(/senha|fcmToken|tokenVersion|passwordReset/);
  });

  test("desvínculo revoga o acesso na hora (token antigo deixa de valer)", async () => {
    const temp = await createUser(app, { condo: A.condo, apartamento: "303" });
    expect((await request(app).get("/api/notices").set(temp.auth)).status).toBe(200);
    expect((await request(app).delete(`/api/residents/${temp.user._id}`).set(A.sindico.auth)).status).toBe(200);
    expect((await request(app).get("/api/notices").set(temp.auth)).status).toBe(401);
  });

  test("síndico de B não desvincula morador de A", async () => {
    expect((await request(app).delete(`/api/residents/${A.vizinho.user._id}`).set(B.sindico.auth)).status).toBe(404);
  });
});

describe("Chat", () => {
  test("mensagens isoladas por condomínio e apagadas só por autor ou gestor", async () => {
    const msg = await request(app).post("/api/chat/messages").set(A.morador.auth).send({ message: "Olá vizinhos", clientId: "abc-1" });
    expect(msg.status).toBe(201);
    const b = await request(app).get("/api/chat/messages").set(B.morador.auth);
    expect(b.body.messages.find((m) => m.id === msg.body.id)).toBeUndefined();
    expect((await request(app).delete(`/api/chat/messages/${msg.body.id}`).set(A.vizinho.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/chat/messages/${msg.body.id}`).set(B.sindico.auth)).status).toBe(404);
    expect((await request(app).post(`/api/chat/messages/${msg.body.id}/report`).set(B.morador.auth).send({ reason: "spam" })).status).toBe(404);
    expect((await request(app).delete(`/api/chat/messages/${msg.body.id}`).set(A.sindico.auth)).status).toBe(200);
  });

  test("reenvio com o mesmo clientId não duplica", async () => {
    const one = await request(app).post("/api/chat/messages").set(A.vizinho.auth).send({ message: "Repetida?", clientId: "dup-1" });
    const two = await request(app).post("/api/chat/messages").set(A.vizinho.auth).send({ message: "Repetida?", clientId: "dup-1" });
    expect(one.status).toBe(201);
    expect(two.status).toBe(200);
    expect(two.body.id).toBe(one.body.id);
    expect(await models.ChatMessage.countDocuments({ clientId: "dup-1" })).toBe(1);
  });

  test("bloqueio oculta mensagens do usuário bloqueado; não bloqueia de outro condomínio", async () => {
    await request(app).post("/api/chat/messages").set(A.vizinho.auth).send({ message: "Mensagem do vizinho" });
    expect((await request(app).post(`/api/chat/blocks/${A.vizinho.user._id}`).set(A.morador.auth)).status).toBe(201);
    const list = await request(app).get("/api/chat/messages").set(A.morador.auth);
    expect(list.body.messages.some((m) => m.userId === String(A.vizinho.user._id))).toBe(false);
    expect((await request(app).post(`/api/chat/blocks/${B.morador.user._id}`).set(A.morador.auth)).status).toBe(404);
  });

  test("denúncia chega ao gestor do mesmo condomínio", async () => {
    const msg = await request(app).post("/api/chat/messages").set(A.vizinho.auth).send({ message: "Conteúdo ofensivo" });
    expect((await request(app).post(`/api/chat/messages/${msg.body.id}/report`).set(A.morador.auth).send({ reason: "Ofensivo" })).status).toBe(201);
    expect((await request(app).get("/api/chat/reports").set(A.morador.auth)).status).toBe(403);
    const reports = await request(app).get("/api/chat/reports").set(A.sindico.auth);
    expect(reports.body.some((r) => r.message?.id === msg.body.id)).toBe(true);
    const otherCondo = await request(app).get("/api/chat/reports").set(B.sindico.auth);
    expect(otherCondo.body.some((r) => r.message?.id === msg.body.id)).toBe(false);
  });
});

describe("Arquivos", () => {
  test("não existe pasta pública de uploads", async () => {
    expect((await request(app).get("/uploads/package/qualquer.jpg")).status).toBe(404);
  });

  test("rejeita arquivo que não é imagem, mesmo com extensão .jpg", async () => {
    const res = await request(app)
      .post("/api/chat/messages")
      .set(A.morador.auth)
      .field("message", "segue")
      .attach("image", Buffer.from("<html><script>alert(1)</script></html>"), { filename: "x.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(422);
  });

  test("remove EXIF (ex.: GPS) das fotos", async () => {
    const res = await request(app).put("/api/me/photo").set(A.morador.auth).attach("photo", jpegWithExif(), { filename: "eu.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    const file = await request(app).get(res.body.profileImageUrl).set(A.vizinho.auth).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/jpeg");
    expect(file.body.includes(Buffer.from("GPSLatitude"))).toBe(false);
    expect((await request(app).get(res.body.profileImageUrl).set(B.morador.auth)).status).toBe(404);
  });

  test("limite de tamanho", async () => {
    const big = Buffer.concat([jpegWithExif().subarray(0, 4), Buffer.alloc(6 * 1024 * 1024)]);
    const res = await request(app).put("/api/me/photo").set(A.morador.auth).attach("photo", big, { filename: "g.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(413);
  });
});
