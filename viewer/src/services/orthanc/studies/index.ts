import api from '../../api'
import type { Study } from '@/types/orthanc'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeStudy(value: unknown): Study | null {
  if (!isRecord(value)) return null
  const id = typeof value.ID === 'string' ? value.ID : null
  if (!id) return null

  const patientId =
    typeof value.PatientID === 'string'
      ? value.PatientID
      : typeof value.ParentPatient === 'string'
        ? value.ParentPatient
        : ''

  return {
    ID: id,
    PatientID: patientId,
    MainDicomTags: isRecord(value.MainDicomTags)
      ? (value.MainDicomTags as Study['MainDicomTags'])
      : {},
    PatientMainDicomTags: isRecord(value.PatientMainDicomTags)
      ? (value.PatientMainDicomTags as Study['PatientMainDicomTags'])
      : {},
    Series: Array.isArray(value.Series)
      ? value.Series.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

export const studiesService = {
  async list(): Promise<string[]> {
    const res = await api.get<string[]>('/api/orthanc/studies')
    return Array.isArray(res.data) ? res.data.filter((item): item is string => typeof item === 'string') : []
  },

  async get(id: string): Promise<Study> {
    const res = await api.get<unknown>(`/api/orthanc/studies/${id}`)
    return normalizeStudy(res.data) ?? {
      ID: id,
      PatientID: '',
      MainDicomTags: {},
      PatientMainDicomTags: {},
      Series: [],
    }
  },

  async getSeries(id: string) {
    const res = await api.get(`/api/orthanc/studies/${id}/series`)
    return res.data
  },

  async find<TResponse = unknown>(query: Record<string, unknown>, signal?: AbortSignal): Promise<TResponse> {
    const res = await api.post<TResponse>('/api/orthanc/tools/find', query, { signal })
    return res.data
  },

  async findByStudyDate(studyDateQueryValue: string, signal?: AbortSignal): Promise<Study[]> {
    const data = await studiesService.find<unknown[]>(
      {
        Level: 'Study',
        Expand: true,
        Query: { StudyDate: studyDateQueryValue },
      },
      signal,
    )

    return Array.isArray(data)
      ? data.map(normalizeStudy).filter((study): study is Study => study !== null)
      : []
  },
}
