import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboard'
import { filterStudiesByFilters } from '@/utils/dicom'

export function useStudies(patientId: string | null) {
  const { studies, isLoadingStudies, fetchStudies, filters } = useDashboardStore()

  useEffect(() => {
    if (patientId) {
      fetchStudies(patientId)
    }
  }, [patientId, fetchStudies])

  const filtered = filterStudiesByFilters(studies, filters)

  return { studies: filtered, isLoading: isLoadingStudies }
}
