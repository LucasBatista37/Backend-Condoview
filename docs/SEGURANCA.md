# Auditoria de segurança da API — outubro de 2026

Revisão do código da branch `main` (commit `bacbe82`) seguindo o OWASP API
Security Top 10 (2023) como referência. Não se trata de certificação nem de
garantia de segurança absoluta. **Nenhum teste foi executado contra o servidor
de produção**: as evidências vêm da leitura do código e de testes automatizados
contra um MongoDB em memória.

Legenda de gravidade: **Crítica** (exposição/alteração de dados de terceiros sem
login), **Alta**, **Média**, **Baixa**.

## Achados e correções

| # | Gravidade | Achado (versão anterior) | Correção (v2) | Reteste automatizado |
|---|---|---|---|---|
| 1 | Crítica | Quase todas as rotas sem autenticação: `GET /api/users/admin/all` (todos os usuários com e-mail, telefone e token FCM), `GET /api/users/:id`, reservas, manutenções, ocorrências, encomendas, assembleias e condomínios podiam ser lidos, editados e apagados anonimamente (API1/API5 — BOLA/BFLA). | `requireAuth` em todas as rotas de dados; papel e condomínio lidos do banco. Rotas antigas removidas. | `account.test.js › rotas antigas sem autenticação não existem mais`; `isolation.test.js › Arquivos › não existe pasta pública` |
| 2 | Crítica | Escalonamento de privilégio no cadastro: `POST /register` aceitava `role` e `condominium` do corpo. | Cadastro sempre cria `morador` sem condomínio; vínculo só por gestor (`/api/residents/link`) ou script do operador. | `auth.test.js › ignora role e condomínio enviados pelo cliente` |
| 3 | Crítica | Ausência de isolamento entre condomínios (exceto avisos). | Todo documento tem `condominium`; todas as consultas filtram pelo condomínio do usuário autenticado; IDs de outro condomínio respondem 404. | `isolation.test.js` (avisos, reservas, manutenção, ocorrências, encomendas, chat, moradores, arquivos) |
| 4 | Crítica | `/admin/associate` aberto: qualquer pessoa movia qualquer conta para qualquer condomínio. `/save-fcm-token` aberto e com `upsert: true` (criava documentos). `/send-notification` aberto (push arbitrário). | Removidos. Vínculo só por gestor do próprio condomínio; token FCM salvo apenas para o próprio usuário autenticado; push somente por eventos internos. | `isolation.test.js › Moradores`; `account.test.js › rotas antigas…` |
| 5 | Crítica | QR Code de visitante gerado no app com JSON sem assinatura (`data`, `hora`, nome, unidade, endereço) e validado apenas no app do porteiro → convites forjáveis e com dados pessoais. | Convite criado no servidor; QR contém só `CV1.<id>.<HMAC>`; validade (início do dia → 24 h após o horário), uso único, revogação e registro de entrada atômico no servidor. | `rules.test.js › Visitantes` (adulteração, outro condomínio, uso único, expirado, revogado, data futura) |
| 6 | Alta | Votação inexistente no servidor (o app mostrava "Voto confirmado" sem registrar). | Modelo `Vote` com índice único (assembleia, pauta, eleitor); eleitor por unidade ou por usuário; votação aberta/encerrada pelo gestor; parciais só para gestor. | `rules.test.js › Assembleias` (inclui votos simultâneos da mesma unidade) |
| 7 | Alta | Chat: `GET /admin/chat` filtrava por campo inexistente e devolvia mensagens de todos os condomínios; qualquer usuário apagava qualquer mensagem; push com o texto da mensagem para todos os usuários da plataforma. | Chat por condomínio; apagar só autor ou gestor; push só para o condomínio e sem o conteúdo; denúncia e bloqueio. | `isolation.test.js › Chat` |
| 8 | Alta | `DELETE /api/users/admin/:id` permitia a qualquer usuário logado apagar qualquer conta. | Removido. Exclusão apenas da própria conta (com senha) e desvínculo de morador pelo gestor do mesmo condomínio. | `account.test.js › Exclusão de conta`; `isolation.test.js › desvínculo…` |
| 9 | Alta | Uploads servidos publicamente em `/uploads` (fotos de encomendas, ocorrências, chat, perfis), sem validação de tipo: era possível hospedar HTML/JS no domínio da API. Imagens com localização GPS (EXIF). | Somente JPEG/PNG verificados pela assinatura; EXIF/XMP removidos; nome aleatório fora de pasta pública; entrega por `/api/files/:id` com controle de acesso e `nosniff`; limite de 5 MB. | `isolation.test.js › Arquivos` |
| 10 | Alta | Sessões sem revogação: JWT de 7 dias continuava válido após bloqueio, exclusão ou troca de senha; `authGuard` não verificava `isBlocked` nem existência do usuário. | `tokenVersion` no usuário (logout, troca/redefinição de senha, desvínculo); bloqueio e usuário inexistente recusados; algoritmo fixo HS256; `JWT_SECRET` obrigatório (≥ 32 caracteres). | `auth.test.js › Sessão` |
| 11 | Alta | Recuperação de senha inexistente; link de verificação apontava para `http://localhost:5000` (cadastro não funcionava em produção). | Código de 6 dígitos (HMAC), 15 min, 5 tentativas, uso único; links usam `PUBLIC_BASE_URL`. | `auth.test.js › Recuperação de senha` |
| 12 | Média | Enumeração de contas: login respondia 404 "Usuário não encontrado" e cadastro "utilize outro e-mail". | Mensagens e status idênticos; comparação bcrypt com hash fictício para igualar tempo. | `auth.test.js › mensagem genérica…`, `e-mail já cadastrado…` |
| 13 | Média | Sem limite de tentativas (força bruta em login). | `express-rate-limit` em rotas de autenticação (20/15 min por IP) e geral. | `account.test.js › Limite de tentativas` |
| 14 | Média | Mass assignment / injeção NoSQL: campos do corpo passados diretamente ao Mongoose (`status`, `usuarioNome`, `nomeUsuario`, `imagePath`…); query string com objetos aninhados. | Validação explícita por rota (apenas campos declarados, tipos primitivos); query parser `simple`. | `auth.test.js › rejeita operadores NoSQL`; `isolation.test.js › filtro com operador…`; `PATCH /me não permite alterar papel…` |
| 15 | Média | Erros devolviam `error.message` interno; logs com corpo das requisições (dados pessoais) via `console.log`. | Tratador central com mensagens genéricas; logs só com método, rota, status e tempo. | `account.test.js › JSON malformado…` |
| 16 | Média | Segredos no histórico do Git: credenciais Gerencianet/Efí (sandbox) em `config/config.js` (commit `7c6bbc8`). Arquivos de usuários (fotos e PDF) versionados em `uploads/`. | Arquivos removidos do índice e `uploads/` no `.gitignore`. **O histórico público não foi reescrito** (sem force push). | **Ação do titular:** revogar/rotacionar as credenciais; avaliar a remoção dos arquivos do histórico (ex.: `git filter-repo`) com consciência do impacto. |
| 17 | Baixa | Sem cabeçalhos de segurança; `X-Powered-By` exposto; CORS com `credentials: true` e origem localhost. | `helmet`, `x-powered-by` desativado, CORS só para origens configuradas. | `account.test.js › cabeçalhos de segurança` |
| 18 | Baixa | Dependências com vulnerabilidades conhecidas (multer 1.x, nodemailer 6.x, gerencianet sem uso). | Atualizadas (multer 2, nodemailer 10, firebase-admin 14, express 4.22); `gerencianet` removido. `npm audit --omit=dev`: 0 vulnerabilidades em 15/10/2026. | `npm audit` |

## Pontos que dependem do titular / limitações conhecidas

- **Produção não foi alterada.** Até o deploy da v2, o servidor atual
  (`backend-condoview.onrender.com`) continua com os achados 1–16, se ainda
  estiver no ar. Recomenda-se suspendê-lo ou publicar a v2 com urgência.
- **Rotação de segredos**: `JWT_SECRET`, credenciais do MongoDB, senha do
  e-mail e credenciais Gerencianet/Efí.
- **Armazenamento de arquivos**: o disco do Render é efêmero; configure um
  disco persistente (`UPLOAD_DIR`) ou um bucket.
- **Papel de portaria**: não existe papel "porteiro"; a validação de QR Code é
  feita por síndico/administração. Criar um papel dedicado é uma evolução
  possível.
- **Unicidade de e-mail**: a v2 cria um índice único em `users.email`. Se a base
  atual tiver duplicados, o índice não será criado até a limpeza.
- **Verificação em produção**: repetir os testes de isolamento com contas de
  teste no ambiente publicado, após o deploy.
