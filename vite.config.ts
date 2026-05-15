import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [react()],
    base: process.env.ELECTRON_IS_DEV ? '/' : './',
    build: {
      outDir: 'dist-react',
      target: 'esnext',
      minify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'monaco'
              if (id.includes('react-joyride')) return 'onboarding'
              if (id.includes('fuse.js')) return 'search'
              if (id.includes('date-fns')) return 'date-fns'
              if (id.includes('@heroicons')) return 'icons'
              if (id.includes('@headlessui')) return 'headlessui'
              if (id.includes('react-dom') || id.includes('scheduler')) return 'react-dom'
              if (id.includes('/react/') || id.endsWith('/react')) return 'react'
              return 'vendor'
            }
          }
        }
      }
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none'
    },
    server: {
      port: 3000
    }
  }
})
