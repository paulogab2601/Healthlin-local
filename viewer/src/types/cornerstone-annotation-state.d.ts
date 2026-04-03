declare module '@cornerstonejs/tools/dist/esm/stateManagement/annotation/annotationState.js' {
  export function removeAllAnnotations(): void
  export function removeAnnotations(
    toolName: string,
    annotationGroupSelector: HTMLElement | string,
  ): void
}
