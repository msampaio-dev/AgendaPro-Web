import type { Agendamento } from './types'

type ServicosDoAgendamento = Pick<Agendamento, 'servicoNome' | 'servicoAdicionalNome'>

export function nomeCompletoServicos(agendamento: ServicosDoAgendamento) {
  const adicional = agendamento.servicoAdicionalNome?.trim()
  return adicional
    ? `${agendamento.servicoNome} + ${adicional}`
    : agendamento.servicoNome
}

// Datas da API chegam como AAAA-MM-DD, sem fuso. Ler ao meio-dia local evita
// que o fuso do navegador empurre a data para o dia anterior.
function diaLocal(data: string) {
  return new Date(`${data}T12:00:00`)
}

// Para espaços curtos, como os cartões de próximas datas: "seg., 07 de jan.".
export function formatarDiaCurto(data: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(diaLocal(data))
}

// Para frases e resumos: "segunda-feira, 07 de janeiro".
export function formatarDiaPorExtenso(data: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(diaLocal(data))
}
