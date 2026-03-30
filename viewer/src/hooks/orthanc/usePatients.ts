import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboard'
import type { Patient } from '@/types/orthanc'

export function usePatients() {
  const { patients, isLoading, isOrtahncOffline, searchQuery, fetchPatients } = useDashboardStore()

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const filtered = patients.filter((p: Patient) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const name = p.MainDicomTags.PatientName?.toLowerCase() ?? ''
    const id = p.MainDicomTags.PatientID?.toLowerCase() ?? ''
    return name.includes(q) || id.includes(q)
  })

  return { patients: filtered, isLoading, isOrtahncOffline, refetch: fetchPatients }
}
