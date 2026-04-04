import { useEffect } from 'react'
import { ConnectionError } from '@/components/common/errors/ConnectionError'
import { SkeletonCard } from '@/components/common/loading/SkeletonCard'
import { usePatients } from '@/hooks/orthanc/usePatients'
import { useDashboardStore } from '@/store/dashboard'
import { formatDate, formatPatientName } from '@/utils/format'

export function PatientList() {
  const { patients, isLoading, isOrtahncOffline, fetchError, refetch, page, hasMore, nextPage, prevPage } =
    usePatients()
  const { selectedPatientId, selectPatient } = useDashboardStore()

  useEffect(() => {
    if (isLoading || !selectedPatientId) return
    const isVisible = patients.some((patient) => patient.ID === selectedPatientId)
    if (!isVisible) selectPatient(null)
  }, [isLoading, patients, selectedPatientId, selectPatient])

  if (isOrtahncOffline) {
    return <ConnectionError onRetry={refetch} />
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-sm text-danger">{fetchError}</p>
        <button
          onClick={refetch}
          className="text-sm text-accent hover:text-accent/80 underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (patients.length === 0 && page === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p>Nenhum paciente encontrado</p>
      </div>
    )
  }

  function handleSelect(id: string) {
    if (id === selectedPatientId) {
      selectPatient(null)
      return
    }
    selectPatient(id)
  }

  const hasPrev = page > 0

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-tertiary text-text-muted text-left">
            <th className="pb-2 pr-4 font-medium">Paciente</th>
            <th className="pb-2 pr-4 font-medium">ID</th>
            <th className="pb-2 pr-4 font-medium">Nascimento</th>
            <th className="pb-2 font-medium">Estudos</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const isSelected = patient.ID === selectedPatientId
            const tags = patient.MainDicomTags ?? {}
            const patientName = typeof tags.PatientName === 'string' ? tags.PatientName : undefined
            const patientId =
              typeof tags.PatientID === 'string' && tags.PatientID.trim().length > 0
                ? tags.PatientID
                : '-'
            const patientBirthDate = typeof tags.PatientBirthDate === 'string' ? tags.PatientBirthDate : undefined
            const studiesCount = Array.isArray(patient.Studies) ? patient.Studies.length : 0

            return (
              <tr
                key={patient.ID}
                onClick={() => handleSelect(patient.ID)}
                className={[
                  'border-b border-bg-tertiary cursor-pointer transition-colors',
                  isSelected ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
                ].join(' ')}
              >
                <td className="py-3 pr-4 text-text-primary font-medium">{formatPatientName(patientName)}</td>
                <td className="py-3 pr-4 text-text-secondary font-mono text-xs">{patientId}</td>
                <td className="py-3 pr-4 text-text-secondary">{formatDate(patientBirthDate)}</td>
                <td className="py-3 text-text-secondary">{studiesCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {(hasPrev || hasMore) && (
        <div className="flex items-center justify-between pt-4 text-sm text-text-secondary">
          <button
            onClick={prevPage}
            disabled={!hasPrev}
            className="px-3 py-1.5 rounded border border-bg-tertiary enabled:hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span className="text-text-muted">Pagina {page + 1}</span>
          <button
            onClick={nextPage}
            disabled={!hasMore}
            className="px-3 py-1.5 rounded border border-bg-tertiary enabled:hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Proximo
          </button>
        </div>
      )}
    </div>
  )
}
