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
        const { init: csInit, RenderingEngine } = await import('@cornerstonejs/core')
        const { init: toolsInit } = await import('@cornerstonejs/tools')
        const dicomImageLoader = await import('@cornerstonejs/dicom-image-loader')

        await csInit()
        await toolsInit()

        // Configura o WADO URI loader com token JWT
        dicomImageLoader.init({
          maxWebWorkers: navigator.hardwareConcurrency || 1,
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

        _engine = new RenderingEngine('healthlin-engine')
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
