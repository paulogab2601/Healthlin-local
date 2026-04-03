export type CouncilType = 'CRM' | 'CRTR' | 'MATRICULA'
export type UserRole = 'admin' | 'medico' | 'tecnico' | 'secretaria'

export interface User {
  id: number
  name: string
  council_type: CouncilType
  council_number: string
  role: UserRole
}

export interface LoginRequest {
  council_type: CouncilType
  council_number: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ApiUser extends User {
  active: number
  created_at: string
}

export interface PaginatedUsers {
  items: ApiUser[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface ListUsersParams {
  page?: number
  per_page?: number
  search?: string
  role?: UserRole
  active?: boolean
}
