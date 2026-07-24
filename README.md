# Symbius — Landing + Deck + Propostas

Site comercial da Symbius em **React + Vite**, com API de propostas:

- `/` — landing de captação
- `/admin` — painel (login: `admin` / `admin`)
- `/admin/apresentacao` — deck BrandGrowth
- `/admin/propostas` — lista e gerador de propostas
- `/p/:slug` — landing pública da proposta

## Como rodar (local)

Em dois terminais:

```bash
# 1) API
cd api
npm install
npm run dev
```

```bash
# 2) Frontend
cd web
npm install
npm run dev
```

Acesse `http://localhost:5173`

Por padrão a API usa **arquivo JSON** (`api/data/db.json`) porque Docker/Postgres pode não estar no PC. Schema Postgres e `docker-compose.yml` já estão prontos para a VPS.

### Postgres (Docker / VPS)

```bash
docker compose up -d
# em api/.env: STORE=  (vazio) ou remova STORE=file e use DATABASE_URL
cd api && npm run db:migrate && npm run dev
```

Variáveis em `api/.env.example`:
- `DATABASE_URL`
- `ADMIN_TOKEN` (header `X-Admin-Token`; o front usa o mesmo valor via default)
- `PORT` (3001)
- `STORE=file` | omitir (auto) | forçar postgres

## Build front

```bash
cd web
npm run build
npm run preview
```

## Propostas

- Modelo: **Setup** (único) e **Operação BrandGrowth** (mensal), cada um com toggle on/off
- Serviços entram como checklist incluso (sem preço por item); preço na linha inteira
- Tráfego pago opcional (mídia à parte)
- Engrenagem: dados da empresa + catálogo de serviços
- Saídas: PDF e LP pública `/p/:slug`

## Estrutura

```
symbius/
├── docker-compose.yml
├── api/                    # Express + Postgres ou JSON
│   ├── db/schema.sql
│   └── src/
└── web/                    # React SPA
```

## Deploy VPS (resumo)

1. Criar DB Postgres e rodar `api/db/schema.sql` + `seed.sql` (ou `npm run db:migrate`)
2. Configurar `DATABASE_URL` e remover `STORE=file`
3. Subir `api` com Node (`npm start`)
4. Servir `web/dist` com nginx/caddy e proxy `/api` → API; SPA fallback para `index.html`
