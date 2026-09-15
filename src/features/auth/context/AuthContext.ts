import { createContext } from 'react'
import type { LoginRequest, PerfilUsuario, SessaoResponse } from '../types'

export type AuthContextValue = {
  sessao: SessaoResponse | null
  token: string | null
  carregando: boolean
  autenticado: boolean
  entrar: (credenciais: LoginRequest) => Promise<void>
  sair: () => void
  possuiPerfil: (...perfis: PerfilUsuario[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
