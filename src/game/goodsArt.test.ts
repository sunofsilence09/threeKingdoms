import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GOODS } from './economy';

describe('commodity illustrations', () => {
  it('gives all ten unchanged goods a distinct versioned PNG path', () => {
    expect(GOODS.map(good => good.id)).toEqual(['grain', 'cloth', 'salt', 'iron', 'pottery', 'tea', 'herbs', 'silk', 'wine', 'leather']);
    for (const good of GOODS) expect(good).toHaveProperty('image', `/assets/goods/${good.id}-v1.png`);
  });

  it('ships ten different square alpha PNG files rather than shared or vector placeholders', () => {
    const hashes = new Set<string>();
    for (const good of GOODS) {
      const path = fileURLToPath(new URL(`../../public/assets/goods/${good.id}-v1.png`, import.meta.url));
      const png = readFileSync(path);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(png.readUInt32BE(20));
      expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(512);
      expect(png[25]).toBe(6);
      hashes.add(createHash('sha256').update(png).digest('hex'));
    }
    expect(hashes.size).toBe(10);
  });
});
