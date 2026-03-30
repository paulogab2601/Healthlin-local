import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/auth/login-form/LoginForm'
import { ChangePasswordModal } from '@/components/auth/change-password/ChangePasswordModal'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const { isAuthenticated, isDefaultPassword } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !isDefaultPassword) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isDefaultPassword, navigate])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent tracking-tight">Healthlin</h1>
          <p className="mt-2 text-text-secondary text-sm">Visualizador de Imagens DICOM</p>
        </div>

        <div className="rounded-xl bg-bg-secondary border border-bg-tertiary p-6 shadow-2xl">
          <LoginForm />
        </div>
      </div>

      {/* Modal de troca de senha obrigatória após primeiro login */}
      <ChangePasswordModal
        isOpen={isAuthenticated && isDefaultPassword}
        onClose={() => navigate('/dashboard', { replace: true })}
        forceChange
      />
    </div>
  )
}
