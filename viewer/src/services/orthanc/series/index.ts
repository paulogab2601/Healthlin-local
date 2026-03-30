import api from '../../api'
import type { Series } from '@/types/orthanc'

export const seriesService = {
  async get(id: string): Promise<Series> {
    const res = await api.get<Series>(`/api/orthanc/series/${id}`)
    return res.data
  },

  async getInstances(id: string) {
    const res = await api.get(`/api/orthanc/series/${id}/instances`)
    return res.data
  },
}
