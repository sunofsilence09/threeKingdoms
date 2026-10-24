import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const assets = ['xiahou-dun', 'xiahou-dun-uninjured', 'xiahou-yuan', 'cao-ren', 'cao-xiu', 'local-soldier', 'local-captain'];

describe('Cao generals and local garrison illustrations', () => {
  it('ships seven distinct portrait RGBA PNGs for full-body figures', () => {
    const hashes = new Set<string>();
    for (const id of assets) {
      const path = fileURLToPath(new URL(`../../public/assets/characters/${id}-v1.png`, import.meta.url));
      const png = readFileSync(path);
      expect(png.subarray(0, 8).toString('hex'), id).toBe('89504e470d0a1a0a');
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(width, id).toBeGreaterThanOrEqual(768);
      expect(height, id).toBeGreaterThanOrEqual(1024);
      expect(height / width, id).toBeGreaterThanOrEqual(1.25);
      expect(height / width, id).toBeLessThanOrEqual(2);
      expect(png[25], id).toBe(6);
      hashes.add(createHash('sha256').update(png).digest('hex'));
    }
    expect(hashes.size).toBe(assets.length);
  });
});
