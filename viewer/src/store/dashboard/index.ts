import { create } from 'zustand'
import { patientsService } from '@/services/orthanc/patients'
import { isOrthancOfflineError, isRequestCanceled } from '@/services/network-error'
import type { Patient, Study } from '@/types/orthanc'

const PAGE_SIZE = 50

interface DashboardFilters {
  modality: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: DashboardFilters = { modality: '', dateFrom: '', dateTo: '' }

interface DashboardState {
  patients: Patient[]
  studies: Study[]
  selectedPatientId: string | null
  filters: DashboardFilters
  searchQuery: string
  isLoadingPatients: boolean
  isLoadingStudies: boolean
  isOrtahncOffline: boolean
  fetchError: string | null
  page: number
  hasMore: boolean

  fetchPatients: () => Promise<void>
  fetchStudies: (patientId: string) => Promise<void>
  selectPatient: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setFilters: (f: Partial<DashboardFilters>) => void
  setOrtahncOffline: (v: boolean) => void
  nextPage: () => void
  prevPage: () => void
}

let studiesAbort: AbortController | null = null

export const useDashboardStore = create<DashboardState>((set, get) => ({
  patients: [],
  studies: [],
  selectedPatientId: null,
  filters: { ...DEFAULT_FILTERS },
  searchQuery: '',
  isLoadingPatients: false,
  isLoadingStudies: false,
  isOrtahncOffline: false,
  fetchError: null,
  page: 0,
  hasMore: false,

  fetchPatients: async () => {
    const since = get().page * PAGE_SIZE
    set({ isLoadingPatients: true, isOrtahncOffline: false, fetchError: null })
    try {
      const { patients, hasMore } = await patientsService.list(since, PAGE_SIZE)
      set({ patients, hasMore, isLoadingPatients: false })
    } catch (err: unknown) {
      if (isOrthancOfflineError(err)) {
        set({ isOrtahncOffline: true, isLoadingPatients: false })
      } else {
        set({ fetchError: 'Erro ao carregar pacientes. Tente novamente.', isLoadingPatients: false })
      }
    }
  },

  fetchStudies: async (patientId) => {
    studiesAbort?.abort()
    const controller = new AbortController()
    studiesAbort = controller
    set({ isLoadingStudies: true })
    try {
      const studies = await patientsService.getStudies(patientId, controller.signal)
      if (get().selectedPatientId !== patientId) return
      set({ studies, isLoadingStudies: false })
    } catch (err) {
      if (isRequestCanceled(err)) return
      set({ isLoadingStudies: false })
    }
  },

  selectPatient: (id) => set({ selectedPatientId: id, studies: [], filters: { ...DEFAULT_FILTERS } }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setFilters: (f) =>
    set((state) => ({ filters: { ...state.filters, ...f } })),

  setOrtahncOffline: (v) => set({ isOrtahncOffline: v }),

  nextPage: () => {
    if (!get().hasMore) return
    set({ page: get().page + 1 })
    get().fetchPatients()
  },

  prevPage: () => {
    if (get().page <= 0) return
    set({ page: get().page - 1 })
    get().fetchPatients()
  },
}))
