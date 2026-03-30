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
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
