import { useEffect, useState } from 'react'
import { useViewerStore } from '@/store/viewer'
import { instancesService } from '@/services/orthanc/instances'
import type { SimplifiedTags } from '@/types/orthanc'
import { formatDate, formatPatientName } from '@/utils/format'

const DISPLAYED_TAGS: { key: keyof SimplifiedTags; label: string }[] = [
  { key: 'PatientName', label: 'Paciente' },
  { key: 'PatientID', label: 'ID Paciente' },
  { key: 'PatientBirthDate', label: 'Nascimento' },
  { key: 'PatientSex', label: 'Sexo' },
  { key: 'StudyDate', label: 'Data do estudo' },
  { key: 'StudyDescription', label: 'Estudo' },
  { key: 'Modality', label: 'Modalidade' },
  { key: 'SeriesDescription', label: 'Série' },
  { key: 'InstanceNumber', label: 'Instância' },
  { key: 'SliceThickness', label: 'Espessura de corte' },
  { key: 'KVP', label: 'KV' },
]

export function MetadataPanel() {
  const currentInstance = useViewerStore((s) => s.currentInstance)
  const [tags, setTags] = useState<SimplifiedTags | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!currentInstance) { setTags(null); setHasError(false); return }
    setHasError(false)
    instancesService.getSimplifiedTags(currentInstance.ID)
      .then((data) => { setTags(data); setHasError(false) })
      .catch(() => { setTags(null); setHasError(true) })
  }, [currentInstance])

  return (
    <aside className="w-52 bg-bg-secondary border-l border-bg-tertiary flex flex-col shrink-0 overflow-y-auto text-xs">
      <div className="px-3 py-2 border-b border-bg-tertiary">
        <p className="font-semibold text-text-muted uppercase tracking-wider">Metadados DICOM</p>
      </div>

      {hasError ? (
        <div className="p-3 text-danger">Erro ao carregar metadados</div>
      ) : !tags ? (
        <div className="p-3 text-text-muted">Selecione uma instância</div>
      ) : (
        <dl className="p-3 space-y-2">
          {DISPLAYED_TAGS.map(({ key, label }) => {
            const raw = tags[key]
            if (!raw) return null
            let value = raw
            if (key === 'PatientName') value = formatPatientName(raw)
            if (key === 'PatientBirthDate' || key === 'StudyDate') value = formatDate(raw)
            return (
              <div key={key}>
                <dt className="text-text-muted">{label}</dt>
                <dd className="text-text-primary font-medium break-words">{value}</dd>
              </div>
            )
          })}
        </dl>
      )}
    </aside>
  )
}
