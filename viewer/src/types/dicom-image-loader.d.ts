declare module '@cornerstonejs/dicom-image-loader' {
  export const external: {
    cornerstone: unknown
  }
  export function configure(options: { beforeSend?: (xhr: XMLHttpRequest) => void }): void
  export const webWorkerManager: {
    initialize(config: {
      maxWebWorkers?: number
      startWebWorkersOnDemand?: boolean
      taskConfiguration?: Record<string, unknown>
    }): void
  }
}
