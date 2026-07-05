---
tags: [reference, config]
aliases: [Env, Environment, .env]
---

# Environment Variables

From `alpr/.env.example` (copy to `.env`; `.env*` is gitignored except `.env.example`). Compose reads `.env`; `docker compose restart` does **not** re-read it — use `up --force-recreate`.

## Base path / deployment
| Var | Example | Notes |
|-----|---------|-------|
| `BASE_PATH` | `/aipack` | Sub-path the app is served under. See [[basePath & Deployment]] |

## Auth
| Var | Example | Notes |
|-----|---------|-------|
| `NEXTAUTH_URL` | `http://localhost:3000/aipack/api/auth` | ⚠️ **must include `/api/auth`** — becomes Auth.js's route prefix. See [[Authentication & RBAC]] |
| `NEXTAUTH_SECRET` | `changeme` | session signing secret |
| `GOOGLE_CLIENT_ID` | … | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | … | |
| `ALLOWED_EMAIL_DOMAINS` | `ksu.ac.th,gmail.com` | comma-separated allow-list; empty = unrestricted (dev only) |
| `ADMIN_EMAILS` | `sarayut.go@ksu.ac.th` | comma-separated; auto-elevated to admin every login. See [[Admin Console]] |

## Database
| Var | Example |
|-----|---------|
| `DATABASE_URL` | `postgresql://alpr:alpr@postgres:5432/alpr` |

## Storage (MinIO)
| Var | Example | Notes |
|-----|---------|-------|
| `MINIO_ENDPOINT` | `minio` | internal Docker hostname (server-side ops) |
| `MINIO_PORT` | `9000` | |
| `MINIO_USE_SSL` | `false` | |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | `minio` / `minio12345` | |
| `MINIO_PUBLIC_ENDPOINT` | `http://localhost:9000` | ⚠️ **browser-reachable** URL for presigned links; prod = real public MinIO URL. See [[Bugs Fixed]] |
| `MINIO_BUCKET_PLANS` / `_REPORTS` / `_EXTRACTED` | — | *optional* bucket-name overrides; default `alpr-plans` / `alpr-reports` / `alpr-extracted` |

## AI evaluator
| Var | Example | Notes |
|-----|---------|-------|
| `AI_PROVIDER` | `gemini` | `gemini` \| `openai`; **DB `app_settings` overrides this** at runtime |
| `GEMINI_API_KEY` | … | `@google/generative-ai` SDK (not Vertex) |
| `GEMINI_MODEL` | `gemini-2.5-pro` | env value `gemini-3.1-pro-preview`; **code default** (unset) `gemini-2.5-pro`; `gemini-3-pro` is invalid |
| `OPENAI_API_KEY` | … | needs billing/quota; uses the Responses API (reasoning models OK) |
| `OPENAI_MODEL` | `gpt-4o-mini` | code default (unset) `gpt-4o`; `gpt-5.5-pro` works but ~10 min/plan; `gpt-5.1-chat-latest` is a fast alt. See [[AI Evaluation & Rubric#Model selection & the speed/cost reality measured]] |
| `OPENAI_BASE_URL` | — | *optional* — point OpenAI SDK at Azure OpenAI / a proxy |

## PDF report
| Var | Example | Notes |
|-----|---------|-------|
| `REPORT_FONT_PATH` | `assets/fonts/IBMPlexSansThai-Regular.ttf` | Thai font (Regular) |
| `REPORT_FONT_BOLD_PATH` | — | *optional* — Bold variant; defaults to `IBMPlexSansThai-Bold.ttf` next to the Regular |

## Related
- [[basePath & Deployment]] · [[Admin Console]] · [[AI Evaluation & Rubric]] · [[Tech Stack]]
