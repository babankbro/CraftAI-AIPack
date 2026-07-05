---
tags: [session-log, changelog]
aliases: [Changelog, Session Log]
---

# Build Session Changelog

Everything changed/added while taking the cloned repo from "code present, never run" to "running end-to-end, extended." Bugs are detailed separately in [[Bugs Fixed]].

## M7/M8 completion (getting it to run)
- Added `alpr/.env.example` (and fixed `.gitignore` to allow it past the `.env*` glob).
- Generated the missing initial Prisma migration (`20260704140431_init`) — without it `prisma migrate deploy` created zero tables.
- Downloaded the missing Thai font (`IBMPlexSansThai-Regular.ttf`, later `-Bold.ttf`).
- Set up **Vitest** + `test` script; wrote **34 unit tests** (scoring, rubric, schema, checklist) — all pass.
- Verified the full **dev and prod Docker stacks** boot; runner build compiles.
- Added `scripts/backup.sh` (pg_dump + MinIO mirror); added app healthcheck.

## Deployment / infra hardening
- **`middleware.ts` → `proxy.ts`** (Next.js 16 convention).
- Restructured Compose: dev-only bits moved to auto-loaded `docker-compose.override.yml`; base file is prod-safe; `docker-compose.prod.yml` sets `HOSTNAME=0.0.0.0`. Fixes the `volumes: []` no-op override bug.
- Added `@napi-rs/canvas` (needed by pdf-parse for OCR page rasterization) + explicit Dockerfile copy.

## Auth & access (see [[Authentication & RBAC]])
- Fixed the **NextAuth basePath** trio: `NEXTAUTH_URL=…/aipack/api/auth`, route wrapper re-adding basePath, `trustHost: true`.
- Fixed `PrismaAdapter` `image → avatarUrl` / drop `emailVerified` mapping (first login crashed).
- Fixed all redirect targets to include basePath (`login`, `pending-role`, `AppHeader`, home).
- API routes now return JSON 401/403 instead of HTML redirects (killed `Unexpected token '<'`).

## New features (beyond original scope)
- **Admin console** — `/admin/users` (role/status) + `/admin/settings` (AI provider/model). See [[Admin Console]].
- **`ADMIN_EMAILS`** auto-elevation + default `active`/`cat` provisioning (no more stuck "pending role").
- **`app_settings`** table (migration `20260705005415`) → runtime AI provider/model switching; `getAiEvaluator()` made async, reads DB then env.
- Header nav: **"คิวตรวจ"** (CAM), **"จัดการผู้ใช้"** + **"ตั้งค่า AI"** (admin).
- Root `/` redirect now routes admin → `/admin/users`, cam → `/cam/queue`.

## CAM review & report (see [[CAM Review & PDF Report]])
- Added **per-criterion CAM reasoning** textarea (stored in `criteria_final`).
- **View original uploaded PDF** button on the evaluate page.
- Queue "done" section: edit + download-report buttons.
- **Redesigned the PDF report** (`lib/report.ts`) — structured, colored, paginated, with AI-vs-CAM comparison per criterion; added Bold font; removed emoji (tofu boxes).

## AI model
- `GEMINI_MODEL`: `gemini-3-pro` (invalid, 404) → `gemini-2.5-flash` → `gemini-2.5-pro` → **`gemini-3.1-pro-preview`** (user choice). Verified each end-to-end against the real pipeline.
- Confirmed OpenAI best model = `gpt-5.5-pro`, but the key has **no billing/quota**.

## Documentation
- This Obsidian vault (system architecture, updated from the session).
- Updated `.env.example`, `IMPLEMENTATION_PLAN.md` (NEXTAUTH_URL note), font README.

## Recurring operational lesson
Next.js dev keeps the `.next` build in an **anonymous Docker volume** that survives restarts → stale-cache 404s after edits/model swaps. Fix: `docker compose up -d --build --force-recreate --renew-anon-volumes app`. Hit this several times.

## Related
- [[Bugs Fixed]] · [[Milestones & Status]] · [[System Architecture]]
