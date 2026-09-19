import { type ReactNode, useEffect, useState } from 'react'
import { ApiError } from '../../../services/api'
import { buscarSessao, login } from '../authApi'
import { lerSessao, removerSessao, salvarSessao } from '../authStorage'
import type { LoginRequest, LoginResponse, PerfilUsuario, SessaoResponse } from '../types'
import { AuthContext } from './AuthContext'

// A API hiberna no plano gratuito e pode levar mais de um minuto para voltar.
// Esperas crescentes cobrem esse retorno sem martelar o servidor.
const ESPERAS_ENTRE_TENTATIVAS = [1000, 3000, 6000, 12000]

/**
 * Só o servidor recusando o token invalida a sessão. Falha de rede, servidor
 * fora do ar ou hibernação não dizem nada sobre a credencial, e apagá-la
 * deslogaria quem apenas tentou abrir o sistema na hora errada.
 */
function credencialRecusada(erro: unknown) {
  return erro instanceof ApiError && (erro.status === 401 || erro.status === 403)
}

function espera(milissegundos: number) {
  return new Promise((resolve) => setTimeout(resolve, milissegundos))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credencial, setCredencial] = useState<LoginResponse | null>(null)
  const [sessao, setSessao] = useState<SessaoResponse | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    async function restaurarSessao() {
      const credencialSalva = lerSessao()

      if (!credencialSalva || new Date(credencialSalva.expiraEm).getTime() <= Date.now()) {
        removerSessao()
        if (ativo) {
          setCarregando(false)
        }
        return
      }

      for (let tentativa = 0; ativo; tentativa++) {
        try {
          const sessaoAtual = await buscarSessao(credencialSalva.token)
          if (ativo) {
            setCredencial(credencialSalva)
            setSessao(sessaoAtual)
            setCarregando(false)
          }
          return
        } catch (erro) {
          if (credencialRecusada(erro)) {
            removerSessao()
            if (ativo) {
              setCredencial(null)
              setSessao(null)
              setCarregando(false)
            }
            return
          }

          const proximaEspera = ESPERAS_ENTRE_TENTATIVAS[tentativa]

          // Esgotadas as tentativas, a credencial continua salva de propósito:
          // a próxima visita tenta de novo em vez de exigir um login novo.
          if (proximaEspera === undefined) {
            if (ativo) setCarregando(false)
            return
          }

          await espera(proximaEspera)
        }
      }
    }

    restaurarSessao()
    return () => { ativo = false }
  }, [])

  async function entrar(credenciais: LoginRequest) {
    const novaCredencial = await login(credenciais)
    await atualizarCredencial(novaCredencial)
  }

  async function atualizarCredencial(novaCredencial: LoginResponse) {
    salvarSessao(novaCredencial)

    try {
      const sessaoAtual = await buscarSessao(novaCredencial.token)
      setCredencial(novaCredencial)
      setSessao(sessaoAtual)
    } catch (erro) {
      // Um token recém-emitido não perde a validade porque a rede falhou.
      if (credencialRecusada(erro)) removerSessao()
      throw erro
    }
  }

  function sair() {
    removerSessao()
    setCredencial(null)
    setSessao(null)
  }

  function possuiPerfil(...perfis: PerfilUsuario[]) {
    return perfis.some((perfil) => sessao?.perfis.includes(perfil))
  }

  return (
    <AuthContext.Provider value={{
      sessao,
      token: credencial?.token ?? null,
      carregando,
      autenticado: Boolean(sessao),
      entrar,
      atualizarCredencial,
      sair,
      possuiPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
