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
