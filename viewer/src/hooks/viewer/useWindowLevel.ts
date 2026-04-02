import { useCallback, useRef } from 'react'
import { useViewerStore } from '@/store/viewer'
import { useCornerstone } from '@/hooks/viewer/useCornerstone'

const VIEWPORT_ID = 'healthlin-viewport'

interface StackViewportWithVOI {
  setProperties: (props: { voiRange: { lower: number; upper: number } }) => void
  render: () => void
}

export function useWindowLevel() {
  const { windowLevel, setWindowLevel } = useViewerStore()
  const { renderingEngine } = useCornerstone()
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

      const newWL = {
        windowWidth: Math.max(1, startWL.current.windowWidth + dx * 4),
        windowCenter: startWL.current.windowCenter - dy * 2,
      }
      setWindowLevel(newWL)

      const viewport = renderingEngine?.getViewport(VIEWPORT_ID) as StackViewportWithVOI | undefined
      if (viewport) {
        viewport.setProperties({
          voiRange: {
            lower: newWL.windowCenter - newWL.windowWidth / 2,
            upper: newWL.windowCenter + newWL.windowWidth / 2,
          },
        })
        viewport.render()
      }
    },
    [setWindowLevel, renderingEngine],
  )

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return { windowLevel, onMouseDown, onMouseMove, onMouseUp }
}
