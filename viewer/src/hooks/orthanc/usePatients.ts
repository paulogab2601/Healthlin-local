import { useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardStore } from '@/store/dashboard'
import { patientsService } from '@/services/orthanc/patients'
import { isRequestCanceled } from '@/services/network-error'
import type { Patient, Study } from '@/types/orthanc'
import { filterStudiesByFilters, hasStudyFilters } from '@/utils/dicom'

export function usePatients() {
  const {
    patients,
    isLoadingPatients,
    isOrtahncOffline,
    fetchError,
    searchQuery,
    fetchPatients,
    filters,
    page,
    hasMore,
    nextPage,
    prevPage,
  } = useDashboardStore()

  const [matchingPatientIds, setMatchingPatientIds] = useState<Set<string> | null>(null)
  const [isFilteringByStudies, setIsFilteringByStudies] = useState(false)
  const studiesCacheRef = useRef<Map<string, Study[]>>(new Map())

  const studyFilters = useMemo(
    () => ({
      modality: filters.modality,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    [filters.modality, filters.dateFrom, filters.dateTo],
  )
  const shouldApplyStudyFilter = hasStudyFilters(studyFilters)

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const searchedPatients = useMemo(() => {
    if (!searchQuery) return patients

    const q = searchQuery.toLowerCase()
    return patients.filter((patient: Patient) => {
      const tags = patient.MainDicomTags ?? {}
      const name = typeof tags.PatientName === 'string' ? tags.PatientName.toLowerCase() : ''
      const id = typeof tags.PatientID === 'string' ? tags.PatientID.toLowerCase() : ''
      return name.includes(q) || id.includes(q)
    })
  }, [patients, searchQuery])

  useEffect(() => {
    if (!shouldApplyStudyFilter) {
      setMatchingPatientIds(null)
      setIsFilteringByStudies(false)
      return
    }

    if (searchedPatients.length === 0) {
      setMatchingPatientIds(new Set())
      setIsFilteringByStudies(false)
      return
    }

    let isActive = true
    const controller = new AbortController()

    setIsFilteringByStudies(true)

    void (async () => {
      const matchingIds = await Promise.all(
        searchedPatients.map(async (patient) => {
          if (!Array.isArray(patient.Studies) || patient.Studies.length === 0) return null

          let studies = studiesCacheRef.current.get(patient.ID)

          if (!studies) {
            try {
              studies = await patientsService.getStudies(patient.ID, controller.signal)
              studiesCacheRef.current.set(patient.ID, studies)
            } catch (error) {
              if (isRequestCanceled(error)) return null
              return null
            }
          }

          return filterStudiesByFilters(studies, studyFilters).length > 0 ? patient.ID : null
        }),
      )

      if (!isActive) return

      setMatchingPatientIds(new Set(matchingIds.filter((id): id is string => Boolean(id))))
      setIsFilteringByStudies(false)
    })()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [searchedPatients, shouldApplyStudyFilter, studyFilters])

  const filteredPatients = useMemo(() => {
    if (!shouldApplyStudyFilter) return searchedPatients
    if (!matchingPatientIds) return []
    return searchedPatients.filter((patient) => matchingPatientIds.has(patient.ID))
  }, [searchedPatients, shouldApplyStudyFilter, matchingPatientIds])

  return {
    patients: filteredPatients,
    isLoading: isLoadingPatients || isFilteringByStudies,
    isOrtahncOffline,
    fetchError,
    refetch: fetchPatients,
    page,
    hasMore,
    nextPage,
    prevPage,
  }
}
