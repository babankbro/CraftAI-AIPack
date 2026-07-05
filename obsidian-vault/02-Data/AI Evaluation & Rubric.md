---
tags: [data, ai, rubric, core]
aliases: [Rubric, AI Evaluation, AIPACK Rubric]
---

# AI Evaluation & Rubric

The AIPACK rubric is the domain core. Encoded in `alpr/src/lib/ai/rubric.ts` (shared by prompt, seed, and UI) as `aipack-v1`.

## The 5 criteria (C1–C5), each 1–4 → total /20

| Code | Criterion (Thai) | English | Evidence signals |
|------|------------------|---------|------------------|
| **C1** | ความสอดคล้องกับมาตรฐาน | Alignment (CK ↔ RL/CT ↔ AIK) | `ai_tool` |
| **C2** | จุดประสงค์การเรียนรู้ | Objectives (K-P-A, SMART) | — |
| **C3** | กระบวนการจัดการเรียนรู้ | Process (Active Learning, Socratic, PERMA) | `socratic` |
| **C4** | การใช้สื่อและเทคโนโลยี | Media & AI Tools (Gen AI, Prompt, Fact-check) | `prompt` |
| **C5** | การประเมินผล | Evaluation (Formative/Summative, Analytic Rubric, think-trail) | `rubric`, `think_trail` |

Each criterion has 4 level descriptors (1–4). Example — C4 level 4: "แนบ Prompt จริง + AI เป็น Devil's Advocate + ขั้นตอนให้ผู้เรียน Fact-check".

## Score → band → PLC action

`scoreToBand()` and `PLC_ACTION` in `rubric.ts`:

| Total | Band (`quality_band`) | PLC Action |
|-------|-----------------------|-----------|
| 17–20 | `innovative_master` | Best Practice / lead trainer |
| 13–16 | `fluent` | Sharpen Socratic wording & rubric → ready to teach |
| 9–12 | `developing` | ⚠️ **ห้ามนำแผนไปใช้สอนทันที** — schedule Mentor-Mentee |
| 5–8 | `emerging` | Pull into large PLC, co-design from scratch |

The "developing → must not teach yet" warning (AC-6) is surfaced prominently in the UI and report.

## The JSON contract (Zod-enforced)

`alpr/src/lib/ai/schema.ts` — every provider must return this exact shape, validated on parse:

```ts
CriterionResult = {
  code: "C1".."C5",
  level: int 1..4,
  reason: string,
  evidence: { quote: string, page: int|null }[],
  confidence: "high"|"medium"|"low",
  no_evidence: boolean            // if true → low level, never guess high (FR-4.2/AC-3)
}
EvaluationResult = { criteria: CriterionResult[5], suggested_total: int 0..20 }
```

This decouples business logic from the provider — see [[Database Schema|ai_evaluations]] stores `provider` + `model` per run for reproducibility.

## Provider abstraction

```
interface AiEvaluator { evaluatePlan(input) → { provider, model, result, promptHash } }
  ├─ GeminiEvaluator  (@google/generative-ai, responseMimeType: application/json)
  └─ OpenAiEvaluator  (openai, response_format: json_object)

getAiEvaluator()  [lib/ai/index.ts, async]
  1. read app_settings (id=1) from DB          ← admin UI, see [[Admin Console]]
  2. fall back to env AI_PROVIDER / GEMINI_MODEL / OPENAI_MODEL
```

- Constructors accept a `model` override so DB settings flow through.
- Selecting a provider/model is **runtime** (no restart) via [[Admin Console]].

## Model selection (as of build)

- **Gemini** — current: `gemini-3.1-pro-preview` (a "thinking" preview model: strongest reasoning, but slower + pricier per call, and previews can change/be pulled). Stable alternative: `gemini-2.5-pro`. `gemini-3-pro` is **not** a valid id (404) — see [[Bugs Fixed]].
- **OpenAI** — newest available on the key: `gpt-5.5-pro`. ⚠️ the key currently has **no billing/quota** (`insufficient_quota`), so OpenAI won't work until billing is set up.

## Testing

`rubric.test.ts`, `schema.test.ts`, `scoring.test.ts`, `checklist.test.ts` — 34 tests covering band mapping, the no-evidence rule, exactly-5-criteria enforcement, and score totals.

## Related
- [[Upload-to-Report Pipeline]] · [[Admin Console]] · [[CAM Review & PDF Report]] · [[Assessment Forms]]
