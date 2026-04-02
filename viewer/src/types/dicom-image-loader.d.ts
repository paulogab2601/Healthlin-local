declare module '@cornerstonejs/dicom-image-loader' {
  export const external: {
    cornerstone: unknown
    dicomParser: unknown
  }
  export function configure(options: {
    beforeSend?: (xhr: XMLHttpRequest | null) => void | Record<string, string>
  }): void
  export const webWorkerManager: {
    initialize(config: {
      maxWebWorkers?: number
      startWebWorkersOnDemand?: boolean
      taskConfiguration?: Record<string, unknown>
    }): void
  }
}
