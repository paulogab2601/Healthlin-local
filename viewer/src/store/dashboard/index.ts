import { create } from 'zustand'
import { patientsService } from '@/services/orthanc/patients'
import { studiesService } from '@/services/orthanc/studies'
import type { Patient, Study } from '@/types/orthanc'

interface DashboardFilters {
  modality: string
  dateFrom: string
  dateTo: string
}

interface DashboardState {
  patients: Patient[]
  studies: Study[]
  selectedPatientId: string | null
  filters: DashboardFilters
  searchQuery: string
  isLoading: boolean
  isOrtahncOffline: boolean

  fetchPatients: () => Promise<void>
  fetchStudies: (patientId: string) => Promise<void>
  selectPatient: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setFilters: (f: Partial<DashboardFilters>) => void
  setOrtahncOffline: (v: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  patients: [],
  studies: [],
  selectedPatientId: null,
  filters: { modality: '', dateFrom: '', dateTo: '' },
  searchQuery: '',
  isLoading: false,
  isOrtahncOffline: false,

  fetchPatients: async () => {
    set({ isLoading: true, isOrtahncOffline: false })
    try {
      const patients = await patientsService.list()
      set({ patients, isLoading: false })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; code?: string }
      const status = axiosErr?.response?.status
      const isNetworkError = !axiosErr?.response || axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ERR_NETWORK'
      if (isNetworkError || status === 502 || status === 504) {
        set({ isOrtahncOffline: true })
      }
      set({ isLoading: false })
    }
  },

  fetchStudies: async (patientId) => {
    set({ isLoading: true })
    try {
      const studies = await patientsService.getStudies(patientId)
      set({ studies, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  selectPatient: (id) => set({ selectedPatientId: id, studies: [] }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setFilters: (f) =>
    set((state) => ({ filters: { ...state.filters, ...f } })),

  setOrtahncOffline: (v) => set({ isOrtahncOffline: v }),
}))
