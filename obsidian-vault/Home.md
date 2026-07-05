---
tags: [moc, home]
aliases: [Index, MOC, Start Here]
---

# 🏠 ALPR — AIPACK Lesson Plan Review System

> ระบบตรวจประเมินแผนการจัดการเรียนรู้แบบบูรณาการ AIPACK
> Automatic-assisted Lesson Plan Review — โครงการวิจัยเชิงปฏิบัติการฯ พัฒนา RL & CT ด้วย AI จ.กาฬสินธุ์

This vault documents the **as-built system architecture** of ALPR, synthesized from the project's design docs (SRS, Architecture, DB Schema, UX/UI) and **updated with the implementation reality** discovered/built during the build session (see [[Build Session Changelog]]).

---

## 🗺️ Map of Content

### Overview
- [[Project Overview]] — what it is, who uses it, the core principles
- [[Glossary]] — CAT, CAM, AIPACK, RL/CT, evidence trail, PLC action…
- [[Milestones & Status]] — M0–M8, what's done

### Architecture
- [[System Architecture]] — **start here** · high-level components & data flow
- [[Tech Stack]] — the as-built stack (Next.js 16, Prisma 6, Gemini…)
- [[basePath & Deployment]] — sub-folder hosting under `/aipack`, the quirks
- [[Upload-to-Report Pipeline]] — the end-to-end processing flow

### Data & AI
- [[Database Schema]] — 14 tables, ERD, key decisions
- [[AI Evaluation & Rubric]] — the 5-criteria AIPACK rubric, JSON contract, provider abstraction

### Auth & Access
- [[Authentication & RBAC]] — Google OAuth, roles, the NextAuth basePath saga

### Features
- [[Admin Console]] — user/role management + AI provider settings
- [[CAM Review & PDF Report]] — side-by-side review, sign-off, report design

### Reference
- [[Environment Variables]] — every env var and what it does
- [[Assessment Forms]] — the 3 source forms (project context)

### Session Log
- [[Build Session Changelog]] — everything changed/fixed during the build session
- [[Bugs Fixed]] — the real bugs caught while getting it running

---

## ⚡ Quick facts

| | |
|---|---|
| **Roles** | CAT (teacher/coachee), CAM (mentor), admin |
| **Scoring** | 5 criteria (C1–C5) × 1–4 → total /20 → 4 quality bands |
| **AI** | Pluggable Gemini/OpenAI · currently `gemini-3.1-pro-preview` |
| **Human-in-the-loop** | AI proposes (draft), CAM confirms/overrides, signs |
| **Deploy** | Next.js `basePath=/aipack` under `craftai.ksu.ac.th`, Docker Compose |
| **Stores** | PostgreSQL (metadata/scores) + MinIO (files/reports) |
