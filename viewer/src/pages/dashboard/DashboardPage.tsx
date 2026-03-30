import { Header } from '@/components/layout/header/Header'
import { Sidebar } from '@/components/layout/sidebar/Sidebar'
import { SearchBar } from '@/components/dashboard/search-bar/SearchBar'
import { Filters } from '@/components/dashboard/filters/Filters'
import { PatientList } from '@/components/dashboard/patient-list/PatientList'
import { ExamList } from '@/components/dashboard/exam-list/ExamList'
import { useDashboardStore } from '@/store/dashboard'

export default function DashboardPage() {
  const selectedPatientId = useDashboardStore((s) => s.selectedPatientId)

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Controles */}
          <div className="px-4 py-3 border-b border-bg-tertiary bg-bg-secondary space-y-3">
            <SearchBar />
            <Filters />
          </div>

          {/* Conteúdo */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Lista de pacientes */}
            <div className={`flex flex-col min-h-0 overflow-y-auto p-4 ${selectedPatientId ? 'w-3/5' : 'w-full'}`}>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Pacientes
              </h2>
              <PatientList />
            </div>

            {/* Lista de exames — visível ao selecionar paciente */}
            {selectedPatientId && (
              <div className="w-2/5 border-l border-bg-tertiary flex flex-col min-h-0 overflow-y-auto p-4">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Estudos
                </h2>
                <ExamList />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
