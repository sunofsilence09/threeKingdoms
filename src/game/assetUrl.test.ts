import { describe, expect, it } from 'vitest';
import { imageAssetUrl } from './assetUrl';

describe('optimized image addresses', () => {
  it('maps game PNG assets, including dynamic hero paths, while retaining query and fragment', () => {
    expect(imageAssetUrl('/assets/characters/guan-yu-v1.png',true)).toBe('/assets/characters/guan-yu-v1.webp');
    expect(imageAssetUrl('/assets/characters/hero/jiang-yuan-commander-bow-v1.png?rev=2#preview',true)).toBe('/assets/characters/hero/jiang-yuan-commander-bow-v1.webp?rev=2#preview');
    expect(imageAssetUrl('/assets/events/event-wolves-v1.png',true)).toBe('/assets/events/event-wolves-v1.webp');
  });
  it('keeps original paths for tests and leaves other resource types untouched', () => {
    expect(imageAssetUrl('/assets/goods/grain-v1.png',false)).toBe('/assets/goods/grain-v1.png');
    for (const path of ['/assets/neutral.svg','/assets/music/winter.mp3','https://example.com/a.png','data:image/png;base64,aaa','/outside.png','/assets/a.webp']) expect(imageAssetUrl(path,true)).toBe(path);
  });
});
