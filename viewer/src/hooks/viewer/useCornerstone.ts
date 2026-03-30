import { useEffect, useRef } from 'react'
import type { Types } from '@cornerstonejs/core'

let initialized = false
let renderingEngine: Types.IRenderingEngine | null = null

export function useCornerstone() {
  const initializingRef = useRef(false)

  useEffect(() => {
    if (initialized || initializingRef.current) return
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

        renderingEngine = new RenderingEngine('healthlin-engine')
        initialized = true
      } catch (err) {
        console.error('[Cornerstone] Falha na inicialização:', err)
      }
    }

    init()
  }, [])

  return { renderingEngine: renderingEngine as Types.IRenderingEngine | null }
}
