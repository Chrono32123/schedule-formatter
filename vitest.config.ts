import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
        isolate: true,
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
