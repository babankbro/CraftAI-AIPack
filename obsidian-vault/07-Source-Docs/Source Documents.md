---
tags: [source-docs, moc]
aliases: [Source Docs, Original Docs]
---

# Source Documents

The **original design/spec documents**, moved into the vault so everything lives in one place. These are the authoritative originals (the "what we intended"); the rest of the vault is the **synthesized, as-built** view (the "what was actually built" — see [[Milestones & Status]] and the deviation notes). They cross-link each other by their original filenames, which is preserved here.

| Document | What it is | Synthesized / as-built in |
|----------|-----------|---------------------------|
| [[SRS_AIPACK_LessonPlan_Review]] | Software Requirements Spec v1.2 (FR/NFR, AC, entities) | [[Project Overview]] · [[System Architecture]] · [[Authentication & RBAC]] · [[basePath & Deployment]] |
| [[IMPLEMENTATION_PLAN]] | Milestone plan M0–M8 (Docker-based) | [[Milestones & Status]] · [[Build Session Changelog]] |
| [[design_architecture]] | Architecture design (pre-build) | [[System Architecture]] · [[Tech Stack]] |
| [[design_database_schema]] | DB schema design v1.1 (13 tables) | [[Database Schema]] (now 14 tables) |
| [[UX_UI_Design_ALPR]] | UX/UI wireframes + design system | [[CAM Review & PDF Report]] · [[File Viewer]] · [[Admin Console]] |
| [[assessment_forms_reference]] | The 3 source assessment forms (project context) | [[Assessment Forms]] · [[AI Evaluation & Rubric]] |

> [!tip] Original vs as-built
> Where these docs and the synthesized notes disagree, the **synthesized notes reflect reality** (e.g. direct basePath instead of a reverse proxy; `@google/generative-ai` instead of Vertex; `pdf-lib` instead of Playwright; per-criterion AI evaluation). See [[System Architecture#Deviations from the original design]] and [[Bugs Fixed]].

## Related
- [[Home]] · [[Milestones & Status]] · [[System Architecture]]
