import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Do not load vitest.setup.ts — integration tests opt into a real DATABASE_URL.
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    env: {
      VITEST_ALLOW_DATABASE_URL: '1',
      VITEST_ALLOW_AUTH_ENV: '1',
    },
  },
});

