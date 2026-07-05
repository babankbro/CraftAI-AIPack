> [!info] Source document (original architecture design) — part of [[Source Documents]].
> As-built architecture: [[System Architecture]] · [[Tech Stack]] · [[basePath & Deployment]] (see the "Deviations from the original design" table there).

# สถาปัตยกรรมระบบ (Design Architecture) — ALPR
## ระบบตรวจประเมินแผนการจัดการเรียนรู้ AIPACK

| ฟิลด์ | รายละเอียด |
|-------|-----------|
| เวอร์ชัน | 1.2 (ก่อน implement) — subpath ตรงผ่าน Next.js basePath (ไม่ใช้ reverse proxy) + AI provider เลือกได้ |
| วันที่ | 1 กรกฎาคม 2569 |
| อ้างอิง | [SRS v1.2](SRS_AIPACK_LessonPlan_Review.md) · [UX/UI](UX_UI_Design_ALPR.md) · [Forms](assessment_forms_reference.md) |
| สถานะ | Design only — ยังไม่ implement |

---

## 1. บทสรุปการตัดสินใจเชิงสถาปัตยกรรม (Key Decisions)
| ด้าน | ตัวเลือกที่เลือก | เหตุผล |
|------|------------------|--------|
| **Hosting** | KSU on-prem / VM (โดเมนเดียวกับ DigiNest LMS) | คุมข้อมูลเอง, PDPA, อยู่ใต้ `craftai.ksu.ac.th` |
| **ที่เก็บไฟล์** | Object storage เอง — **MinIO** (S3-compatible) | ไฟล์แผน/รายงานอยู่ในเครื่อง KSU, presigned URL, คุม lifecycle |
| **ฐานข้อมูล** | **PostgreSQL** | รองรับ JSONB (ผล AI รายข้อ), audit, ธุรกรรมชัด |
| **AI** | **เลือกได้ (Pluggable):** Google Gemini (Vertex AI) **หรือ** OpenAI API | สลับผู้ให้บริการผ่าน config; มัลติโมดัลอ่าน PDF ไทย, ต้องตั้ง no-training/data governance ทุกเจ้า |
| **Auth** | Google OAuth 2.0 / OIDC (ระบุตัวตนเท่านั้น) | ครูมีบัญชี Google, ไม่ต้องจัดการรหัสผ่าน |
| **Deploy path** | **Subpath ตรง `/aipack`** ด้วย Next.js `basePath` (ไม่ใช้ reverse proxy แยก) | เข้าถึง `craftai.ksu.ac.th/aipack`, กลมกลืนกับ `/lms` |

> **แยกให้ชัด:** Google ใช้ **ระบุตัวตน** เท่านั้น — **ไฟล์และผลเก็บใน MinIO/Postgres ของ KSU** ไม่ได้เก็บใน Google Drive

---

## 2. ภาพรวมสถาปัตยกรรม (High-Level)
> **การเข้าถึงเป็น subpath ตรง ๆ** ผ่าน Next.js `basePath=/aipack` — **ไม่มี reverse-proxy layer แยก**
> เข้าถึงที่ `http://craftai.ksu.ac.th/aipack` (โมดูลอิสระ อยู่ข้าง `/lms` บนโดเมนเดียวกัน)
```
   Browser → http://craftai.ksu.ac.th/aipack/...
                        │
                        ▼  (Next.js จัดการ basePath=/aipack เอง ทุก route/asset/api)
        ┌───────────────────────────┐   OAuth    ┌───────────────────┐
        │  Next.js App (ALPR)        │◄──────────►│  Google Identity   │ (ระบุตัวตน)
        │  - หน้า UI (SSR)           │            └───────────────────┘
        │  - Route Handlers /aipack/api                
        │  - Auth (Auth.js)          │───OCR────►┌───────────────────┐
        │  รับฟังพอร์ตเดียว เสิร์ฟทุกอย่าง        │  OCR (Tesseract    │
        │  ใต้ /aipack                │           │  ไทย) / pdf parse  │
        └──┬────────┬────────────────┘           └───────────────────┘
           │        │                                  │ ข้อความ
     SQL   │        │  S3 API                 ┌────────▼─────────────────┐
     ┌─────▼───┐  ┌─▼──────────┐              │ AI Provider Abstraction   │
     │Postgres │  │  MinIO      │             │  ├─ Gemini (Vertex AI)    │
     │(ข้อมูล) │  │  (ไฟล์)     │             │  └─ OpenAI API            │
     └─────────┘  └────────────┘              │  (เลือกด้วย AI_PROVIDER)   │
                                              └──────────────────────────┘

หมายเหตุ: /lms (DigiNest LMS เดิม) และ /aipack เป็นคนละแอป แชร์โดเมนเดียวกัน
โดยแต่ละแอปรับผิดชอบ subpath ของตัวเอง (path-based) — ไม่ต้องมี proxy กลางมาroute
```

