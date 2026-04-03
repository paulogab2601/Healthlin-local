import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboard'
import type { Study } from '@/types/orthanc'

export function useStudies(patientId: string | null) {
  const { studies, isLoadingStudies, fetchStudies, filters } = useDashboardStore()

  useEffect(() => {
    if (patientId) {
      fetchStudies(patientId)
    }
  }, [patientId, fetchStudies])

  const filtered = studies.filter((study: Study) => {
    const tags = study.MainDicomTags

    if (filters.modality) {
      // ModalitiesInStudy pode ser "CT" ou "CT\MR" (multi-value DICOM separado por \)
      const modalities = (tags.ModalitiesInStudy ?? '').split('\\')
      if (!modalities.includes(filters.modality)) return false
    }

    // StudyDate no DICOM é YYYYMMDD; filtros chegam como YYYY-MM-DD — normaliza removendo hífens
    const studyDate = tags.StudyDate ?? ''
    if (filters.dateFrom && studyDate < filters.dateFrom.replace(/-/g, '')) return false
    if (filters.dateTo   && studyDate > filters.dateTo.replace(/-/g, ''))   return false

    return true
  })

  return { studies: filtered, isLoading: isLoadingStudies }
}
