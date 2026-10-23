# Local Officials and Portraits Implementation Plan

**Goal:** Draw the eight approved historical officials and expose sourced, date-aware local-office records for all 13 regions / 16 origins without inventing missing office holders.

**Architecture:** Separate sourced records and portrait metadata from combat characters. A read-only inspection panel displays the local province office and prefecture office, with exact-month events or clearly marked year-only evidence. The historical character collection remains intact; officials have their own data and inspector.

**Tech Stack:** TypeScript, Phaser, DOM/CSS, Vitest, built-in image_gen, Python Playwright.

## Constraints

- Eight approved figures: Wang Yun, Xu Qiu, Guo Xun, Jia Cong, Guo Dian, Zhao Qian, Chu Gong, Qin Jie.
- Jia Cong only supported from June 184; Qin Jie attested by June, appointment month unknown. Do not equate first attestation with appointment date.
- Guo Xun / Chu Gong deaths are dated by historical month; no claim that they are still active afterwards.
- Year-only evidence stays year-only. Unknown offices remain unfilled. No automatic faction choice or save changes when inspecting.
- Per-person generated transparent full-body PNGs in public/assets/characters, distinct identity and silhouette, with prompts in docs/art.

## Tasks

- [x] Generate and inspect eight independent portraits; keep every approved deliverable in the workspace. Built-in image_gen, 1024×1536 RGBA, versioned PNGs and prompts preserved.
- [x] Write failing tests for province/prefecture mapping, unknown offices, future-month filtering, deaths, source links and stable IDs. New suite failed before module existed, then all 5 behavior tests passed.
- [x] Add localOfficials.ts with official metadata, office slots and date-aware evidence resolution. Add localOfficialPanel.ts using openInspection to keep game input paused and save state unchanged.
- [x] Add a map entry for local officials; build a responsive inspector showing image, official role, place, dated evidence and source link. Do not imply that image inspection constitutes a faction encounter.
- [x] Run all tests (81 passed), build, and desktop/mobile inspections of all eight portraits at 1280×820, 844×390, 390×844. Verify transparency, full-body margins, unchanged saves, close/reopen and date filters. Pin the close control during scroll and provide a compact landscape portrait. Rebuild local package.

Final package smoke: map entry, eight portrait decodes, close lifecycle and unchanged saved state all pass with external network requests blocked; no page errors. Task-owned verification server stopped afterwards.
