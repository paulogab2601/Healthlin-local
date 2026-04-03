import api from '../api'
import type { LoginRequest, LoginResponse, User, ChangePasswordRequest, PaginatedUsers, ListUsersParams } from '@/types/auth'

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

  async listUsers(params: ListUsersParams = {}): Promise<PaginatedUsers> {
    const res = await api.get<PaginatedUsers>('/api/auth/users', { params })
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

  async reactivateUser(id: number): Promise<void> {
    await api.put(`/api/auth/users/${id}/reactivate`)
  },
}
