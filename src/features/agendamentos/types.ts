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
  situacao: SituacaoDisponibilidade
  horarios: HorarioDisponivel[]
}

export type SituacaoDisponibilidade =
  | 'DISPONIVEL'
  | 'SEM_EXPEDIENTE'
  | 'DIA_BLOQUEADO'
  | 'SEM_ENCAIXE'
  | 'HORARIO_LOCAL_INVALIDO'
  | 'HORARIOS_ENCERRADOS'
  | 'HORARIOS_OCUPADOS'

export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO'

export type Agendamento = {
  id: number
  clienteId: number
  clienteNome: string
  profissionalId: number
  profissionalNome: string
  servicoId: number
  servicoNome: string
  inicio: string
  fim: string
  status: StatusAgendamento
}

export type Pagina<T> = {
  conteudo: T[]
  pagina: number
  tamanho: number
  totalElementos: number
  totalPaginas: number
  primeira: boolean
  ultima: boolean
}
