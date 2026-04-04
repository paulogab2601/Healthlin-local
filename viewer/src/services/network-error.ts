import axios from 'axios'

interface RequestErrorLike {
  code?: string
  name?: string
  request?: unknown
  response?: { status?: number }
  config?: { signal?: AbortSignal }
}

const OFFLINE_HTTP_STATUSES = new Set([502, 503, 504])
const OFFLINE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ERR_NETWORK',
  'ECONNREFUSED',
  'ERR_CONNECTION_REFUSED',
  'ENOTFOUND',
])

export function isRequestCanceled(error: unknown): boolean {
  if (axios.isCancel(error)) return true

  const err = error as RequestErrorLike
  if (!err) return false

  if (err.code === 'ERR_CANCELED') return true
  if (err.name === 'CanceledError' || err.name === 'AbortError') return true
  if (err.config?.signal?.aborted) return true

  return false
}

export function isOrthancOfflineError(error: unknown): boolean {
  if (isRequestCanceled(error)) return false

  const err = error as RequestErrorLike
  const status = err?.response?.status

  if (typeof status === 'number' && OFFLINE_HTTP_STATUSES.has(status)) {
    return true
  }

  if (typeof err?.code === 'string' && OFFLINE_ERROR_CODES.has(err.code)) {
    return true
  }

  if (!err?.response && Boolean(err?.request)) {
    return true
  }

  return false
}
