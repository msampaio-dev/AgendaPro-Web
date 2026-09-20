import { describe, expect, it } from 'vitest'
import { nomeCompletoServicos } from './agendamentoFormatters'

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
