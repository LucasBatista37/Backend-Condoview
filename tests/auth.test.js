"use strict";

const { setup, teardown, createCondo, createUser, PASSWORD, models, request } = require("./helpers");

let app, ctx;
beforeAll(async () => ({ app, ctx } = await setup()));
afterAll(teardown);

describe("Cadastro", () => {
  test("ignora role e condomínio enviados pelo cliente (sem escalonamento de privilégio)", async () => {
    const condo = await createCondo();
    const res = await request(app).post("/api/auth/register").send({
      nome: "Invasor",
      email: "invasor@teste.dev",
      senha: "Senha1234",
      role: "administrador",
      condominium: String(condo._id),
      isVerified: true,
    });
    expect(res.status).toBe(201);
    const user = await models.User.findOne({ email: "invasor@teste.dev" });
    expect(user.role).toBe("morador");
    expect(user.condominium).toBeNull();
    expect(user.isVerified).toBe(false);
  });

  test("exige senha com pelo menos 8 caracteres, letras e números", async () => {
    const res = await request(app).post("/api/auth/register").send({ nome: "Fraca", email: "fraca@teste.dev", senha: "12345" });
    expect(res.status).toBe(422);
    expect(res.body.errors[0]).toMatch(/8 caracteres/);
  });

  test("e-mail já cadastrado recebe a mesma resposta (não revela contas)", async () => {
    await request(app).post("/api/auth/register").send({ nome: "Maria", email: "maria@teste.dev", senha: "Senha1234" });
    const res = await request(app).post("/api/auth/register").send({ nome: "Outra", email: "maria@teste.dev", senha: "Senha1234" });
    expect(res.status).toBe(201);
    expect(await models.User.countDocuments({ email: "maria@teste.dev" })).toBe(1);
  });

  test("conta não verificada não entra; link do e-mail verifica", async () => {
    await request(app).post("/api/auth/register").send({ nome: "Joana", email: "joana@teste.dev", senha: "Senha1234" });
    let res = await request(app).post("/api/auth/login").send({ email: "joana@teste.dev", senha: "Senha1234" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("email_not_verified");

    const mail = ctx.mailer.outbox.filter((m) => m.to === "joana@teste.dev").pop();
    const link = mail.text.match(/\/api\/auth\/verify\/\S+/)[0];
    res = await request(app).get(link);
    expect(res.status).toBe(200);

    res = await request(app).post("/api/auth/login").send({ email: "joana@teste.dev", senha: "Senha1234" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).not.toHaveProperty("senha");
  });
});

describe("Login", () => {
  test("mensagem genérica para senha errada e e-mail inexistente", async () => {
    const { email } = await createUser(app);
    const wrong = await request(app).post("/api/auth/login").send({ email, senha: "Errada123" });
    const none = await request(app).post("/api/auth/login").send({ email: "naoexiste@teste.dev", senha: "Errada123" });
    expect(wrong.status).toBe(401);
    expect(none.status).toBe(401);
    expect(wrong.body.errors).toEqual(none.body.errors);
  });

  test("rejeita operadores NoSQL no corpo", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { $ne: null }, senha: { $ne: null } });
    expect(res.status).toBe(422);
  });

  test("token adulterado ou de outro algoritmo é recusado", async () => {
    const { token } = await createUser(app);
    const [h, p] = token.split(".");
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${p}.`;
    expect((await request(app).get("/api/me").set("Authorization", `Bearer ${none}`)).status).toBe(401);
    expect((await request(app).get("/api/me").set("Authorization", `Bearer ${h}.${p}.assinatura`)).status).toBe(401);
  });
});

describe("Sessão", () => {
  test("logout invalida o token", async () => {
    const { auth } = await createUser(app);
    expect((await request(app).get("/api/me").set(auth)).status).toBe(200);
    expect((await request(app).post("/api/auth/logout").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/me").set(auth)).status).toBe(401);
  });

  test("usuário bloqueado perde acesso imediatamente", async () => {
    const { user, auth } = await createUser(app);
    await models.User.updateOne({ _id: user._id }, { isBlocked: true });
    expect((await request(app).get("/api/me").set(auth)).status).toBe(401);
  });

  test("troca de senha invalida tokens antigos e devolve um novo", async () => {
    const { auth } = await createUser(app);
    const res = await request(app).put("/api/me/password").set(auth).send({ senhaAtual: PASSWORD, novaSenha: "NovaSenha99" });
    expect(res.status).toBe(200);
    expect((await request(app).get("/api/me").set(auth)).status).toBe(401);
    expect((await request(app).get("/api/me").set("Authorization", `Bearer ${res.body.token}`)).status).toBe(200);
  });

  test("PATCH /me não permite alterar papel, condomínio ou verificação", async () => {
    const condo = await createCondo("Outro");
    const { user, auth } = await createUser(app);
    const res = await request(app)
      .patch("/api/me")
      .set(auth)
      .send({ nome: "Nome Novo", role: "administrador", condominium: String(condo._id), isBlocked: false, tokenVersion: 0 });
    expect(res.status).toBe(200);
    const fresh = await models.User.findById(user._id);
    expect(fresh.nome).toBe("Nome Novo");
    expect(fresh.role).toBe("morador");
    expect(fresh.condominium).toBeNull();
  });
});

describe("Recuperação de senha", () => {
  test("fluxo completo com código, limite de tentativas e revogação de sessões", async () => {
    const { email, auth } = await createUser(app);
    const res = await request(app).post("/api/auth/forgot-password").send({ email });
    expect(res.status).toBe(200);
    const code = ctx.mailer.outbox.filter((m) => m.to === email).pop().text.match(/\b(\d{6})\b/)[1];

    const bad = await request(app).post("/api/auth/reset-password").send({ email, code: code === "000000" ? "111111" : "000000", senha: "Outra1234" });
    expect(bad.status).toBe(400);

    const ok = await request(app).post("/api/auth/reset-password").send({ email, code, senha: "Outra1234" });
    expect(ok.status).toBe(200);
    expect((await request(app).get("/api/me").set(auth)).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email, senha: "Outra1234" })).status).toBe(200);

    // código não pode ser reutilizado
    const again = await request(app).post("/api/auth/reset-password").send({ email, code, senha: "Mais1234x" });
    expect(again.status).toBe(400);
  });

  test("bloqueia após 5 códigos errados", async () => {
    const { email } = await createUser(app);
    await request(app).post("/api/auth/forgot-password").send({ email });
    const code = ctx.mailer.outbox.filter((m) => m.to === email).pop().text.match(/\b(\d{6})\b/)[1];
    const wrong = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i += 1) await request(app).post("/api/auth/reset-password").send({ email, code: wrong, senha: "Outra1234" });
    const res = await request(app).post("/api/auth/reset-password").send({ email, code, senha: "Outra1234" });
    expect(res.status).toBe(400);
  });

  test("resposta igual para e-mail inexistente", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "ninguem@teste.dev" });
    expect(res.status).toBe(200);
  });
});
