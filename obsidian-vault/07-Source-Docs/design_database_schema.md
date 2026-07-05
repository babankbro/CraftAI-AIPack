> [!info] Source document (original DB design v1.1, 13 tables) — part of [[Source Documents]].
> As-built schema (14 tables incl. `app_settings`, + JSONB shapes): [[Database Schema]].

# Database Schema Design — ALPR (PostgreSQL)
## ระบบตรวจประเมินแผนการจัดการเรียนรู้ AIPACK

| ฟิลด์ | รายละเอียด |
|-------|-----------|
| เวอร์ชัน | 1.1 (ก่อน implement) |
| วันที่ | 1 กรกฎาคม 2569 |
| DBMS | PostgreSQL 16+ (ผ่าน Prisma) |
| อ้างอิง | [Architecture](design_architecture.md) · [SRS v1.2](SRS_AIPACK_LessonPlan_Review.md) |
| มติล่าสุด (v1.1) | ①เก็บผล AI **หลายครั้ง/หลาย provider** ต่อแผน · ②`schools` เป็นตารางแยก (normalize) · ③session แบบ **DB-backed** (เพิกถอนได้) · ④`rubric_versions` เป็นตารางอ้างอิง |

> **หลักการ:** ไฟล์ใหญ่ (แผน/รายงาน) เก็บใน **MinIO** — ตารางเก็บแค่ `*_key` อ้างอิง ·
> ทุกคะแนนอิงหลักฐาน (evidence trail) · ทุกการแก้คะแนน AI→CAM ลง **audit**

---

## 1. ERD (ภาพรวมความสัมพันธ์)
```
                    ┌──────────────┐
                    │    users     │  (CAT, CAM)
                    └──────┬───────┘
             cam_id ┌──────┴──────┐ cat_id
                    ▼             ▼
              ┌───────────────┐   │
              │ mentor_links  │   │ (CAM ↔ CAT)
              └───────────────┘   │
                                  ▼
                         ┌─────────────────┐   previous_version_id (self)
                         │  lesson_plans    │◄──────────┐
                         └───┬────┬────┬────┘           │
              1:1 │          │    │    └───────────────┘
        ┌─────────▼──┐  ┌────▼─────────┐  ┌──────────▼─────────┐
        │extractions │  │ai_evaluations│  │ final_evaluations   │
        │(text+OCR)  │  │(draft ราย C) │  │(CAM ยืนยัน+ลงนาม)   │
        └────────────┘  └──────────────┘  └─────────┬──────────┘
                                                    │ 1:N
                                          ┌─────────▼──────────┐
                                          │    audit_logs       │
                                          │ (ai_level→cam_level)│
                                          └────────────────────┘
```
ความสัมพันธ์:
- `users` 1—N `lesson_plans` (ครู CAT เป็นเจ้าของแผน)
- `mentor_links` เชื่อม CAM↔CAT (คู่ Mentor-Mentee, many-to-many)
- `lesson_plans` 1—1 `extractions`, 1—N `ai_evaluations` (เก็บได้หลายครั้ง/หลาย provider), 1—1 `final_evaluations`
- `final_evaluations` 1—N `audit_logs`
- `lesson_plans.previous_version_id` → self (v1→v2)

---

## 2. ENUM Types
```sql
CREATE TYPE user_role      AS ENUM ('cat', 'cam', 'admin');
CREATE TYPE user_status    AS ENUM ('active', 'pending_role', 'disabled');
CREATE TYPE plan_status    AS ENUM (
  'uploaded', 'processing', 'ai_pending', 'waiting_cam',
  'in_review', 'done', 'failed'
);
CREATE TYPE file_type      AS ENUM ('pdf', 'docx');
CREATE TYPE ai_provider    AS ENUM ('gemini', 'openai', 'claude');
CREATE TYPE quality_band   AS ENUM (
  'innovative_master',  -- 17–20 ต้นแบบสร้างสรรค์
  'fluent',             -- 13–16 เชี่ยวชาญช่ำชอง
  'developing',         -- 9–12  บ่มเพาะทักษะ (⚠️ ห้ามใช้สอนทันที)
  'emerging'            -- 5–8   เริ่มจุดประกาย
);
```

---

