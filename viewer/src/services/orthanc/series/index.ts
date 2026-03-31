import api from '../../api'
import type { Series, Instance } from '@/types/orthanc'

type SeriesInstancesResponseItem = string | Instance

export const seriesService = {
  async get(id: string): Promise<Series> {
    const res = await api.get<Series>(`/api/orthanc/series/${id}`)
    return res.data
  },

  async getInstances(id: string): Promise<SeriesInstancesResponseItem[]> {
    const res = await api.get<SeriesInstancesResponseItem[]>(`/api/orthanc/series/${id}/instances`)
    return res.data
  },
}
