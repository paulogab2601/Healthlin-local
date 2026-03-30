import api from '../api'
import type { LoginRequest, LoginResponse, User, ChangePasswordRequest, ApiUser } from '@/types/auth'

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/api/auth/login', data)
    return res.data
  },

  async me(): Promise<User> {
    const res = await api.get<User>('/api/auth/me')
    return res.data
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.put('/api/auth/change-password', data)
  },

  async listUsers(): Promise<ApiUser[]> {
    const res = await api.get<ApiUser[]>('/api/auth/users')
    return res.data
  },

  async createUser(data: {
    name: string
    council_type: string
    council_number: string
    password: string
    role?: string
  }): Promise<void> {
    await api.post('/api/auth/users', data)
  },

  async deactivateUser(id: number): Promise<void> {
    await api.delete(`/api/auth/users/${id}`)
  },
}
