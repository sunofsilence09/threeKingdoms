import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ids = ['liu-biao', 'liu-zhang', 'zhang-lu', 'ma-teng', 'himiko', 'gongsun-zan', 'yuan-shao', 'liu-yu', 'zhang-yan'];

describe('garrison era leader art', () => {
  it('ships nine distinct portrait-format RGBA PNG originals', () => {
    const hashes = ids.map(id => {
      const file = readFileSync(resolve('public/assets/characters', `${id}-v1.png`));
      expect(file.subarray(0, 8).toString('hex'), id).toBe('89504e470d0a1a0a');
      const width = file.readUInt32BE(16);
      const height = file.readUInt32BE(20);
      expect(width, id).toBeGreaterThanOrEqual(1024);
      expect(height, id).toBeGreaterThanOrEqual(1536);
      expect(height / width, id).toBeGreaterThanOrEqual(1.35);
      expect(height / width, id).toBeLessThanOrEqual(1.8);
      expect(file[25], `${id} preserves generated alpha`).toBe(6);
      return createHash('sha256').update(file).digest('hex');
    });
    expect(new Set(hashes).size).toBe(ids.length);
  });
});
