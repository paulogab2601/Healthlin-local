import { useCallback, useRef } from 'react'
import { useViewerStore } from '@/store/viewer'

export function useWindowLevel() {
  const { windowLevel, setWindowLevel } = useViewerStore()
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startWL = useRef(windowLevel)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true
      startPos.current = { x: e.clientX, y: e.clientY }
      startWL.current = windowLevel
    },
    [windowLevel],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y

      setWindowLevel({
        windowWidth: Math.max(1, startWL.current.windowWidth + dx * 4),
        windowCenter: startWL.current.windowCenter - dy * 2,
      })
    },
    [setWindowLevel],
  )

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return { windowLevel, onMouseDown, onMouseMove, onMouseUp }
}
