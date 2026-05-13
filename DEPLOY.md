# Deploy a Vercel

Guía completa para desplegar EYAN en Vercel.

## ⚠️ Limitación importante

**Los scrapers (Salesforce + FEN) NO funcionan en Vercel** porque Playwright requiere Chromium (>50MB binary + filesystem persistente). En producción esos endpoints devuelven `503` con mensaje claro.

**Solución:** corre los scrapers desde tu máquina local apuntando al `MONGODB_URI` de producción (Atlas). Los resultados se persisten al mismo cluster que usa Vercel.

## 1. Pre-deploy

### MongoDB Atlas
1. Cluster en [atlas.mongodb.com](https://atlas.mongodb.com) (free tier sirve)
2. Database Access → crear usuario con rol `readWrite` sobre db `eyan`
3. Network Access → agregar `0.0.0.0/0` (o IPs de Vercel)
4. Copiar connection string

### Repositorio
1. Push del código a GitHub
2. **NO** subir `.env.local` (ya excluido por `.gitignore`)

## 2. Crear proyecto en Vercel

1. [vercel.com/new](https://vercel.com/new) → importar repo
2. Framework preset: **Next.js** (auto-detectado)
3. Build command: `next build` (default)
4. Output: `.next` (default)
5. Antes de hacer "Deploy", click "Environment Variables" y agregar (ver siguiente paso)

## 3. Variables de entorno (Vercel Dashboard)

### Obligatorias

| Variable | Valor |
|---|---|
| `MONGODB_URI` | Connection string de Atlas |
| `NEXTAUTH_SECRET` | Generar con `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` (URL final del deploy) |

### Opcionales (solo si vas a usar scrapers desde Vercel, no recomendado)

| Variable | Valor |
|---|---|
| `SF_*` | Credenciales Salesforce |
| `FEN_*` | Credenciales FEN |
| `QBO_*` | Credenciales QuickBooks Online |
| `ALLOW_SCRAPERS` | `true` (forzar habilitación, fallará en runtime sin Chromium) |

### Para QBO (cuando lo conectes)
| Variable | Valor |
|---|---|
| `QBO_CLIENT_ID` | App QBO Developer |
| `QBO_CLIENT_SECRET` | App QBO Developer |
| `QBO_REDIRECT_URI` | `https://tu-app.vercel.app/api/qbo/callback` |
| `QBO_ENVIRONMENT` | `sandbox` o `production` |

### Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
# o en PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 4. Primer deploy

Vercel hace deploy automático. Cuando termine:

1. Visita `https://tu-app.vercel.app`
2. Verás el login. Sin usuarios todavía.

## 5. Bootstrap del primer admin

Como el DB está vacío, `/api/seed` corre en modo bootstrap (sin auth):

```bash
curl -X POST https://tu-app.vercel.app/api/seed
```

Crea:
- **admin@eyan.com** / `admin123` (admin)
- **maria@eyan.com** / `admin123` (dispatcher)
- **juan/carlos/miguel/roberto/andres@eyan.com** / `coord123` (drivers)
- 5 camiones, 6 rutas, asignaciones demo

⚠️ **Cambia las contraseñas inmediatamente** desde `/settings/users` o `/perfil`.

## 6. Correr scrapers local → DB prod

Para sincronizar Salesforce o FEN contra producción:

```bash
# .env.local con MONGODB_URI apuntando a Atlas prod
npm run dev
# Login como admin local en http://localhost:3000
# Usa los botones Sync SF / Scrape FEN → escriben en Atlas prod
```

Alternativa más limpia: configurar un `.env.production.local` y correr el dev server con esas vars.

## 7. Post-deploy

- Verifica `/dashboard` carga sin errores
- Verifica `/settings/users` y `/perfil` funcionan
- Verifica `/contabilidad` carga (botón Scrape devuelve 503 esperado en prod)
- Verifica login con credentials del seed

## 8. Updates futuros

Cada push a `main` (o la branch configurada) trigger deploy automático.

```bash
git add .
git commit -m "feat: ..."
git push
```

## Troubleshooting

**"Invalid CSRF token" al login:**
- `NEXTAUTH_URL` no coincide con la URL real → ajustar en Vercel env vars y redeploy.

**Función timeout en `/api/seed`:**
- Plan Hobby tiene límite 10s. Si el seed tarda más, upgrade a Pro (60s default, 300s con `maxDuration`).

**MongoDB connection failed:**
- Verifica Network Access en Atlas permite IPs de Vercel (0.0.0.0/0 más simple).

**Scraper devuelve 503:**
- Esperado en Vercel. Corre el scraper local contra DB prod.
