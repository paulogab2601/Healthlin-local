import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useViewerStore } from '@/store/viewer'
import { Toolbar } from '@/components/viewer/toolbar/Toolbar'
import { SeriesPanel } from '@/components/viewer/series-panel/SeriesPanel'
import { DicomCanvas } from '@/components/viewer/dicom-canvas/DicomCanvas'
import { ImagePanel } from '@/components/viewer/image-panel/ImagePanel'
import { MetadataPanel } from '@/components/viewer/metadata-panel/MetadataPanel'
import { AnnotationOverlay } from '@/components/viewer/annotations/AnnotationOverlay'
import { Spinner } from '@/components/common/loading/Spinner'

export default function ViewerPage() {
  const { studyId } = useParams<{ studyId: string }>()
  const { loadStudy, currentStudy, isLoading, setOrtahncOffline } = useViewerStore()

  useEffect(() => {
    if (studyId) loadStudy(studyId)
  }, [studyId, loadStudy])

  useEffect(() => {
    function handleOrthancOffline() {
      setOrtahncOffline(true)
    }
    window.addEventListener('orthanc:offline', handleOrthancOffline)
    return () => window.removeEventListener('orthanc:offline', handleOrthancOffline)
  }, [setOrtahncOffline])

  return (
    <div className="flex flex-col h-screen bg-black text-text-primary">
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-3 py-1 bg-bg-secondary border-b border-bg-tertiary shrink-0">
        <Link
          to="/dashboard"
          className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        {currentStudy && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary text-sm font-medium">
              {currentStudy.MainDicomTags.StudyDescription || 'Estudo'}
            </span>
            <span className="text-text-muted text-xs">
              {currentStudy.PatientMainDicomTags?.PatientName}
            </span>
          </>
        )}
        <div className="flex-1" />
        <span className="text-accent text-sm font-bold">Healthlin</span>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Corpo do viewer */}
      <div className="flex flex-1 min-h-0">
        <SeriesPanel />

        {/* Canvas + slider */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
          {isLoading && !currentStudy ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 relative">
                <DicomCanvas />
                <AnnotationOverlay />
              </div>
              <ImagePanel />
            </>
          )}
        </div>

        <MetadataPanel />
      </div>
    </div>
  )
}
