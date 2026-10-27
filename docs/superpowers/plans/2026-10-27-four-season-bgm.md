# Four-season BGM Implementation Plan

**Goal:** Add the user's summer, autumn and winter music to the existing seasonal narrative player and portable Windows game.

**Architecture:** Keep one presentation-only audio player with four separate playlists. March–May spring, June–August summer, September–November autumn, December–February winter. A winter beginning in December continues through January/February without rewinding. Change playlists only at season boundaries; keep existing battle/background pause and settings semantics. Each season selects randomly and avoids immediate repeats when multiple tracks exist.

**Tech Stack:** Existing TypeScript/Phaser, HTMLAudioElement, Vitest, Node/FFmpeg importer, Python Playwright.

## Constraints

- User asks to extend the existing approved music flow; no new approval or version bump required.
- Source D:/games/bgms/ThreeKingdoms: 春日 and duplicate春日2 → spring; 夏天 → summer; 秋风 → autumn; 东雪 (user filename) → winter. Preserve names, source bytes and metadata.
- Import only matching season names, deduplicate within each season, preserve existing spring asset URL; leave unclassified files out with an explicit report.
- No changes to game saves, combat, dates, gameplay RNG, volume preferences or unrelated progress.md edits. No commits or deployment requested.

## Tasks

- [x] Write failing four-season lifecycle regressions:16 expected failures before implementation; correct playlist, calendar/year boundaries, no same-season rewind, winter December→January continuity, battle/background resume, mute and empty bank.
- [x] Implement per-season data/importer; keep the existing spring import entry as a compatibility wrapper; validate source classification/dedup and conversion.5 original files unchanged,4 MP3tracks with metadata preserved.
- [x] Extend SeasonalMusicPlayer, rename singleton usage to seasonalMusic, update music controls and documentation. Per-bank repeat history retained and invalid calendar remains silent.
- [x] Full639Vitest cases passed;25lifecycle cases plus3settings cases,2Node importer cases and portable server passed; tsc and build passed. Three screen sizes exercised actual audio signals, all calendar months, winter across year, battles/background, ended loop and settings.
- [x] Portable package updated;165production files match SHA256. Same complete four-season flow passed offline in1440×1000,390×844,844×390, no external requests or page errors. Re-ran legacy spring checks with updated summer switching expectations.
