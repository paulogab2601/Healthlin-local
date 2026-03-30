import { useViewerStore } from '@/store/viewer'

export function ImagePanel() {
  const { instances, currentFrame, setFrame } = useViewerStore()

  if (instances.length <= 1) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-bg-secondary border-t border-bg-tertiary">
      <span className="text-xs text-text-muted whitespace-nowrap">
        Frame {currentFrame + 1} / {instances.length}
      </span>
      <input
        type="range"
        min={0}
        max={instances.length - 1}
        value={currentFrame}
        onChange={(e) => setFrame(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
    </div>
  )
}
