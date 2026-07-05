---
tags: [overview, status]
---

# Milestones & Status

The [[Build Session Changelog|original plan]] defined milestones M0–M8. As-built status (verified by running the stack end-to-end):

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M0** | Infra & scaffold — Next.js + Docker + Prisma (13→14 tables) | ✅ Done |
| **M1** | Auth — Google OAuth + allow-list + DB session + RBAC | ✅ Done — see [[Authentication & RBAC]] |
| **M2** | Upload + MinIO storage + versioning | ✅ Done |
| **M3** | Extraction + Thai OCR + 5-item checklist | ✅ Done — see [[Upload-to-Report Pipeline]] |
| **M4** | AI evaluation (pluggable Gemini/OpenAI, Zod schema) | ✅ Done — see [[AI Evaluation & Rubric]] |
| **M5** | CAM review + audit logs + band/PLC | ✅ Done — see [[CAM Review & PDF Report]] |
| **M6** | Summary, sign & PDF report | ✅ Done (report redesigned in session) |
| **M7** | Seed, tests, hardening | ✅ Done — 34 unit tests, Vitest, seed present |
| **M8** | Prod deploy (KSU subpath, backups) | ✅ Compose + Dockerfile + backup script; needs real KSU host |

## Added beyond the original plan (this session)

- **Admin console** — `/admin/users` (role/status) + `/admin/settings` (AI provider/model). See [[Admin Console]].
- **`ADMIN_EMAILS`** env-based admin elevation + default `active`/`cat` provisioning policy.
- **`app_settings` table** (14th table) for runtime AI config.
- **Per-criterion deep AI analysis** — 5 sequential calls, each returning evidence quotes + suggestions + example. See [[AI Evaluation & Rubric]].
- **CAM per-criterion reasoning** field + **redesigned PDF report** (evidence/suggestions/example, flowing layout). See [[CAM Review & PDF Report]].
- **In-browser file viewer** + CAT early-AI-draft views. See [[File Viewer]].
- **OpenAI Responses API** so reasoning models (`gpt-5.5-pro`) work.

## Known follow-ups / not done

- Real Google OAuth on the KSU host + real production `NEXTAUTH_URL` / `BASE_PATH`.
- `gpt-5.5-pro` works but is ~10 min/plan (sequential reasoning) → instance runs on Gemini; see [[AI Evaluation & Rubric]].
- CI wiring for `npm test`.
- Mentor-Mentee link management UI (currently DB-only; admin scope was intentionally kept to role/status).
- Claude provider (`ai_provider` enum has it, no evaluator implementation yet).

## Related
- [[Build Session Changelog]] · [[Bugs Fixed]] · [[System Architecture]]
