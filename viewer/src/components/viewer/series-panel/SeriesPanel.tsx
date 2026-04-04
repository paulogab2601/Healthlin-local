import { useEffect, useRef, useState } from 'react'

import { ModalityBadge } from '@/components/common/badges/ModalityBadge'
import { isRequestCanceled } from '@/services/network-error'
import { instancesService } from '@/services/orthanc/instances'
import { seriesService } from '@/services/orthanc/series'
import { useViewerStore } from '@/store/viewer'
import type { Instance } from '@/types/orthanc'

const THUMBNAIL_CONCURRENCY_LIMIT = 2
const THUMBNAIL_CACHE_LIMIT = 96

const thumbnailUrlCache = new Map<string, string>()
const thumbnailMissingCache = new Set<string>()
const seriesInstanceCache = new Map<string, string | null>()
const thumbnailPromiseCache = new Map<string, Promise<string | null>>()

let activeThumbnailTasks = 0
const thumbnailQueue: Array<{ signal?: AbortSignal; start: () => void }> = []

function createAbortError(): Error {
  const error = new Error('Request aborted')
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}

function releaseThumbnailSlot(): void {
  activeThumbnailTasks = Math.max(0, activeThumbnailTasks - 1)

  while (thumbnailQueue.length > 0) {
    const next = thumbnailQueue.shift()
    if (!next) return
    if (next.signal?.aborted) continue
    next.start()
    return
  }
}

