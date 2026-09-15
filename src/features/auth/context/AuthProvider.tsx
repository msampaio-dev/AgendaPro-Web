import { type ReactNode, useEffect, useState } from 'react'
import { buscarSessao, login } from '../authApi'
import { lerSessao, removerSessao, salvarSessao } from '../authStorage'
import type { LoginRequest, LoginResponse, PerfilUsuario, SessaoResponse } from '../types'
import { AuthContext } from './AuthContext'

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

      try {
        const sessaoAtual = await buscarSessao(credencialSalva.token)
        if (ativo) {
          setCredencial(credencialSalva)
          setSessao(sessaoAtual)
        }
      } catch {
        removerSessao()
        if (ativo) {
          setCredencial(null)
          setSessao(null)
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    restaurarSessao()
    return () => { ativo = false }
  }, [])

  async function entrar(credenciais: LoginRequest) {
    const novaCredencial = await login(credenciais)
    salvarSessao(novaCredencial)

    try {
      const sessaoAtual = await buscarSessao(novaCredencial.token)
      setCredencial(novaCredencial)
      setSessao(sessaoAtual)
    } catch (error) {
      removerSessao()
      throw error
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
      sair,
      possuiPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
