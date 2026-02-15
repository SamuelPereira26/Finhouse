# FINHOUSE 2.0 (Next.js + Supabase + Vercel)

Migracion de FINHOUSE desde Google Apps Script + Google Sheets a un stack moderno y gratuito desplegable en Vercel.

## Estructura

- `apps/web`: Next.js 14 App Router + Route Handlers
- `packages/core`: logica de dominio TypeScript (import, parseo, reglas, health, transfer, telegram, API helpers)
- `packages/db`: schema SQL/migraciones para Supabase y tipos compartidos

## Variables de entorno

Configura en local (`.env.local`) y en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- Opcionales legacy:
  - `SPREADSHEET_ID`
  - `DRIVE_FOLDER_ID`
  - `AUTHORIZED_EMAILS`

Nota: `TELEGRAM.API_URL` se mantiene como constante en `packages/core/src/constants.ts`.

## Instalacion local

1. Instalar dependencias:

```bash
npm install --workspaces
```

2. Aplicar migraciones en Supabase SQL Editor:

- `packages/db/migrations/0001_initial.sql`
- `packages/db/migrations/0002_seed.sql`

3. Arrancar web:

```bash
npm run dev -w apps/web
```

## Setup Supabase

1. Crear proyecto Supabase (plan gratuito).
2. Copiar URL/keys en `.env.local`.
3. Habilitar Auth (email/password o magic link).
4. En Auth > URL Configuration:
   - Site URL: `http://localhost:3000` (local) y luego tu dominio Vercel.
   - Redirect URLs: `http://localhost:3000/auth/callback` y `https://<tu-dominio>/auth/callback`.
5. Ejecutar migraciones.
6. Verificar tablas creadas:

- `accounts`
- `imports`
- `master`
- `rules`
- `budgets`
- `health`
- `staging_rows`
- `processed_files`

## Deploy en Vercel

1. Importar repo en Vercel.
2. Configurar `Root Directory` a `apps/web`.
3. Configurar todas las variables de entorno.
4. Install command:

```bash
npm install
```

5. Build command:

```bash
npm run build
```

6. Output: Next.js default.

## Telegram webhook

Endpoint webhook:

- `POST /api/telegram/webhook`

Registrar webhook (local script o curl):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://<tu-dominio>/api/telegram/webhook"}'
```

Callbacks soportados:

- `resumen`
- `comparativa`
- `presupuesto`
- `pendientes`
- `donaciones`
- `menu`
- `create_rule:<pattern>`
- `dismiss_pattern:<pattern>`

## iPhone Shortcut (API token)

Se soporta token por query `?token=` o header `X-API-TOKEN`.

### `POST /api/cash`

Body JSON exacto:

```json
{
  "date": "2026-02-15",
  "amount": -22.35,
  "description": "Cafeteria",
  "type": "EXPENSE",
  "macro": "Ocio",
  "subcat": "Restaurantes",
  "note": "desayuno",
  "counterparty": "CAFETERIA X",
  "reimbursementTarget": null
}
```

### `POST /api/confirm`

Body JSON exacto:

```json
{
  "tx_id": "abc123",
  "updates": {
    "type": "EXPENSE",
    "macro": "Otros",
    "subcat": "No clasificado",
    "user_note": "detalle obligatorio en Otros"
  }
}
```

## Import flow

En `/imports` se sube manualmente BBVA XLSX o Revolut CSV.

Pipeline:

1. `createImportBatch`
2. `detectSource`
3. `parseFile`
4. `runHealthChecks`
5. `saveToStaging`
6. `mergeToMaster`
7. `runTransferDetection`
8. `updateImportBatch`

## Endpoints API

- `GET /api/transactions`
- `GET /api/pending`
- `GET /api/summary`
- `GET /api/budgets`
- `GET /api/rules`
- `GET /api/health`
- `GET /api/categories`
- `GET /api/accounts`
- `POST /api/confirm`
- `POST /api/cash`
- `POST /api/rule`
- `POST /api/rule-update`
- `POST /api/budget`
- `POST /api/imports/upload`
- `POST /api/telegram/webhook`

## Tests

Tests en `packages/core/tests`:

- `parseAmount`
- `parseDate`
- `generateTxId`
- `matchFixedRules`
- `matchCommonPatterns`
- `TransferDetector`
- `HealthChecks`
- E2E minimo de import Revolut CSV

Ejecucion:

```bash
npm run test -w packages/core
```
