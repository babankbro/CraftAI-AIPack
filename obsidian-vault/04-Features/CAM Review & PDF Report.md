---
tags: [feature, cam, report]
aliases: [CAM Review, PDF Report, Report]
---

# CAM Review & PDF Report

How a mentor (CAM) reviews an AI proposal and produces a signed report. See the flow in [[Upload-to-Report Pipeline]].

## Review queue (`/cam/queue`)

Scoped by `mentor_links` (a CAM sees plans of the CATs they're linked to; empty link set = all). Two sections:
- **Pending** (`waiting_cam` / `in_review`) — each shows AI suggested total + avg confidence + evidence checklist dots; "ตรวจ →" opens the evaluate page.
- **Done** — shows final score, plus **"แก้ไขการประเมิน"** (re-edit) and **"⬇ ดาวน์โหลดรายงาน PDF"** buttons (added in session).

## Evaluate page (`/cam/evaluate/[planId]`)

Side-by-side (Evidence-first):
- **Left**: extracted plan text (sticky, scrollable), OCR badge, **"📄 ดูไฟล์ต้นฉบับ"** — now opens the [[File Viewer]] page (in-browser PDF/DOCV render), not a raw download.
- **Right** (`EvaluateForm`): per criterion C1–C5 — the AI's deep analysis + a 4/3/2/1 level selector + a **"เหตุผลเพิ่มเติมของ CAM"** textarea for the CAM's own justification.

The AI analysis per criterion now shows (from the per-criterion evaluation — see [[AI Evaluation & Rubric]]):
- **ประโยคหลักฐาน** — every evidence quote (+page), i.e. the sentences that justified the score
- **คำแนะนำเพื่อปรับปรุง** — improvement suggestions
- **ตัวอย่างที่ดีขึ้น** — a concrete plan-specific example

The CAM's reasoning is stored in `final_evaluations.criteria_final[].reason` and pre-filled on re-edit.

## Sign-off (`/cam/summary/[planId]`)

- Shows total/band/PLC action + the "must not teach" warning for `developing`.
- `SignForm`: Strengths + Areas for Growth + position → **"✍ ลงนามและปิดผล"**.
- On sign (`POST /api/plans/[id]/final` with `sign=true`): computes total/band, generates the PDF, stores it in `alpr-reports`, sets `signed_at`, status → `done`.
- Every score confirm/adjust writes an `audit_logs` row (`ai_level → cam_level`), even if unchanged (research trail, FR-5.3).

Editing a `done` plan without re-signing moves it back to pending until re-signed (intentional — any edit needs re-confirmation).

## PDF report design (`lib/report.ts`, redesigned in session)

Built with `pdf-lib` + embedded IBM Plex Sans Thai (Regular + Bold). Structured, paginated, professional:

- Colored header band with title.
- **Section 1** — info panel (subject, grade, CAT/CAM names, date).
- **Section 2** — score summary: large total, colored quality-band badge, PLC action.
- **Per-criterion sections** (reflowed to a flowing layout so variable-length content paginates cleanly): CAM-confirmed + AI-proposed level badges, AI reasoning, **evidence quotes** (left-accented), **suggestions** (bulleted), a shaded **example** box, then the CAM's own reasoning, with a separator between criteria.
- **Section 4** — colored Strengths / Areas-for-Growth boxes.
- Signature line; automatic pagination.

Constraints learned:
- Font file **must** be present or it throws a clear error (no silent garbled Thai).
- **No emoji** — the Thai font lacks emoji glyphs (they render as tofu boxes); labels are plain bold text.
- Only affects reports generated **after** the change; already-signed plans keep the old PDF until re-signed.

## Download & permissions

`GET /api/plans/[id]/report` and `/download` return a short-lived presigned URL. Both check owner-or-CAM/admin. Report only exists once `signed_at` is set (AC-8). Presigning uses the **public** MinIO endpoint — see [[basePath & Deployment]].

## Related
- [[Upload-to-Report Pipeline]] · [[AI Evaluation & Rubric]] · [[Database Schema]] · [[Bugs Fixed]]
