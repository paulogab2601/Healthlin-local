import api from '../../api'
import type { Patient, Study } from '@/types/orthanc'

export interface PaginatedPatients {
  patients: Patient[]
  hasMore: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizePatient(value: unknown): Patient | null {
  if (!isRecord(value)) return null
  const id = typeof value.ID === 'string' ? value.ID : null
  if (!id) return null

  return {
    ID: id,
    MainDicomTags: isRecord(value.MainDicomTags)
      ? (value.MainDicomTags as Patient['MainDicomTags'])
      : {},
    Studies: Array.isArray(value.Studies)
      ? value.Studies.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

export const patientsService = {
  async list(since = 0, limit = 50): Promise<PaginatedPatients> {
    const res = await api.get<Patient[]>(
      `/api/orthanc/patients?expand&since=${since}&limit=${limit + 1}`,
    )
    const patients = Array.isArray(res.data)
      ? res.data.map(normalizePatient).filter((item): item is Patient => item !== null)
      : []
    const hasMore = patients.length > limit
    return {
      patients: hasMore ? patients.slice(0, limit) : patients,
      hasMore,
    }
  },

  async get(id: string): Promise<Patient> {
    const res = await api.get<Patient>(`/api/orthanc/patients/${id}`)
    if (!isRecord(res.data)) {
      return {
        ID: id,
        MainDicomTags: {},
        Studies: [],
      }
    }

    return normalizePatient(res.data) ?? { ID: id, MainDicomTags: {}, Studies: [] }
  },

  async getStudies(id: string, signal?: AbortSignal): Promise<Study[]> {
    const res = await api.get<Study[]>(`/api/orthanc/patients/${id}/studies?expand`, { signal })
    return Array.isArray(res.data) ? res.data : []
  },
}
