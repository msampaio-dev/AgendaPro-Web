import type { Agendamento } from './types'

type ServicosDoAgendamento = Pick<Agendamento, 'servicoNome' | 'servicoAdicionalNome'>

export function nomeCompletoServicos(agendamento: ServicosDoAgendamento) {
  const adicional = agendamento.servicoAdicionalNome?.trim()
  return adicional
    ? `${agendamento.servicoNome} + ${adicional}`
    : agendamento.servicoNome
}
