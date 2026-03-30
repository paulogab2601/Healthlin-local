import { useViewerStore } from '@/store/viewer'

export function useInstances() {
  const { instances, currentInstance, currentFrame, setFrame } = useViewerStore()
  return { instances, currentInstance, currentFrame, setFrame }
}
