import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCornerstone } from '@/hooks/viewer/useCornerstone'
import { useViewerStore } from '@/store/viewer'
import { instancesService } from '@/services/orthanc/instances'
import { ConnectionError } from '@/components/common/errors/ConnectionError'
import { Spinner } from '@/components/common/loading/Spinner'

const VIEWPORT_ID = 'healthlin-viewport'

interface StackViewport {
  setStack: (imageIds: string[], frameIndex?: number) => Promise<void>
  render: () => void
}

export function DicomCanvas() {
  const divRef = useRef<HTMLDivElement>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const { studyId } = useParams<{ studyId: string }>()
  const { renderingEngine, initError } = useCornerstone()
  const {
    currentStudy,
    currentInstance,
    isOrtahncOffline,
    isLoading,
    setOrtahncOffline,
    loadStudy,
  } = useViewerStore()

  // Mount viewport as soon as the rendering engine is ready.
  useEffect(() => {
    if (!renderingEngine || !divRef.current) return

    const engine = renderingEngine
    const div = divRef.current

    function ensureViewport(): StackViewport | null {
      let viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined

      if (!viewport) {
        engine.enableElement({
          viewportId: VIEWPORT_ID,
          type: 'stack' as any,
          element: div,
        })
      }

      engine.resize(true, true)

      viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined
      return viewport ?? null
    }

    try {
      const viewport = ensureViewport()
      console.log('Viewport size:', div.clientWidth, div.clientHeight)

      if (!viewport) {
        setRenderError('Falha ao inicializar o viewport DICOM.')
        return
      }

      viewport.render()
      setRenderError(null)
    } catch (err) {
      setRenderError('Falha ao inicializar o viewport DICOM.')
      console.error('[DicomCanvas] Failed to enable viewport:', err)
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!divRef.current) return

      const viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined

      try {
        console.log('Viewport size:', divRef.current.clientWidth, divRef.current.clientHeight)
        engine.resize(true, true)
        viewport?.render()
      } catch (err) {
        setRenderError('Falha ao redimensionar o viewport DICOM.')
        console.error('[DicomCanvas] Failed to resize viewport:', err)
      }
    })

    resizeObserver.observe(div)

    return () => {
      resizeObserver.disconnect()

      try {
        engine.disableElement(VIEWPORT_ID)
      } catch (err) {
        console.error('[DicomCanvas] Failed to disable viewport:', err)
      }
    }
  }, [renderingEngine])

  // Render image whenever the selected instance changes.
  useEffect(() => {
    if (!renderingEngine) return

    if (!currentInstance) {
      if (currentStudy !== null) {
        setRenderError('Série sem instâncias válidas.')
      }
      return
    }

    let cancelled = false

    const engine = renderingEngine
    const instance = currentInstance

    async function loadImage() {
      try {
        let viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined

        if (!viewport && divRef.current) {
          engine.enableElement({
            viewportId: VIEWPORT_ID,
            type: 'stack' as any,
            element: divRef.current,
          })
          engine.resize(true, true)
          viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined
        }

        if (!viewport) {
          if (cancelled) return
          setRenderError('Viewport DICOM nao esta disponivel para renderizacao.')
          return
        }

        const imageId = instancesService.getFileUrl(instance.ID)
        const imageIds = [imageId].filter((value): value is string => Boolean(value))
        console.log('ImageIds:', imageIds)

        if (imageIds.length === 0) {
          if (cancelled) return
          setRenderError('Nenhuma imagem DICOM valida encontrada para renderizacao.')
          return
        }

        await viewport.setStack(imageIds, 0)
        if (cancelled) return
        viewport.render()
        setRenderError(null)
      } catch (err: unknown) {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 502 || status === 504) {
          setOrtahncOffline(true)
          setRenderError('Orthanc indisponivel no momento.')
        } else {
          setRenderError('Falha ao carregar/renderizar a imagem DICOM.')
          console.error('[DicomCanvas] Failed to load image:', err)
        }
      }
    }

    loadImage()

    return () => {
      cancelled = true
    }
  }, [renderingEngine, currentInstance, currentStudy, setOrtahncOffline])

  if (renderingEngine === null && initError !== null) {
    return (
      <div className="absolute inset-0">
        <ConnectionError overlay onRetry={() => window.location.reload()} />
      </div>
    )
  }

  if (isOrtahncOffline) {
    return (
      <div className="absolute inset-0">
        <ConnectionError
          overlay
          onRetry={() => studyId && loadStudy(studyId)}
        />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <Spinner size="lg" />
        </div>
      )}
      {renderError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="mx-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{renderError}</p>
          </div>
        </div>
      )}
      <div
        ref={divRef}
        id={VIEWPORT_ID}
        className="w-full h-full"
        style={{ userSelect: 'none' }}
      />
    </div>
  )
}
