import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export function useRequireAuth() {
  const { isAuthenticated, loadMe } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    loadMe()
  }, [isAuthenticated, navigate, loadMe])

  return isAuthenticated
}
