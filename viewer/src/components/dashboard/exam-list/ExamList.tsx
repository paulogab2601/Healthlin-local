import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '@/store/dashboard'
import { useStudies } from '@/hooks/orthanc/useStudies'
import { SkeletonCard } from '@/components/common/loading/SkeletonCard'
import { ModalityBadge } from '@/components/common/badges/ModalityBadge'
import { Button } from '@/components/common/buttons/Button'
import { formatDate } from '@/utils/format'
import { getStudyModalities } from '@/utils/dicom'

export function ExamList() {
  const { selectedPatientId } = useDashboardStore()
  const { studies, isLoading } = useStudies(selectedPatientId)
  const navigate = useNavigate()

  if (!selectedPatientId) return null

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        Nenhum estudo encontrado para este paciente.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {studies.map((study) => {
        const tags = study.MainDicomTags
        const studyModalities = getStudyModalities(tags)
        return (
          <div
            key={study.ID}
            className="rounded-lg bg-bg-card border border-bg-tertiary p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium truncate">
                  {tags.StudyDescription || 'Sem descrição'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatDate(tags.StudyDate)} · {study.Series.length} série(s)
                </p>
                {tags.AccessionNumber && (
                  <p className="text-xs text-text-muted font-mono">Acc: {tags.AccessionNumber}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {studyModalities.map((m) => (
                  <ModalityBadge key={m} modality={m} />
                ))}
              </div>
              <Button size="sm" onClick={() => navigate(`/viewer/${study.ID}`)}>
                Visualizar
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
