import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
