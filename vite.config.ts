import { defineConfig } from 'vitest/config';

export default defineConfig({
  test:{include:['src/**/*.test.ts']},
  server: {
    host: '127.0.0.1',
    watch:{ignored:['**/release/**','**/artifacts/**']},
  },
});
