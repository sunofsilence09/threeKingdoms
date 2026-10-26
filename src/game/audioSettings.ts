export interface AudioSettings { muted: boolean; volume: number }
export const AUDIO_SETTINGS_KEY = 'three-kingdoms-audio-v1';
const DEFAULT: AudioSettings = { muted: false, volume: .65 };
export function normalizeAudioSettings(value: unknown): AudioSettings {
  const candidate = value && typeof value === 'object' ? value as Partial<AudioSettings> : {};
  return { muted: typeof candidate.muted === 'boolean' ? candidate.muted : DEFAULT.muted,
    volume: typeof candidate.volume === 'number' && Number.isFinite(candidate.volume) ? Math.max(0, Math.min(1, candidate.volume)) : DEFAULT.volume };
}
export function loadAudioSettings(): AudioSettings {
  try { return normalizeAudioSettings(JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) ?? 'null')); } catch { return { ...DEFAULT }; }
}
export function saveAudioSettings(value: AudioSettings): void {
  try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalizeAudioSettings(value))); } catch { /* Private browsing/storage denial is harmless. */ }
}
const listeners = new Set<(settings: AudioSettings) => void>();
let currentSettings: AudioSettings | undefined;
export function getAudioSettings(): AudioSettings { return { ...(currentSettings ??= loadAudioSettings()) }; }
export function setAudioSettings(value: Partial<AudioSettings>): AudioSettings {
  const settings = normalizeAudioSettings({ ...getAudioSettings(), ...value });
  currentSettings = settings;
  saveAudioSettings(settings); listeners.forEach(listener => listener(settings)); return settings;
}
export function onAudioSettings(listener: (settings: AudioSettings) => void): () => void {
  listeners.add(listener); return () => { listeners.delete(listener); };
}

/** The caller owns the returned control's lifetime; keep it outside frequently rebuilt action UI. */
export function createAudioControls(onGesture: () => void): HTMLElement {
  const group = document.createElement('div'); group.className = 'audio-controls'; group.setAttribute('aria-label', '音效设置');
  const mute = document.createElement('button'); mute.type = 'button'; mute.dataset.audioMute = '';
  const label = document.createElement('label'); label.textContent = '音量 ';
  const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = '100'; range.step = '5';
  range.setAttribute('aria-label', '音效音量'); range.dataset.audioVolume = '';
  const output = document.createElement('output');
  const refresh = () => { const s = getAudioSettings(); mute.textContent = s.muted ? '音效：关' : '音效：开'; mute.setAttribute('aria-pressed', String(!s.muted)); range.value = String(Math.round(s.volume * 100)); output.value = `${range.value}%`; };
  mute.addEventListener('click', () => { onGesture(); setAudioSettings({ muted: !getAudioSettings().muted }); refresh(); });
  range.addEventListener('input', () => { onGesture(); setAudioSettings({ volume: Number(range.value) / 100 }); refresh(); });
  // Controls always refresh their own state and are recreated when changing screens.
  refresh(); label.append(range, output); group.append(mute, label); return group;
}
