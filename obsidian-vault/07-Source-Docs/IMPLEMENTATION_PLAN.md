> [!info] Source document (original plan) — part of [[Source Documents]].
> Milestone status & as-built deviations: [[Milestones & Status]] · [[System Architecture]] · [[Build Session Changelog]].

# Implementation Plan — ALPR (Docker-based)
## ระบบตรวจประเมินแผนการจัดการเรียนรู้ AIPACK

| ฟิลด์ | รายละเอียด |
|-------|-----------|
| เวอร์ชัน | 1.0 |
| วันที่ | 1 กรกฎาคม 2569 |
| อ้างอิง | [SRS v1.2](SRS_AIPACK_LessonPlan_Review.md) · [Architecture](design_architecture.md) · [DB Schema v1.1](design_database_schema.md) · [UX/UI](UX_UI_Design_ALPR.md) |
| รันด้วย | **Docker Compose** (dev + prod) — `docker compose up` เดียวจบ |

> **หลักการ:** สร้างทีละ vertical slice, **ทุก milestone รันบน Docker ได้จริง** และตรวจ acceptance ก่อนไปต่อ

---

## 0. Stack & โครงสร้างโปรเจกต์
```
alpr/
├── docker-compose.yml            # dev: app + postgres + minio + createbuckets
├── docker-compose.prod.yml       # prod override (build standalone, ไม่ mount source)
├── Dockerfile                    # multi-stage (deps → build → runner standalone)
├── .env / .env.example
├── Makefile                      # ทางลัดคำสั่ง docker
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                   # rubric_versions/criteria + schools ตั้งต้น
├── src/
│   ├── app/                      # Next.js App Router (basePath /aipack)
│   │   ├── (auth)/login/
│   │   ├── cat/upload · cat/results
│   │   ├── cam/queue · cam/evaluate/[planId] · cam/summary/[planId]
│   │   └── api/                  # route handlers: auth, plans, ai, reports
│   ├── lib/
│   │   ├── db.ts                 # Prisma client
│   │   ├── storage.ts            # MinIO (S3) client + presigned URL
│   │   ├── ai/                   # AI Provider Abstraction
│   │   │   ├── index.ts (factory ตาม AI_PROVIDER)
│   │   │   ├── gemini.ts · openai.ts
│   │   │   └── schema.ts (Zod: CriteriaResult[])
│   │   ├── extract/              # pdf-parse / tesseract / mammoth
│   │   └── auth.ts               # Auth.js config (Google + allow-list)
│   └── components/               # UI (จาก design/*.html → React + Tailwind)
└── tests/
```
**Stack:** Next.js (App Router) · Tailwind + shadcn/ui · Prisma + PostgreSQL · MinIO (S3) · Auth.js (Google, DB session) · AI: Gemini/OpenAI (pluggable) · OCR: Tesseract(ไทย)+pdf-parse

---

## 1. Docker Setup

### 1.1 `docker-compose.yml` (dev)
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: alpr, POSTGRES_PASSWORD: alpr, POSTGRES_DB: alpr }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD","pg_isready","-U","alpr"], interval: 5s, retries: 10 }

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }
    ports: ["9000:9000","9001:9001"]
    volumes: [miniodata:/data]
    healthcheck: { test: ["CMD","mc","ready","local"], interval: 5s, retries: 10 }

  createbuckets:                     # สร้าง bucket ครั้งแรกแล้วจบ
    image: minio/mc
    depends_on: { minio: { condition: service_healthy } }
    entrypoint: >
      /bin/sh -c "mc alias set m http://minio:9000 minio minio12345 &&
                  mc mb -p m/alpr-plans m/alpr-reports m/alpr-extracted &&
                  mc anonymous set none m/alpr-plans; exit 0"

  app:
    build: { context: ., target: dev }
    command: sh -c "npx prisma migrate deploy && npm run dev"
    env_file: .env
    ports: ["3000:3000"]
    depends_on:
      postgres: { condition: service_healthy }
      minio:    { condition: service_healthy }
    volumes: ["./:/app","/app/node_modules"]   # hot reload

volumes: { pgdata: {}, miniodata: {} }
```

### 1.2 `Dockerfile` (multi-stage)
```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev            # ← dev target (hot reload)
COPY . .
EXPOSE 3000

