# ALPR Architecture Vault (Obsidian)

An [Obsidian](https://obsidian.md) vault documenting the **as-built system architecture** of ALPR (AIPACK Lesson Plan Review System), synthesized from the project's design docs and updated with the implementation reality from the build session.

## How to open

1. Open Obsidian → **Open folder as vault** → select this `obsidian-vault/` folder.
2. Start at **[[Home]]** (the Map of Content). Use the graph view to see how notes link.

If you're reading this on GitHub/plain text, start with `Home.md`, then `01-Architecture/System Architecture.md`.

## Structure

```
Home.md                        ← index / map of content
00-Overview/                   Project Overview, Glossary, Milestones & Status
01-Architecture/               System Architecture, Tech Stack, basePath & Deployment,
                               Upload-to-Report Pipeline
02-Data/                       Database Schema, AI Evaluation & Rubric
03-Auth/                       Authentication & RBAC
04-Features/                   Admin Console, CAM Review & PDF Report, File Viewer
05-Reference/                  Environment Variables, Assessment Forms
06-Session-Log/                Build Session Changelog, Bugs Fixed
07-Source-Docs/                the original design/spec docs (SRS, plan, architecture,
                               DB schema, UX/UI, forms) — moved in; see Source Documents.md
```

Notes are cross-linked with `[[wikilinks]]`. The vault documents the app under `../alpr/` (source of truth: `alpr/src/`, `alpr/prisma/schema.prisma`).

The **original design/spec documents now live inside the vault** under `07-Source-Docs/` (see `Source Documents.md`). The `00`–`06` notes are the synthesized, as-built view; `07-Source-Docs/` holds the authoritative originals.
