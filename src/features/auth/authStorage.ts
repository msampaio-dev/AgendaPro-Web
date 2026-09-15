import type { LoginResponse } from './types'

const SESSION_KEY = 'agendapro:sessao'

export function salvarSessao(sessao: LoginResponse) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao))
}

export function lerSessao(): LoginResponse | null {
  const value = sessionStorage.getItem(SESSION_KEY)

  if (!value) return null

  try {
    return JSON.parse(value) as LoginResponse
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function removerSessao() {
  sessionStorage.removeItem(SESSION_KEY)
}
