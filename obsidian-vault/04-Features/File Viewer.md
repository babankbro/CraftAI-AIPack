---
tags: [feature, viewer, cat]
aliases: [File Viewer, Original File Viewer, CAT Views]
---

# File Viewer & CAT Views

## In-browser file viewer — `/plans/[id]/view`

A server-rendered page that shows the **original uploaded plan** directly in the browser (no download step). Permission: plan owner (CAT) or CAM/admin.

- **PDF** → embedded in an `<iframe>` via a short-lived presigned URL (browsers render PDF natively).
- **DOCX** → converted to HTML **server-side with mammoth** (`docxToHtml` in `lib/extract/docx.ts`) and rendered in a styled `.docx-preview` reader (browsers can't render `.docx` natively). Falls back to a "download instead" message if conversion fails.

Reached from the **"📄 ดูไฟล์ต้นฉบับ"** buttons on: [[CAM Review & PDF Report|cam/evaluate]], `cat/results`, and `cat/upload` — all now `Link ... target="_blank"` to this page (previously a raw download). Uses `getObjectBuffer` (added to `lib/storage.ts`) to pull the file from MinIO.

`.docx-preview` CSS (in `globals.css`) restores headings/lists/tables that Tailwind's reset strips from mammoth's HTML.

## CAT sees the AI draft *before* CAM confirms

A deliberate change from the original design (which only revealed results to the CAT after CAM sign-off). Rationale: give teachers early, actionable feedback while a plan waits in the queue.

- **`cat/upload`** (recent-uploads list): a "✨ AI เสนอ ~X/20" badge appears next to the status once the AI has evaluated, plus quick links to the file viewer and results.
- **`cat/results`**: for plans not yet signed, a clearly-labeled **draft** box ("ร่าง — ยังไม่ผ่านการยืนยันจากครูพี่เลี้ยง") shows per-criterion levels plus the full deep analysis: **evidence quotes** (the sentences that scored it), **suggestions**, and **example**. Once CAM signs, this is replaced by the confirmed result + PDF download.

The draft is unambiguously marked as an AI proposal that may change — preserving the [[Project Overview|human-in-the-loop]] principle (the CAM's confirmed score is still the only binding one).

## Related
- [[CAM Review & PDF Report]] · [[AI Evaluation & Rubric]] · [[Upload-to-Report Pipeline]] · [[Authentication & RBAC]]