---

## 3. Tech Stack
| ชั้น | เทคโนโลยี |
|------|-----------|
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui (theme ตรง LMS: Prompt/IBM Plex, hue 225) |
| Backend | Next.js Route Handlers (Node.js) — เรียก Gemini, MinIO, Postgres |
| Auth | Auth.js (NextAuth) — Google provider + domain allow-list |
| DB | PostgreSQL + Prisma (ORM) |
| ไฟล์ | MinIO (S3 SDK, presigned URL) |
| OCR/parse | pdf-parse (PDF ข้อความ) + Tesseract OCR (ไทย) สำหรับสแกน · mammoth (DOCX) |
| AI | **AI Provider Abstraction** — สลับได้: Google Gemini (Vertex AI) / OpenAI API (เพิ่ม Claude ได้ในอนาคต); ทุกเจ้าใช้ structured output (JSON schema เดียวกัน) |
| รายงาน PDF | เรนเดอร์ฝั่งเซิร์ฟเวอร์ (เช่น Playwright/print) จากเทมเพลตฟอร์มต้นฉบับ |
| Deploy | Docker Compose (app + postgres + minio) หลัง Nginx |

---

## 4. ที่เก็บข้อมูล (Storage Design) — ตอบโจทย์หลัก

### 4.1 MinIO — ไฟล์ (Buckets)
| Bucket | เก็บอะไร | เข้าถึง |
|--------|----------|---------|
| `alpr-plans` | ไฟล์แผนต้นฉบับที่ครูอัปโหลด (PDF/DOCX) แยกตาม `plan_id/version` | presigned URL, private |
| `alpr-reports` | รายงานผลประเมิน PDF ที่ระบบสร้าง | presigned URL, private |
| `alpr-extracted` (ออปชัน) | ข้อความ/ภาพหน้า ที่สกัดไว้ (cache OCR) | private |
- **ไม่เปิด public** — ทุกการเข้าถึงผ่าน presigned URL อายุสั้นที่ backend ออกให้เฉพาะเจ้าของ/CAM ที่ดูแล
- Object key: `plans/{plan_id}/{version}/{uuid}.pdf`

### 4.0 AI Provider Abstraction (เลือกโมเดลได้)
เลเยอร์กลางให้สลับผู้ให้บริการ AI โดยไม่แตะ business logic:
```
interface AiEvaluator {
  evaluatePlan(text, images[], rubric): Promise<CriteriaResult[]>
}
  ├─ GeminiEvaluator  (Vertex AI · gemini-*)
  └─ OpenAiEvaluator  (OpenAI API · gpt-*)
เลือกด้วย env: AI_PROVIDER = "gemini" | "openai"
```
- **สัญญาเดียวกัน:** ทุก provider คืน JSON schema เดียว → `{code C1–C5, level, reason, evidence[{quote,page}], confidence}` (business logic ไม่ต้องรู้ว่าใครประเมิน)
- ตาราง `ai_evaluations` เก็บ `provider` + `model` ต่อครั้งอยู่แล้ว → เทียบผล/reproducibility ข้าม provider ได้
- ตั้งค่าได้ระดับ deploy (ทั้งระบบ) หรือเปิดให้ admin สลับ; รองรับ **fallback** เมื่อเจ้าหนึ่งล่ม
- ทั้งสองเจ้ารองรับมัลติโมดัล (อ่าน PDF/ภาพหน้าแผน) และ structured output

