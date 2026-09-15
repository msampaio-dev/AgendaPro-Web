import { apiRequest } from '../../../services/api'
import type { Servico } from '../../agendamentos/types'

export type DadosServico = {
  nome: string
  descricao: string | null
  duracaoMinutos: number
  preco: number
}

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function listarServicosAdmin(token: string) {
  return apiRequest<Servico[]>('/servicos', { headers: autorizacao(token) })
}

export function cadastrarServico(dados: DadosServico, token: string) {
  return apiRequest<Servico>('/servicos', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify(dados),
  })
}

export function atualizarServico(id: number, dados: DadosServico, token: string) {
  return apiRequest<Servico>(`/servicos/${id}`, {
    method: 'PUT',
    headers: autorizacao(token),
    body: JSON.stringify(dados),
  })
}

export function desativarServico(id: number, token: string) {
  return apiRequest<void>(`/servicos/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}
