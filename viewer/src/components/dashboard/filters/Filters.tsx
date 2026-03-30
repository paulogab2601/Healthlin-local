import { Select } from '@/components/common/inputs/Select'
import { Input } from '@/components/common/inputs/Input'
import { useDashboardStore } from '@/store/dashboard'

const MODALITY_OPTIONS = [
  { value: '', label: 'Todas as modalidades' },
  { value: 'CT', label: 'CT — Tomografia' },
  { value: 'MR', label: 'MR — Ressonância' },
  { value: 'CR', label: 'CR — Radiografia' },
  { value: 'US', label: 'US — Ultrassom' },
  { value: 'NM', label: 'NM — Med. Nuclear' },
  { value: 'PT', label: 'PT — PET' },
]

export function Filters() {
  const { filters, setFilters } = useDashboardStore()

  return (
    <div className="flex flex-wrap gap-3">
      <div className="min-w-44">
        <Select
          options={MODALITY_OPTIONS}
          value={filters.modality}
          onChange={(e) => setFilters({ modality: e.target.value })}
        />
      </div>
      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => setFilters({ dateFrom: e.target.value })}
        placeholder="Data início"
        title="Data início"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => setFilters({ dateTo: e.target.value })}
        placeholder="Data fim"
        title="Data fim"
      />
    </div>
  )
}