### 4.2 PostgreSQL — ข้อมูลโครงสร้าง (Schema ย่อ)
```
users(id, google_sub, email, name, avatar_url, role[CAT|CAM],
      school, status[active|pending_role], created_at)
mentor_links(cam_id → users, cat_id → users)
lesson_plans(id, cat_id, subject, topic, grade, version,
      file_key, file_type, status, created_at)          -- file_key ชี้ MinIO
extractions(plan_id, text, ocr_used, checklist JSONB, created_at)
ai_evaluations(plan_id, provider, model, rubric_version,
      criteria JSONB, created_at)                        -- ผล AI รายข้อ C1–C5
final_evaluations(plan_id, cam_id, criteria_final JSONB, total,
      band, plc_action, strengths, areas_for_growth,
      report_key, signature, signed_at)                  -- report_key ชี้ MinIO
audit_logs(id, plan_id, criterion, ai_level, cam_level,
      changed_by, created_at)                            -- ประวัติ AI→CAM
```
- **แยกหน้าที่:** ไฟล์ใหญ่ → MinIO · เมทาดาทา/คะแนน/audit → Postgres (เก็บแค่ `file_key` อ้างอิง)
- `criteria JSONB` เก็บ `{code, level, reason, evidence[{quote,page}], confidence}` ต่อองค์ประกอบ

---

## 5. Authentication Flow (Google OAuth)
```
1. ผู้ใช้กด "เข้าสู่ระบบด้วย Google"  → Auth.js → Google consent
2. callback: /aipack/api/auth/callback/google
3. ตรวจ domain allow-list (เช่น @ksu.ac.th หรือ list) — นอกรายการ = ปฏิเสธ
4. upsert users (JIT); ถ้าใหม่ → status=pending_role
5. สร้าง session cookie (HttpOnly+Secure+SameSite, Path=/aipack)
6. RBAC middleware: กันเส้นทางตามบทบาท (CAT/CAM)
```
- บทบาท CAT/CAM **ระบบกำหนด** ไม่ได้มาจาก Google
- Redirect URI ต้องรวม basePath (จุดพลาดบ่อยตอน deploy ใต้ sub-path)

---

## 6. Flow หลัก: อัปโหลด → ประเมิน → ยืนยัน → รายงาน
```
CAT อัปโหลดแผน
  → API รับไฟล์ → validate (ชนิด/ขนาด ≤20MB)
  → เก็บลง MinIO (alpr-plans) → insert lesson_plans (status=processing)
  → สกัดข้อความ: PDF text / OCR ไทย (ถ้าสแกน) / DOCX
  → insert extractions + checklist 5 รายการ
  → เรียก AI provider ที่เลือก (Gemini/OpenAI ผ่าน abstraction): ส่งข้อความ+เกณฑ์ AIPACK → structured JSON
       (แต่ละ C1–C5: level, reason, evidence{quote,page}, confidence;
        ถ้าไม่พบหลักฐาน → "ไม่พบ" + ระดับต่ำ ห้ามเดาสูง)
  → insert ai_evaluations (draft) → status=waiting_cam

CAM ตรวจ (side-by-side)
  → ยืนยัน/แก้ระดับรายข้อ → ทุกการแก้ insert audit_logs (ai_level→cam_level)
  → เขียน Strengths/Growth → คำนวณ total/band/PLC → ลงนาม
  → สร้างรายงาน PDF → เก็บ MinIO (alpr-reports) → final_evaluations (signed)
  → status=done

CAT ดูผล → presigned URL ดาวน์โหลดรายงาน
```

---

