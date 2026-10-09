import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../services/api'
import type { SugestaoAgendamento } from '../types'
import { AssistenteAgendamento } from './AssistenteAgendamento'

const api = vi.hoisted(() => ({
  sugerirAgendamento: vi.fn(),
  criarAgendamento: vi.fn(),
}))

vi.mock('../agendamentoApi', () => api)

const sugestao: SugestaoAgendamento = {
  barbeariaId: 2,
  barbeariaNome: 'Barbershopping Ipanema',
  profissionalId: 4,
  profissionalNome: 'João Gabriel',
  servicoId: 3,
  servicoNome: 'Corte de cabelo Social',
  servicoAdicionalId: 6,
  servicoAdicionalNome: 'Barba',
  dataPedida: '2030-01-11',
  data: '2030-01-11',
  periodo: 'TARDE',
  horarios: [
    { inicio: '13:00:00', fim: '14:00:00' },
    { inicio: '15:00:00', fim: '16:00:00' },
  ],
  observacao: 'Escolhi o corte social.',
  sugestoesRestantesHoje: 9,
}

function renderizar() {
  const onAjustar = vi.fn()
  const onAgendado = vi.fn()
  render(<AssistenteAgendamento clienteId={7} onAgendado={onAgendado} onAjustar={onAjustar} token="token-teste" />)
  return { onAjustar, onAgendado, usuario: userEvent.setup() }
}

async function pedirSugestao(usuario: ReturnType<typeof userEvent.setup>, texto = 'corte e barba sexta à tarde com o João') {
  await usuario.type(screen.getByLabelText('Prefere descrever o que quer?'), texto)
  await usuario.click(screen.getByRole('button', { name: 'Sugerir horário' }))
}

describe('AssistenteAgendamento', () => {
  beforeEach(() => {
    api.sugerirAgendamento.mockReset()
    api.criarAgendamento.mockReset()
  })

  it('mostra a sugestão com os horários livres', async () => {
    const { usuario } = renderizar()
    api.sugerirAgendamento.mockResolvedValue(sugestao)

    await pedirSugestao(usuario)

    expect(api.sugerirAgendamento).toHaveBeenCalledWith('corte e barba sexta à tarde com o João', 'token-teste')
    expect(await screen.findByText('João Gabriel')).toBeVisible()
    expect(screen.getByText('Corte de cabelo Social + Barba')).toBeVisible()
    expect(screen.getByText('Escolhi o corte social.')).toBeVisible()
    expect(screen.getByRole('button', { name: '13:00' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Escolha um horário' })).toBeDisabled()
  })

  it('confirma pelo mesmo endpoint do fluxo manual', async () => {
    const { usuario, onAgendado } = renderizar()
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    const agendamento = { id: 10, profissionalNome: 'João Gabriel' }
    api.criarAgendamento.mockResolvedValue(agendamento)

    await pedirSugestao(usuario)
    await usuario.click(await screen.findByRole('button', { name: '15:00' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar às 15:00' }))

    expect(api.criarAgendamento).toHaveBeenCalledWith({
      clienteId: 7,
      profissionalId: 4,
      servicoId: 3,
      servicoAdicionalId: 6,
      data: '2030-01-11',
      horarioInicio: '15:00:00',
    }, 'token-teste')
    expect(onAgendado).toHaveBeenCalledWith(agendamento, sugestao)
  })

  it('entrega a sugestão para o formulário manual ao ajustar', async () => {
    const { usuario, onAjustar } = renderizar()
    api.sugerirAgendamento.mockResolvedValue(sugestao)

    await pedirSugestao(usuario)
    await usuario.click(await screen.findByRole('button', { name: 'Ajustar' }))

    expect(onAjustar).toHaveBeenCalledWith(sugestao)
    expect(screen.queryByText('João Gabriel')).not.toBeInTheDocument()
    expect(api.criarAgendamento).not.toHaveBeenCalled()
  })

  it('avisa quando a data sugerida é diferente da pedida', async () => {
    const { usuario } = renderizar()
    api.sugerirAgendamento.mockResolvedValue({ ...sugestao, data: '2030-01-12' })

    await pedirSugestao(usuario)

    expect(await screen.findByText(/Esta é a data mais próxima com vaga/)).toBeVisible()
  })

  it('orienta a ajustar quando não há horário livre', async () => {
    const { usuario } = renderizar()
    api.sugerirAgendamento.mockResolvedValue({ ...sugestao, horarios: [] })

    await pedirSugestao(usuario)

    expect(await screen.findByText(/Não encontrei horário livre/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ajustar' })).toBeEnabled()
  })

  it('mostra o erro da API e aponta para a escolha manual', async () => {
    const { usuario } = renderizar()
    api.sugerirAgendamento.mockRejectedValue(new ApiError(422, 'Não identifiquei qual serviço você quer. Escolha manualmente.'))

    await pedirSugestao(usuario, 'oi')

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não identifiquei qual serviço você quer.')
    expect(alerta).toHaveTextContent('Você pode escolher tudo manualmente logo abaixo.')
  })

  it('usa mensagem genérica quando a falha não vem da API', async () => {
    const { usuario } = renderizar()
    api.sugerirAgendamento.mockRejectedValue(new Error('falha inesperada'))

    await pedirSugestao(usuario)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível montar uma sugestão agora.')
  })

  it('mantém a sugestão na tela quando a confirmação falha', async () => {
    const { usuario, onAgendado } = renderizar()
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    api.criarAgendamento.mockRejectedValue(new ApiError(409, 'O horário escolhido não está mais disponível.'))

    await pedirSugestao(usuario)
    await usuario.click(await screen.findByRole('button', { name: '13:00' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar às 13:00' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O horário escolhido não está mais disponível.')
    expect(screen.getByText('João Gabriel')).toBeVisible()
    expect(onAgendado).not.toHaveBeenCalled()
  })

  it('não deixa pedir outra sugestão enquanto confirma', async () => {
    const { usuario } = renderizar()
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    api.criarAgendamento.mockReturnValue(new Promise(() => {}))

    await pedirSugestao(usuario)
    await usuario.click(await screen.findByRole('button', { name: '13:00' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar às 13:00' }))

    expect(await screen.findByRole('button', { name: 'Confirmando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sugerir horário' })).toBeDisabled()
    expect(api.sugerirAgendamento).toHaveBeenCalledTimes(1)
  })

  it('não envia texto vazio', () => {
    renderizar()

    expect(screen.getByRole('button', { name: 'Sugerir horário' })).toBeDisabled()
  })
})
