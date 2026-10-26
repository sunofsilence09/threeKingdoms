import { afterEach, describe, expect, it, vi } from 'vitest';
import { BattleAudioBus, createAudioEventSession, synthesizeCue, SOUND_IDS, type AudioSink } from './battleAudio';
import { createCombatState, type CombatEvent } from './combat';
afterEach(() => vi.unstubAllGlobals());

describe('offline original battle audio', () => {
  it('provides three bounded, non-silent and distinct PCM variations for every cue', () => {
    const fingerprints = new Set<string>();
    for (const sound of SOUND_IDS) {
      const variants = [0, 1, 2].map(v => synthesizeCue(sound, v, 22050));
      for (const samples of variants) {
        expect(samples.length).toBeGreaterThan(1000);
        expect(samples.length).toBeLessThan(22050);
        expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(.8);
        expect(samples.reduce((s, x) => s + x * x, 0) / samples.length).toBeGreaterThan(.0001);
        expect(samples[0]).toBe(0);
        const fingerprint = Array.from(samples.filter((_, i) => i % 101 === 0)).join(',');
        expect(fingerprints.has(fingerprint)).toBe(false); fingerprints.add(fingerprint);
      }
    }
  });
  it('plays newly emitted events once and never replays primed restored events', () => {
    const played: string[] = []; let stops = 0;
    const sink: AudioSink = { play: cues => played.push(...cues.map(c => c.sound)), stop: () => { stops++; } };
    const units = createCombatState(null).units;
    const old: CombatEvent = { kind: 'attack', actorId: units[0].id, damage: 1 };
    const session = createAudioEventSession(sink, [old]);
    session.emit([old], units); expect(played).toEqual([]);
    const fresh = { ...old }; session.emit([fresh, fresh], units); session.emit([fresh], units);
    expect(played).toEqual(['slash', 'hit']);
    session.destroy(); session.emit([{ ...old }], units);
    expect(played).toHaveLength(2); expect(stops).toBe(1);
  });
  it('requires a gesture, bounds concurrent scheduled voices and cancels all sound on background', () => {
    let constructed = 0, starts = 0, stops = 0, suspended = 0;
    vi.stubGlobal('AudioContext', class {
      state = 'running'; currentTime = 10; sampleRate = 22050; destination = {};
      constructor() { constructed++; }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
      createBufferSource() { return { buffer: null, onended: null, connect() {}, disconnect() {}, start(time: number) { expect(time).toBeGreaterThanOrEqual(10); expect(time).toBeLessThanOrEqual(10.5); starts++; }, stop() { stops++; } }; }
      suspend() { this.state = 'suspended'; suspended++; return Promise.resolve(); }
    });
    const bus = new BattleAudioBus(), cues = Array.from({ length: 30 }, () => ({ sound: 'heavy' as const, delayMs: 1000, level: 1 }));
    bus.play(cues); expect(constructed).toBe(0); expect(starts).toBe(0);
    bus.unlock(); bus.play(cues); bus.play(cues);
    expect(constructed).toBe(1); expect(starts).toBe(6);
    bus.background(); expect(stops).toBe(6); expect(suspended).toBe(1);
    bus.play(cues); expect(starts).toBe(6);
  });
  it('survives unavailable and throwing browser audio implementations', () => {
    vi.stubGlobal('AudioContext', undefined); const bus = new BattleAudioBus();
    expect(() => bus.unlock()).not.toThrow();
    vi.stubGlobal('AudioContext', class { constructor() { throw Error('No device'); } });
    expect(() => bus.unlock()).not.toThrow(); expect(() => bus.stop()).not.toThrow();
  });
});