## 3. DDL (ตารางหลัก)

### 3.0 schools (มติ ② — normalize)
```sql
CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT UNIQUE,          -- รหัสสถานศึกษา (ถ้ามี)
  district   TEXT,                 -- อำเภอ/เขต (อปท.)
  province   TEXT DEFAULT 'กาฬสินธุ์',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schools_name ON schools(name);
```
- แยกตารางเพื่อรายงานรวมระดับโรงเรียน/เขต และลดข้อมูลซ้ำ

### 3.1 users
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub    TEXT UNIQUE NOT NULL,           -- Google account id (sub)
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  role          user_role   NOT NULL DEFAULT 'cat',
  status        user_status NOT NULL DEFAULT 'pending_role',
  school_id     UUID REFERENCES schools(id) ON DELETE SET NULL,   -- มติ ②
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_school ON users(school_id);
```
- `google_sub` = ตัวตนจาก Google (ระบุตัวตนเท่านั้น) · `role`/`status` ระบบกำหนดเอง
- ผู้ใช้ใหม่ผ่าน allow-list → `status='pending_role'` รอ admin กำหนดบทบาท

### 3.1.1 rubric_versions & rubric_criteria (มติ ④ — เกณฑ์เป็นตารางอ้างอิง)
```sql
CREATE TABLE rubric_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,       -- เช่น 'aipack-v1'
  title       TEXT NOT NULL,
  max_score   INT  NOT NULL DEFAULT 20,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rubric_criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  UUID NOT NULL REFERENCES rubric_versions(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,              -- 'C1'..'C5'
  ord         INT  NOT NULL,              -- ลำดับแสดง
  title       TEXT NOT NULL,              -- เช่น "ความสอดคล้องกับมาตรฐาน"
  max_level   INT  NOT NULL DEFAULT 4,
  descriptors JSONB NOT NULL,             -- เกณฑ์ราย level 1–4 + สัญญาณหลักฐาน
  UNIQUE (version_id, code)
);
CREATE INDEX idx_criteria_version ON rubric_criteria(version_id);
```
- เปลี่ยน rubric ได้โดยไม่แก้โค้ด · ผล AI/CAM อ้าง `rubric_version_id` เพื่อ reproducibility
- `descriptors` (JSONB) เก็บคำบรรยายราย level เช่น `[{"level":4,"text":"...","signals":["prompt","fact_check"]}, ...]`

### 3.2 mentor_links (CAM ↔ CAT)
```sql
CREATE TABLE mentor_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cam_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cat_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cam_id, cat_id),
  CHECK (cam_id <> cat_id)
);
CREATE INDEX idx_mentor_links_cat ON mentor_links(cat_id);
```

### 3.3 lesson_plans
```sql
CREATE TABLE lesson_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject              TEXT NOT NULL,             -- รายวิชา/เรื่องที่สอน
  topic                TEXT,
  grade                TEXT,                      -- เช่น "ม.2"
  version              INT  NOT NULL DEFAULT 1,
  previous_version_id  UUID REFERENCES lesson_plans(id) ON DELETE SET NULL,
  file_key             TEXT NOT NULL,             -- object key ใน MinIO (bucket alpr-plans)
  file_type            file_type NOT NULL,
  file_size_bytes      BIGINT,
  status               plan_status NOT NULL DEFAULT 'uploaded',
  error_message        TEXT,                      -- กรณี status='failed'
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plans_cat        ON lesson_plans(cat_id);
CREATE INDEX idx_plans_status     ON lesson_plans(status);
CREATE INDEX idx_plans_created    ON lesson_plans(created_at DESC);
```
- `file_key` ชี้ไฟล์ใน MinIO — **ไม่เก็บ blob ใน DB**
- เวอร์ชันใหม่ (v2) สร้างแถวใหม่ + `previous_version_id` ชี้ของเดิม

### 3.4 extractions (ผลสกัดข้อความ + checklist)
```sql
CREATE TABLE extractions (
  plan_id     UUID PRIMARY KEY REFERENCES lesson_plans(id) ON DELETE CASCADE,
  text        TEXT,                    -- ข้อความที่สกัดได้ (ใช้ป้อน AI)
  ocr_used    BOOLEAN NOT NULL DEFAULT false,
  page_count  INT,
  checklist   JSONB NOT NULL DEFAULT '[]',  -- เช็กลิสต์หลักฐาน 5 รายการ
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**รูปแบบ `checklist` (JSONB):**
```json
[
  {"key":"ai_tool",     "found":true,  "page":1},
  {"key":"prompt",      "found":false, "page":null},
  {"key":"socratic",    "found":true,  "page":3},
  {"key":"rubric",      "found":false, "page":null},
  {"key":"think_trail", "found":true,  "page":5}
]
```

### 3.5 ai_evaluations (ข้อเสนอจาก AI — draft)
```sql
CREATE TABLE ai_evaluations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        UUID NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  provider          ai_provider NOT NULL,
  model             TEXT NOT NULL,          -- เช่น "gemini-2.x" / "gpt-x"
  rubric_version_id UUID NOT NULL REFERENCES rubric_versions(id),  -- มติ ④
  criteria          JSONB NOT NULL,         -- ผลราย C1–C5 (ดูรูปแบบด้านล่าง)
  suggested_total INT,                      -- รวมที่ AI เสนอ (0–20)
  prompt_hash    TEXT,                      -- reproducibility
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_eval_plan ON ai_evaluations(plan_id, created_at DESC);
```
- **มติ ① — เก็บได้หลายแถวต่อแผน** (หลายครั้ง/หลาย provider): ประวัติการประเมินซ้ำ + เทียบ Gemini↔OpenAI; ดึง "ล่าสุด" ด้วย index `(plan_id, created_at DESC)`
**รูปแบบ `criteria` (JSONB) — ใช้ร่วมกับ final_evaluations:**
```json
[
  {
    "code": "C1",
    "level": 3,
    "reason": "พบเชื่อม CK↔RL แต่ยังไม่เชื่อม AI",
    "evidence": [{"quote":"เชื่อมโยงเป้าหมายการอ่าน...","page":2}],
    "confidence": "high",          // high | medium | low
    "no_evidence": false
  }
  // ... C2–C5 (ถ้า no_evidence=true → level ต่ำ ห้ามเดาสูง)
]
```

### 3.6 final_evaluations (CAM ยืนยัน + ลงนาม)
```sql
CREATE TABLE final_evaluations (
  plan_id          UUID PRIMARY KEY REFERENCES lesson_plans(id) ON DELETE CASCADE,
  cam_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  based_on_ai_id    UUID REFERENCES ai_evaluations(id) ON DELETE SET NULL,  -- แถว AI ที่ CAM ใช้เป็นฐาน (มติ ①)
  rubric_version_id UUID NOT NULL REFERENCES rubric_versions(id),           -- มติ ④
  criteria_final    JSONB NOT NULL,          -- ราย C1–C5 (ค่าที่ CAM ยืนยัน)
  total            INT  NOT NULL CHECK (total BETWEEN 0 AND 20),
  band             quality_band NOT NULL,
  plc_action       TEXT,
  strengths        TEXT,                    -- 4.1 จุดเด่น
  areas_for_growth TEXT,                    -- 4.2 จุดเติมเต็ม
  report_key       TEXT,                    -- รายงาน PDF ใน MinIO (alpr-reports)
  signature        TEXT,                    -- ชื่อ/ลายเซ็นดิจิทัล
  position         TEXT,
  signed_at        TIMESTAMPTZ,             -- NULL = ยังไม่ปิดผล
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_final_cam ON final_evaluations(cam_id);
```
- ผล **สมบูรณ์เมื่อ `signed_at IS NOT NULL`** (ตาม AC-8) · ก่อนหน้านั้นเป็น draft ของ CAM
- `total` ควรตรงกับผลรวม level ใน `criteria_final` (บังคับที่ application layer)

### 3.7 audit_logs (ประวัติการแก้คะแนน AI→CAM)
```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  criterion   TEXT NOT NULL,               -- 'C1'..'C5'
  ai_level    INT,                         -- AI เสนอ
  cam_level   INT NOT NULL,                -- CAM เลือก
  changed_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_plan ON audit_logs(plan_id, created_at);
```
- เขียนทุกครั้งที่ CAM ยืนยัน/แก้ (แม้ค่าเท่า AI ก็บันทึกเพื่อร่องรอยการวิจัย)

---

## 4. Sessions — DB-backed (มติ ③)
เลือก **database session** ของ Auth.js (Prisma Adapter) เพื่อให้ **เพิกถอน session ได้ทันที** เมื่อเปลี่ยนบทบาท/ปิดบัญชี (สำคัญกับข้อมูลอ่อนไหว)
```sql
CREATE TABLE accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,          -- 'google'
  provider_account_id TEXT NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,                   -- ถ้าขอ scope Drive/offline
  expires_at          BIGINT,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  UNIQUE (provider, provider_account_id)
);
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires       TIMESTAMPTZ NOT NULL
);
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```
- เพิกถอน = ลบแถวใน `sessions` · cookie ยังตั้ง `Path=/aipack` (subpath)

---

## 5. Indexes & Constraints สรุป
| ตาราง | หลัก | เสริม |
|-------|------|-------|
| schools | PK id · UNIQUE code | name |
| users | PK id · UNIQUE google_sub, email · FK school_id | role, school_id |
| rubric_versions | PK id · UNIQUE code | — |
| rubric_criteria | PK id · UNIQUE(version_id,code) | version_id |
| mentor_links | UNIQUE(cam_id,cat_id) · CHECK cam≠cat | cat_id |
| lesson_plans | PK id · FK cat_id | status, created_at, cat_id |
| extractions | PK=plan_id (1:1) | — |
| ai_evaluations | PK id · FK plan_id, rubric_version_id | (plan_id, created_at) |
| final_evaluations | PK=plan_id (1:1) · FK rubric_version_id · CHECK total 0–20 | cam_id |
| audit_logs | PK id · FK plan_id | (plan_id, created_at) |
| accounts / sessions | Auth.js (DB-backed) | user_id |

---

## 6. View ช่วยงาน (ออปชัน) — คิวของ CAM
```sql
CREATE VIEW cam_review_queue AS
SELECT p.id, p.subject, p.version, p.status, p.created_at,
       u.name AS cat_name,
       ae.suggested_total AS ai_total,
       ae.criteria        AS ai_criteria
FROM lesson_plans p
JOIN users u ON u.id = p.cat_id
LEFT JOIN LATERAL (
  SELECT * FROM ai_evaluations a
  WHERE a.plan_id = p.id ORDER BY a.created_at DESC LIMIT 1
) ae ON true
WHERE p.status IN ('waiting_cam','in_review');
```

---

## 7. หมายเหตุ PDPA / Data Lifecycle
- ไม่มี blob ไฟล์ใน DB — เก็บแค่ `file_key`/`report_key` (ไฟล์จริงอยู่ MinIO เข้ารหัส)
- `updated_at` อัปเดตด้วย trigger `BEFORE UPDATE` (หรือจัดการที่ Prisma middleware)
- นโยบายลบข้อมูล: ลบ `lesson_plans` → CASCADE ลบ extractions/ai_evaluations/final/audit ที่ผูกไว้ (ต้องลบไฟล์ใน MinIO คู่กันในโค้ด)
- พิจารณา retention: เก็บผลเพื่อการวิจัยตามกำหนดโครงการ แล้ว purge

---

## 8. ข้อสรุป (ปิดประเด็นแล้ว v1.1)
- ✅ **① เก็บผล AI หลายครั้ง/หลาย provider** ต่อแผน — `ai_evaluations` เป็นหลายแถว (ประวัติ + เทียบ Gemini↔OpenAI), ดึงล่าสุดด้วย index
- ✅ **② `schools` เป็นตารางแยก** (normalize) — `users.school_id` FK; รองรับรายงานรวมระดับโรงเรียน/เขต
- ✅ **③ Session DB-backed** — ตาราง `accounts/sessions/verification_tokens` (Auth.js Prisma Adapter) เพิกถอนได้ทันที
- ✅ **④ `rubric_versions` + `rubric_criteria` เป็นตารางอ้างอิง** — `ai_evaluations`/`final_evaluations` ใช้ `rubric_version_id`

---
*Schema v1.1 — ปิดประเด็นครบ พร้อมแปลงเป็น Prisma schema (`schema.prisma`) และ migration แรกได้ทันที*
