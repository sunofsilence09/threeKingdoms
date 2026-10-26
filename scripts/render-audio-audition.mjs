// Offline original sound audition. Uses exactly the game's PCM synthesis, no downloads.
// node scripts/render-audio-audition.mjs [output-directory]
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] ?? 'artifacts/audio-v1.1');
const rate = 44100;
function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + i * 2));
  return buffer;
}
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { SOUND_IDS, synthesizeCue } = await server.ssrLoadModule('/src/game/battleAudio.ts');
  await mkdir(output, { recursive: true });
  const all = [], index = [], gap = new Float32Array(rate * .18), separator = new Float32Array(rate * .65);
  let offset = 0;
  for (const sound of SOUND_IDS) {
    const row = { sound, startSeconds: offset / rate, variations: [] };
    for (let variation = 0; variation < 3; variation++) {
      const pcm = synthesizeCue(sound, variation, rate);
      const filename = `${sound}-${variation + 1}.wav`;
      await writeFile(resolve(output, filename), wav(pcm));
      all.push(pcm, gap); offset += pcm.length + gap.length;
      row.variations.push({ filename, peak: Math.max(...pcm.map(Math.abs)), rms: Math.sqrt(pcm.reduce((sum, x) => sum + x * x, 0) / pcm.length) });
    }
    all.push(separator); offset += separator.length; index.push(row);
  }
  const combined = new Float32Array(offset); let at = 0;
  for (const pcm of all) { combined.set(pcm, at); at += pcm.length; }
  await writeFile(resolve(output, 'all-cues-three-takes.wav'), wav(combined));
  await writeFile(resolve(output, 'index.json'), JSON.stringify({ sampleRate: rate, note: 'Original offline PCM synthesized by src/game/battleAudio.ts; each family has 3 takes, in listed order.', cues: index }, null, 2));
  console.log(JSON.stringify({ output, sounds: SOUND_IDS.length, variations: SOUND_IDS.length * 3, durationSeconds: offset / rate }));
} finally { await server.close(); }
