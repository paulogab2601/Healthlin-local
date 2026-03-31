import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/login/LoginPage'
import { useAuthStore } from '@/store/auth'
import { Spinner } from '@/components/common/loading/Spinner'

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ViewerPage = lazy(() => import('@/pages/viewer/ViewerPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))

function RouteFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
      <Spinner size="lg" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Hidrata o usuário a partir do token persistido antes de avaliar qualquer rota.
// Sem isso, user=null após refresh redireciona admin para /dashboard.
function AppBoot({ children }: { children: React.ReactNode }) {
  const isHydrating = useAuthStore((s) => s.isHydrating)
  const loadMe = useAuthStore((s) => s.loadMe)

  useEffect(() => {
    loadMe()
  }, [loadMe])

  if (isHydrating) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
        <Spinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBoot>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/viewer/:studyId"
              element={
                <RequireAuth>
                  <ViewerPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminUsersPage />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppBoot>
    </BrowserRouter>
  )
}
