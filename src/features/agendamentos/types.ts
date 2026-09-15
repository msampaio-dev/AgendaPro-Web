export type Servico = {
  id: number
  nome: string
  descricao: string | null
  duracaoMinutos: number
  preco: number
  ativo: boolean
}

export type Profissional = {
  id: number
  usuarioId: number
  nome: string
  email: string
  ativo: boolean
  fusoHorario: string
}

export type ProfissionalServico = {
  id: number
  profissionalId: number
  servicoId: number
  ativo: boolean
}

export type HorarioDisponivel = {
  inicio: string
  fim: string
}

export type Disponibilidade = {
  profissionalId: number
  servicoId: number
  data: string
  horarios: HorarioDisponivel[]
}

export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO'

export type Agendamento = {
  id: number
  clienteId: number
  profissionalId: number
  servicoId: number
  inicio: string
  fim: string
  status: StatusAgendamento
}
