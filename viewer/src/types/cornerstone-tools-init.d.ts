declare module '@cornerstonejs/tools/dist/esm/init.js' {
  export interface ToolsInitConfig {
    showSVGCursors?: boolean
    mouseEnabled?: boolean
    touchEnabled?: boolean
    globalToolSyncEnabled?: boolean
  }

  export default function init(config?: ToolsInitConfig): Promise<void> | void
}
