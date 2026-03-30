import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { RoleBadge } from '@/components/common/badges/RoleBadge'
import { ChangePasswordModal } from '@/components/auth/change-password/ChangePasswordModal'

export function Header() {
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  return (
    <>
      <header className="h-14 bg-bg-secondary border-b border-bg-tertiary flex items-center justify-between px-4 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-accent font-bold text-xl tracking-tight">Healthlin</span>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-bg-tertiary transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-sm text-text-primary hidden sm:block">{user?.name}</span>
            {user && <RoleBadge role={user.role} />}
            <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-48 z-20 rounded-md bg-bg-secondary border border-bg-tertiary shadow-xl py-1">
                <button
                  onClick={() => { setMenuOpen(false); setChangePasswordOpen(true) }}
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  Trocar senha
                </button>
                <hr className="border-bg-tertiary my-1" />
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-bg-tertiary transition-colors"
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  )
}
