---
tags: [session-log, bugs, gotchas]
aliases: [Bugs, Gotchas, Troubleshooting]
---

# Bugs Fixed

Real bugs caught while getting ALPR running end-to-end. Grouped by theme — most trace back to **Next.js 16 basePath behavior** or **Docker networking**.

## basePath / routing

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | `/aipack/login` redirected to `/login` (basePath dropped) | `nextUrl.pathname` **includes** basePath in `proxy.ts`, and the code assumed otherwise | Strip/re-add basePath from `BASE_PATH` env in `proxy.ts` |
| 2 | Every auth endpoint → `UnknownAction` / 400 | `NEXTAUTH_URL` lacked `/api/auth`; and Next 16 strips basePath from Route Handler `req.url` | `NEXTAUTH_URL=…/aipack/api/auth` + route wrapper re-adding `/aipack` |
| 3 | `redirect_uri_mismatch` risk from Google | outgoing `redirect_uri` missing `/aipack` | same wrapper fix as #2 |
| 4 | Post-login/logout landed on bare `/` → 404 | `signIn`/`signOut` `redirectTo` don't auto-prefix basePath | prefix all redirect targets with `BASE_PATH` |
| 5 | `Unexpected token '<', "<!DOCTYPE"` on API calls | `proxy.ts` redirected unauthenticated **API** calls to the login **HTML** page; `fetch().json()` choked | API paths return JSON `401/403`; only pages redirect |

## Auth / Prisma

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 6 | First Google login crashed: `Configuration` error, Prisma `Unknown argument 'image'` | Stock `PrismaAdapter` writes `image`/`emailVerified`; schema uses `avatarUrl`, no `emailVerified` | Wrap `createUser`/`updateUser` to map `image→avatarUrl`, drop `emailVerified` |
| 7 | Prod login: `UntrustedHost` | Auth.js v5 rejects unknown hosts in prod | `trustHost: true` |

## Docker / infra

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 8 | Fresh `make up` created **zero DB tables** | `migrate deploy` ran with no committed migrations | Generated the initial migration |
| 9 | Prod build served dev source, hid `server.js` | Compose `volumes: []` is a no-op override on this version (no `!reset`) | Move dev bits to auto-loaded `docker-compose.override.yml`; prod skips it |
| 10 | Prod healthcheck couldn't reach the app | standalone `server.js` binds to `HOSTNAME` (= container id) | `HOSTNAME=0.0.0.0` in prod compose |
| 11 | Repeated stale 404s after edits/model swaps | `.next` lives in an anonymous Docker volume surviving restarts | `--force-recreate --renew-anon-volumes` |

## Extraction / storage / report

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 12 | Upload → `status=failed`: "Setting up fake worker failed … pdf.worker.mjs" | pdf-parse/pdfjs can't auto-resolve its worker path under Turbopack | `PDFParse.setWorker()` → explicit `node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs` |
| 13 | OCR warning: "Cannot load @napi-rs/canvas" | pdfjs page rasterization dep not in standalone trace | add `@napi-rs/canvas` + explicit Dockerfile copy |
| 14 | Pipeline failed at AI stage: `rubricVersion` not found | DB never seeded | `prisma db seed` (rubric `aipack-v1` + criteria) |
| 15 | Can't open report PDF from MinIO | presigned URL used `minio:9000` (internal Docker host), unreachable from browser | second S3 client signs against `MINIO_PUBLIC_ENDPOINT` |
| 16 | Report emoji rendered as tofu boxes | IBM Plex Sans Thai has no emoji glyphs | remove emoji from report text |
| 17 | Report throws if font missing | pdf-lib has no Thai glyphs | ship `IBMPlexSansThai-{Regular,Bold}.ttf`; clear error if absent |

## AI model

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 18 | AI eval `404: models/gemini-3-pro not found` | `gemini-3-pro` isn't a real model id | use a real id; current `gemini-3.1-pro-preview` (or `gemini-2.5-pro`) |
| 19 | OpenAI `insufficient_quota` | the OpenAI key has no billing | out of our control — needs billing on that account |

## UI

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 20 | Hydration mismatch on `<body>` | Grammarly browser extension injects attributes pre-hydration (not an app bug) | `suppressHydrationWarning` on `<body>` |
| 21 | Admin saw no menu / landed on teacher page | `/` redirect had no `admin` branch | route admin → `/admin/users` |

## Related
- [[basePath & Deployment]] · [[Authentication & RBAC]] · [[Build Session Changelog]] · [[Upload-to-Report Pipeline]]
