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
      // Usa bundle com web workers (decoding em threads separadas).
      '@cornerstonejs/dicom-image-loader': path.resolve(
        __dirname,
        './node_modules/@cornerstonejs/dicom-image-loader/dist/cornerstoneDICOMImageLoader.bundle.min.js',
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
        manualChunks(id) {
          if (id.includes('@cornerstonejs/dicom-image-loader')) return 'dicom-loader'
          if (id.includes('@cornerstonejs/core') || id.includes('@cornerstonejs/tools')) return 'cornerstone-runtime'
          if (id.includes('dicom-parser')) return 'dicom-loader'
        },
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
