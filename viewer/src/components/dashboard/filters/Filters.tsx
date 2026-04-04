import { Select } from '@/components/common/inputs/Select'
import { Input } from '@/components/common/inputs/Input'
import { Button } from '@/components/common/buttons/Button'
import { useDashboardStore } from '@/store/dashboard'

const MODALITY_OPTIONS = [
  { value: '', label: 'Todas as modalidades' },
  { value: 'DX', label: 'DX — Raio-X Digital' },
  { value: 'CR', label: 'CR — Raio-X Digitalizado' },
  { value: 'CT', label: 'CT — Tomografia' },
  { value: 'MR', label: 'MR — Ressonância' },
  { value: 'US', label: 'US — Ultrassom' },
  { value: 'MG', label: 'MG — Mamografia' },
]

export function Filters() {
  const { filters, setFilters, clearFilters } = useDashboardStore()
  const hasActiveFilters = Boolean(filters.modality.trim() || filters.dateFrom || filters.dateTo)

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
      <div className="flex items-end">
        <Button type="button" variant="secondary" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
          Limpar filtros
        </Button>
      </div>
    </div>
  )
}
