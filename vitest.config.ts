import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Pruebas (Vitest + jsdom). Va aparte de vite.config.ts porque Vitest trae su propia versión de Vite y los tipos
// de los plugins no coinciden; para las pruebas no hace falta Tailwind.
export default defineConfig({
  plugins: [react() as never],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts', 'src/types/**', 'src/assets/**', 'src/data/**'],
    },
  },
})
