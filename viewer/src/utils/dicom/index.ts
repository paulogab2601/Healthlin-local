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
