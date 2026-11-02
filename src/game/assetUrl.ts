declare const __OPTIMIZED_IMAGES__: boolean;
const optimized = typeof __OPTIMIZED_IMAGES__ !== 'undefined' && __OPTIMIZED_IMAGES__;

/** Catalogs retain original-art paths; browsers request only the prepared release assets. */
export function imageAssetUrl(path: string, useOptimized = optimized): string {
  return useOptimized && /^\/assets\/.+\.png(?:[?#]|$)/i.test(path)
    ? path.replace(/\.png(?=[?#]|$)/i, '.webp') : path;
}
