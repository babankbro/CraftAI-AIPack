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
- **Left**: extracted plan text (sticky, scrollable), OCR badge, **"📄 ดูไฟล์ต้นฉบับ"** button (view original upload via presigned URL — added in session).
- **Right** (`EvaluateForm`): per criterion C1–C5 — the AI's proposed level, reasoning, confidence, and evidence quote; a 4/3/2/1 level selector for the CAM; **and a "เหตุผลเพิ่มเติมของ CAM" textarea** (added in session) so the CAM records their own justification.

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
- **Per-criterion comparison cards** — AI proposed level + reasoning + confidence side-by-side with CAM's confirmed level + CAM's own reasoning; color-coded badges (AI = primary, CAM = green).
- **Section 4** — colored Strengths / Areas-for-Growth boxes.
- Signature line; automatic pagination (long text flows to page 2 without splitting a card).

Constraints learned:
- Font file **must** be present or it throws a clear error (no silent garbled Thai).
- **No emoji** — the Thai font lacks emoji glyphs (they render as tofu boxes); labels are plain bold text.
- Only affects reports generated **after** the change; already-signed plans keep the old PDF until re-signed.

## Download & permissions

`GET /api/plans/[id]/report` and `/download` return a short-lived presigned URL. Both check owner-or-CAM/admin. Report only exists once `signed_at` is set (AC-8). Presigning uses the **public** MinIO endpoint — see [[basePath & Deployment]].

## Related
- [[Upload-to-Report Pipeline]] · [[AI Evaluation & Rubric]] · [[Database Schema]] · [[Bugs Fixed]]
