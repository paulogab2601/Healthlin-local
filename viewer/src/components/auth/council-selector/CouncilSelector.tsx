import { Select } from '@/components/common/inputs/Select'
import type { CouncilType } from '@/types/auth'

const COUNCIL_OPTIONS = [
  { value: 'CRM', label: 'CRM — Conselho Regional de Medicina' },
  { value: 'CRTR', label: 'CRTR — Conselho Regional de Radiologia' },
  { value: 'MATRICULA', label: 'Matrícula Interna' },
]

interface CouncilSelectorProps {
  value: CouncilType
  onChange: (value: CouncilType) => void
  error?: string
}

export function CouncilSelector({ value, onChange, error }: CouncilSelectorProps) {
  return (
    <Select
      label="Tipo de conselho"
      options={COUNCIL_OPTIONS}
      value={value}
      onChange={(e) => onChange(e.target.value as CouncilType)}
      error={error}
    />
  )
}
