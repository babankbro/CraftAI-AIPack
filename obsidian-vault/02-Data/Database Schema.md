---
tags: [data, schema]
aliases: [Schema, Database, ERD]
---

# Database Schema

PostgreSQL via Prisma (`alpr/prisma/schema.prisma`). **14 tables** (13 from the original design + `app_settings` added this session). Two migrations: `20260704140431_init`, `20260705005415_add_app_settings`.

> Principle: large files → [[System Architecture|MinIO]]; metadata/scores/audit → Postgres (only `*_key` pointers stored).

## ERD

```
              ┌──────────┐          ┌──────────────┐
              │ schools  │◄─────────│    users     │ (cat / cam / admin)
              └──────────┘          └──┬────┬───┬───┘
                                cam_id │    │   │ cat_id
                               ┌───────┘    │   └───────┐
                               ▼            │           ▼
                        ┌─────────────┐     │    ┌─────────────┐
                        │ mentor_links│     │    │lesson_plans │◄─┐ previous_version_id
                        └─────────────┘     │    └──┬───┬───┬──┘  │ (self)
                                            │   1:1 │   │   └──────┘
              accounts / sessions ──────────┘  ┌────▼──┐┌▼────────────┐┌▼───────────────┐
              verification_tokens (Auth.js)    │extract││ai_evaluations││final_evaluations│
                                               │-ions  ││(draft, 1:N)  ││(CAM signed,1:1) │
   rubric_versions ──1:N── rubric_criteria     └───────┘└──────────────┘└───────┬─────────┘
        ▲          (referenced by ai/final evals)                         1:N   ▼
        └──────────────────────────────────────────────────────────┐   ┌──────────────┐
                                                                    └───│  audit_logs   │
   app_settings (singleton, id=1) ── AI provider/model                  │(ai→cam level) │
                                                                        └──────────────┘
```

## Enums

- `user_role`: `cat` · `cam` · `admin`
- `user_status`: `active` · `pending_role` · `disabled`
- `plan_status`: `uploaded` · `processing` · `ai_pending` · `waiting_cam` · `in_review` · `done` · `failed`
- `file_type`: `pdf` · `docx`
- `ai_provider`: `gemini` · `openai` · `claude` *(claude reserved, no evaluator yet)*
- `quality_band`: `innovative_master` · `fluent` · `developing` · `emerging`

## Tables

| Table | Purpose | Notes |
|-------|---------|-------|
| `schools` | Normalized school list | For cross-school reporting |
| `users` | CAT/CAM/admin accounts | `google_sub` = identity; `role`/`status` system-assigned. `avatar_url` (not `image` — see [[Bugs Fixed]]) |
| `mentor_links` | CAM ↔ CAT pairing | Scopes the CAM review queue |
| `rubric_versions` / `rubric_criteria` | The AIPACK rubric as reference data | `aipack-v1`, C1–C5, descriptors JSONB. See [[AI Evaluation & Rubric]] |
| `lesson_plans` | Uploaded plan metadata | `file_key`→MinIO; `previous_version_id` for v2 |
| `extractions` | Extracted text + OCR flag + checklist | 1:1 with plan, `checklist` JSONB |
| `ai_evaluations` | AI draft scores | 1:N (multi-run/provider); `provider`, `model`, `criteria` JSONB, `suggested_total`, `prompt_hash` |
| `final_evaluations` | CAM-confirmed + signed result | 1:1; `criteria_final` JSONB (**now includes CAM `reason`**), `total`, `band`, `report_key`, `signed_at` |
| `audit_logs` | Every AI→CAM score change | Research trail; written even when unchanged |
| `accounts` / `sessions` / `verification_tokens` | Auth.js DB-backed session | Revocable instantly. See [[Authentication & RBAC]] |
| **`app_settings`** | **Singleton (id=1) AI config** | `ai_provider`, `gemini_model`, `openai_model`; null model → env fallback. Added this session — see [[Admin Console]] |

## JSONB shapes

**`ai_evaluations.criteria` / `final_evaluations.criteria_final`** (per C1–C5):
```json
{ "code": "C1", "level": 3, "reason": "…",
  "evidence": [{"quote":"…","page":2}],
  "confidence": "high", "no_evidence": false }
```
`final_evaluations.criteria_final` additionally carries the CAM's own `reason` (optional) — see [[CAM Review & PDF Report]].

**`extractions.checklist`**: array of `{key, found, page}` for the 5 signals.

## Key design decisions (from `design_database_schema.md` v1.1)

1. **AI evals are multi-row** per plan (history + provider comparison), latest via `(plan_id, created_at DESC)` index.
2. **`schools` normalized** (FK on `users.school_id`).
3. **DB-backed sessions** (Prisma adapter) → instant revocation.
4. **Rubric is reference data** (`rubric_version_id` on evals) → reproducibility, change rubric without code.

## Related
- [[AI Evaluation & Rubric]] · [[Upload-to-Report Pipeline]] · [[Authentication & RBAC]] · [[Admin Console]]
