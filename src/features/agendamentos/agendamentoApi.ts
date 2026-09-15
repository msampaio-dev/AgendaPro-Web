import { apiRequest } from '../../services/api'
import type {
  Agendamento,
  Disponibilidade,
  Profissional,
  ProfissionalServico,
  Pagina,
  Servico,
  StatusAgendamento,
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

export function consultarProximasDisponibilidades(
  profissionalId: number,
  servicoId: number,
  dataInicial: string,
  token: string,
) {
  const params = new URLSearchParams({
    profissionalId: String(profissionalId),
    servicoId: String(servicoId),
    dataInicial,
    quantidade: '5',
    horizonteDias: '30',
  })

  return apiRequest<Disponibilidade[]>(`/disponibilidades/proximas?${params}`, {
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

export type FiltrosAgendamento = {
  dataInicio: string
  dataFim: string
  status: StatusAgendamento | ''
}

function inicioDoDiaEmIso(data: string) {
  return new Date(`${data}T00:00:00`).toISOString()
}

function inicioDoDiaSeguinteEmIso(data: string) {
  const dia = new Date(`${data}T00:00:00`)
  dia.setDate(dia.getDate() + 1)
  return dia.toISOString()
}

export function listarAgendamentosDoCliente(
  clienteId: number,
  filtros: FiltrosAgendamento,
  pagina: number,
  token: string,
) {
  const params = new URLSearchParams({ page: String(pagina), size: '6', sort: 'inicio,desc' })
  if (filtros.dataInicio) params.set('inicioDe', inicioDoDiaEmIso(filtros.dataInicio))
  if (filtros.dataFim) params.set('inicioAntesDe', inicioDoDiaSeguinteEmIso(filtros.dataFim))
  if (filtros.status) params.set('status', filtros.status)

  return apiRequest<Pagina<Agendamento>>(`/agendamentos/cliente/${clienteId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function cancelarAgendamento(id: number, token: string) {
  return apiRequest<Agendamento>(`/agendamentos/${id}/cancelar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export type FiltrosAgendaProfissional = {
  dataInicio: string
  dataFim: string
  status: StatusAgendamento | ''
}

export function listarAgendaDoProfissional(
  profissionalId: number,
  filtros: FiltrosAgendaProfissional,
  pagina: number,
  token: string,
) {
  const params = new URLSearchParams({
    profissionalId: String(profissionalId),
    page: String(pagina),
    size: '8',
    sort: 'inicio,asc',
  })
  if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio)
  if (filtros.dataFim) params.set('dataFim', filtros.dataFim)
  if (filtros.status) params.set('status', filtros.status)

  return apiRequest<Pagina<Agendamento>>(`/agendamentos?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function alterarStatus(id: number, acao: 'confirmar' | 'concluir', token: string) {
  return apiRequest<Agendamento>(`/agendamentos/${id}/${acao}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function confirmarAgendamento(id: number, token: string) {
  return alterarStatus(id, 'confirmar', token)
}

export function concluirAgendamento(id: number, token: string) {
  return alterarStatus(id, 'concluir', token)
}
