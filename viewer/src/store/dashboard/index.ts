import { create } from 'zustand'
import { patientsService } from '@/services/orthanc/patients'
import { isOrthancOfflineError, isRequestCanceled } from '@/services/network-error'
import type { Patient, Study } from '@/types/orthanc'

const PAGE_SIZE = 50

export interface DashboardFilters {
  modality: string
  dateFrom: string
  dateTo: string
}

export const DEFAULT_FILTERS: DashboardFilters = { modality: '', dateFrom: '', dateTo: '' }

function getTodayLocalDateInputValue(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDefaultDateFilters(): DashboardFilters {
  const today = getTodayLocalDateInputValue()
  return { modality: '', dateFrom: today, dateTo: today }
}

function hasManualDashboardFilters(filters: DashboardFilters, searchQuery: string): boolean {
  return Boolean(
    searchQuery.trim() ||
    filters.modality.trim() ||
    filters.dateFrom ||
    filters.dateTo,
  )
}

interface DashboardState {
  patients: Patient[]
  studies: Study[]
  selectedPatientId: string | null
  filters: DashboardFilters
  isDefaultDateFilterActive: boolean
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
  clearFilters: () => void
  setOrtahncOffline: (v: boolean) => void
  nextPage: () => void
  prevPage: () => void
}

let studiesAbort: AbortController | null = null

export const useDashboardStore = create<DashboardState>((set, get) => ({
  patients: [],
  studies: [],
  selectedPatientId: null,
  filters: buildDefaultDateFilters(),
  isDefaultDateFilterActive: true,
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

  selectPatient: (id) => set({ selectedPatientId: id, studies: [] }),

  setSearchQuery: (searchQuery) =>
    set((state) => {
      if (state.isDefaultDateFilterActive) {
        if (searchQuery.trim().length === 0) return { searchQuery }

        return {
          searchQuery,
          isDefaultDateFilterActive: false,
          filters: { ...DEFAULT_FILTERS },
        }
      }

      if (hasManualDashboardFilters(state.filters, searchQuery)) {
        return { searchQuery }
      }

      return {
        searchQuery: '',
        filters: buildDefaultDateFilters(),
        isDefaultDateFilterActive: true,
      }
    }),

  setFilters: (f) =>
    set((state) => {
      const nextFilters = state.isDefaultDateFilterActive
        ? { ...DEFAULT_FILTERS, ...f }
        : { ...state.filters, ...f }

      if (!hasManualDashboardFilters(nextFilters, state.searchQuery)) {
        return {
          filters: buildDefaultDateFilters(),
          isDefaultDateFilterActive: true,
        }
      }

      return {
        filters: nextFilters,
        isDefaultDateFilterActive: false,
      }
    }),
  clearFilters: () =>
    set({
      filters: buildDefaultDateFilters(),
      searchQuery: '',
      isDefaultDateFilterActive: true,
    }),

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
