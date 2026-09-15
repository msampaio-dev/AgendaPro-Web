import { apiRequest } from '../../../services/api'

export type DiaSemana = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type TipoExcecao = 'BLOQUEIO' | 'DISPONIBILIDADE_EXTRA'

export type HorarioAtendimento = {
  id: number
  profissionalId: number
  diaSemana: DiaSemana
  horarioInicio: string
  horarioFim: string
  ativo: boolean
}

export type ExcecaoDisponibilidade = {
  id: number
  profissionalId: number
  data: string
  tipo: TipoExcecao
  horarioInicio: string | null
  horarioFim: string | null
  diaInteiro: boolean
  ativo: boolean
}

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function listarHorarios(profissionalId: number, token: string) {
  return apiRequest<HorarioAtendimento[]>(`/horarios-atendimento?profissionalId=${profissionalId}`, {
    headers: autorizacao(token),
  })
}

export function cadastrarHorario(
  dados: { profissionalId: number; diaSemana: DiaSemana; horarioInicio: string; horarioFim: string },
  token: string,
) {
  return apiRequest<HorarioAtendimento>('/horarios-atendimento', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify(dados),
  })
}

export function cadastrarJornadaComIntervalo(
  dados: {
    profissionalId: number
    diaSemana: DiaSemana
    horarioInicio: string
    inicioIntervalo: string
    fimIntervalo: string
    horarioFim: string
  },
  token: string,
) {
  return apiRequest<HorarioAtendimento[]>('/horarios-atendimento/jornada', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify(dados),
  })
}

export function removerHorario(id: number, token: string) {
  return apiRequest<void>(`/horarios-atendimento/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}

export function listarExcecoes(profissionalId: number, data: string, token: string) {
  const params = new URLSearchParams({ profissionalId: String(profissionalId), data })
  return apiRequest<ExcecaoDisponibilidade[]>(`/excecoes-disponibilidade?${params}`, {
    headers: autorizacao(token),
  })
}

export function cadastrarExcecao(
  dados: {
    profissionalId: number
    data: string
    tipo: TipoExcecao
    horarioInicio: string | null
    horarioFim: string | null
  },
  token: string,
) {
  return apiRequest<ExcecaoDisponibilidade>('/excecoes-disponibilidade', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify(dados),
  })
}

export function removerExcecao(id: number, token: string) {
  return apiRequest<void>(`/excecoes-disponibilidade/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}
