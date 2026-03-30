declare module '@cornerstonejs/dicom-image-loader' {
  export function init(options?: { maxWebWorkers?: number }): void
  export function configure(options: { beforeSend?: (xhr: XMLHttpRequest) => void }): void
}
