import api from '../../api'
import type { Study } from '@/types/orthanc'

export const studiesService = {
  async list(): Promise<string[]> {
    const res = await api.get<string[]>('/api/orthanc/studies')
    return res.data
  },

  async get(id: string): Promise<Study> {
    const res = await api.get<Study>(`/api/orthanc/studies/${id}`)
    return res.data
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
