import { useCallback, useEffect, useState } from 'react'
import type { Types } from '@cornerstonejs/core'
import type { ToolMode } from '@/types/viewer'

interface IToolGroup {
  addTool: (toolName: string) => void
  addViewport: (viewportId: string, renderingEngineId: string) => void
  setToolActive: (toolName: string, options?: { bindings?: Array<{ mouseButton: number }> }) => void
  setToolPassive: (toolName: string, options?: { removeAllBindings?: boolean }) => void
}

interface IToolClass {
  toolName: string
}

interface IToolsApi {
  init: () => Promise<void>
  addTool: (tool: IToolClass) => void
  ToolGroupManager: {
    getToolGroup: (id: string) => IToolGroup | undefined
    createToolGroup: (id: string) => IToolGroup
    destroyToolGroup: (id: string) => void
  }
  PanTool: IToolClass
  ZoomTool: IToolClass
  WindowLevelTool: IToolClass
  LengthTool: IToolClass
  AngleTool: IToolClass
  RectangleROITool: IToolClass
}

interface IDicomWorkerManager {
  initialize?: (config: {
    maxWebWorkers: number
    startWebWorkersOnDemand: boolean
    taskConfiguration?: {
      decodeTask?: {
        initializeCodecsOnStartup?: boolean
        strict?: boolean
      }
    }
  }) => void
  terminate?: () => void
}

interface IDicomLoader {
  external: {
    cornerstone?: unknown
    dicomParser?: unknown
  }
  configure: (options: {
    beforeSend: (xhr: XMLHttpRequest | null) => void | Record<string, string>
  }) => void
  webWorkerManager?: IDicomWorkerManager
}

// Singleton compartilhado entre todos os componentes.
let _initialized = false
let _engine: Types.IRenderingEngine | null = null
let _toolGroup: IToolGroup | null = null
let _cleanupRegistered = false
let _initPromise: Promise<void> | null = null
let _initError: Error | null = null

let _workerManager: IDicomWorkerManager | null = null
let _toolsApi: IToolsApi | null = null

const PRIMARY_TOOLS: ToolMode[] = [
  'Pan',
  'Zoom',
  'WindowLevel',
  'Length',
  'Angle',
  'RectangleROI',
]

function setPrimaryTool(toolGroup: IToolGroup, toolName: string): void {
  PRIMARY_TOOLS.forEach((name) => {
    if (name !== toolName) {
      toolGroup.setToolPassive(name, { removeAllBindings: true })
    }
  })

  toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: 1 }] })
}

async function ensureCornerstoneInitialized(): Promise<void> {
  if (_initialized && _engine && _toolGroup) {
    return
  }

  if (_initPromise) {
    return _initPromise
  }

  _initPromise = (async () => {
    const {
      core: cornerstone,
      tools: toolsApi,
      dicomImageLoader,
      dicomParser,
    } = await import('@/lib/cornerstone-init')

    const tools = toolsApi as unknown as IToolsApi
    const loader = dicomImageLoader as unknown as IDicomLoader

    _toolsApi = tools

    loader.external.cornerstone = cornerstone
    loader.external.dicomParser =
      (dicomParser as unknown as { default?: unknown }).default ?? dicomParser

    await cornerstone.init()
    await tools.init()

    _workerManager = loader.webWorkerManager ?? null
    _workerManager?.initialize?.({
      maxWebWorkers: navigator.hardwareConcurrency || 1,
      startWebWorkersOnDemand: true,
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: false,
          strict: false,
        },
      },
    })

    loader.configure({
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

    if (!_engine) {
      _engine = new cornerstone.RenderingEngine('healthlin-engine')
    }

    const {
      addTool,
      ToolGroupManager,
      PanTool,
      ZoomTool,
      WindowLevelTool,
      LengthTool,
      AngleTool,
      RectangleROITool,
    } = tools

    const toolClasses = [
      PanTool,
      ZoomTool,
      WindowLevelTool,
      LengthTool,
      AngleTool,
      RectangleROITool,
    ]

    toolClasses.forEach((ToolClass) => {
      try {
        addTool(ToolClass)
      } catch (err) {
        // Se a ferramenta global já existir, seguimos.
        if (!(err instanceof Error) || !err.message.toLowerCase().includes('already')) {
          throw err
        }
      }
    })

    const group =
      ToolGroupManager.getToolGroup('healthlin-tools') ??
      ToolGroupManager.createToolGroup('healthlin-tools')

    toolClasses.forEach((ToolClass) => {
      try {
        group.addTool(ToolClass.toolName)
      } catch (err) {
        // Se a ferramenta já estiver no grupo, apenas seguimos.
        if (!(err instanceof Error) || !err.message.toLowerCase().includes('already')) {
          throw err
        }
      }
    })

    setPrimaryTool(group, WindowLevelTool.toolName)
    _toolGroup = group
    _initialized = true

    if (!_cleanupRegistered) {
      window.addEventListener('beforeunload', () => {
        _workerManager?.terminate?.()
        _toolsApi?.ToolGroupManager.destroyToolGroup('healthlin-tools')
        _engine?.destroy()
        _engine = null
        _toolGroup = null
        _initialized = false
      })
      _cleanupRegistered = true
    }
  })()

  try {
    await _initPromise
    _initError = null
  } catch (err) {
    _initialized = false
    _initError = err instanceof Error ? err : new Error(String(err))
    throw _initError
  } finally {
    _initPromise = null
  }
}

export function useCornerstone() {
  const [renderingEngine, setRenderingEngine] = useState<Types.IRenderingEngine | null>(_engine)
  const [initError, setInitError] = useState<Error | null>(_initError)

  useEffect(() => {
    let cancelled = false

    if (_engine) {
      setRenderingEngine(_engine)
      setInitError(_initError)
      return () => {
        cancelled = true
      }
    }

    ensureCornerstoneInitialized()
      .then(() => {
        if (cancelled) return
        setRenderingEngine(_engine)
        setInitError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setInitError(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
    }
  }, [])

  // addViewport é idempotente para nosso uso; seguro chamar em troca de ferramenta.
  const activateTool = useCallback((toolName: string): void => {
    if (!_toolGroup) return
    _toolGroup.addViewport('healthlin-viewport', 'healthlin-engine')
    setPrimaryTool(_toolGroup, toolName)
  }, [])

  return { renderingEngine, initError, activateTool }
}
