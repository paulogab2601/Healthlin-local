import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboard'

export function useStudies(patientId: string | null) {
  const { studies, isLoading, fetchStudies } = useDashboardStore()

  useEffect(() => {
    if (patientId) {
      fetchStudies(patientId)
    }
  }, [patientId, fetchStudies])

  return { studies, isLoading }
}
