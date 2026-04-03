import api from '../../api'
import type { Patient } from '@/types/orthanc'

export const patientsService = {
  async list(): Promise<Patient[]> {
    const res = await api.get<Patient[]>('/api/orthanc/patients?expand')
    return res.data
  },

  async get(id: string): Promise<Patient> {
    const res = await api.get<Patient>(`/api/orthanc/patients/${id}`)
    return res.data
  },

  async getStudies(id: string) {
    const res = await api.get(`/api/orthanc/patients/${id}/studies`)
    return res.data
  },
}
