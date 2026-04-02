// Barrel file: single entrypoint for Cornerstone runtime modules.
//
// We intentionally avoid `import * as tools` because materializing the
// full namespace from `@cornerstonejs/tools` can pull circular reexports
// that break initialization order in production bundles.
import * as core from '@cornerstonejs/core'
import * as dicomImageLoader from '@cornerstonejs/dicom-image-loader'
import * as dicomParser from 'dicom-parser'
import {
  init as initTools,
  addTool,
  ToolGroupManager,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  LengthTool,
  AngleTool,
  RectangleROITool,
} from '@cornerstonejs/tools'

const tools = {
  init: initTools,
  addTool,
  ToolGroupManager,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  LengthTool,
  AngleTool,
  RectangleROITool,
}

export { core, tools, dicomImageLoader, dicomParser }
