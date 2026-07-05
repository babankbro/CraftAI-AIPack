---
tags: [overview, reference]
---

# Glossary

| Term | Meaning |
|------|---------|
| **CAT** | Coachee — ครูผู้สอน / the teacher who authors & uploads the lesson plan |
| **CAM** | Coach/Mentor — ครูพี่เลี้ยง / the mentor who reviews, confirms scores, and signs |
| **admin** | System administrator — manages roles and AI settings (see [[Admin Console]]) |
| **AIPACK** | Integration framework: AI + PACK (CK = content knowledge, AIK = AI knowledge) |
| **RL** | Reading Literacy (ความฉลาดรู้ด้านการอ่าน) |
| **CT** | Critical Thinking (การคิดอย่างมีวิจารณญาณ) |
| **Evidence Trail** | Quote + page number from the plan that justifies a score. Required for every AI score |
| **PLC Action Trigger** | The follow-up action automatically tied to a score band (see [[AI Evaluation & Rubric]]) |
| **Analytic Rubric** | Per-criterion scoring rubric (as opposed to holistic) |
| **Quality Band** | One of 4 result levels: innovative_master / fluent / developing / emerging |
| **Socratic** | The style of open-ended questioning the rubric looks for (criterion C3) |
| **PERMA** | Positive-psychology framework for classroom climate |
| **Growth Mindset (GM)** | Belief that ability grows with effort; a signal the rubric rewards |
| **KapiBarian** | A learning platform/tool referenced in the project |
| **Kalyanamitra** (กัลยาณมิตร) | "Good friend" — the supportive, non-judgmental feedback tone |
| **Mentor-Mentee link** | A `mentor_links` row pairing a CAM with a CAT they oversee |
| **JIT provisioning** | Just-in-time account creation on first Google login |
| **basePath** | The URL sub-path (`/aipack`) the whole app is served under. See [[basePath & Deployment]] |
| **Human-in-the-loop** | AI proposes a draft; a human (CAM) makes the binding decision |

## Score bands ↔ enum values

| Band | Enum (`quality_band`) | Score |
|------|-----------------------|-------|
| ต้นแบบสร้างสรรค์ | `innovative_master` | 17–20 |
| เชี่ยวชาญช่ำชอง | `fluent` | 13–16 |
| บ่มเพาะทักษะ | `developing` | 9–12 |
| เริ่มจุดประกาย | `emerging` | 5–8 |

## The 5 evidence checklist signals

Detected heuristically before AI evaluation (see [[Upload-to-Report Pipeline]]):
`ai_tool` · `prompt` · `socratic` · `rubric` · `think_trail`
