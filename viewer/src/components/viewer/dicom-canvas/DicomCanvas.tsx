import { imageLoader, type Types } from '@cornerstonejs/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ConnectionError } from '@/components/common/errors/ConnectionError'
import { Spinner } from '@/components/common/loading/Spinner'
import { useCornerstone } from '@/hooks/viewer/useCornerstone'
import { instancesService } from '@/services/orthanc/instances'
import { isOrthancOfflineError, isRequestCanceled } from '@/services/network-error'
import { useViewerStore } from '@/store/viewer'

const VIEWPORT_ID = 'healthlin-viewport'
const PREFETCH_RADIUS = 5
const PREFETCH_CONCURRENCY = 2
const PREFETCH_TRACK_LIMIT = 160
const WHEEL_DELTA_THRESHOLD = 24
const WHEEL_STEP_THROTTLE_MS = 40

interface StackViewport {
  setStack: (imageIds: string[], frameIndex?: number) => Promise<unknown>
  setImageIdIndex?: (index: number) => Promise<unknown>
  render: () => void
}

function ensureViewport(engine: Types.IRenderingEngine, element: HTMLDivElement | null): StackViewport | null {
  let viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined

  if (!viewport && element) {
    engine.enableElement({
      viewportId: VIEWPORT_ID,
      type: 'stack' as any,
      element,
    })
    engine.resize(true, true)
    viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined
  }

  return viewport ?? null
}

function areSameImageIds(previous: string[], next: string[]): boolean {
  if (previous === next) return true
  if (previous.length !== next.length) return false

  for (let index = 0; index < previous.length; index += 1) {
    if (previous[index] !== next[index]) return false
  }

  return true
}

