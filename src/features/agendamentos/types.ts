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
  barbeariaId: number | null
  barbeariaNome: string | null
  ativo: boolean
  fusoHorario: string
  fotoUrl?: string | null
}

export type Barbearia = {
  id: number
  nome: string
  ativo: boolean
  fotoUrl?: string | null
  proprietarioProfissionalId?: number | null
  proprietarioNome?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  fusoHorario?: string | null
}

export type DiaSemana = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export type HorarioFuncionamento = {
  id: number
  barbeariaId: number
  diaSemana: DiaSemana
  horarioInicio: string
  horarioFim: string
}

export type HorarioFuncionamentoInput = Omit<HorarioFuncionamento, 'id' | 'barbeariaId'>

export type DadosBarbearia = {
  nome: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
  }
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
  servicoAdicionalId?: number | null
  servicoAdicionalNome?: string | null
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
