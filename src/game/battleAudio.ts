import { audioCuesFor, SOUND_IDS, type AudioCue, type SoundId } from './audioCues';
import { getAudioSettings, onAudioSettings } from './audioSettings';
import type { CombatEvent, CombatUnit } from './combat';
export { SOUND_IDS } from './audioCues';

export interface AudioSink { play(cues: readonly AudioCue[]): void; stop(): void }
export function createAudioEventSession(sink: AudioSink, restoredEvents: readonly CombatEvent[] = []) {
  const heard = new WeakSet<CombatEvent>(restoredEvents); let destroyed = false;
  return {
    emit(events: readonly CombatEvent[], units: readonly CombatUnit[]): void {
      if (destroyed) return;
      const fresh = events.filter(e => { if (heard.has(e)) return false; heard.add(e); return true; });
      sink.play(audioCuesFor(fresh, units));
    },
    destroy(): void { if (!destroyed) { destroyed = true; sink.stop(); } },
  };
}

/** Original PCM instruments: filtered air, resonant wood/metal and low impact layers.
 * Three reproducible takes use only a local synth seed, never gameplay randomness.
 */
export function synthesizeCue(sound: SoundId, variation = 0, sampleRate = 44100): Float32Array {
  const v = ((Math.trunc(variation) % 3) + 3) % 3;
  const index = SOUND_IDS.indexOf(sound), pitch = [1, .94, 1.07][v];
  const duration = sound === 'fire' ? .48 : sound === 'ultimate' ? .46 : sound === 'martial' ? .38 : sound === 'burn' ? .31 : sound === 'heavy' ? .32 : .23;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = (0x9182ce ^ ((index + 1) * 65537) ^ ((v + 1) * 7919)) >>> 0, low = 0, slow = 0;
  const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
  const phase = (frequency: number, t: number) => Math.sin(2 * Math.PI * frequency * pitch * t);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate, p = t / duration, n = noise();
    low += .16 * (n - low); slow += .035 * (n - slow);
    const air = n - low, attack = Math.min(1, t / .004), tail = Math.pow(1 - p, 2);
    let x = 0;
    switch (sound) {
      case 'slash': x = .65 * air * Math.sin(Math.PI * p) * Math.exp(-p * 3) + .17 * phase(1450 - 700 * p, t) * Math.exp(-p * 14); break;
      case 'polearm': x = .6 * low * Math.sin(Math.PI * p) * Math.exp(-p * 3) + .27 * phase(330, t) * Math.exp(-p * 12) + .09 * phase(1070, t) * Math.exp(-p * 7); break;
      case 'heavy': x = .5 * slow * Math.sin(Math.PI * p) + .34 * phase(104 - 35 * p, t) * Math.exp(-p * 8) + .15 * phase(610, t) * Math.exp(-p * 10); break;
      case 'bow': x = (.28 * phase(265, t) + .16 * phase(535, t) + .12 * phase(799, t)) * Math.exp(-p * 13) + .3 * air * Math.sin(Math.PI * p) * Math.exp(-p * 4); break;
      case 'fists': x = .4 * phase(118 - 50 * p, t) * Math.exp(-p * 13) + .55 * low * Math.exp(-p * 12); break;
      case 'claws': { const rake = Math.exp(-Math.pow((p - .18) * 18, 2)) + .65 * Math.exp(-Math.pow((p - .5) * 18, 2)); x = .42 * air * rake + .2 * phase(185 - 70 * p, t) * Math.exp(-p * 10); break; }
      case 'hit': x = .36 * phase(150 - 80 * p, t) * Math.exp(-p * 17) + .5 * low * Math.exp(-p * 19) + .15 * air * Math.exp(-p * 28); break;
      case 'shield': x = (.22 * phase(510, t) + .15 * phase(839, t) + .1 * phase(1327, t)) * Math.exp(-p * 7) + .32 * n * Math.exp(-p * 30); break;
      case 'miss': x = .55 * air * Math.sin(Math.PI * p) * Math.exp(-p * 5) + .16 * low * Math.sin(Math.PI * p); break;
      case 'fire': x = .5 * low * Math.sin(Math.PI * p) + .3 * air * Math.exp(-p * 4) * (.4 + .6 * Math.pow(Math.sin(t * 133), 8)) + .14 * phase(75, t) * Math.exp(-p * 9); break;
      case 'burn': x = .4 * low * tail + .36 * air * Math.pow(Math.sin(t * 237), 14) * tail; break;
      case 'martial': x = (.2 * phase(294, t) + .13 * phase(441, t) + .08 * phase(882, t)) * Math.exp(-p * 5) + .16 * air * Math.sin(Math.PI * p); break;
      case 'ultimate': x = (.23 * phase(147 + 200 * p, t) + .14 * phase(220.5 + 300 * p, t)) * Math.sin(Math.PI * p) + .25 * slow * tail; break;
    }
    samples[i] = i === 0 ? 0 : Math.tanh(x * 1.15) * .72 * attack * tail;
  }
  return samples;
}

