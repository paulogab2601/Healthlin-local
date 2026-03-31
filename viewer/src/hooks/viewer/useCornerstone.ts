import { useEffect, useRef, useState } from 'react'
import type { Types } from '@cornerstonejs/core'

// Singleton compartilhado entre montagens do componente
let _initialized = false
let _engine: Types.IRenderingEngine | null = null

export function useCornerstone() {
  const [renderingEngine, setRenderingEngine] = useState<Types.IRenderingEngine | null>(_engine)
  const initializingRef = useRef(false)

  useEffect(() => {
    // Já inicializado em montagem anterior — expõe via state
    if (_engine) {
      setRenderingEngine(_engine)
      return
    }

    if (_initialized || initializingRef.current) return
    initializingRef.current = true

    async function init() {
      try {
        const cornerstone = await import('@cornerstonejs/core')
        // Importa apenas o módulo de inicialização para evitar carregar todo o
        // índice de tools (que possui cadeias de reexport circulares).
        const { default: toolsInit } = await import('@cornerstonejs/tools/dist/esm/init.js')
        const dicomImageLoader = await import('@cornerstonejs/dicom-image-loader')

        // Registra a instância do cornerstone no loader (obrigatório na v1.86.0)
        dicomImageLoader.external.cornerstone = cornerstone

        await cornerstone.init()
        await toolsInit()

        // Inicializa web workers (init() não existe na v1.86.0 — usar webWorkerManager)
        dicomImageLoader.webWorkerManager.initialize({
          maxWebWorkers: navigator.hardwareConcurrency || 1,
          startWebWorkersOnDemand: true,
        })

        // Injeta token nas requisições do loader
        dicomImageLoader.configure({
          beforeSend: (xhr: XMLHttpRequest) => {
            const token = localStorage.getItem('healthlin_token')
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`)
            }
          },
        })

        _engine = new cornerstone.RenderingEngine('healthlin-engine')
        _initialized = true
        setRenderingEngine(_engine)
      } catch (err) {
        console.error('[Cornerstone] Falha na inicialização:', err)
      }
    }

    init()
  }, [])

  return { renderingEngine }
}
