---
tags: [architecture, core]
aliases: [Architecture, System Design]
---

# System Architecture

> As-built architecture of ALPR. The original design (`design_architecture.md`) is largely realized; deviations are called out in [[#Deviations from the original design]].

## High-level components

```
   Browser ──► https://craftai.ksu.ac.th/aipack/...
                      │  (Next.js owns basePath=/aipack: pages, /_next assets, /aipack/api)
                      ▼
        ┌───────────────────────────────┐   OAuth    ┌────────────────────┐
        │  Next.js 16 App (ALPR)         │◄──────────►│  Google Identity    │ (identity only)
        │  • SSR pages (App Router)      │            └────────────────────┘
        │  • Route Handlers /aipack/api  │
        │  • proxy.ts (RBAC)             │──extract──►┌────────────────────┐
        │  • Auth.js v5 (DB session)     │            │ pdf-parse + Tesseract│
        └──┬──────────┬──────────────────┘            │ (Thai OCR) · mammoth │
           │          │                               └────────────────────┘
     SQL   │          │ S3 API                               │ text
     ┌─────▼────┐  ┌──▼─────────┐            ┌───────────────▼──────────────┐
     │ Postgres │  │  MinIO      │           │  AI Provider Abstraction      │
     │ (metadata│  │  (files)    │           │  ├─ GeminiEvaluator (@google) │
     │  scores, │  │  3 buckets  │           │  └─ OpenAiEvaluator (openai)  │
     │  audit)  │  │             │           │  chosen by DB app_settings →  │
     └──────────┘  └────────────┘           │  fallback env AI_PROVIDER      │
                                             └──────────────────────────────┘
```

`/lms` (DigiNest LMS) and `/aipack` are **separate apps sharing one domain**, path-based — no central reverse-proxy routing in the app. See [[basePath & Deployment]].

## Layers

| Layer | Responsibility | Key files (`alpr/src/`) |
|-------|----------------|-------------------------|
| **Pages (SSR)** | Render UI per role, server-fetch via Prisma | `app/**/page.tsx` |
| **Route Handlers** | JSON API for upload, review, report, auth | `app/api/**/route.ts` |
| **Proxy (RBAC)** | Gate routes by role/status before handlers | `proxy.ts` (was `middleware.ts`) |
| **Auth** | Google OAuth, DB sessions, role elevation | `auth.ts` |
| **Domain lib** | Pipeline, scoring, rubric, report | `lib/pipeline.ts`, `lib/scoring.ts`, `lib/ai/`, `lib/report.ts` |
| **Extraction** | PDF/DOCX text + Thai OCR + checklist | `lib/extract/` |
| **Storage** | MinIO S3 client + presigned URLs | `lib/storage.ts` |
| **Data** | Prisma client | `lib/db.ts`, `prisma/schema.prisma` |

## Two data stores, clean separation

- **PostgreSQL** — all structured metadata: users, plans, extractions, AI/final evaluations, audit logs, rubric, sessions, app settings. See [[Database Schema]].
- **MinIO** (S3-compatible) — the large binary files, never in the DB:
  - `alpr-plans` — original uploaded PDF/DOCX
  - `alpr-reports` — generated PDF reports
  - `alpr-extracted` — (optional) OCR cache
  - Access only via short-lived **presigned URLs**. ⚠️ presigning must use a *browser-reachable* endpoint — see [[Bugs Fixed]].

Tables store only a `file_key` / `report_key` pointer into MinIO.

## Core request flows

- **Auth flow** → [[Authentication & RBAC]]
- **Upload → extract → AI → review → sign → report** → [[Upload-to-Report Pipeline]]
- **AI provider selection** → [[AI Evaluation & Rubric]]

## Deviations from the original design

The design docs described intentions; the build made these concrete choices:

| Area | Design doc said | As-built |
|------|-----------------|----------|
| Sub-path hosting | Possibly reverse proxy | **Direct Next.js `basePath`**, no proxy layer |
| Gemini | Vertex AI (`VERTEX_PROJECT/LOCATION`) | **`@google/generative-ai` SDK** with `GEMINI_API_KEY` |
| PDF report | Playwright / print-to-PDF | **`pdf-lib` + embedded Thai fonts** (`lib/report.ts`) |
| OCR rendering | "Tesseract + pdf parse" | pdf-parse `getScreenshot()` (needs `@napi-rs/canvas`) → **Tesseract CLI** `tha+eng` |
| AI provider switching | env `AI_PROVIDER` only | **DB `app_settings` (admin UI)** → falls back to env. See [[Admin Console]] |
| Sessions | DB-backed (as designed) | ✅ DB-backed via Prisma adapter |

## The one thing to understand before touching code

This is **Next.js 16**, which behaves differently from older versions in ways that bit us repeatedly. Read [[basePath & Deployment]] and the `alpr/AGENTS.md` warning before editing routing/auth. The most important gotcha: `nextUrl.pathname` **includes** the basePath in `proxy.ts` but is **stripped** in Route Handlers — the opposite behaviors caused several bugs.

## Related
- [[Tech Stack]] · [[Database Schema]] · [[basePath & Deployment]] · [[Milestones & Status]]
