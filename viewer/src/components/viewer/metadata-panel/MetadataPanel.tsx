import { useEffect, useRef, useState } from 'react'

import { instancesService } from '@/services/orthanc/instances'
import { useViewerStore } from '@/store/viewer'
import type { DicomTagValue, SimplifiedTags } from '@/types/orthanc'
import { formatDate, formatPatientName } from '@/utils/format'

const DISPLAYED_TAGS: { key: keyof SimplifiedTags; label: string }[] = [
  { key: 'PatientName', label: 'Paciente' },
  { key: 'PatientID', label: 'ID Paciente' },
  { key: 'PatientBirthDate', label: 'Nascimento' },
  { key: 'PatientSex', label: 'Sexo' },
  { key: 'StudyDate', label: 'Data do estudo' },
  { key: 'StudyDescription', label: 'Estudo' },
  { key: 'Modality', label: 'Modalidade' },
  { key: 'SeriesDescription', label: 'Serie' },
  { key: 'InstanceNumber', label: 'Instancia' },
  { key: 'SliceThickness', label: 'Espessura de corte' },
  { key: 'PixelSpacing', label: 'Pixel Spacing' },
  { key: 'ImagerPixelSpacing', label: 'Imager Pixel Spacing' },
  { key: 'safeSpacing', label: 'Safe Spacing' },
  { key: 'safeSpacingSource', label: 'Safe Spacing Origem' },
  { key: 'NumberOfFrames', label: 'Number Of Frames' },
  { key: 'KVP', label: 'KV' },
  { key: 'ExposureTime', label: 'Tempo de exposicao' },
  { key: 'Rows', label: 'Linhas' },
  { key: 'Columns', label: 'Colunas' },
]

const DEBOUNCE_MS = 300
const METADATA_CACHE_LIMIT = 240
const FALLBACK_VALUE = '-'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toFiniteNumber(value: DicomTagValue | undefined): number | null {
  if (isFiniteNumber(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toNumericList(value: DicomTagValue | undefined): number[] | null {
  if (Array.isArray(value)) {
    if (value.length < 2) return null
    const numbers = value
      .map((item) => toFiniteNumber(item))
      .filter((item): item is number => item !== null)
    return numbers.length === value.length ? numbers : null
  }

  if (typeof value === 'string' && value.includes('\\')) {
    const rawItems = value.split('\\').map((item) => item.trim())
    if (rawItems.length < 2) return null
    const numbers = rawItems
      .map((item) => toFiniteNumber(item))
      .filter((item): item is number => item !== null)
    return numbers.length === rawItems.length ? numbers : null
  }

  return null
}

function toStringValue(value: DicomTagValue | undefined): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }
  if (isFiniteNumber(value)) {
    return String(value)
  }
  return null
}

function toDisplayValue(value: DicomTagValue | undefined): string | null {
  const primitive = toStringValue(value)
  if (primitive !== null) return primitive

  if (Array.isArray(value)) {
    const items = value
      .map((item) => toDisplayValue(item))
      .filter((item): item is string => Boolean(item))
    return items.length > 0 ? items.join(' \\ ') : null
  }

  // Object or invalid structures are tolerated but not rendered.
  return null
}

function formatTagValue(tags: SimplifiedTags, key: keyof SimplifiedTags, raw: DicomTagValue | undefined): string {
  if (key === 'PatientName') {
    const value = toStringValue(raw)
    return value ? formatPatientName(value) : FALLBACK_VALUE
  }

  if (key === 'PatientBirthDate' || key === 'StudyDate') {
    const value = toStringValue(raw)
    return value ? formatDate(value) : FALLBACK_VALUE
  }

  if (key === 'safeSpacingSource') {
    if (raw === 'PixelSpacing') return 'PixelSpacing'
    if (raw === 'ImagerPixelSpacing') return 'ImagerPixelSpacing (fallback nao calibrado)'
    return FALLBACK_VALUE
  }

  if (key === 'PixelSpacing' || key === 'ImagerPixelSpacing' || key === 'safeSpacing') {
    const spacing = toNumericList(raw)
    if (spacing === null) return FALLBACK_VALUE
    const spacingDisplay = spacing.join(' \\ ')
    if (key === 'safeSpacing' && tags.safeSpacingSource === 'ImagerPixelSpacing') {
      return `${spacingDisplay} (origem ImagerPixelSpacing; nao calibrado)`
    }
    return spacingDisplay
  }

  if (
    key === 'InstanceNumber' ||
    key === 'SliceThickness' ||
    key === 'KVP' ||
    key === 'ExposureTime' ||
    key === 'Rows' ||
    key === 'Columns' ||
    key === 'NumberOfFrames'
  ) {
    const numericValue = toFiniteNumber(raw)
    return numericValue === null ? FALLBACK_VALUE : String(numericValue)
  }

  const genericValue = toDisplayValue(raw)
  return genericValue ?? FALLBACK_VALUE
}

export function MetadataPanel() {
  const currentInstance = useViewerStore((s) => s.currentInstance)
  const [tags, setTags] = useState<SimplifiedTags | null>(null)
  const [hasError, setHasError] = useState(false)
  const cacheRef = useRef<Map<string, SimplifiedTags>>(new Map())

  const cacheTags = (instanceId: string, data: SimplifiedTags) => {
    const cache = cacheRef.current
    if (cache.has(instanceId)) cache.delete(instanceId)
    cache.set(instanceId, data)

    if (cache.size > METADATA_CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
  }

  useEffect(() => {
    if (!currentInstance) {
      setTags(null)
      setHasError(false)
      return
    }

    const instanceId = currentInstance.ID
    const cached = cacheRef.current.get(instanceId)
    if (cached) {
      setTags(cached)
      setHasError(false)
      return
    }

    const abortController = new AbortController()

    const timer = setTimeout(() => {
      instancesService
        .getSimplifiedTags(instanceId, abortController.signal)
        .then((data) => {
          cacheTags(instanceId, data)
          setTags(data)
          setHasError(false)
        })
        .catch(() => {
          if (abortController.signal.aborted) return
          setTags(null)
          setHasError(true)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      abortController.abort()
    }
  }, [currentInstance])

  return (
    <aside className="w-52 bg-bg-secondary border-l border-bg-tertiary flex flex-col shrink-0 overflow-y-auto text-xs">
      <div className="px-3 py-2 border-b border-bg-tertiary">
        <p className="font-semibold text-text-muted uppercase tracking-wider">Metadados DICOM</p>
      </div>

      {hasError ? (
        <div className="p-3 text-danger">Erro ao carregar metadados</div>
      ) : !tags ? (
        <div className="p-3 text-text-muted">Selecione uma instancia</div>
      ) : (
        <dl className="p-3 space-y-2">
          {DISPLAYED_TAGS.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-text-muted">{label}</dt>
              <dd className="text-text-primary font-medium break-words">
                {formatTagValue(tags, key, tags[key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}
