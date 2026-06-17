import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true }),
  ],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('i18next')) return 'vendor-i18n'
          if (id.includes('react-icons')) return 'vendor-icons'
          // Keep the heavy PDF renderer out of the eagerly-loaded react vendor
          // chunk — it is dynamically imported (OverviewTab) and must stay lazy.
          // This check must precede the generic 'react' match below.
          if (id.includes('@react-pdf')) return 'vendor-pdf'
          if (id.includes('react')) return 'vendor-react'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.test.*',
        'src/**/*.spec.*',
      ],
      thresholds: {
        statements: 23,
        branches: 24,
        functions: 22,
        lines: 22,
      },
    },
  },
})
