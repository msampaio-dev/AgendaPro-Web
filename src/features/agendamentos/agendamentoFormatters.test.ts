import { describe, expect, it } from 'vitest'
import { formatarDiaCurto, formatarDiaPorExtenso, nomeCompletoServicos } from './agendamentoFormatters'

describe('nomeCompletoServicos', () => {
  it('combina o serviço principal e o adicional', () => {
    expect(nomeCompletoServicos({
      servicoNome: 'Corte de cabelo Degradê',
      servicoAdicionalNome: 'Barba',
    })).toBe('Corte de cabelo Degradê + Barba')
  })

  it('mantém apenas o serviço principal quando não há adicional', () => {
    expect(nomeCompletoServicos({
      servicoNome: 'Corte de cabelo Social',
      servicoAdicionalNome: null,
    })).toBe('Corte de cabelo Social')
  })
})

describe('formatação de dias', () => {
  it('mostra o mesmo dia nos formatos curto e por extenso', () => {
    expect(formatarDiaCurto('2030-01-07')).toMatch(/07 de jan/)
    expect(formatarDiaPorExtenso('2030-01-07')).toMatch(/^segunda-feira, 07 de janeiro/)
  })
})
