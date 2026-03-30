import { useViewerStore } from '@/store/viewer'
import { ModalityBadge } from '@/components/common/badges/ModalityBadge'

export function SeriesPanel() {
  const { currentStudy, currentSeries, selectSeries } = useViewerStore()

  if (!currentStudy) return null

  return (
    <aside className="w-44 bg-bg-secondary border-r border-bg-tertiary flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 border-b border-bg-tertiary">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Séries</p>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {currentStudy.Series.map((seriesId, index) => {
          const isActive = currentSeries?.ID === seriesId
          return (
            <button
              key={seriesId}
              onClick={() => selectSeries(seriesId)}
              className={[
                'flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors w-full',
                isActive
                  ? 'bg-accent/20 border border-accent/40'
                  : 'border border-transparent hover:bg-bg-tertiary',
              ].join(' ')}
            >
              {/* Miniatura da série */}
              <SeriesThumbnail seriesId={seriesId} />
              <span className="text-text-muted">Série {index + 1}</span>
              {isActive && currentSeries && (
                <ModalityBadge modality={currentSeries.MainDicomTags.Modality} />
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function SeriesThumbnail({ seriesId }: { seriesId: string }) {
  const { currentStudy } = useViewerStore()
  if (!currentStudy) return <div className="h-24 w-full bg-bg-tertiary rounded" />

  // Usa a primeira instância da série (não temos o ID aqui ainda)
  return (
    <div className="h-24 w-full bg-bg-tertiary rounded flex items-center justify-center">
      <svg className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
      </svg>
    </div>
  )
}
