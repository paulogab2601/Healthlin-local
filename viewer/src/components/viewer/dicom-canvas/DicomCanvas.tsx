import { useEffect, useRef } from 'react'
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
  const { renderingEngine } = useCornerstone()
  const {
    currentInstance,
    currentFrame,
    isOrtahncOffline,
    isLoading,
    setOrtahncOffline,
    loadStudy,
  } = useViewerStore()

  // Monta o viewport quando o engine estiver pronto
  useEffect(() => {
    if (!renderingEngine || !divRef.current) return

    const existing = renderingEngine.getViewport(VIEWPORT_ID)
    if (!existing) {
      renderingEngine.enableElement({
        viewportId: VIEWPORT_ID,
        type: 'STACK' as unknown as never,
        element: divRef.current,
      })
    }
  }, [renderingEngine])

  // Atualiza a imagem quando a instância muda
  useEffect(() => {
    if (!renderingEngine || !currentInstance) return

    async function loadImage() {
      try {
        const viewport = renderingEngine!.getViewport(VIEWPORT_ID) as unknown as StackViewport
        if (!viewport) return

        const imageId = instancesService.getFileUrl(currentInstance!.ID)
        await viewport.setStack([imageId], currentFrame)
        viewport.render()
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 502 || status === 504) {
          setOrtahncOffline(true)
        }
      }
    }

    loadImage()
  }, [renderingEngine, currentInstance, currentFrame, setOrtahncOffline])

  const studyId = useViewerStore.getState().currentStudy?.ID

  if (isOrtahncOffline) {
    return (
      <div className="relative flex-1">
        <ConnectionError
          overlay
          onRetry={() => studyId && loadStudy(studyId)}
        />
      </div>
    )
  }

  return (
    <div className="relative flex-1 bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <Spinner size="lg" />
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
