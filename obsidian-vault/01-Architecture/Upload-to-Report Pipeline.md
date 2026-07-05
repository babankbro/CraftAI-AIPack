---
tags: [architecture, flow]
aliases: [Pipeline, Processing Flow]
---

# Upload-to-Report Pipeline

The end-to-end flow from a CAT uploading a plan to a CAT downloading a signed report.

## Stages & status transitions

`lesson_plans.status` moves through:
`uploaded → processing → ai_pending → waiting_cam → in_review → done` (or `failed`).

```
CAT uploads plan  (POST /api/plans)
  → validate type/size (≤20 MB, PDF/DOCX)
  → putObject → MinIO alpr-plans → insert lesson_plans (status=uploaded)
  → fire-and-forget: processPlan(planId)     [lib/pipeline.ts]

processPlan:
  status=processing
  → extract text                              [lib/extract]
      PDF: pdf-parse; pages with <20 chars → getScreenshot() → Tesseract tha+eng (OCR)
      DOCX: mammoth
  → build 5-signal checklist (heuristic keywords)
  → upsert extractions (text, ocr_used, page_count, checklist)
  status=ai_pending
  → getAiEvaluator() (DB app_settings → env fallback)   [lib/ai]
  → evaluate PER CRITERION: 5 sequential focused calls (C1→C5), each returns
     evidence + suggestions + example; base.ts assembles + retries bad JSON
  → Zod-validated → insert ai_evaluations
  status=waiting_cam
  (any error → status=failed + error_message, logged, not rethrown)

CAM review  (page cam/evaluate/[planId])
  → sees plan text + full AI analysis (evidence/suggestions/example) per criterion
  → confirms/adjusts each C1–C5 level + optional reasoning
  → POST /api/plans/[id]/final (sign=false) → status=in_review, writes audit_logs
  → summary page → sign=true:
      compute total/band/plc → generateReportPdf → MinIO alpr-reports
      → final_evaluations (signed_at set) → status=done

CAT  (cat/upload / cat/results)
  → sees AI draft early (labeled, pre-sign); after sign → presigned report PDF
  → "ดูไฟล์ต้นฉบับ" → in-browser [[File Viewer]]
```

## Key modules

| File | Role |
|------|------|
| `lib/pipeline.ts` | Orchestrates extract → AI; sets status; never leaves a plan hanging silently (always `failed` + message on error) |
| `lib/extract/pdf.ts` | pdf-parse text; OCR fallback for scanned pages; **sets pdf.worker path explicitly** (Turbopack breaks auto-detect — see [[Bugs Fixed]]) |
| `lib/extract/checklist.ts` | Keyword heuristic for the 5 evidence signals |
| `lib/ai/index.ts` | `getAiEvaluator()` — async factory reading `app_settings` then env |
| `lib/ai/base.ts` | `BaseAiEvaluator` — sequential per-criterion loop + JSON unwrap/clean/retry; providers only implement `runJson` |
| `lib/scoring.ts` | `computeTotalAndBand()` — sums 5 criteria, maps band |
| `lib/report.ts` | `generateReportPdf()` — pdf-lib, AI-vs-CAM + evidence/suggestions/example |
| `lib/storage.ts` | MinIO put/get/getObjectBuffer + presigned URLs (dual client for public endpoint) |

## The 5-item evidence checklist (pre-flight)

Detected before AI runs, shown to CAM as a quick signal (found/not-found + page). Keys: `ai_tool`, `prompt`, `socratic`, `rubric`, `think_trail`. This is a heuristic — the real score comes from AI + CAM confirmation.

## Notes

- Processing is **fire-and-forget** from the upload POST (doesn't block the CAT's response). NFR-2 target: ≤90 s — the sequential per-criterion approach runs ~114 s on Gemini (accepted trade for depth); `gpt-5.5-pro` is ~10 min. See [[AI Evaluation & Rubric#Model selection & the speed/cost reality measured]].
- The DB must be **seeded** first (`prisma db seed`) — the pipeline reads `rubric_versions` (`aipack-v1`); an unseeded DB makes it fail at the AI stage. See [[Bugs Fixed]].
- `ai_evaluations` can have **multiple rows** per plan (re-runs, different providers); the latest is used.

## Related
- [[AI Evaluation & Rubric]] · [[CAM Review & PDF Report]] · [[Database Schema]] · [[System Architecture]]
