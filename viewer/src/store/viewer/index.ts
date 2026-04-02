import { create } from 'zustand'
import { studiesService } from '@/services/orthanc/studies'
import { seriesService } from '@/services/orthanc/series'
import type { Study, Series, Instance } from '@/types/orthanc'
import type { ToolMode, WindowLevel, Annotation } from '@/types/viewer'

function normalizeInstances(
  instanceList: Array<string | Instance>,
  seriesId: string,
): Instance[] {
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

  loadStudy: (studyId: string) => Promise<void>
  selectSeries: (seriesId: string) => Promise<void>
  selectInstance: (instance: Instance) => void
  setFrame: (frame: number) => void
  setWindowLevel: (wl: WindowLevel) => void
  setActiveTool: (tool: ToolMode) => void
  addAnnotation: (annotation: Annotation) => void
  removeAnnotation: (id: string) => void
  setOrtahncOffline: (v: boolean) => void
}

let _loadStudyVersion = 0
let _selectSeriesVersion = 0

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

  loadStudy: async (studyId) => {
    const version = ++_loadStudyVersion
    set({ isLoading: true, isOrtahncOffline: false })
    try {
      const study = await studiesService.get(studyId)
      if (version !== _loadStudyVersion) return
      set({ currentStudy: study, isLoading: false })

      // Carrega a primeira série automaticamente
      if (study.Series.length > 0) {
        await get().selectSeries(study.Series[0])
      }
    } catch (err: unknown) {
      if (version !== _loadStudyVersion) return
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 502 || status === 504) {
        set({ isOrtahncOffline: true })
      }
      set({ currentStudy: null, currentSeries: null, currentInstance: null, instances: [], isLoading: false })
    }
  },

  selectSeries: async (seriesId) => {
    const version = ++_selectSeriesVersion
    set({ isLoading: true })
    try {
      const series = await seriesService.get(seriesId)
      if (version !== _selectSeriesVersion) return
      const instanceList =
        series.Instances?.length > 0
          ? series.Instances
          : await seriesService.getInstances(seriesId)
      if (version !== _selectSeriesVersion) return
      const instances = normalizeInstances(instanceList, seriesId)

      set({
        currentSeries: series,
        instances,
        currentInstance: instances[0] ?? null,
        currentFrame: 0,
        isLoading: false,
      })
    } catch {
      if (version !== _selectSeriesVersion) return
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

  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),

  removeAnnotation: (id) =>
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) })),

  setOrtahncOffline: (v) => set({ isOrtahncOffline: v }),
}))
