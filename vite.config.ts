import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  publicDir: mode === 'test' ? 'public' : '.generated/public',
  define: { __OPTIMIZED_IMAGES__: JSON.stringify(mode !== 'test') },
  test:{include:['src/**/*.test.ts']},
  server: {
    host: '127.0.0.1',
    watch:{ignored:['**/release/**','**/artifacts/**','**/.generated/image-cache/**']},
  },
}));
