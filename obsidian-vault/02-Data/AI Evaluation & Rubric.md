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

`alpr/src/lib/ai/schema.ts` — each per-criterion call returns a `CriterionAnalysis` (no `code`; the loop injects it), validated on parse:

```ts
CriterionAnalysis = {
  level: int 1..4,
  reason: string,
  evidence: { quote: string, page: int|null }[],   // the sentences that justified the score
  confidence: "high"|"medium"|"low",
  no_evidence: boolean,           // if true → low level, never guess high (FR-4.2/AC-3)
  suggestions: string[],          // concrete improvements to raise the level
  example: string | null          // a plan-specific worked example of a better version
}
CriterionResult   = CriterionAnalysis & { code: "C1".."C5" }
EvaluationResult  = { criteria: CriterionResult[5], suggested_total: int 0..20 }
```

`suggestions` and `example` were **added** to power the richer analysis (evidence + advice + examples) shown in [[CAM Review & PDF Report]]. Both default to `[]` / `null` so older stored evaluations still parse.

This decouples business logic from the provider — [[Database Schema|ai_evaluations]] stores `provider` + `model` per run for reproducibility.

## Provider abstraction — per-criterion iteration

```
BaseAiEvaluator (lib/ai/base.ts)   ← shared orchestration
  evaluatePlan(): loops C1→C5 SEQUENTIALLY, one focused AI call per criterion
                  (buildCriterionPrompt), assembles EvaluationResult
  robustness: unwrapJson (single-element array / {criteria:[…]}) + cleanJsonText
              (strip ``` fences) + retry ×3 on malformed JSON
  ├─ GeminiEvaluator  → runJson via @google/generative-ai (responseMimeType json)
  └─ OpenAiEvaluator  → runJson via OpenAI **Responses API** (client.responses.create,
                        text.format json_object) — NOT Chat Completions

getAiEvaluator()  [lib/ai/index.ts, async]
  1. read app_settings (id=1) from DB          ← admin UI, see [[Admin Console]]
  2. fall back to env AI_PROVIDER / GEMINI_MODEL / OPENAI_MODEL
```

- **Per-criterion, not one-shot**: each C gets its own focused call (`buildCriterionPrompt`) → deeper evidence + suggestions + example. Sequential (one after another) to be gentle on rate limits.
- Providers only implement `runJson(prompt) → string`; the base class does parsing, retry, and assembly.
- **OpenAI uses the Responses API** so reasoning models (`gpt-5.5-pro`) work — Chat Completions rejects them (`not a chat model`). See [[Bugs Fixed]].
- Selecting a provider/model is **runtime** (no restart) via [[Admin Console]].

## Model selection & the speed/cost reality (measured)

| Model | Deep 5-call run | Notes |
|-------|-----------------|-------|
| `gemini-3.1-pro-preview` | **~114 s** ✅ | Current default. Fast enough, excellent grounded output. Preview (can change/be pulled) |
| `gemini-2.5-pro` | — | Stable GA alternative |
| `gpt-5.5-pro` | **~601 s (~10 min)** ⚠️ | Works (Responses API) but impractically slow for 5 sequential reasoning calls; key also hits `insufficient_quota` |
| `gpt-5.1-chat-latest` | fast | Good chat-model fallback for OpenAI |

- `gemini-3-pro` is **not** a valid id (404) — must be `gemini-3.1-pro-preview` / `gemini-2.5-pro`.
- Because gpt-5.5-pro is ~10 min/plan + quota-limited, the running instance is left on **Gemini**; gpt-5.5-pro stays one-click-away in [[Admin Console]].
- NFR-2 target is ≤90 s; the ~114 s Gemini run slightly exceeds it — an accepted trade for the depth (sequential per-criterion).

## Testing

`rubric.test.ts`, `schema.test.ts` (incl. per-criterion analysis + suggestions/example defaults), `scoring.test.ts`, `checklist.test.ts` — **37 tests**.

## Related
- [[Upload-to-Report Pipeline]] · [[Admin Console]] · [[CAM Review & PDF Report]] · [[Assessment Forms]]
