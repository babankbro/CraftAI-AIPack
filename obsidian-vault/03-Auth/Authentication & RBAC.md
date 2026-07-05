---
tags: [auth, security, core]
aliases: [Auth, RBAC, Authentication]
---

# Authentication & RBAC

Google OAuth is the **only** login method (SRS FR-1). Auth.js v5 (next-auth beta) with DB-backed sessions via the Prisma adapter. Config in `alpr/src/auth.ts`, gating in `alpr/src/proxy.ts`.

## Login flow

```
1. "เข้าสู่ระบบด้วย Google" → Auth.js → Google consent
2. callback: /aipack/api/auth/callback/google
3. signIn callback: check ALLOWED_EMAIL_DOMAINS (domain allow-list) → reject if outside (AC-11)
4. JIT provisioning: new user created via adapter (see policy below)
5. DB session created (revocable); cookie HttpOnly+Secure+SameSite
6. proxy.ts RBAC gates the route by role/status
```

- Google provides **identity only**. `role`/`status` are **system-assigned**, never from Google.
- Sessions are DB rows → deleting a `sessions` row revokes access instantly.

## Provisioning & role policy (built this session)

- **New user default**: `role = cat`, `status = active` — so ordinary teachers can use the app immediately (no "pending role" wait). This changed the original `pending_role` default.
- **Admin elevation**: emails in `ADMIN_EMAILS` (env, comma-separated) are forced to `role=admin, status=active` on **every** login — self-healing, and solves the bootstrap problem (no pre-existing admin needed). Current admin: `sarayut.go@ksu.ac.th`.
- Admins can then change anyone else's role/status via [[Admin Console]].

## PrismaAdapter field mapping (bug-driven detail)

The stock adapter writes `image` and `emailVerified`, but the schema uses `avatarUrl` and has no `emailVerified`. `auth.ts` wraps `createUser`/`updateUser` to translate `image → avatarUrl` and drop `emailVerified`, and `linkAccount` to backfill `googleSub`. Without this, first login crashed with Prisma `Unknown argument 'image'`. See [[Bugs Fixed]].

## RBAC (`proxy.ts`)

```
public:    /login, /api/auth/*
unauth:    page → redirect /aipack/login ; api → JSON 401
!active:   → /pending-role (except that page)
/cat/*:    role cat|admin  else 403/redirect
/cam/*:    role cam|admin  else 403/redirect
/admin/*:  role admin      else 403/redirect
```

Home `/` redirect (`app/page.tsx`): admin → `/admin/users`, cam → `/cam/queue`, else → `/cat/upload`.

## The NextAuth basePath saga

Getting OAuth working under `/aipack` took **three** coordinated fixes (all in [[basePath & Deployment]] too):

1. **`NEXTAUTH_URL = http://host/aipack/api/auth`** — Auth.js derives its internal route prefix (`config.basePath`) from this pathname. Just the origin → `UnknownAction` on every endpoint.
2. **Route wrapper** in `app/api/auth/[...nextauth]/route.ts` — re-adds `/aipack` to `req.url` before calling `handlers`, because Next.js 16 strips the basePath from Route Handler URLs. Without it: `UnknownAction`, and the Google `redirect_uri` would drop `/aipack` → `redirect_uri_mismatch`.
3. **`trustHost: true`** in `auth.ts` — Auth.js v5 rejects unknown hosts in production (`UntrustedHost`) behind a reverse proxy (NFR-9.7).

Verified end-to-end: the sign-in POST redirects to Google with the correct `redirect_uri = http://host/aipack/api/auth/callback/google`.

## Session shape

`session.user` carries `id`, `role`, `status` (injected in the `session` callback) so pages/proxy can make RBAC decisions without re-querying.

## Related
- [[basePath & Deployment]] · [[Admin Console]] · [[Database Schema]] · [[Bugs Fixed]]