async function waitForThumbnailSlot(signal?: AbortSignal): Promise<void> {
  if (activeThumbnailTasks < THUMBNAIL_CONCURRENCY_LIMIT) {
    activeThumbnailTasks += 1
    return
  }

  await new Promise<void>((resolve, reject) => {
    let handleAbort: (() => void) | null = null

    const entry = {
      signal,
      start: () => {
        if (signal && handleAbort) {
          signal.removeEventListener('abort', handleAbort)
        }
        activeThumbnailTasks += 1
        resolve()
      },
    }

    thumbnailQueue.push(entry)

    if (!signal) return

    handleAbort = () => {
      const queueIndex = thumbnailQueue.indexOf(entry)
      if (queueIndex >= 0) {
        thumbnailQueue.splice(queueIndex, 1)
      }
      reject(createAbortError())
    }

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

async function runWithThumbnailLimit<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  await waitForThumbnailSlot(signal)

  try {
    return await task()
  } finally {
    releaseThumbnailSlot()
  }
}

function getInstanceId(instance: string | Instance): string | null {
  if (typeof instance === 'string') {
    const normalized = instance.trim()
    return normalized.length > 0 ? normalized : null
  }

  if (typeof instance?.ID === 'string') {
    const normalized = instance.ID.trim()
    return normalized.length > 0 ? normalized : null
  }

  return null
}

function pickFirstInstanceId(instances: Array<string | Instance>): string | null {
  for (const item of instances) {
    const instanceId = getInstanceId(item)
    if (instanceId) return instanceId
  }
  return null
}

async function resolveSeriesInstanceId(seriesId: string): Promise<string | null> {
  const cached = seriesInstanceCache.get(seriesId)
  if (cached !== undefined) return cached

  const series = await seriesService.get(seriesId)
  const fromSeries = pickFirstInstanceId(Array.isArray(series.Instances) ? series.Instances : [])
  if (fromSeries) {
    seriesInstanceCache.set(seriesId, fromSeries)
    return fromSeries
  }

  const fromInstances = pickFirstInstanceId(await seriesService.getInstances(seriesId))
  seriesInstanceCache.set(seriesId, fromInstances)
  return fromInstances
}

function cacheThumbnailUrl(seriesId: string, thumbnailUrl: string): void {
  const previousUrl = thumbnailUrlCache.get(seriesId)
  if (previousUrl && previousUrl !== thumbnailUrl) {
    URL.revokeObjectURL(previousUrl)
  }

  thumbnailUrlCache.delete(seriesId)
  thumbnailUrlCache.set(seriesId, thumbnailUrl)

  while (thumbnailUrlCache.size > THUMBNAIL_CACHE_LIMIT) {
    const oldestSeriesId = thumbnailUrlCache.keys().next().value as string | undefined
    if (!oldestSeriesId) break

    const oldestThumbnailUrl = thumbnailUrlCache.get(oldestSeriesId)
    if (oldestThumbnailUrl) {
      URL.revokeObjectURL(oldestThumbnailUrl)
    }

    thumbnailUrlCache.delete(oldestSeriesId)
    thumbnailMissingCache.delete(oldestSeriesId)
    seriesInstanceCache.delete(oldestSeriesId)
    thumbnailPromiseCache.delete(oldestSeriesId)
  }
}

async function getSeriesThumbnail(seriesId: string, signal?: AbortSignal): Promise<string | null> {
  const cachedThumbnailUrl = thumbnailUrlCache.get(seriesId)
  if (cachedThumbnailUrl) return cachedThumbnailUrl
  if (thumbnailMissingCache.has(seriesId)) return null

  const inflight = thumbnailPromiseCache.get(seriesId)
  if (inflight) return inflight

  const request = runWithThumbnailLimit(async () => {
    throwIfAborted(signal)

    const instanceId = await resolveSeriesInstanceId(seriesId)
    throwIfAborted(signal)

    if (!instanceId) {
      thumbnailMissingCache.add(seriesId)
      return null
    }

    try {
      const previewBlob = await instancesService.getPreviewBlob(instanceId, signal)
      throwIfAborted(signal)

      if (previewBlob.size <= 0) {
        thumbnailMissingCache.add(seriesId)
        return null
      }

      const thumbnailUrl = URL.createObjectURL(previewBlob)
      cacheThumbnailUrl(seriesId, thumbnailUrl)
      thumbnailMissingCache.delete(seriesId)

      return thumbnailUrl
    } catch (error: unknown) {
      if (isRequestCanceled(error)) throw error

      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 415 || status === 422 || status === 204) {
        thumbnailMissingCache.add(seriesId)
      }

      return null
    }
  }, signal).finally(() => {
    thumbnailPromiseCache.delete(seriesId)
  })

  thumbnailPromiseCache.set(seriesId, request)
  return request
}

function pruneThumbnailCaches(validSeriesIds: string[]): void {
  const validIds = new Set(validSeriesIds)

  for (const [seriesId, thumbnailUrl] of thumbnailUrlCache.entries()) {
    if (validIds.has(seriesId)) continue
    URL.revokeObjectURL(thumbnailUrl)
    thumbnailUrlCache.delete(seriesId)
  }

  for (const seriesId of thumbnailMissingCache) {
    if (!validIds.has(seriesId)) {
      thumbnailMissingCache.delete(seriesId)
    }
  }

  for (const seriesId of seriesInstanceCache.keys()) {
    if (!validIds.has(seriesId)) {
      seriesInstanceCache.delete(seriesId)
    }
  }

  for (const seriesId of thumbnailPromiseCache.keys()) {
    if (!validIds.has(seriesId)) {
      thumbnailPromiseCache.delete(seriesId)
    }
  }
}

export function SeriesPanel() {
  const { currentStudy, currentSeries, selectSeries } = useViewerStore()
  const seriesIds = Array.isArray(currentStudy?.Series) ? currentStudy.Series : []
  const seriesIdsKey = seriesIds.join('|')
  const currentModality =
    currentSeries && typeof currentSeries.MainDicomTags?.Modality === 'string'
      ? currentSeries.MainDicomTags.Modality
      : undefined

  useEffect(() => {
    pruneThumbnailCaches(seriesIds)
  }, [seriesIdsKey])

  if (!currentStudy) return null

  return (
    <aside className="w-44 bg-bg-secondary border-r border-bg-tertiary flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 border-b border-bg-tertiary">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Series</p>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {seriesIds.map((seriesId, index) => {
          const isActive = currentSeries?.ID === seriesId
          return (
            <button
              key={seriesId}
              onClick={() => selectSeries(seriesId)}
              className={[
                'flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors w-full',
                isActive
                  ? 'bg-accent/20 border border-accent/40'
                  : 'border border-transparent hover:bg-bg-tertiary',
              ].join(' ')}
            >
              <SeriesThumbnail seriesId={seriesId} index={index} />
              <span className="text-text-muted">Serie {index + 1}</span>
              {isActive && <ModalityBadge modality={currentModality} />}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function SeriesThumbnail({ seriesId, index }: { seriesId: string; index: number }) {
  const thumbnailRef = useRef<HTMLDivElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(() => thumbnailUrlCache.has(seriesId) || thumbnailMissingCache.has(seriesId))
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => thumbnailUrlCache.get(seriesId) ?? null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>(() => {
    if (thumbnailUrlCache.has(seriesId)) return 'ready'
    if (thumbnailMissingCache.has(seriesId)) return 'empty'
    return 'idle'
  })

  useEffect(() => {
    if (thumbnailUrl || shouldLoad) return

    const element = thumbnailRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setShouldLoad(true)
        observer.disconnect()
      },
      {
        rootMargin: '120px 0px',
        threshold: 0.1,
      },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [shouldLoad, thumbnailUrl])

  useEffect(() => {
    if (thumbnailUrl) {
      setStatus('ready')
      return
    }

    if (thumbnailMissingCache.has(seriesId)) {
      setStatus('empty')
      return
    }

    if (!shouldLoad) return

    const abortController = new AbortController()
    let disposed = false

    setStatus('loading')

    getSeriesThumbnail(seriesId, abortController.signal)
      .then((resolvedThumbnailUrl) => {
        if (disposed || abortController.signal.aborted) return

        if (resolvedThumbnailUrl) {
          setThumbnailUrl(resolvedThumbnailUrl)
          setStatus('ready')
          return
        }

        setStatus(thumbnailMissingCache.has(seriesId) ? 'empty' : 'error')
      })
      .catch((error) => {
        if (disposed || abortController.signal.aborted || isRequestCanceled(error)) return
        setStatus('error')
      })

    return () => {
      disposed = true
      abortController.abort()
    }
  }, [seriesId, shouldLoad, thumbnailUrl])

  return (
    <div ref={thumbnailRef} className="h-24 w-full bg-bg-tertiary rounded overflow-hidden flex items-center justify-center">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Preview da serie ${index + 1}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : status === 'loading' ? (
        <div className="h-full w-full animate-pulse bg-bg-tertiary" />
      ) : (
        <svg
          className={['h-6 w-6', status === 'error' ? 'text-danger/70' : 'text-text-muted'].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
          />
        </svg>
      )}
    </div>
  )
}