## 7. Deployment (On-Prem · Subpath ตรง)
- **แนวคิด:** แอปเดียวรับฟังพอร์ตของตัวเอง และ **Next.js จัดการ subpath `/aipack` เองทั้งหมด** (page routes, static assets `/_next`, API `/aipack/api`) — ไม่มี proxy กลางมา rewrite/route
- **Next.js config:** `basePath: '/aipack'` + `assetPrefix: '/aipack'` (Next ผูก path ให้ทุก asset/route อัตโนมัติ)
- **Docker Compose:** `app` (Next.js, expose port) · `postgres` · `minio` (+ `minio-console`) — app เข้าถึงตรงที่ `craftai.ksu.ac.th/aipack`
- **การอยู่ร่วมกับ `/lms`:** สองแอปแยกกัน แชร์โดเมนแบบ path-based (host ผูก `/lms`→LMS, `/aipack`→ALPR ที่ระดับ host/DNS/port mapping) โดย **ไม่ต้องเขียน reverse-proxy routing เพิ่ม** ในฝั่งแอป
- **Env:** `BASE_PATH=/aipack`, `DATABASE_URL`, `MINIO_*`, `GOOGLE_CLIENT_ID/SECRET`, `ALLOWED_EMAIL_DOMAINS`, `NEXTAUTH_URL=https://craftai.ksu.ac.th/aipack`
  - **AI:** `AI_PROVIDER=gemini|openai` · (Gemini) `VERTEX_PROJECT/LOCATION` · (OpenAI) `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` (ออปชัน — เผื่อ Azure OpenAI/proxy)
- **Backup:** `pg_dump` ตามรอบ + MinIO versioning/replication; เก็บ log แยก

---

## 8. ความปลอดภัย & PDPA (ข้อมูลครู/นักเรียน)
- ข้อมูลอยู่ในเครื่อง KSU ทั้งหมด (ไฟล์+DB) — เข้ารหัส at-rest (disk/MinIO SSE) + in-transit (HTTPS)
- MinIO private + presigned URL อายุสั้น เฉพาะเจ้าของ/CAM
- **AI (ทุก provider):** ต้องตั้ง **ปิดการนำข้อมูลไปเทรน / no data retention** เสมอ — Gemini via **Vertex AI** (data governance, เลือก region); OpenAI ใช้ **API แบบ zero data-retention/Enterprise** (ข้อมูลไม่ถูกนำไปเทรนโดยดีฟอลต์บน API แต่ควรยืนยัน retention window/DPA); พิจารณา redact ชื่อนักเรียนก่อนส่งทุกเจ้า
- Audit log ครบทุกการเปลี่ยนคะแนนและการเข้าถึงไฟล์
- Session: HttpOnly+Secure+SameSite, scope `Path=/aipack`

---

## 9. Non-Functional & Scaling
- ประเมิน 1 แผน (≤30 หน้า) ≤ 90 วิ (async job + สถานะ polling)
- งานหนัก (OCR/Gemini) แยกเป็น background worker/queue ได้ถ้าโหลดเยอะ
- Stateless app (scale horizontal ได้), state อยู่ที่ Postgres+MinIO
- รองรับ dark/light ตาม LMS · desktop+tablet

---

## 10. ประเด็นเปิด / ต้องยืนยันก่อน implement
1. **ค่า basePath จริง** (`/aipack` ?) และ host ผูก subpath ให้ ALPR ที่ระดับไหน (DNS/port/ที่ตั้งบนเครื่องเดียวกับ LMS) — เนื่องจากไม่ใช้ reverse proxy แยก
2. **โดเมนอีเมลที่อนุญาต** — `@ksu.ac.th` เท่านั้น หรือครู อปท. ใช้ Gmail ส่วนตัว (ต้อง allow-list รายอีเมล)
3. **AI provider เริ่มต้น** = Gemini หรือ OpenAI? และพร้อมใช้ไหม — Gemini ต้องมี GCP project/billing (Vertex); OpenAI ต้องมี API key (+ยืนยัน zero-retention/DPA). ทั้งคู่สลับได้ภายหลังผ่าน `AI_PROVIDER`
4. **DB/สตอเรจ:** ตั้ง Postgres+MinIO ใหม่เฉพาะ ALPR หรือใช้ instance ที่ KSU มีอยู่
5. **การกำหนดบทบาทผู้ใช้ใหม่** (pending_role): admin อนุมัติ หรือ auto=CAT
6. **รายงาน PDF:** ต้องตรงฟอร์มต้นฉบับเป๊ะแค่ไหน (เลย์เอาต์ราชการ)

---
*เอกสารสถาปัตยกรรมก่อน implement — เมื่อยืนยันประเด็นข้อ 10 จะเริ่ม scaffold Next.js + Docker Compose ตามนี้ได้*
