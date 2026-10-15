# Condoview — API

API do Condoview (Node.js + Express + MongoDB), usada pelo aplicativo Android
[Condoview-App](https://github.com/LucasBatista37/Condoview-App).

> **Versão 2.0 — reescrita de segurança.** A versão anterior expunha dados de
> todos os condomínios sem autenticação. Veja [docs/SEGURANCA.md](docs/SEGURANCA.md)
> antes de publicar e siga o [plano de migração](#migração-da-versão-anterior).

## Requisitos

- Node.js **22 ou superior** (exigência do `firebase-admin` 14)
- MongoDB 6+ (Atlas ou local)
- SMTP para e-mails de confirmação e recuperação de senha (produção)
- Opcional: conta de serviço do Firebase para notificações push

## Executar localmente

```bash
npm install
cp .env.example .env      # preencha JWT_SECRET e MONGODB_URI
npm run server            # http://localhost:5000
```

Sem banco local? Suba uma API de desenvolvimento com MongoDB em memória e
dados fictícios de demonstração (nada é persistido):

```bash
node scripts/dev-memory-server.js
# contas demo (senha Demo12345): sindica@demo.condoview, morador@demo.condoview, nova@demo.condoview
```

## Testes

```bash
npm test
```

Os testes sobem um MongoDB em memória (`mongodb-memory-server`) e cobrem
autenticação, isolamento entre condomínios, papéis, reservas concorrentes,
voto único, QR Code de visitantes, uploads e exclusão de conta.

## Criar um condomínio

Não existe rota pública para criar condomínios. O operador da plataforma usa:

```bash
node scripts/create-condominium.js --nome "Residencial X" --endereco "Rua Y, 10" \
  --gestor sindico@email.com --papel sindico
```

O gestor precisa ter criado (e confirmado) a conta no app antes. Depois disso,
ele libera os moradores pelo app (Gestão → Moradores → Liberar acesso).

## Variáveis de ambiente

Veja `.env.example`. Obrigatórias em produção: `NODE_ENV=production`,
`JWT_SECRET` (≥ 32 caracteres aleatórios), `MONGODB_URI` (ou `DB_USER`/`DB_PASS`),
`PUBLIC_BASE_URL`, SMTP (`SMTP_*`/`MAIL_FROM`) e `UPLOAD_DIR` apontando para um
disco **persistente** (no Render, um *Persistent Disk*; o disco padrão é apagado
a cada deploy).

## Rotas principais

| Área | Rotas |
|---|---|
| Conta | `POST /api/auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/resend-verification`, `GET /api/auth/verify/:token` |
| Perfil | `GET/PATCH/DELETE /api/me`, `PUT /api/me/password`, `PUT /api/me/photo`, `PUT /api/me/fcm-token`, `GET /api/me/summary` |
| Condomínio | `GET/PATCH /api/condominium`, `GET /api/residents`, `POST /api/residents/link`, `PATCH/DELETE /api/residents/:id` |
| Avisos | `GET/POST /api/notices`, `GET/PATCH/DELETE /api/notices/:id` |
| Reservas | `GET/POST /api/reserves`, `GET /api/reserves/availability`, `POST /api/reserves/:id/{cancel,approve,reject}` |
| Manutenção | `GET/POST /api/maintenance`, `POST /api/maintenance/:id/status` |
| Ocorrências | `GET/POST /api/occurrences`, `POST /api/occurrences/:id/status` |
| Encomendas | `GET/POST /api/packages`, `POST /api/packages/:id/pickup`, `DELETE /api/packages/:id` |
| Assembleias | `GET/POST /api/assemblies`, `GET/PATCH/DELETE /api/assemblies/:id`, `POST /api/assemblies/:id/{open,close,votes}` |
| Visitantes | `GET/POST /api/visitors`, `GET /api/visitors/:id/qr`, `POST /api/visitors/:id/revoke`, `POST /api/visitors/validate` |
| Chat | `GET/POST /api/chat/messages`, `DELETE /api/chat/messages/:id`, `POST /api/chat/messages/:id/report`, `GET /api/chat/reports`, `POST /api/chat/reports/:id/resolve`, `GET/POST/DELETE /api/chat/blocks[/:userId]` |
| Arquivos | `GET /api/files/:id` (autenticado, com verificação de acesso) |
| Web | `GET/POST /conta/excluir` (exclusão de conta exigida pelo Google Play), `GET /health` |

Todas as rotas (exceto cadastro/login/recuperação, verificação de e-mail,
`/health` e a página de exclusão) exigem `Authorization: Bearer <token>`. O
condomínio e o papel do usuário são sempre lidos do banco — nunca do corpo da
requisição.

## Migração da versão anterior

A v2 muda o formato da API; o app antigo deixa de funcionar com ela e o app
novo não funciona com a API antiga. Publique os dois juntos.

1. **Rotacione os segredos**: `JWT_SECRET` (encerra todas as sessões antigas),
   senha do MongoDB, senha de app do e-mail e as credenciais Gerencianet/Efí que
   estiveram no histórico deste repositório.
2. Faça backup do banco.
3. Registros antigos de reservas, manutenções, ocorrências, encomendas,
   assembleias e chat não tinham vínculo com condomínio; a v2 não os exibe
   (decisão conservadora). Se forem necessários, associe-os manualmente a um
   condomínio no banco antes de liberar.
4. Contas criadas com `role` escolhido pelo próprio usuário devem ser revisadas:
   `db.users.find({ role: { $ne: "morador" } })`.
5. Configure `UPLOAD_DIR` em disco persistente; as imagens antigas em
   `uploads/` não são migradas.
