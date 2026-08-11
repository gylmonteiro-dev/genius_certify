# Nexus Genius — Genius Certify

Plataforma SaaS multi-tenant para emissão, gestão e validação de certificados digitais.

## Estrutura

```text
.
├── frontend/              # React + Vite + TypeScript + Tailwind
├── backend/               # FastAPI + SQLAlchemy + PostgreSQL
├── docker-compose.yml
├── .env.example
├── .gitignore
└── .cursorrules
```

## Subir com Docker

```bash
cp .env.example .env
docker compose up --build
```

Serviços:

| Serviço   | URL |
|-----------|-----|
| Frontend  | http://localhost |
| API/docs  | http://localhost:8000/api/docs (também via http://localhost/api/docs) |
| MinIO API | http://localhost:9000 |
| MinIO UI  | http://localhost:9001 |
| Postgres  | localhost:5432 |

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

### Schema (multi-tenant)

| Tabela | Observação |
|--------|------------|
| `instituicoes` | tenant; `logo_url` / `assinatura_url` (S3) |
| `usuarios` | `super_admin` ou `instituicao_admin` |
| `cursos` | sempre com `instituicao_id` |
| `alunos` | unique por tenant (email/documento) |
| `certificados` | `codigo_validacao` (UUID) para validação pública |