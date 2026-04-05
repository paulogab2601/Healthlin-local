import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { Header } from '@/components/layout/header/Header'
import { Sidebar } from '@/components/layout/sidebar/Sidebar'
import { Button } from '@/components/common/buttons/Button'
import { Modal } from '@/components/common/modals/Modal'
import { Input } from '@/components/common/inputs/Input'
import { Select } from '@/components/common/inputs/Select'
import { RoleBadge } from '@/components/common/badges/RoleBadge'
import { authService } from '@/services/auth/authService'
import type { ApiUser, CouncilType, UserRole, PaginatedUsers } from '@/types/auth'
import { formatDate } from '@/utils/format'

const COUNCIL_OPTIONS = [
  { value: 'CRM', label: 'CRM' },
  { value: 'CRTR', label: 'CRTR' },
  { value: 'MATRICULA', label: 'Matrícula' },
]

const ROLE_OPTIONS = [
  { value: 'medico', label: 'Médico' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'secretaria', label: 'Secretária' },
  { value: 'admin', label: 'Admin' },
]

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  ...ROLE_OPTIONS,
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
]

const PER_PAGE = 20

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [data, setData] = useState<PaginatedUsers>({ items: [], total: 0, page: 1, per_page: PER_PAGE, pages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)

  // Formulário de criação
  const [name, setName] = useState('')
  const [councilType, setCouncilType] = useState<CouncilType>('CRM')
  const [councilNumber, setCouncilNumber] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('medico')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(async (p = page, signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      const result = await authService.listUsers({
        page: p,
        per_page: PER_PAGE,
        search: search || undefined,
        role: (roleFilter as UserRole) || undefined,
        active: activeFilter === '' ? undefined : activeFilter === 'true',
      }, signal)
      if (!signal?.aborted) setData(result)
    } catch (err) {
      if (signal?.aborted) return
      throw err
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [page, search, roleFilter, activeFilter])

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchUsers(page, controller.signal)
    }, 300)

    return () => {
      controller.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchUsers, page])

  // Reset para página 1 ao mudar filtros
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value)
    setPage(1)
  }

  function handleActiveFilterChange(value: string) {
    setActiveFilter(value)
    setPage(1)
  }

  async function handleDeactivate(id: number) {
    if (!confirm('Desativar este usuário?')) return
    try {
      await authService.deactivateUser(id)
      fetchUsers()
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao desativar usuário'
      )
    }
  }

  async function handleReactivate(id: number) {
    if (!confirm('Reativar este usuário?')) return
    await authService.reactivateUser(id)
    fetchUsers()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name || !councilNumber || !password) {
      setFormError('Preencha todos os campos')
      return
    }
    setFormLoading(true)
    try {
      await authService.createUser({ name, council_type: councilType, council_number: councilNumber, password, role })
      setCreateOpen(false)
      setName(''); setCouncilNumber(''); setPassword('')
      fetchUsers()
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar usuário'
      )
    } finally {
      setFormLoading(false)
    }
  }

  const users = data.items

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold">Gerenciar Usuários</h1>
            <Button onClick={() => setCreateOpen(true)}>Novo usuário</Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                options={ROLE_FILTER_OPTIONS}
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={activeFilter}
                onChange={(e) => handleActiveFilterChange(e.target.value)}
              />
            </div>
            <span className="text-xs text-text-muted whitespace-nowrap">
              {data.total} usuário{data.total !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <p className="text-text-muted">Carregando...</p>
          ) : (
            <>
              <div className="rounded-lg border border-bg-tertiary overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bg-secondary">
                    <tr className="border-b border-bg-tertiary text-text-muted text-left">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Conselho</th>
                      <th className="px-4 py-3 font-medium">Papel</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Criado em</th>
                      <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      users.map((u: ApiUser) => (
                        <tr key={u.id} className="border-b border-bg-tertiary hover:bg-bg-tertiary/50 transition-colors">
                          <td className="px-4 py-3 text-text-primary">{u.name}</td>
                          <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                            {u.council_type}/{u.council_number}
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={u.active ? 'text-success' : 'text-text-muted'}>
                              {u.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-xs">
                            {formatDate(u.created_at?.split('T')[0]?.replace(/-/g, ''))}
                          </td>
                          <td className="px-4 py-3">
                            {u.id === 1 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-text-muted" title="Administrador principal — não pode ser desativado">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Protegido
                              </span>
                            ) : u.active === 1 ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeactivate(u.id)}
                                disabled={u.id === currentUser?.id}
                                title={u.id === currentUser?.id ? 'Você não pode desativar sua própria conta' : undefined}
                              >
                                Desativar
                              </Button>
                            ) : (
                              <Button variant="secondary" size="sm" onClick={() => handleReactivate(u.id)}>
                                Reativar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-text-muted">
                    Página {data.page} de {data.pages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= data.pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Novo Usuário">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. João Silva" />
          <Select
            label="Tipo de conselho"
            options={COUNCIL_OPTIONS}
            value={councilType}
            onChange={(e) => setCouncilType(e.target.value as CouncilType)}
          />
          <Input label="Número" value={councilNumber} onChange={(e) => setCouncilNumber(e.target.value)} placeholder="12345" />
          <Input label="Senha inicial" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          <Select
            label="Papel"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          />
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={formLoading}>
              Criar usuário
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
