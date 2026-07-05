---
tags: [architecture, reference]
---

# Tech Stack (as-built)

Versions pinned in `alpr/package.json` at build time.

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | **Next.js** (App Router, Turbopack) | `16.2.9` | ⚠️ breaking changes vs older Next — see [[basePath & Deployment]] |
| UI runtime | **React** | `19.2.4` | |
| Language | **TypeScript** | `^5` | strict |
| Styling | **Tailwind CSS** | `^4` | tokens mirror DigiNest LMS (hue 225) |
| Auth | **Auth.js / next-auth** | `5.0.0-beta.31` | Google provider, DB sessions, Prisma adapter |
| ORM | **Prisma** + `@prisma/client` | `6.19.3` | 14 tables, 2 migrations |
| Database | **PostgreSQL** | `16-alpine` | via Docker |
| Object storage | **MinIO** + `@aws-sdk/client-s3` | — | S3-compatible, presigned URLs |
| AI (default) | **`@google/generative-ai`** | `0.24.1` | model `gemini-3.1-pro-preview` (configurable); per-criterion iteration |
| AI (alt) | **`openai`** | `6.45.0` | uses the **Responses API** (`client.responses.create`) so reasoning models work |
| Validation | **Zod** | `4.4.3` | enforces AI JSON output shape (+ retry on malformed JSON) |
| PDF text | **pdf-parse** | `2.4.5` | + `@napi-rs/canvas` `1.0.2` for page rasterization |
| OCR | **Tesseract CLI** (`tesseract-ocr-data-tha`) | apk pkg | invoked via `child_process`, lang `tha+eng` |
| DOCX | **mammoth** | `1.12.0` | text extraction + **HTML conversion** for the in-browser [[File Viewer]] |
| PDF report | **pdf-lib** + `@pdf-lib/fontkit` | `1.17.1` | embeds IBM Plex Sans Thai (Regular + Bold) |
| Testing | **Vitest** | `4.x` | 34 unit tests, `npm test` |

## Fonts (report generation)

`alpr/assets/fonts/`:
- `IBMPlexSansThai-Regular.ttf`
- `IBMPlexSansThai-Bold.ttf` (added for headings in the redesigned report)

pdf-lib has no built-in Thai glyphs — the report throws a clear error if the font file is missing, rather than rendering garbled text. Emoji are **not** in the font (they render as tofu boxes), so the report avoids them. See [[CAM Review & PDF Report]].

## Container topology (Docker Compose)

```
services:
  postgres  (16-alpine, healthcheck pg_isready)
  minio     (server /data, console :9001, healthcheck mc ready)
  createbuckets (one-shot: creates alpr-plans / alpr-reports / alpr-extracted)
  app       (Next.js; dev = hot reload + migrate deploy, prod = standalone node server.js)
```

- Dev: `docker-compose.yml` + auto-loaded `docker-compose.override.yml` (bind-mount source, `target: dev`)
- Prod: `docker-compose.yml` + `docker-compose.prod.yml` (`target: runner`, `HOSTNAME=0.0.0.0`, `restart: always`)
- The override-file split fixes a real bug where `volumes: []` didn't clear dev bind-mounts. See [[Bugs Fixed]].

## Related
- [[System Architecture]] · [[Environment Variables]] · [[basePath & Deployment]]
