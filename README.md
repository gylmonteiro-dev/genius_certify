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
| Frontend  | http://localhost:3000 |
| API/docs  | http://localhost:8000/api/docs (também via http://localhost/api/docs) |
| MinIO API | http://localhost:9000 |
| MinIO UI  | http://localhost:9001 |
| Postgres  | só rede interna (`db:5432`) |

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
```

### Schema (multi-tenant)

| Tabela | Observação |
|--------|------------|
| `instituicoes` | tenant; `logo_url` / `assinatura_url` (S3) |
| `usuarios` | `super_admin` ou `instituicao_admin` |
| `cursos` | sempre com `instituicao_id` |
| `alunos` | unique por tenant (email/documento) |
| `certificados` | `codigo_validacao` (UUID) para validação pública |