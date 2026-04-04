import api from '../../api'
import type { DicomTagValue, Instance, SafeSpacingSource, SimplifiedTags } from '@/types/orthanc'

function isObject(value: unknown): value is Record<string, DicomTagValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
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

function isSafeSpacingSource(value: unknown): value is Exclude<SafeSpacingSource, null> {
  return value === 'PixelSpacing' || value === 'ImagerPixelSpacing'
}

function normalizeSafeSpacing(tags: SimplifiedTags): Pick<SimplifiedTags, 'safeSpacing' | 'safeSpacingSource'> {
  if (isSafeSpacingSource(tags.safeSpacingSource)) {
    const explicitSafeSpacing = toNumericList(tags.safeSpacing)
    if (explicitSafeSpacing !== null) {
      return {
        safeSpacing: explicitSafeSpacing,
        safeSpacingSource: tags.safeSpacingSource,
      }
    }
  }

  const pixelSpacing = toNumericList(tags.PixelSpacing)
  if (pixelSpacing !== null) {
    return { safeSpacing: pixelSpacing, safeSpacingSource: 'PixelSpacing' }
  }

  const imagerPixelSpacing = toNumericList(tags.ImagerPixelSpacing)
  if (imagerPixelSpacing !== null) {
    return { safeSpacing: imagerPixelSpacing, safeSpacingSource: 'ImagerPixelSpacing' }
  }

  return { safeSpacing: null, safeSpacingSource: null }
}

function withSafeSpacing(tags: SimplifiedTags): SimplifiedTags {
  const spacingData = normalizeSafeSpacing(tags)
  return {
    ...tags,
    ...spacingData,
  }
}

export const instancesService = {
  async get(id: string): Promise<Instance> {
    const res = await api.get<Instance>(`/api/orthanc/instances/${id}`)
    return res.data
  },

  async getSimplifiedTags(id: string, signal?: AbortSignal): Promise<SimplifiedTags> {
    const res = await api.get<SimplifiedTags>(`/api/orthanc/instances/${id}/simplified-tags`, { signal })
    if (!isObject(res.data)) {
      return { safeSpacing: null, safeSpacingSource: null }
    }
    return withSafeSpacing(res.data as SimplifiedTags)
  },

  // Retorna a URL do arquivo DICOM para o Cornerstone3D (wadouri scheme)
  getFileUrl(id: string): string {
    return `wadouri:${import.meta.env.VITE_API_URL ?? ''}/api/orthanc/instances/${id}/file`
  },

  // Retorna a URL da preview para miniaturas
  getPreviewUrl(id: string): string {
    return `/api/orthanc/instances/${id}/preview`
  },

  async getPreviewBlob(id: string, signal?: AbortSignal): Promise<Blob> {
    const res = await api.get<Blob>(`/api/orthanc/instances/${id}/preview`, {
      responseType: 'blob',
      signal,
    })
    return res.data
  },
}
