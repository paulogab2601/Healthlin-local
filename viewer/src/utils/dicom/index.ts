/** Mapeia código de modalidade para nome legível. */
export const MODALITY_NAMES: Record<string, string> = {
  CT: 'Tomografia Computadorizada',
  MR: 'Ressonância Magnética',
  CR: 'Radiografia Computadorizada',
  DX: 'Radiografia Digital',
  US: 'Ultrassonografia',
  NM: 'Medicina Nuclear',
  PT: 'PET',
  XA: 'Angiografia',
  MG: 'Mamografia',
  RF: 'Fluoroscopia',
  SC: 'Captura Secundária',
  OT: 'Outro',
}

function normalizeModality(value: string): string {
  return value.trim().toUpperCase()
}

const DICOM_DATE_REGEX = /^\d{8}$/

/**
 * Extrai modalidades de um estudo com fallback:
 * 1) ModalitiesInStudy (preferencial)
 * 2) Modality
 * 3) StudyDescription (apenas se for uma sigla conhecida)
 */
export function getStudyModalities(tags: {
  ModalitiesInStudy?: string | string[]
  Modality?: string | string[]
  StudyDescription?: string
}): string[] {
  const values = new Set<string>()

  const collect = (raw?: string | string[]) => {
    if (!raw) return
    const tokens = Array.isArray(raw)
      ? raw
      : raw.split(/\\|,/)

    tokens
      .map(normalizeModality)
      .filter(Boolean)
      .forEach((modality) => values.add(modality))
  }

  collect(tags.ModalitiesInStudy)

  if (values.size === 0) {
    collect(tags.Modality)
  }

  if (values.size === 0) {
    const modalityFromDescription = normalizeModality(tags.StudyDescription ?? '')
    if (MODALITY_NAMES[modalityFromDescription]) {
      values.add(modalityFromDescription)
    }
  }

  return Array.from(values)
}

export interface StudyFilterValues {
  modality?: string
  dateFrom?: string
  dateTo?: string
}

interface StudyFilterableTags {
  ModalitiesInStudy?: string | string[]
  Modality?: string | string[]
  StudyDescription?: string
  StudyDate?: string
}

interface StudyFilterable {
  MainDicomTags?: StudyFilterableTags
}

export function isValidDicomDate(value: string): boolean {
  if (!DICOM_DATE_REGEX.test(value)) return false

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))

  if (month < 1 || month > 12 || day < 1) return false

  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

export function normalizeStudyFilterDate(value?: string | null): string | null {
  if (!value) return null

  const normalized = value.replace(/-/g, '')
  return isValidDicomDate(normalized) ? normalized : null
}

export function hasStudyFilters(filters: StudyFilterValues): boolean {
  return Boolean((filters.modality ?? '').trim() || filters.dateFrom || filters.dateTo)
}

export function studyMatchesFilters(study: StudyFilterable, filters: StudyFilterValues): boolean {
  const tags = study.MainDicomTags ?? {}
  const selectedModality = (filters.modality ?? '').trim().toUpperCase()
  const dateFrom = normalizeStudyFilterDate(filters.dateFrom)
  const dateTo = normalizeStudyFilterDate(filters.dateTo)
  const hasDateFilter = Boolean(dateFrom || dateTo)

  if (selectedModality) {
    const modalities = getStudyModalities(tags)
    // Some Orthanc setups return studies without modality in MainDicomTags.
    // In this case, avoid false negatives.
    if (modalities.length > 0 && !modalities.includes(selectedModality)) return false
  }

  // DICOM StudyDate is YYYYMMDD; UI filters come as YYYY-MM-DD.
  const studyDate = typeof tags.StudyDate === 'string' ? tags.StudyDate : ''
  if (hasDateFilter && !isValidDicomDate(studyDate)) return false
  if (dateFrom && studyDate < dateFrom) return false
  if (dateTo && studyDate > dateTo) return false

  return true
}

export function filterStudiesByFilters<TStudy extends StudyFilterable>(
  studies: TStudy[],
  filters: StudyFilterValues,
): TStudy[] {
  return studies.filter((study) => studyMatchesFilters(study, filters))
}

export function getModalityName(code?: string): string {
  if (!code) return 'Desconhecido'
  return MODALITY_NAMES[code.toUpperCase()] ?? code
}

/** Sexo DICOM: M, F, O */
export function formatSex(sex?: string): string {
  if (!sex) return '—'
  const map: Record<string, string> = { M: 'Masculino', F: 'Feminino', O: 'Outro' }
  return map[sex.toUpperCase()] ?? sex
}
export { sortDicomInstances } from './sortInstances'
