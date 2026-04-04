import api from '../../api'
import type { Study } from '@/types/orthanc'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const studiesService = {
  async list(): Promise<string[]> {
    const res = await api.get<string[]>('/api/orthanc/studies')
    return Array.isArray(res.data) ? res.data.filter((item): item is string => typeof item === 'string') : []
  },

  async get(id: string): Promise<Study> {
    const res = await api.get<Study>(`/api/orthanc/studies/${id}`)
    if (!isRecord(res.data)) {
      return {
        ID: id,
        PatientID: '',
        MainDicomTags: {},
        PatientMainDicomTags: {},
        Series: [],
      }
    }

    const study = res.data as Study
    return {
      ...study,
      Series: Array.isArray(study?.Series) ? study.Series : [],
      MainDicomTags: study?.MainDicomTags ?? {},
      PatientMainDicomTags: study?.PatientMainDicomTags ?? {},
    }
  },

  async getSeries(id: string) {
    const res = await api.get(`/api/orthanc/studies/${id}/series`)
    return res.data
  },

  async find(query: Record<string, unknown>) {
    const res = await api.post('/api/orthanc/tools/find', query)
    return res.data
  },
}
