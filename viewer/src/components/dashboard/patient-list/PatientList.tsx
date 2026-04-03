import { usePatients } from '@/hooks/orthanc/usePatients'
import { useDashboardStore } from '@/store/dashboard'
import { SkeletonCard } from '@/components/common/loading/SkeletonCard'
import { ConnectionError } from '@/components/common/errors/ConnectionError'
import { formatPatientName, formatDate } from '@/utils/format'

export function PatientList() {
  const { patients, isLoading, isOrtahncOffline, refetch } = usePatients()
  const { selectedPatientId, selectPatient } = useDashboardStore()

  if (isOrtahncOffline) {
    return <ConnectionError onRetry={refetch} />
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
      </div>
    )
  }

  if (patients.length === 0) {
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
            return (
              <tr
                key={patient.ID}
                onClick={() => handleSelect(patient.ID)}
                className={[
                  'border-b border-bg-tertiary cursor-pointer transition-colors',
                  isSelected ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
                ].join(' ')}
              >
                <td className="py-3 pr-4 text-text-primary font-medium">
                  {formatPatientName(patient.MainDicomTags.PatientName)}
                </td>
                <td className="py-3 pr-4 text-text-secondary font-mono text-xs">
                  {patient.MainDicomTags.PatientID ?? '—'}
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {formatDate(patient.MainDicomTags.PatientBirthDate)}
                </td>
                <td className="py-3 text-text-secondary">{patient.Studies.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
