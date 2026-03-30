/**
 * Formata uma data DICOM (YYYYMMDD) para DD/MM/AAAA.
 * Aceita também ISO dates (YYYY-MM-DD) e retorna '—' para valores inválidos.
 */
export function formatDate(dicomDate?: string): string {
  if (!dicomDate) return '—'

  // Normaliza: remove separadores
  const clean = dicomDate.replace(/[-/]/g, '')
  if (clean.length !== 8) return dicomDate

  const year = clean.slice(0, 4)
  const month = clean.slice(4, 6)
  const day = clean.slice(6, 8)

  return `${day}/${month}/${year}`
}

/**
 * Formata um nome DICOM (SOBRENOME^NOME) para "Nome Sobrenome".
 */
export function formatPatientName(dicomName?: string): string {
  if (!dicomName) return 'Paciente desconhecido'

  const parts = dicomName.split('^')
  const lastName = parts[0]?.trim() ?? ''
  const firstName = parts[1]?.trim() ?? ''

  if (firstName && lastName) return `${firstName} ${lastName}`
  return lastName || firstName || 'Paciente desconhecido'
}
