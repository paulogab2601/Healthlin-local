import api from '../../api'
import type { Patient, Study } from '@/types/orthanc'

export interface PaginatedPatients {
  patients: Patient[]
  hasMore: boolean
}

export const patientsService = {
  async list(since = 0, limit = 50): Promise<PaginatedPatients> {
    const res = await api.get<Patient[]>(
      `/api/orthanc/patients?expand&since=${since}&limit=${limit + 1}`,
    )
    const hasMore = res.data.length > limit
    return {
      patients: hasMore ? res.data.slice(0, limit) : res.data,
      hasMore,
    }
  },

  async get(id: string): Promise<Patient> {
    const res = await api.get<Patient>(`/api/orthanc/patients/${id}`)
    return res.data
  },

  async getStudies(id: string, signal?: AbortSignal): Promise<Study[]> {
    const res = await api.get<Study[]>(`/api/orthanc/patients/${id}/studies?expand`, { signal })
    return res.data
  },
}
