---
tags: [architecture, deployment, gotchas]
aliases: [basePath, Deployment, Sub-folder Hosting]
---

# basePath & Deployment

ALPR is served under a **configurable sub-path** (`/aipack`) of an existing domain (`craftai.ksu.ac.th`, alongside DigiNest LMS at `/lms`) — **not** its own domain/subdomain. This is a hard requirement (SRS NFR-9, AC-9/AC-12) and the single biggest source of subtle bugs. `basePath` comes from the `BASE_PATH` env var — never hardcode it.

```
https://<domain>/<basePath>/            → app pages
https://<domain>/<basePath>/api/...      → route handlers
https://<domain>/<basePath>/_next/...    → static assets (incl. Thai fonts)
https://<domain>/<basePath>/reports/...  → report download links
```

Config (`next.config.ts`): `basePath` + `assetPrefix` + `output: "standalone"`, `basePath` sourced from `BASE_PATH` (default `/aipack`).

## ⚠️ The Next.js 16 basePath gotchas (verified at runtime)

These behaviors are **the opposite of what the docs/older-version knowledge suggest**, and each caused a bug (see [[Bugs Fixed]]):

### 1. `nextUrl.pathname` inconsistency
- In **`proxy.ts`** (middleware): `req.nextUrl.pathname` **includes** the basePath (`/aipack/login`), and `nextUrl.basePath` reads empty. → proxy strips/re-adds basePath manually from `BASE_PATH`.
- In **Route Handlers**: Next.js **strips** the basePath before the handler sees `req.url` (`/api/...`, no `/aipack`). → the NextAuth route re-adds it (see below).

### 2. `middleware.ts` → `proxy.ts`
Next.js 16 renamed the middleware file convention to `proxy.ts`. The RBAC logic lives there. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`.

### 3. Redirects don't auto-prefix basePath
`signIn`/`signOut` `redirectTo`, and `redirect()` targets built by Auth.js, do **not** know about Next's basePath. All hardcoded redirect targets (`/login`, `/`, etc.) must be manually prefixed with `BASE_PATH`. Fixed in `login/page.tsx`, `pending-role/page.tsx`, `AppHeader.tsx`, and `page.tsx`.

### 4. NextAuth basePath — the three-part fix
See [[Authentication & RBAC#The NextAuth basePath saga]]. Summary:
- `NEXTAUTH_URL` must be `http://host/aipack/api/auth` (its pathname becomes Auth.js's internal route prefix).
- `app/api/auth/[...nextauth]/route.ts` **re-adds** `/aipack` to `req.url` before handing to `handlers` (because Next stripped it).
- `trustHost: true` in `auth.ts` (Auth.js v5 rejects unknown hosts in prod behind a reverse proxy — NFR-9.7).

### 5. API routes must return JSON, not HTML redirects
`proxy.ts` redirects unauthenticated **page** requests to `/login`, but **API** requests (`/api/...`) get a JSON `401`/`403`. Otherwise `fetch()` transparently follows the redirect, receives the login HTML, and `.json()` throws `Unexpected token '<'`.

## MinIO presigned URLs & Docker networking

The S3 client connects to MinIO at `minio:9000` (internal Docker hostname), but **presigned download URLs go to the browser**, which can't resolve `minio`. `lib/storage.ts` uses a **second S3 client** signing against `MINIO_PUBLIC_ENDPOINT` (dev: `http://localhost:9000`; prod: the real public MinIO URL). See [[Bugs Fixed]].

## Prod runner binding

Next's standalone `server.js` binds to `process.env.HOSTNAME`; Docker sets that to the container ID, so the server only listens on that IP and the healthcheck can't reach it. `docker-compose.prod.yml` sets `HOSTNAME=0.0.0.0`.

## Deployment checklist (KSU)

- Set `BASE_PATH`, `NEXTAUTH_URL` (= `https://craftai.ksu.ac.th/aipack/api/auth`), Google OAuth redirect URI = `https://craftai.ksu.ac.th/aipack/api/auth/callback/google`.
- `MINIO_PUBLIC_ENDPOINT` = the externally-reachable MinIO URL.
- `pg_dump` cron + MinIO versioning (see `alpr/scripts/backup.sh`).
- `make up-prod` (= `-f docker-compose.yml -f docker-compose.prod.yml`).

## Related
- [[System Architecture]] · [[Authentication & RBAC]] · [[Bugs Fixed]] · [[Environment Variables]]
