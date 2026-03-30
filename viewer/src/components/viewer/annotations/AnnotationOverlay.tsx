export function AnnotationOverlay() {
  return (
    <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
      <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-1.5">
        <p className="text-xs text-warning">
          Anotações são temporárias e serão perdidas ao fechar o visualizador.
        </p>
      </div>
    </div>
  )
}
