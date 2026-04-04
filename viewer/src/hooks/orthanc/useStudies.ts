import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboard'
import type { Study } from '@/types/orthanc'
import { getStudyModalities } from '@/utils/dicom'

const DICOM_DATE_REGEX = /^\d{8}$/

function isValidDicomDate(value: string): boolean {
  if (!DICOM_DATE_REGEX.test(value)) return false

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))

  if (month < 1 || month > 12 || day < 1) return false

  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

function normalizeFilterDate(value?: string | null): string | null {
  if (!value) return null

  const normalized = value.replace(/-/g, '')
  return isValidDicomDate(normalized) ? normalized : null
}

export function useStudies(patientId: string | null) {
  const { studies, isLoadingStudies, fetchStudies, filters } = useDashboardStore()

  const selectedModality = filters.modality.trim().toUpperCase()
  const dateFrom = normalizeFilterDate(filters.dateFrom)
  const dateTo = normalizeFilterDate(filters.dateTo)
  const hasDateFilter = Boolean(dateFrom || dateTo)

  useEffect(() => {
    if (patientId) {
      fetchStudies(patientId)
    }
  }, [patientId, fetchStudies])

  const filtered = studies.filter((study: Study) => {
    const tags = study.MainDicomTags

    if (selectedModality) {
      const modalities = getStudyModalities(tags)
      // Alguns Orthanc retornam estudos sem tag de modalidade no MainDicomTags.
      // Nesses casos, evita falso negativo (sumir com todos os exames ao filtrar).
      if (modalities.length > 0 && !modalities.includes(selectedModality)) return false
    }

    // StudyDate no DICOM é YYYYMMDD; filtros chegam como YYYY-MM-DD — normaliza removendo hífens
    const studyDate = tags.StudyDate ?? ''
    if (hasDateFilter && !isValidDicomDate(studyDate)) return false
    if (dateFrom && studyDate < dateFrom) return false
    if (dateTo   && studyDate > dateTo)   return false

    return true
  })

  return { studies: filtered, isLoading: isLoadingStudies }
}
