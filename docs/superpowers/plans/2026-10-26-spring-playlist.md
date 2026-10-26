# Spring BGM audition integration

User-approved scope: use D:/games/bgms/ThreeKingdoms as the spring narrative BGM library; choose a random track in spring and try the effect. Existing seasons define spring as March–May. Narrative/prologue/map/route/ending play music; battle and hidden/background pages pause it. Same-season state updates and panels preserve the playhead. Returning from battle resumes; entering a different spring chooses again; ending a track randomly advances without immediate repeats if multiple unique tracks exist.

Source inspection found 春日.m4a and 春日2.m4a are byte-identical, SHA256 021203B366F3F640B2DFFB6B6455B544B70D762D6BAE5017DAB4A82F97C9B316, Opus in MP4,177.28s stereo48000Hz. Deduplicate to one playable asset and retain both source names in provenance; do not claim two distinct songs. Convert one copy to browser-compatible MP3; source directory stays intact.

- [x] RED lifecycle tests: gesture gate, March–May, battle/background pause/resume, stable currentTime, independent RNG, next/no-repeat, rejected playback recovery, mute/volume and settings persistence.
- [x] Implement seasonalMusic.ts + springMusicData.ts + musicSettings.ts, with lazy HTMLAudioElement and no RPG/save/random-stream fields.
- [x] Connect runtime state projection and start-menu gesture, document visibility and retry gestures; add independent BGM controls to start menu and map. Preserve attack SFX preferences and layout.
- [x] Real browser playback: nonzero output, matching source, spring story/map, summer stop, battle pause, no restart on normal state updates, hidden/visible, persistent music volume, mobile layouts.
- [x] Fresh full tests/tsc/build and local package; verify packaged asset hashes and playback with network unavailable. Keep version1.1.0 for this audition change.

No automatic purchases, external music generation, repository commits or publishing.


Verification:587/587fullVitest,12focused recheck,TypeScript/Vite and local-server test passed. Independent reviewer found noP1/P2 with10newtests. Real WebAudio signal peak0.2004/RMS0.0267; source-page three viewports passed. Packaged offline UI verified actual enter-battle/retreat, April/May continuity, June stop and music settings; zeroexternal requests/pageerrors. Package162files match production hashes; MP3 hash matches public/dist/www. Importer preserves source attribution metadata and both original files. No version bump for audition.
