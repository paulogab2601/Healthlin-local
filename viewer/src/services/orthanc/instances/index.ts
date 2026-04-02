import api from '../../api'
import type { Instance, SimplifiedTags } from '@/types/orthanc'

export const instancesService = {
  async get(id: string): Promise<Instance> {
    const res = await api.get<Instance>(`/api/orthanc/instances/${id}`)
    return res.data
  },

  async getSimplifiedTags(id: string): Promise<SimplifiedTags> {
    const res = await api.get<SimplifiedTags>(`/api/orthanc/instances/${id}/simplified-tags`)
    return res.data
  },

  // Retorna a URL do arquivo DICOM para o Cornerstone3D (wadouri scheme)
  getFileUrl(id: string): string {
    return `wadouri:${import.meta.env.VITE_API_URL ?? ''}/api/orthanc/instances/${id}/file`
  },

  // Retorna a URL da preview para miniaturas
  getPreviewUrl(id: string): string {
    return `/api/orthanc/instances/${id}/preview`
  },
}
