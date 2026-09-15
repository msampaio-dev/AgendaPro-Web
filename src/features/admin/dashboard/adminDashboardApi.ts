import { apiRequest } from '../../../services/api'
import type { Agendamento, Pagina, Profissional, Servico, StatusAgendamento } from '../../agendamentos/types'
import type { UsuarioResponse } from '../../auth/types'

export type FiltrosAgendaAdmin = {
  profissionalId: number | null
  dataInicio: string
  dataFim: string
  status: StatusAgendamento | ''
}

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function carregarResumoAdmin(token: string) {
  const headers = autorizacao(token)
  const [usuarios, profissionais, servicos] = await Promise.all([
    apiRequest<UsuarioResponse[]>('/usuarios', { headers }),
    apiRequest<Profissional[]>('/profissionais', { headers }),
    apiRequest<Servico[]>('/servicos', { headers }),
  ])

  return { usuarios, profissionais, servicos }
}

export function listarAgendaAdmin(
  filtros: FiltrosAgendaAdmin,
  pagina: number,
  token: string,
) {
  const params = new URLSearchParams({
    page: String(pagina),
    size: '10',
    sort: 'inicio,asc',
  })

  if (filtros.profissionalId) params.set('profissionalId', String(filtros.profissionalId))
  if (filtros.dataInicio) params.set('inicioDe', inicioDoDiaEmIso(filtros.dataInicio))
  if (filtros.dataFim) params.set('inicioAntesDe', inicioDoDiaSeguinteEmIso(filtros.dataFim))
  if (filtros.status) params.set('status', filtros.status)

  return apiRequest<Pagina<Agendamento>>(`/agendamentos/admin?${params}`, {
    headers: autorizacao(token),
  })
}

function inicioDoDiaEmIso(data: string) {
  return new Date(`${data}T00:00:00`).toISOString()
}

function inicioDoDiaSeguinteEmIso(data: string) {
  const dia = new Date(`${data}T00:00:00`)
  dia.setDate(dia.getDate() + 1)
  return dia.toISOString()
}