const MAX_VOICES = 6;
export class BattleAudioBus implements AudioSink {
  private context?: AudioContext;
  private master?: GainNode;
  private sources = new Set<AudioBufferSourceNode>();
  private buffers = new Map<string, AudioBuffer>();
  private variationSeed = 0xac7192d3;
  private settings = getAudioSettings();
  constructor() { onAudioSettings(s => { this.settings = s; if (this.master) this.master.gain.value = s.muted ? 0 : s.volume * .55; if (s.muted || s.volume === 0) this.stop(); }); }
  /** Called synchronously from a pointer/key gesture; failures never interrupt play. */
  unlock(): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const Constructor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      if (!this.context || this.context.state === 'closed') {
        this.context = new Constructor(); this.buffers.clear();
        this.master = this.context.createGain(); this.master.gain.value = this.settings.muted ? 0 : this.settings.volume * .55;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Audio is optional, including restrictive embedded browsers. */ }
  }
  play(cues: readonly AudioCue[]): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.settings.muted || this.settings.volume === 0 || (typeof document !== 'undefined' && document.hidden)) return;
    // Drop excess sounds instead of accumulating a delayed queue after a busy round.
    for (const cue of cues) {
      if (this.sources.size >= MAX_VOICES) break;
      try {
        this.variationSeed ^= this.variationSeed << 13; this.variationSeed ^= this.variationSeed >>> 17; this.variationSeed ^= this.variationSeed << 5;
        const variation = (this.variationSeed >>> 0) % 3, key = `${cue.sound}:${variation}`;
        let buffer = this.buffers.get(key);
        if (!buffer) {
          const pcm = synthesizeCue(cue.sound, variation, context.sampleRate);
          buffer = context.createBuffer(1, pcm.length, context.sampleRate); buffer.getChannelData(0).set(pcm); this.buffers.set(key, buffer);
        }
        const source = context.createBufferSource(), gain = context.createGain(); source.buffer = buffer;
        gain.gain.value = Math.max(0, Math.min(1, cue.level)) / 2.5; source.connect(gain); gain.connect(this.master!);
        source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); };
        this.sources.add(source);
        try { source.start(context.currentTime + Math.max(0, Math.min(500, cue.delayMs)) / 1000); }
        catch { this.sources.delete(source); source.disconnect(); gain.disconnect(); }
      } catch { /* Unavailable output devices or interrupted contexts are harmless. */ }
    }
  }
  stop(): void { for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } } this.sources.clear(); }
  background(): void { this.stop(); if (this.context?.state === 'running') void this.context.suspend().catch(() => {}); }
}
export const battleAudio = new BattleAudioBus();

/** One lifetime per scene; restored logs are marked heard before any action. */
export function createBattleAudio(restoredEvents: readonly CombatEvent[] = []) {
  const session = createAudioEventSession(battleAudio, restoredEvents);
  const gesture = () => battleAudio.unlock();
  const visibility = () => { if (document.hidden) battleAudio.background(); };
  const pagehide = () => battleAudio.background();
  document.addEventListener('pointerdown', gesture, { passive: true }); document.addEventListener('keydown', gesture);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide);
  return { ...session, destroy(): void {
    session.destroy(); document.removeEventListener('pointerdown', gesture); document.removeEventListener('keydown', gesture);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pagehide);
  } };
}
