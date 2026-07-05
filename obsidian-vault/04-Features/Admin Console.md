---
tags: [feature, admin]
aliases: [Admin, Admin Settings]
---

# Admin Console

Two admin-only pages, gated by `proxy.ts` (`/admin/*` → role `admin`). Nav links appear in `AppHeader` only for admins. Built during the session — beyond the original SRS scope.

## `/admin/users` — role & status management

- Server-rendered table of all users (name, email, school, role, status).
- Per-row Server Action (`updateUserRoleStatus`) with role + status dropdowns and a save button — no separate API layer.
- Solves the "stuck at pending role" problem and lets the admin assign CAM/CAT.

Roles: `cat` / `cam` / `admin`. Statuses: `active` / `pending_role` / `disabled`.

> Scope was intentionally kept to role/status. Mentor-Mentee linking (`mentor_links`) is **not** in this UI yet (DB-only for now).

## `/admin/settings` — AI provider & model

Lets the admin switch the AI engine **at runtime, no restart**:

- Radio: **Gemini** or **OpenAI** (Claude hidden — no evaluator implemented).
- Free-text model fields for each (blank → falls back to the env default).
- Server Action upserts the singleton `app_settings` row (id=1).

### How it takes effect

`getAiEvaluator()` ([[AI Evaluation & Rubric]]) reads `app_settings` first, then env `AI_PROVIDER` / `GEMINI_MODEL` / `OPENAI_MODEL`. Verified: setting a DB model overrode the env value in a live pipeline run.

### Model guidance (shown/known)

- Gemini current: `gemini-3.1-pro-preview` (see [[AI Evaluation & Rubric#Model selection as of build]] for tradeoffs).
- OpenAI best available: `gpt-5.5-pro` — but the key has **no billing/quota** right now, so OpenAI errors with `insufficient_quota` regardless of model. The settings page notes this.

## Data model

`app_settings` (singleton):

```
id=1 (fixed) · ai_provider (enum) · gemini_model (text|null) · openai_model (text|null) · updated_at
```

Null model → use env default. Added in migration `20260705005415_add_app_settings`.

## Related
- [[AI Evaluation & Rubric]] · [[Authentication & RBAC]] · [[Database Schema]] · [[Environment Variables]]
