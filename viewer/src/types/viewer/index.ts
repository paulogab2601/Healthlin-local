export type ToolMode =
  | 'Pan'
  | 'Zoom'
  | 'WindowLevel'
  | 'Length'
  | 'Angle'
  | 'RectangleROI'
  | 'EllipticalROI'
  | 'Probe'
  | 'StackScroll'

export interface WindowLevel {
  windowWidth: number
  windowCenter: number
}

export interface Annotation {
  id: string
  type: string
  data: unknown
  seriesId: string
  instanceId: string
}

export interface ViewerState {
  currentStudyId: string | null
  currentSeriesId: string | null
  currentInstanceId: string | null
  currentFrame: number
  windowLevel: WindowLevel
  activeTool: ToolMode
  annotations: Annotation[]
  isOrtahncOffline: boolean
}
