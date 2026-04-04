import { useState, useCallback, useRef, useEffect } from 'react'
import { useViewerStore } from '@/store/viewer'

const THROTTLE_MS = 60

export function ImagePanel() {
  const { instances, currentFrame, setFrame } = useViewerStore()
  const [displayFrame, setDisplayFrame] = useState(currentFrame)
  const pendingRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when store changes externally (series switch, etc.)
  useEffect(() => {
    setDisplayFrame(currentFrame)
  }, [currentFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const throttledSetFrame = useCallback(
    (value: number) => {
      pendingRef.current = value

      if (!timerRef.current) {
        // Leading edge — fire immediately
        setFrame(value)
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          // Trailing edge — fire latest buffered value if different
          const latest = pendingRef.current
          if (latest !== null && latest !== value) {
            setFrame(latest)
          }
        }, THROTTLE_MS)
      }
    },
    [setFrame],
  )

  if (instances.length <= 1) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-bg-secondary border-t border-bg-tertiary">
      <span className="text-xs text-text-muted whitespace-nowrap">
        Instancia {displayFrame + 1} / {instances.length}
      </span>
      <input
        type="range"
        min={0}
        max={instances.length - 1}
        value={displayFrame}
        onChange={(e) => {
          const v = Number(e.target.value)
          setDisplayFrame(v)
          throttledSetFrame(v)
        }}
        className="flex-1 accent-accent"
      />
    </div>
  )
}
