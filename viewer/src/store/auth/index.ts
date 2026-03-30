import { create } from 'zustand'
import { authService } from '@/services/auth/authService'
import type { User, LoginRequest, ChangePasswordRequest } from '@/types/auth'

const DEFAULT_ADMIN_PASSWORD = 'admin123'
const TOKEN_KEY = 'healthlin_token'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isDefaultPassword: boolean
  isLoading: boolean
  error: string | null

  login: (data: LoginRequest) => Promise<void>
  logout: () => void
  loadMe: () => Promise<void>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isDefaultPassword: false,
  isLoading: false,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await authService.login(data)
      localStorage.setItem(TOKEN_KEY, res.token)

      // Detecta se está usando a senha padrão do admin
      const isDefault =
        data.council_type === 'MATRICULA' &&
        data.council_number === 'admin' &&
        data.password === DEFAULT_ADMIN_PASSWORD

      set({
        token: res.token,
        user: res.user,
        isAuthenticated: true,
        isDefaultPassword: isDefault,
        isLoading: false,
      })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao fazer login'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null, isAuthenticated: false, isDefaultPassword: false })
  },

  loadMe: async () => {
    const { token } = get()
    if (!token) return

    try {
      const user = await authService.me()
      set({ user, isAuthenticated: true })
    } catch {
      get().logout()
    }
  },

  changePassword: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await authService.changePassword(data)
      set({ isDefaultPassword: false, isLoading: false })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao trocar senha'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
