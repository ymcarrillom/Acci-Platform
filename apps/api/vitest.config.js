import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    testTimeout: 15000,
    // Run test files sequentially to avoid DB conflicts between suites
    fileParallelism: false,
  },
});
