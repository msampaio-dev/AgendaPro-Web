import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import type { PerfilUsuario } from '../types'

type RotaProtegidaProps = {
  children: ReactNode
  perfis?: PerfilUsuario[]
}

export function RotaProtegida({ children, perfis = [] }: RotaProtegidaProps) {
  const location = useLocation()
  const { autenticado, carregando, possuiPerfil } = useAuth()

  if (carregando) {
    return <div role="status" aria-live="polite">Validando sua sessão...</div>
  }

  if (!autenticado) {
    return <Navigate to="/entrar" replace state={{ retorno: location.pathname }} />
  }

  if (perfis.length > 0 && !possuiPerfil(...perfis)) {
    return <Navigate to="/painel" replace />
  }

  return children
}
