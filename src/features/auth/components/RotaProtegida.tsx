import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useEsperaLonga } from '../../../hooks/useEsperaLonga'
import { useAuth } from '../context/useAuth'
import type { PerfilUsuario } from '../types'

type RotaProtegidaProps = {
  children: ReactNode
  perfis?: PerfilUsuario[]
}

export function RotaProtegida({ children, perfis = [] }: RotaProtegidaProps) {
  const location = useLocation()
  const { autenticado, carregando, possuiPerfil } = useAuth()
  const servidorAcordando = useEsperaLonga(carregando)

  if (carregando) {
    return (
      <div role="status" aria-live="polite">
        <p>Validando sua sessão...</p>
        {/* A API hiberna no plano gratuito: sem esta explicação, a espera de
            quase um minuto parece a aplicação travada. */}
        {servidorAcordando && <p>
          O servidor estava hibernando e está sendo acordado. Isso pode levar até um minuto
          na primeira visita — sua sessão continua válida.
        </p>}
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/entrar" replace state={{ retorno: location.pathname }} />
  }

  if (perfis.length > 0 && !possuiPerfil(...perfis)) {
    return <Navigate to="/painel" replace />
  }

  return children
}