FROM deps AS build          # ← prod build
COPY . .
RUN npx prisma generate && npm run build      # next standalone output

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node","server.js"]
```
- **OCR ในภาพ:** ติดตั้ง `tesseract-ocr tesseract-ocr-tha` ใน stage ที่รัน (apk add) หรือแยกเป็น service worker

### 1.3 `.env.example`
```
BASE_PATH=/aipack
NEXTAUTH_URL=http://localhost:3000/aipack/api/auth  # ต้องรวม /api/auth — next-auth ใช้ pathname นี้เป็น internal route prefix
NEXTAUTH_SECRET=changeme
DATABASE_URL=postgresql://alpr:alpr@postgres:5432/alpr
MINIO_ENDPOINT=minio  MINIO_PORT=9000  MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minio  MINIO_SECRET_KEY=minio12345
GOOGLE_CLIENT_ID=...  GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAIL_DOMAINS=ksu.ac.th
AI_PROVIDER=gemini            # gemini | openai
VERTEX_PROJECT=...  VERTEX_LOCATION=asia-southeast1
OPENAI_API_KEY=...  OPENAI_MODEL=gpt-...
```

### 1.4 `Makefile`
```
up:      docker compose up -d --build
down:    docker compose down
logs:    docker compose logs -f app
migrate: docker compose exec app npx prisma migrate dev
seed:    docker compose exec app npx prisma db seed
psql:    docker compose exec postgres psql -U alpr
```

---

## 2. Milestones (แต่ละอันรันบน Docker + มี acceptance)

### M0 — Infra & Scaffold ✅ รันได้
- [ ] `create-next-app` (App Router, TS, Tailwind) + ตั้ง `basePath:'/aipack'`, `output:'standalone'`
- [ ] ใส่ Dockerfile + docker-compose + Makefile + .env
- [ ] Prisma init + แปลง [DB schema](design_database_schema.md) → `schema.prisma` (13 ตาราง)
- **Acceptance:** `make up` → `http://localhost:3000/aipack` ขึ้นหน้า placeholder; `postgres`+`minio` healthy; migrate ผ่าน; buckets ถูกสร้าง

### M1 — Auth (Google + allow-list + DB session)
- [ ] Auth.js + Google provider + Prisma adapter (DB session ตามมติ ③)
- [ ] `signIn` callback: ตรวจ `ALLOWED_EMAIL_DOMAINS`, JIT upsert user (`pending_role`)
- [ ] Middleware RBAC: กันเส้นทาง CAT/CAM, cookie `Path=/aipack`
- [ ] หน้า Login (จาก `design/index.html`) + ปุ่ม Google จริง
- **Acceptance:** ล็อกอินด้วย Google ในโดเมนที่อนุญาตได้ → user ถูกสร้าง; อีเมลนอกโดเมนถูกปฏิเสธ (AC-10/11); logout ลบ session แถวใน DB

### M2 — Upload + MinIO Storage
- [ ] `lib/storage.ts` (S3 client, putObject, presigned GET/PUT)
- [ ] หน้า CAT Upload + API `POST /api/plans` (validate ชนิด/≤20MB → เก็บ `alpr-plans` → insert `lesson_plans` status=uploaded)
- [ ] Versioning (`previous_version_id`) + หน้า "ผลของฉัน" + presigned download
- **Acceptance:** อัปโหลด PDF/DOCX ได้จริง เห็นไฟล์ใน MinIO console (`:9001`), แถวใน `lesson_plans`; ดาวน์โหลดกลับได้ (AC ไฟล์)

### M3 — Extraction + OCR ไทย
- [ ] `lib/extract`: pdf-parse (text), Tesseract-tha (สแกน), mammoth (docx)
- [ ] ตรวจเช็กลิสต์หลักฐาน 5 รายการ → insert `extractions` (checklist JSONB)
- [ ] Background job (queue หรือ route async) + สถานะ `processing`→`ai_pending`
- **Acceptance:** อัปโหลด PDF สแกนภาษาไทย → มีข้อความใน `extractions.text`, `ocr_used=true`, checklist ครบ 5 (AC-1)

### M4 — AI Evaluation (Pluggable)
- [ ] `lib/ai`: interface `AiEvaluator` + factory ตาม `AI_PROVIDER`; `gemini.ts`, `openai.ts`
- [ ] Zod schema บังคับ output (C1–C5: level, reason, evidence[{quote,page}], confidence, no_evidence)
- [ ] เรียก AI → insert `ai_evaluations` (provider/model/rubric_version_id, หลายแถวได้ ตามมติ ①) → status=`waiting_cam`
- **Acceptance:** แผนตัวอย่างได้ผล C1–C5 ครบพร้อม evidence; เคสไม่มีหลักฐาน → `no_evidence=true` + level ต่ำ (AC-2/3); สลับ `AI_PROVIDER` แล้วยังทำงาน

