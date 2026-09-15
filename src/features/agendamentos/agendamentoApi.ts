import { apiRequest } from '../../services/api'
import type {
  Agendamento,
  Disponibilidade,
  Profissional,
  ProfissionalServico,
  Servico,
} from './types'

export function listarServicos(token: string) {
  return apiRequest<Servico[]>('/servicos', { headers: { Authorization: `Bearer ${token}` } })
}

export async function listarProfissionaisDoServico(servicoId: number, token: string) {
  const authorization = { Authorization: `Bearer ${token}` }
  const [profissionais, associacoes] = await Promise.all([
    apiRequest<Profissional[]>('/profissionais', { headers: authorization }),
    apiRequest<ProfissionalServico[]>(`/profissionais-servicos/por-servico?servicoId=${servicoId}`, {
      headers: authorization,
    }),
  ])
  const idsAssociados = new Set(associacoes.map((associacao) => associacao.profissionalId))

  return profissionais.filter((profissional) => profissional.ativo && idsAssociados.has(profissional.id))
}

export function consultarDisponibilidade(
  profissionalId: number,
  servicoId: number,
  data: string,
  token: string,
) {
  const params = new URLSearchParams({
    profissionalId: String(profissionalId),
    servicoId: String(servicoId),
    data,
  })

  return apiRequest<Disponibilidade>(`/disponibilidades?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function criarAgendamento(
  dados: {
    clienteId: number
    profissionalId: number
    servicoId: number
    data: string
    horarioInicio: string
  },
  token: string,
) {
  return apiRequest<Agendamento>('/agendamentos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(dados),
  })
}
