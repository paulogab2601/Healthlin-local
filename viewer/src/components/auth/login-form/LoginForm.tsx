import { useState } from 'react'
import { CouncilSelector } from '@/components/auth/council-selector/CouncilSelector'
import { Input } from '@/components/common/inputs/Input'
import { Button } from '@/components/common/buttons/Button'
import { useAuthStore } from '@/store/auth'
import type { CouncilType } from '@/types/auth'

export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore()
  const [councilType, setCouncilType] = useState<CouncilType>('MATRICULA')
  const [councilNumber, setCouncilNumber] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')
    clearError()

    if (!councilNumber.trim() || !password) {
      setValidationError('Preencha todos os campos')
      return
    }

    await login({ council_type: councilType, council_number: councilNumber.trim(), password })
  }

  const displayError = validationError || error

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CouncilSelector value={councilType} onChange={setCouncilType} />

      <Input
        label="Número do conselho / matrícula"
        value={councilNumber}
        onChange={(e) => setCouncilNumber(e.target.value)}
        placeholder="Ex: 12345 ou admin"
        autoComplete="username"
      />

      <Input
        label="Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {displayError && (
        <p className="text-sm text-danger text-center">{displayError}</p>
      )}

      <Button type="submit" className="w-full" loading={isLoading}>
        Entrar
      </Button>
    </form>
  )
}
