import { useViewerStore } from '@/store/viewer'

// --- CT Kernel Filters ---

interface KernelFilter {
  id: string
  label: string
  tooltip: string
}

const CT_KERNELS: KernelFilter[] = [
  { id: 'soft', label: 'Partes moles', tooltip: 'Encefalo, abdome e pelve — menos ruido, melhor contraste' },
  { id: 'bone', label: 'Osseo', tooltip: 'Fraturas, coluna e face — alta nitidez, mais ruido' },
  { id: 'lung', label: 'Pulmonar', tooltip: 'Parenquima pulmonar — otimizado para ar versus tecido' },
]

// --- CT Window/Level Presets ---

interface WindowPreset {
  id: string
  label: string
  tooltip: string
  windowCenter: number
  windowWidth: number
}

const CT_WINDOWS: WindowPreset[] = [
  { id: 'brain', label: 'Cerebral', tooltip: 'WL 40 / WW 80', windowCenter: 40, windowWidth: 80 },
  { id: 'soft-tissue', label: 'Partes moles', tooltip: 'WL 50 / WW 375', windowCenter: 50, windowWidth: 375 },
  { id: 'lung', label: 'Pulmonar', tooltip: 'WL -600 / WW 1500', windowCenter: -600, windowWidth: 1500 },
  { id: 'bone', label: 'Ossea', tooltip: 'WL 400 / WW 1750', windowCenter: 400, windowWidth: 1750 },
]

// --- MR Sequences ---

interface MRSequence {
  id: string
  label: string
  tooltip: string
}

const MR_SEQUENCES: MRSequence[] = [
  { id: 't1', label: 'T1', tooltip: 'Anatomia, pos-contraste — gordura clara, liquido escuro' },
  { id: 't2', label: 'T2', tooltip: 'Edema e inflamacao — liquido branco' },
  { id: 'flair', label: 'FLAIR', tooltip: 'Lesoes cerebrais — suprime liquor' },
  { id: 'dwi', label: 'DWI', tooltip: 'AVC agudo e abscesso — restricao de difusao' },
  { id: 'stir', label: 'STIR', tooltip: 'Edema osseo e muscular — supressao de gordura' },
]

// --- Toggle Button ---

interface FilterButtonProps {
  label: string
  tooltip: string
  isActive: boolean
  onClick: () => void
}

function FilterButton({ label, tooltip, isActive, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={[
        'px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isActive
          ? 'bg-accent text-white shadow-sm'
          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 hover:text-text-primary',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// --- Group Header ---

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider shrink-0">
      {children}
    </span>
  )
}

// --- Main Panel ---

export function ImagingFiltersPanel() {
  const currentSeries = useViewerStore((s) => s.currentSeries)
  const { activeKernel, activeWindowPreset, activeMRSequence } = useViewerStore((s) => s.imagingFilters)
  const { setActiveKernel, setActiveWindowPreset, setActiveMRSequence } = useViewerStore()

  const modality =
    currentSeries && typeof currentSeries.MainDicomTags?.Modality === 'string'
      ? currentSeries.MainDicomTags.Modality.toUpperCase()
      : null

  const isCT = modality === 'CT'
  const isMR = modality === 'MR'

  if (!isCT && !isMR) return null

  return (
    <div className="absolute top-2 left-2 z-30 flex flex-col gap-2 bg-bg-secondary/90 backdrop-blur-sm border border-bg-tertiary rounded-lg p-2 shadow-lg max-w-[calc(100%-1rem)] overflow-x-auto">
      {isCT && (
        <>
          {/* CT Kernels */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <GroupLabel>Kernel</GroupLabel>
            {CT_KERNELS.map((kernel) => (
              <FilterButton
                key={kernel.id}
                label={kernel.label}
                tooltip={kernel.tooltip}
                isActive={activeKernel === kernel.id}
                onClick={() => setActiveKernel(activeKernel === kernel.id ? null : kernel.id)}
              />
            ))}
          </div>

          {/* CT Window/Level */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <GroupLabel>Janela</GroupLabel>
            {CT_WINDOWS.map((preset) => (
              <FilterButton
                key={preset.id}
                label={preset.label}
                tooltip={preset.tooltip}
                isActive={activeWindowPreset === preset.id}
                onClick={() => setActiveWindowPreset(activeWindowPreset === preset.id ? null : preset.id)}
              />
            ))}
          </div>
        </>
      )}

      {isMR && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <GroupLabel>Sequencia</GroupLabel>
          {MR_SEQUENCES.map((seq) => (
            <FilterButton
              key={seq.id}
              label={seq.label}
              tooltip={seq.tooltip}
              isActive={activeMRSequence === seq.id}
              onClick={() => setActiveMRSequence(activeMRSequence === seq.id ? null : seq.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Lookup the window preset values by id. Returns null when no preset is active. */
export function getWindowPresetById(id: string | null): { windowCenter: number; windowWidth: number } | null {
  if (!id) return null
  return CT_WINDOWS.find((p) => p.id === id) ?? null
}
