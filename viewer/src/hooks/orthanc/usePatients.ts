import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboard'
import type { Patient } from '@/types/orthanc'

export function usePatients() {
  const {
    patients, isLoadingPatients, isOrtahncOffline, fetchError,
    searchQuery, fetchPatients, page, hasMore, nextPage, prevPage,
  } = useDashboardStore()

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const filtered = patients.filter((p: Patient) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const tags = p.MainDicomTags ?? {}
    const name = typeof tags.PatientName === 'string' ? tags.PatientName.toLowerCase() : ''
    const id = typeof tags.PatientID === 'string' ? tags.PatientID.toLowerCase() : ''
    return name.includes(q) || id.includes(q)
  })

  return {
    patients: filtered,
    isLoading: isLoadingPatients,
    isOrtahncOffline,
    fetchError,
    refetch: fetchPatients,
    page,
    hasMore,
    nextPage,
    prevPage,
  }
}
