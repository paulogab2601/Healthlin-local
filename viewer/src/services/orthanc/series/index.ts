import api from '../../api'
import type { Series, Instance } from '@/types/orthanc'

type SeriesInstancesResponseItem = string | Instance

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const seriesService = {
  async get(id: string): Promise<Series> {
    const res = await api.get<Series>(`/api/orthanc/series/${id}`)
    if (!isRecord(res.data)) {
      return {
        ID: id,
        ParentStudy: '',
        MainDicomTags: {},
        Instances: [],
      }
    }

    const series = res.data as Series
    return {
      ...series,
      MainDicomTags: series.MainDicomTags ?? {},
      Instances: Array.isArray(series.Instances)
        ? series.Instances.filter((item) => {
            if (typeof item === 'string') return true
            return isRecord(item) && typeof (item as Instance).ID === 'string'
          })
        : [],
    }
  },

  async getInstances(id: string): Promise<SeriesInstancesResponseItem[]> {
    try {
      const res = await api.get<SeriesInstancesResponseItem[]>(`/api/orthanc/series/${id}/instances?expand`)
      if (!Array.isArray(res.data)) return []
      return res.data.filter((item) => {
        if (typeof item === 'string') return true
        return isRecord(item) && typeof (item as Instance).ID === 'string'
      })
    } catch {
      const res = await api.get<SeriesInstancesResponseItem[]>(`/api/orthanc/series/${id}/instances`)
      if (!Array.isArray(res.data)) return []
      return res.data.filter((item) => {
        if (typeof item === 'string') return true
        return isRecord(item) && typeof (item as Instance).ID === 'string'
      })
    }
  },
}
