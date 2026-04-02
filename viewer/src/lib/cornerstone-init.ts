// Barrel file — ponto de entrada único para todos os pacotes Cornerstone.
// Ao usar imports estáticos aqui e um dynamic import() de fora,
// Rollup agrupa tudo no mesmo chunk, evitando dependências circulares
// entre chunks sem precisar de manualChunks (que vazaria o helper CJS
// getDefaultExportFromCjs para o main bundle).
import * as core from '@cornerstonejs/core'
import * as tools from '@cornerstonejs/tools'
import * as dicomImageLoader from '@cornerstonejs/dicom-image-loader'
import * as dicomParser from 'dicom-parser'

export { core, tools, dicomImageLoader, dicomParser }
