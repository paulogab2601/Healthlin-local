import { useState } from 'react'
import { Modal } from '@/components/common/modals/Modal'
import { Input } from '@/components/common/inputs/Input'
import { Button } from '@/components/common/buttons/Button'
import { useAuthStore } from '@/store/auth'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  forceChange?: boolean
}

export function ChangePasswordModal({ isOpen, onClose, forceChange = false }: ChangePasswordModalProps) {
  const { changePassword, isLoading, error, clearError } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const [success, setSuccess] = useState(false)

  function resetForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setValidationError('')
    setSuccess(false)
    clearError()
  }

  function handleClose() {
    if (forceChange) return
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')
    clearError()

    if (!currentPassword || !newPassword || !confirmPassword) {
      setValidationError('Preencha todos os campos')
      return
    }

    if (newPassword.length < 8) {
      setValidationError('A nova senha deve ter pelo menos 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError('As senhas não coincidem')
      return
    }

    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setSuccess(true)
      setTimeout(() => {
        resetForm()
        onClose()
      }, 1500)
    } catch {
      // erro já está no store
    }
  }

  const displayError = validationError || error

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={forceChange ? 'Troque sua senha padrão' : 'Trocar senha'}
    >
      {forceChange && (
        <div className="mb-4 rounded-md bg-warning/10 border border-warning/30 px-4 py-3">
          <p className="text-sm text-warning">
            Por segurança, você deve trocar a senha padrão antes de continuar.
          </p>
        </div>
      )}

      {success ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 rounded-full bg-success/10 p-3 w-fit">
            <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-text-primary font-medium">Senha alterada com sucesso!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {displayError && (
            <p className="text-sm text-danger">{displayError}</p>
          )}

          <div className="flex gap-3 pt-2">
            {!forceChange && (
              <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
            )}
            <Button type="submit" className="flex-1" loading={isLoading}>
              Trocar senha
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
