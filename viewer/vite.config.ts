import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Substitui o módulo WASM de segmentação por stub vazio (não usado)
      '@icr/polyseg-wasm': path.resolve(__dirname, './src/stubs/polyseg-stub.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        // NÃO usar manualChunks — o helper CJS (getDefaultExportFromCjs) vaza
        // para o chunk Cornerstone, forçando um import estático do main bundle
        // que crasha a app inteira (login incluso).
        // Em vez disso, usamos um barrel file (src/lib/cornerstone-init.ts) com
        // imports estáticos + dynamic import() externo: Rollup agrupa tudo no
        // mesmo chunk naturalmente, sem dependências circulares.
      },
    },
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
