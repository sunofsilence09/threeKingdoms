import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_SETTINGS_KEY, getAudioSettings, setAudioSettings, loadAudioSettings, saveAudioSettings, normalizeAudioSettings } from './audioSettings';

afterEach(() => vi.unstubAllGlobals());
describe('independent sound preferences', () => {
  it('clamps finite volume and rejects malformed stored values', () => {
    expect(normalizeAudioSettings({ muted: true, volume: 3 })).toEqual({ muted: true, volume: 1 });
    expect(normalizeAudioSettings({ muted: 'yes', volume: NaN })).toEqual({ muted: false, volume: .65 });
    expect(normalizeAudioSettings({ volume: -2 })).toEqual({ muted: false, volume: 0 });
  });
  it('persists only sound settings under a separate key and survives denied storage', () => {
    const records = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => records.get(k) ?? null, setItem: (k: string, v: string) => records.set(k, v) });
    saveAudioSettings({ muted: true, volume: .2 });
    expect([...records.keys()]).toEqual([AUDIO_SETTINGS_KEY]);
    expect(loadAudioSettings()).toEqual({ muted: true, volume: .2 });
    records.set(AUDIO_SETTINGS_KEY, '{broken');
    expect(loadAudioSettings()).toEqual({ muted: false, volume: .65 });
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
    expect(() => saveAudioSettings({ muted: false, volume: .4 })).not.toThrow();
    expect(loadAudioSettings().volume).toBe(.65);
  });
  it('keeps a working mute and volume in memory when storage is denied', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
    setAudioSettings({ muted: true, volume: .15 });
    expect(getAudioSettings()).toEqual({ muted: true, volume: .15 });
  });
});
