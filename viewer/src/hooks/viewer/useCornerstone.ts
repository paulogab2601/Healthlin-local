import { useCallback, useEffect, useRef, useState } from 'react'
import type { Types } from '@cornerstonejs/core'

interface IToolGroup {
  addTool: (toolName: string) => void
  addViewport: (viewportId: string, renderingEngineId: string) => void
  setToolActive: (toolName: string, options?: { bindings?: Array<{ mouseButton: number }> }) => void
}

// Singleton compartilhado entre montagens do componente
let _initialized = false
let _engine: Types.IRenderingEngine | null = null
let _toolGroup: IToolGroup | null = null
let _cleanupRegistered = false

export function useCornerstone() {
  const [renderingEngine, setRenderingEngine] = useState<Types.IRenderingEngine | null>(_engine)
  const [initError, setInitError] = useState<Error | null>(null)
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
        // Import único do barrel — Rollup agrupa todos os pacotes Cornerstone
        // no mesmo chunk, evitando dependências circulares entre chunks.
        const { core: cornerstone, tools, dicomImageLoader, dicomParser } =
          await import('@/lib/cornerstone-init')

        // Registra a instância do cornerstone no loader (obrigatório na v1.86.0)
        dicomImageLoader.external.cornerstone = cornerstone
        dicomImageLoader.external.dicomParser =
          (dicomParser as unknown as { default?: unknown }).default ?? dicomParser

        await cornerstone.init()
        await tools.init()

        // Inicializa web workers (init() não existe na v1.86.0 — usar webWorkerManager)
        dicomImageLoader.webWorkerManager.initialize({
          maxWebWorkers: navigator.hardwareConcurrency || 1,
          startWebWorkersOnDemand: true,
        })

        // Injeta token nas requisições do loader
        dicomImageLoader.configure({
          beforeSend: (xhr: XMLHttpRequest | null) => {
            const token = localStorage.getItem('healthlin_token')
            if (!token) return

            if (xhr) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`)
              return
            }

            return { Authorization: `Bearer ${token}` }
          },
        })

        _engine = new cornerstone.RenderingEngine('healthlin-engine')
        _initialized = true
        setRenderingEngine(_engine)

        const {
          addTool: csAddTool,
          ToolGroupManager,
          PanTool,
          ZoomTool,
          WindowLevelTool,
          LengthTool,
          AngleTool,
          RectangleROITool,
        } = tools

        const toolClasses = [PanTool, ZoomTool, WindowLevelTool, LengthTool, AngleTool, RectangleROITool]
        toolClasses.forEach(csAddTool)

        let group =
          (ToolGroupManager.getToolGroup('healthlin-tools') as IToolGroup | undefined) ??
          (ToolGroupManager.createToolGroup('healthlin-tools') as unknown as IToolGroup)

        toolClasses.forEach((T) => group.addTool(T.toolName))
        // WindowLevel ativo por padrão com botão primário
        group.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: 1 }] })
        _toolGroup = group

        if (!_cleanupRegistered) {
          window.addEventListener('beforeunload', () => {
            ;(dicomImageLoader.webWorkerManager as unknown as { terminate: () => void }).terminate()
            ToolGroupManager.destroyToolGroup('healthlin-tools')
            _engine?.destroy()
            _engine = null
            _initialized = false
            _toolGroup = null
          })
          _cleanupRegistered = true
        }
      } catch (err) {
        console.error('[Cornerstone] Falha na inicialização:', err)
        setInitError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    init()
  }, [])

  // addViewport é idempotente — seguro chamar a cada ativação de ferramenta
  const activateTool = useCallback((toolName: string): void => {
    if (!_toolGroup) return
    _toolGroup.addViewport('healthlin-viewport', 'healthlin-engine')
    _toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: 1 }] })
  }, [])

  return { renderingEngine, initError, activateTool }
}
