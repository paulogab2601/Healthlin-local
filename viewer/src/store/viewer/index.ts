import { create } from 'zustand'

import { seriesService } from '@/services/orthanc/series'
import { isOrthancOfflineError } from '@/services/network-error'
import { studiesService } from '@/services/orthanc/studies'
import type { Instance, Series, Study } from '@/types/orthanc'
import { sortDicomInstances } from '@/utils/dicom'
import type { Annotation, ToolMode, WindowLevel } from '@/types/viewer'
import { getWindowPresetById } from '@/components/viewer/imaging-filters/ImagingFiltersPanel'

export interface ImagingFilters {
  activeKernel: string | null
  activeWindowPreset: string | null
  activeMRSequence: string | null
}

function normalizeInstances(instanceList: Array<string | Instance>, seriesId: string): Instance[] {
  return instanceList
    .map((item): Instance | null => {
      if (typeof item === 'string') {
        return {
          ID: item,
          ParentSeries: seriesId,
          MainDicomTags: {},
        }
      }

      if (item?.ID) {
        return item
      }

      return null
    })
    .filter((item): item is Instance => item !== null)
}

interface ViewerState {
  currentStudy: Study | null
  currentSeries: Series | null
  currentInstance: Instance | null
  instances: Instance[]
  currentFrame: number
  windowLevel: WindowLevel
  activeTool: ToolMode
  annotations: Annotation[]
  isOrtahncOffline: boolean
  isLoading: boolean
  imagingFilters: ImagingFilters

  loadStudy: (studyId: string) => Promise<void>
  selectSeries: (seriesId: string) => Promise<void>
  selectInstance: (instance: Instance) => void
  setFrame: (frame: number) => void
  setWindowLevel: (wl: WindowLevel) => void
  setActiveTool: (tool: ToolMode) => void
  addAnnotation: (annotation: Annotation) => void
  removeAnnotation: (id: string) => void
  clearAnnotations: () => void
  setOrtahncOffline: (v: boolean) => void
  setActiveKernel: (id: string | null) => void
  setActiveWindowPreset: (id: string | null) => void
  setActiveMRSequence: (id: string | null) => void
}

let loadStudyVersion = 0
let selectSeriesVersion = 0

export const useViewerStore = create<ViewerState>((set, get) => ({
  currentStudy: null,
  currentSeries: null,
  currentInstance: null,
  instances: [],
  currentFrame: 0,
  windowLevel: { windowWidth: 400, windowCenter: 40 },
  activeTool: 'WindowLevel',
  annotations: [],
  isOrtahncOffline: false,
  isLoading: false,
  imagingFilters: { activeKernel: null, activeWindowPreset: null, activeMRSequence: null },

  loadStudy: async (studyId) => {
    const version = ++loadStudyVersion
    set({ isLoading: true, isOrtahncOffline: false })
    try {
      const study = await studiesService.get(studyId)
      if (version !== loadStudyVersion) return

      set({ currentStudy: study, isLoading: false })

      const studySeries = Array.isArray(study.Series) ? study.Series : []
      if (studySeries.length > 0) {
        await get().selectSeries(studySeries[0])
      }
    } catch (err: unknown) {
      if (version !== loadStudyVersion) return
      if (isOrthancOfflineError(err)) {
        set({ isOrtahncOffline: true })
      }
      set({
        currentStudy: null,
        currentSeries: null,
        currentInstance: null,
        instances: [],
        isLoading: false,
      })
    }
  },

  selectSeries: async (seriesId) => {
    const version = ++selectSeriesVersion
    set({ isLoading: true })
    try {
      const series = await seriesService.get(seriesId)
      if (version !== selectSeriesVersion) return

      const seriesInstances = Array.isArray(series.Instances) ? series.Instances : []
      const hasExpandedInstances = seriesInstances.some((item) => typeof item !== 'string')
      const instanceList = hasExpandedInstances
        ? seriesInstances
        : await seriesService.getInstances(seriesId)
      if (version !== selectSeriesVersion) return

      const normalizedInstances = normalizeInstances(Array.isArray(instanceList) ? instanceList : [], seriesId)
      const instances = sortDicomInstances(normalizedInstances)

      set({
        currentSeries: series,
        instances,
        currentInstance: instances[0] ?? null,
        currentFrame: 0,
        isLoading: false,
      })
    } catch {
      if (version !== selectSeriesVersion) return
      set({ currentSeries: null, currentInstance: null, instances: [], isLoading: false })
    }
  },

  selectInstance: (instance) => set({ currentInstance: instance }),

  setFrame: (frame) => {
    const { instances } = get()
    const instance = instances[frame]
    set({ currentFrame: frame, currentInstance: instance ?? null })
  },

  setWindowLevel: (windowLevel) => set({ windowLevel }),
  setActiveTool: (activeTool) => set({ activeTool }),
  addAnnotation: (annotation) => set((state) => ({ annotations: [...state.annotations, annotation] })),
  removeAnnotation: (id) => set((state) => ({ annotations: state.annotations.filter((item) => item.id !== id) })),
  clearAnnotations: () => set({ annotations: [] }),
  setOrtahncOffline: (value) => set({ isOrtahncOffline: value }),

  setActiveKernel: (id) =>
    set((state) => ({ imagingFilters: { ...state.imagingFilters, activeKernel: id } })),

  setActiveWindowPreset: (id) => {
    const preset = getWindowPresetById(id)
    set((state) => ({
      imagingFilters: { ...state.imagingFilters, activeWindowPreset: id },
      ...(preset ? { windowLevel: { windowCenter: preset.windowCenter, windowWidth: preset.windowWidth } } : {}),
    }))
  },

  setActiveMRSequence: (id) =>
    set((state) => ({ imagingFilters: { ...state.imagingFilters, activeMRSequence: id } })),
}))
