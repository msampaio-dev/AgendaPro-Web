import { apiRequest } from '../../../services/api'
import type { Profissional, ProfissionalServico, Servico } from '../../agendamentos/types'
import type { UsuarioResponse } from '../../auth/types'

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function carregarDadosAdministrativos(token: string) {
  const headers = autorizacao(token)
  const [usuarios, profissionais, servicos] = await Promise.all([
    apiRequest<UsuarioResponse[]>('/usuarios', { headers }),
    apiRequest<Profissional[]>('/profissionais', { headers }),
    apiRequest<Servico[]>('/servicos', { headers }),
  ])
  return { usuarios, profissionais, servicos }
}

export function cadastrarProfissional(usuarioId: number, token: string) {
  return apiRequest<Profissional>('/profissionais', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify({ usuarioId }),
  })
}

export function desativarProfissional(id: number, token: string) {
  return apiRequest<void>(`/profissionais/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}

export function listarAssociacoes(profissionalId: number, token: string) {
  return apiRequest<ProfissionalServico[]>(`/profissionais-servicos?profissionalId=${profissionalId}`, {
    headers: autorizacao(token),
  })
}

export function associarServico(profissionalId: number, servicoId: number, token: string) {
  return apiRequest<ProfissionalServico>('/profissionais-servicos', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify({ profissionalId, servicoId }),
  })
}

export function removerAssociacao(id: number, token: string) {
  return apiRequest<void>(`/profissionais-servicos/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}
