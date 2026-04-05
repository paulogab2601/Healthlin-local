import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { isOrthancOfflineError } from '@/services/network-error'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Injeta token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('healthlin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Evita múltiplos logouts quando requisições paralelas retornam 401
let isLoggingOut = false

// Trata respostas de erro globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401 && !isLoggingOut) {
      isLoggingOut = true
      useAuthStore.getState().logout()
      // Libera a flag no próximo tick para permitir logout futuro após re-login
      queueMicrotask(() => { isLoggingOut = false })
    }

    // Só sinaliza offline quando a falha é em rota do Orthanc (imagens/estudos),
    // evitando falso-positivo por erro em rotas de auth/admin.
    const url = error.config?.url ?? ''
    if (status !== 401 && url.includes('/api/orthanc/') && isOrthancOfflineError(error)) {
      window.dispatchEvent(new CustomEvent('orthanc:offline'))
    }

    return Promise.reject(error)
  },
)

export default api
