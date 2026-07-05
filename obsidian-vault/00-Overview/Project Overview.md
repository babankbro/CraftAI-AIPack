---
tags: [overview]
---

# Project Overview

ALPR (**AIPACK Lesson Plan Review**) is a web application where teachers upload lesson plans, an **AI proposes scores with evidence**, and a **human mentor confirms or adjusts** them before a signed report is issued. Built for an action-research project in **Kalasin province (จ.กาฬสินธุ์)** to develop students' **Reading Literacy (RL)** and **Critical Thinking (CT)** through teacher development and AI integration.

Scope this round: **Form 3 only** — evaluating the lesson plan (`/20`). See [[Assessment Forms]] for the two out-of-scope forms.

## Core design principles

1. **Evidence-based always** — every score cites a quote + page from the plan. AI must never give a "floating" score.
2. **Human-in-the-loop** — the final score belongs to the **CAM only**; AI is an assistant that proposes a draft.
3. **4-level rubric** — Innovative Master (4) / Fluent (3) / Developing (2) / Emerging (1).
4. **Kalyanamitra feedback** (กัลยาณมิตร) — results carry both Strengths and Areas for Growth; positive, non-judgmental tone.

## User roles

| Role | Thai | Can do |
|------|------|--------|
| **CAT** | ครูผู้สอน | Upload plans, track status, view results & feedback, download PDF, upload revised versions |
| **CAM** | ครูพี่เลี้ยง | See review queue, view AI proposals side-by-side with the plan, confirm/adjust each score + add reasoning, write feedback, digitally sign & close |
| **admin** | ผู้ดูแลระบบ | Everything CAM can + manage user roles/status + choose AI provider/model (see [[Admin Console]]) |

Roles are **system-assigned**, not derived from Google. See [[Authentication & RBAC]].

## The evaluation model (heart of the system)

5 criteria, each scored 1–4 → **total /20** → mapped to a quality **band** → each band triggers an automatic **PLC Action**. Full detail in [[AI Evaluation & Rubric]].

| Score | Band | PLC Action (auto) |
|-------|------|-------------------|
| 17–20 | ต้นแบบสร้างสรรค์ (Innovative Master) | Promote as best practice / lead trainer |
| 13–16 | เชี่ยวชาญช่ำชอง (Fluent) | Minor polish, ready to teach |
| 9–12 | บ่มเพาะทักษะ (Developing) | ⚠️ **Must NOT be used to teach yet** — mentor session required |
| 5–8 | เริ่มจุดประกาย (Emerging) | Full PLC co-design / rebuild |

## The 6 main screens (SRS §6)

1. **Login** — Google OAuth only, no password
2. **CAT — Upload** (Section 1 form + drag-drop + status)
3. **CAT — My Results** (score /20, band, feedback, PDF download)
4. **CAM — Review Queue** (list + status + avg AI confidence)
5. **CAM — Evaluate** (⬅ plan text + evidence | ➡ 5 criteria to confirm/adjust)
6. **CAM — Summary & Sign** (total, band, PLC action, Strengths/Growth, signature)

Plus, added during the build: **`/admin/users`** and **`/admin/settings`** (see [[Admin Console]]).

## Related
- [[System Architecture]] · [[Milestones & Status]] · [[Glossary]]
