import type { UserRole } from '@/types/auth'

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  medico: { label: 'Médico', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  tecnico: { label: 'Técnico', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  secretaria: { label: 'Secretária', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
}

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = roleConfig[role] ?? roleConfig.medico
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}
