# Nexus Genius — Genius Certify

Plataforma SaaS multi-tenant para emissão, gestão e validação de certificados digitais.

## Estrutura

```text
.
├── frontend/                     # React + Vite + TypeScript + Tailwind
├── backend/                      # FastAPI + SQLAlchemy + PostgreSQL
├── docker-compose.yml            # serviços (sem ports de API/MinIO no host)
├── docker-compose.override.yml   # ports de dev (auto-load no `docker compose up`)
├── docker-compose.prod.yml       # liga frontend/minio na rede `edge` (sem Caddy)
├── proxy/                        # Caddy compartilhado (80/443) na VPS
├── .env.example
├── .gitignore
└── .cursorrules
```

## Subir localmente (dev)

```bash
cp .env.example .env
docker compose up --build
```

`docker compose up` junta `docker-compose.yml` + `docker-compose.override.yml` e publica as portas de desenvolvimento.

| Serviço   | URL |
|-----------|-----|
| Frontend  | http://localhost:3000 |
| Vite (hot reload) | `cd frontend && npm run dev` (3000 ou 3001) |
| API/docs  | http://localhost:8000/api/docs |
| MinIO API | http://localhost:9000 |
| MinIO UI  | http://localhost:9001 |
| Postgres  | só rede interna (`db:5432`) |

Páginas públicas (sem login): `/validar`, `/eventos`.

## Deploy na VPS (produção)

1. Clone o repo, `cp .env.example .env` e **troque todos os segredos**.
2. Defina `ENVIRONMENT=production`, `DOMAIN` (ex.: `certify.nexusgenius.com.br`) e `ACME_EMAIL`.
3. Aponte o DNS A/AAAA de `DOMAIN` para o IP da VPS **antes** de subir (Let's Encrypt).
4. `S3_PUBLIC_ENDPOINT_URL=https://SEU_DOMINIO/files` (Caddy em `proxy/` faz `/files` → MinIO).
5. Crie a rede compartilhada **uma vez**: `docker network create edge`
6. Suba o app **sem** o override de portas locais e, em seguida, o proxy:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose --env-file .env -f proxy/docker-compose.yml up -d
```

Nesse modo a API (8000) e o MinIO (9000/9001) **não** ficam no host. Só 80/443 via Caddy em `proxy/`. Swagger fica desligado. Outro site na VPS entra na rede `edge` e ganha um bloco no `proxy/Caddyfile`.

Zerar dados: `docker compose down -v` (apaga volumes) e subir de novo → seed recria só o SuperAdmin.

## Frontend (dev sem Docker)

```bash
cd frontend
npm install
npm run dev
```

## Backend (dev sem Docker)

Com o Postgres do Compose no ar (`docker compose up -d db`):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Ajuste DATABASE_URL no .env da raiz para host localhost
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

No Docker, as migrações rodam automaticamente no start do serviço `backend`.
O SuperAdmin é criado no boot (seed idempotente) com as vars `SUPERADMIN_*` do `.env`.

### Auth (smoke test)

```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nexusgenius.com.br","password":"changeme_superadmin"}'

# use o access_token:
curl -s http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Instituições (smoke test)

```bash
TOKEN=<access_token>

curl -s -X POST http://localhost:8000/api/instituicoes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "nome": "Faculdade Exemplo",
    "codigo": "INST-2026-001",
    "cnpj": "12345678000199",
    "responsavel": "Maria Silva",
    "email": "contato@exemplo.edu.br",
    "admin_nome": "Admin Facul",
    "admin_email": "admin@exemplo.edu.br",
    "admin_password": "senha12345"
  }'

curl -s http://localhost:8000/api/instituicoes \
  -H "Authorization: Bearer $TOKEN"
```

### Upload logo / assinatura (MinIO)

```bash
# asset_type = logo | assinatura
curl -s -X POST "http://localhost:8000/api/instituicoes/<uuid>/assets/logo" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./logo.png"

curl -s -X POST "http://localhost:8000/api/instituicoes/<uuid>/assets/assinatura" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./assinatura.png"
```

O banco guarda só a URL. O PDF busca o arquivo no MinIO na hora da geração.

### Cursos (smoke test)

```bash
# SuperAdmin precisa informar instituicao_id
curl -s -X POST http://localhost:8000/api/cursos \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "titulo": "Python Avançado",
    "descricao": "Curso de certificação",
    "carga_horaria": 40,
    "instrutor": "Ana Costa",
    "status": "upcoming",
    "instituicao_id": "<uuid-da-instituicao>"
  }'

curl -s "http://localhost:8000/api/cursos?instituicao_id=<uuid-da-instituicao>" \
  -H "Authorization: Bearer $TOKEN"
```

Admin da instituição: `instituicao_id` vem do JWT (não precisa enviar no body).

### Alunos (smoke test)

```bash
curl -s -X POST http://localhost:8000/api/alunos \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "documento": "12345678901",
    "status": "verified",
    "instituicao_id": "<uuid-da-instituicao>"
  }'

curl -s "http://localhost:8000/api/alunos?instituicao_id=<uuid-da-instituicao>" \
  -H "Authorization: Bearer $TOKEN"
```

### Certificados (smoke test)

```bash
# Emitir
curl -s -X POST http://localhost:8000/api/certificados/emitir \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "aluno_id": "<uuid-aluno>",
    "curso_id": "<uuid-curso>",
    "instituicao_id": "<uuid-da-instituicao>"
  }'

# PDF on-the-fly
curl -OJ -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/certificados/<uuid-certificado>/pdf

# Validação pública (sem token)
curl -s http://localhost:8000/api/certificados/validar/<codigo_validacao>

# Catálogo público de eventos
curl -s http://localhost:8000/api/publico/cursos

# Inscrição pública (só cursos upcoming de instituição active)
curl -s -X POST http://localhost:8000/api/publico/cursos/<uuid-curso>/inscrever \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Ana Lima","email":"ana@email.com","documento":"12345678901"}'
```

Páginas públicas no frontend: `/validar`, `/validar/:codigo`, `/eventos`.

### Alterar senha

```bash
curl -s -X POST http://localhost:8000/api/auth/alterar-senha \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"senha_atual":"changeme_superadmin","senha_nova":"novaSenha123"}'
```

### Import CSV de alunos

Cabeçalho: `nome,email,documento` (`status` opcional). SuperAdmin envia `instituicao_id` no form.

```bash
curl -s -X POST http://localhost:8000/api/alunos/importar \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./alunos.csv" \
  -F "instituicao_id=<uuid-da-instituicao>"
```

### Schema (multi-tenant)

| Tabela | Observação |
|--------|------------|
| `instituicoes` | tenant; `logo_url` / `assinatura_url` (S3) |
| `usuarios` | `super_admin` ou `instituicao_admin` |
| `cursos` | sempre com `instituicao_id`; `data_evento`, `categoria`, `modalidade`, `tipo` |
| `alunos` | unique por tenant (email/documento) |
| `certificados` | `codigo_validacao` (UUID) para validação pública |