export function DicomCanvas() {
  const divRef = useRef<HTMLDivElement>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const { studyId } = useParams<{ studyId: string }>()
  const { renderingEngine, initError } = useCornerstone()
  const {
    currentStudy,
    currentSeries,
    instances,
    currentFrame,
    setFrame,
    isOrtahncOffline,
    isLoading,
    setOrtahncOffline,
    loadStudy,
  } = useViewerStore()

  const stackImageIds = useMemo(
    () => instances.map((instance) => instancesService.getFileUrl(instance.ID)).filter(Boolean),
    [instances],
  )

  const renderRequestIdRef = useRef(0)
  const prefetchRequestIdRef = useRef(0)
  const appliedSeriesIdRef = useRef<string | null>(null)
  const appliedStackImageIdsRef = useRef<string[]>([])
  const prefetchedImageIdsRef = useRef<Set<string>>(new Set())
  const wheelDeltaBufferRef = useRef(0)
  const wheelLockRef = useRef(false)

  useEffect(() => {
    if (!renderingEngine || !divRef.current) return

    const engine = renderingEngine
    const element = divRef.current

    try {
      const viewport = ensureViewport(engine, element)
      if (!viewport) {
        setRenderError('Falha ao inicializar o viewport DICOM.')
        return
      }

      engine.resize(true, true)
      viewport.render()
      setRenderError(null)
    } catch (err) {
      setRenderError('Falha ao inicializar o viewport DICOM.')
      console.error('[DicomCanvas] Failed to enable viewport:', err)
    }

    let rafId: number | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (rafId !== null) return

      rafId = requestAnimationFrame(() => {
        rafId = null
        if (!divRef.current) return

        const viewport = engine.getViewport(VIEWPORT_ID) as unknown as StackViewport | undefined

        try {
          engine.resize(true, true)
          viewport?.render()
        } catch (err) {
          setRenderError('Falha ao redimensionar o viewport DICOM.')
          console.error('[DicomCanvas] Failed to resize viewport:', err)
        }
      })
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)

      try {
        engine.disableElement(VIEWPORT_ID)
      } catch (err) {
        console.error('[DicomCanvas] Failed to disable viewport:', err)
      }
    }
  }, [renderingEngine])

  useEffect(() => {
    const element = divRef.current
    if (!element) return

    const maxFrame = instances.length - 1

    function onWheel(event: WheelEvent) {
      if (maxFrame < 1) return

      event.preventDefault()
      wheelDeltaBufferRef.current += event.deltaY

      if (Math.abs(wheelDeltaBufferRef.current) < WHEEL_DELTA_THRESHOLD) {
        return
      }

      if (wheelLockRef.current) return
      wheelLockRef.current = true

      const direction = wheelDeltaBufferRef.current > 0 ? 1 : -1
      wheelDeltaBufferRef.current = 0

      const nextFrame = Math.min(maxFrame, Math.max(0, currentFrame + direction))
      if (nextFrame !== currentFrame) {
        setFrame(nextFrame)
      }

      window.setTimeout(() => {
        wheelLockRef.current = false
      }, WHEEL_STEP_THROTTLE_MS)
    }

    element.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', onWheel)
      wheelDeltaBufferRef.current = 0
      wheelLockRef.current = false
    }
  }, [instances.length, currentFrame, setFrame])

  useEffect(() => {
    if (!renderingEngine) return
    const engine = renderingEngine

    if (stackImageIds.length === 0) {
      appliedSeriesIdRef.current = null
      appliedStackImageIdsRef.current = []
      prefetchedImageIdsRef.current.clear()

      if (currentStudy !== null) {
        setRenderError('Serie sem instancias validas.')
      } else {
        setRenderError(null)
      }
      return
    }

    const requestId = ++renderRequestIdRef.current
    let cancelled = false

    const isStale = (): boolean => cancelled || requestId !== renderRequestIdRef.current

    async function renderCurrentFrame() {
      try {
        const viewport = ensureViewport(engine, divRef.current)
        if (!viewport) {
          if (isStale()) return
          setRenderError('Viewport DICOM nao esta disponivel para renderizacao.')
          return
        }

        const frameIndex = Math.min(Math.max(currentFrame, 0), stackImageIds.length - 1)
        const seriesId = currentSeries?.ID ?? null
        const stackChanged =
          seriesId !== appliedSeriesIdRef.current ||
          !areSameImageIds(appliedStackImageIdsRef.current, stackImageIds)

        if (stackChanged) {
          if (isStale()) return
          await viewport.setStack(stackImageIds, frameIndex)
          if (isStale()) return

          appliedSeriesIdRef.current = seriesId
          appliedStackImageIdsRef.current = stackImageIds
          prefetchedImageIdsRef.current.clear()
        } else if (typeof viewport.setImageIdIndex === 'function') {
          if (isStale()) return
          await viewport.setImageIdIndex(frameIndex)
          if (isStale()) return
        } else {
          if (isStale()) return
          await viewport.setStack(stackImageIds, frameIndex)
          if (isStale()) return
        }

        viewport.render()
        if (isStale()) return
        setRenderError(null)
      } catch (err: unknown) {
        if (isStale() || isRequestCanceled(err)) return

        if (isOrthancOfflineError(err)) {
          setOrtahncOffline(true)
          setRenderError('Orthanc indisponivel no momento.')
          return
        }

        setRenderError('Falha ao carregar/renderizar a imagem DICOM.')
        console.error('[DicomCanvas] Failed to render stack frame:', err)
      }
    }

    void renderCurrentFrame()

    return () => {
      cancelled = true
    }
  }, [renderingEngine, currentSeries?.ID, currentStudy, currentFrame, stackImageIds, setOrtahncOffline])

  useEffect(() => {
    if (!renderingEngine || stackImageIds.length <= 1) return

    const requestId = ++prefetchRequestIdRef.current
    let cancelled = false
    const isStale = (): boolean => cancelled || requestId !== prefetchRequestIdRef.current

    const from = Math.max(0, currentFrame - PREFETCH_RADIUS)
    const to = Math.min(stackImageIds.length - 1, currentFrame + PREFETCH_RADIUS)

    const targets: string[] = []
    for (let index = from; index <= to; index += 1) {
      if (index === currentFrame) continue

      const imageId = stackImageIds[index]
      if (!imageId || prefetchedImageIdsRef.current.has(imageId)) continue

      prefetchedImageIdsRef.current.add(imageId)
      targets.push(imageId)
    }

    if (targets.length === 0) {
      return () => {
        cancelled = true
      }
    }

    if (prefetchedImageIdsRef.current.size > PREFETCH_TRACK_LIMIT) {
      const keepFrom = Math.max(0, currentFrame - PREFETCH_RADIUS)
      const keepTo = Math.min(stackImageIds.length - 1, currentFrame + PREFETCH_RADIUS)
      prefetchedImageIdsRef.current = new Set(stackImageIds.slice(keepFrom, keepTo + 1))
    }

    async function prefetchNearby() {
      for (let index = 0; index < targets.length; index += PREFETCH_CONCURRENCY) {
        if (isStale()) return
        const batch = targets.slice(index, index + PREFETCH_CONCURRENCY)

        await Promise.all(
          batch.map(async (imageId) => {
            if (isStale()) return
            try {
              await imageLoader.loadAndCacheImage(imageId)
            } catch {
              // Prefetch failure should not disrupt navigation/render.
            }
          }),
        )
      }
    }

    void prefetchNearby()

    return () => {
      cancelled = true
    }
  }, [renderingEngine, stackImageIds, currentFrame])

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
