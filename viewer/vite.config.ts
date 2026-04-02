import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Substitui o modulo WASM de segmentacao por stub vazio (nao usado).
      '@icr/polyseg-wasm': path.resolve(__dirname, './src/stubs/polyseg-stub.ts'),
      // Usa bundle sem web workers para evitar erro de decodeTask em runtime.
      '@cornerstonejs/dicom-image-loader': path.resolve(
        __dirname,
        './node_modules/@cornerstonejs/dicom-image-loader/dist/cornerstoneDICOMImageLoaderNoWebWorkers.bundle.min.js',
      ),
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
        // Nao usar manualChunks: mantemos runtime do Cornerstone no mesmo
        // chunk carregado dinamicamente para reduzir risco de ordem de execucao.
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