### M5 — CAM Review + Audit
- [ ] หน้า Queue (view `cam_review_queue`) + หน้า Evaluate (side-by-side จาก `design/cam_evaluate.html`)
- [ ] ยืนยัน/แก้คะแนนรายข้อ → เขียน `audit_logs` (ai_level→cam_level) ทุกครั้ง
- [ ] คำนวณ total/band + PLC action (9–12 = warn "ห้ามใช้สอน")
- **Acceptance:** CAM แก้คะแนนแล้วมีแถวใน `audit_logs` (AC-4); band+PLC ถูกตาม §เกณฑ์ (AC-5/6)

### M6 — Summary, Sign & PDF Report
- [ ] หน้า Summary + Strengths/Growth + ลงนาม → set `signed_at`, `report_key`
- [ ] เรนเดอร์รายงาน PDF (Playwright/print) ตามฟอร์มต้นฉบับ → เก็บ `alpr-reports`
- [ ] CAT เห็นผล + ดาวน์โหลดหลังปิดผล
- **Acceptance:** ปิดผลต้องลงนามก่อน (AC-8); PDF ออกครบส่วน 1–4, CAT ดาวน์โหลดได้ (AC-7)

### M7 — Seed, Test, Hardening
- [ ] `prisma/seed.ts`: rubric_versions/criteria (AIPACK 5 องค์ประกอบ×4 ระดับ) + schools ตั้งต้น
- [ ] Unit (AI schema parse, scoring/band), integration (upload→AI→review), e2e (Playwright) หลัก ๆ
- [ ] Security: rate-limit upload, ตรวจ MIME จริง, presigned อายุสั้น, redact ชื่อก่อนส่ง AI, secrets ใน env
- **Acceptance:** `make seed` ได้ rubric/criteria; ชุดทดสอบผ่านใน CI (docker)

### M8 — Prod Deploy (KSU on-prem, subpath /aipack)
- [ ] `docker-compose.prod.yml`: build `runner` (standalone), `restart: always`, healthcheck, volume ถาวร
- [ ] ตั้งค่า Google OAuth redirect: `https://craftai.ksu.ac.th/aipack/api/auth/callback/google`
- [ ] Backup: cron `pg_dump` + MinIO versioning; ตั้ง `NEXTAUTH_URL`/`BASE_PATH` โปรดักชัน
- **Acceptance:** เข้าถึง `https://craftai.ksu.ac.th/aipack` ใช้งาน flow เต็มได้ (AC-9/12); รีสตาร์ตเครื่องแล้วบริการกลับมาเอง

---

## 3. ลำดับ Dependency
```
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
             └────────(M3,M4 ทำคู่ขนานได้บางส่วน)
```

## 4. Seed สำคัญ (M7)
- `rubric_versions`: `aipack-v1` (max 20)
- `rubric_criteria`: C1–C5 พร้อม `descriptors` ราย level 1–4 + signals (prompt, socratic, rubric, fact_check, think_trail)
- `schools`: โรงเรียนนำร่องในโครงการ (จ.กาฬสินธุ์)

## 5. ความเสี่ยง / ข้อควรระวัง
| ความเสี่ยง | การรับมือ |
|-----------|-----------|
| basePath หลุด (asset/redirect 404) | ตั้ง `basePath`+`assetPrefix`, ทดสอบ OAuth callback ใต้ `/aipack` ตั้งแต่ M1 |
| OCR ไทยช้า/แม่นยำ | รันเป็น worker แยก, cache ลง `alpr-extracted`, มี timeout |
| AI คืน JSON ผิดสคีมา | บังคับ structured output + Zod validate + retry |
| ข้อมูลอ่อนไหวไป AI | redact ชื่อ, ตั้ง no-retention (Vertex/OpenAI DPA) |
| ไฟล์ค้างเมื่อลบแถว | ลบ MinIO object คู่กับ CASCADE ในโค้ด |

---
*แผนพร้อมเริ่ม M0 — สั่ง "เริ่ม M0" เพื่อ scaffold โปรเจกต์ + Docker + Prisma schema ได้ทันที*
