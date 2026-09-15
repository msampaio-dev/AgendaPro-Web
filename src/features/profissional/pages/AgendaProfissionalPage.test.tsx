import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Agendamento, Pagina } from '../../agendamentos/types'
import { AgendaProfissionalPage } from './AgendaProfissionalPage'

const api = vi.hoisted(() => ({
  listarAgendaDoProfissional: vi.fn(),
  confirmarAgendamento: vi.fn(),
  concluirAgendamento: vi.fn(),
}))

vi.mock('../../agendamentos/agendamentoApi', () => api)
vi.mock('../../auth/context/useAuth', () => ({
  useAuth: () => ({
    token: 'token-profissional',
    sessao: {
      id: 8,
      nome: 'Marcelo',
      email: 'profissional@teste.com',
      perfis: ['CLIENTE', 'PROFISSIONAL'],
      profissionalId: 4,
      fusoHorario: 'America/Sao_Paulo',
    },
  }),
}))

const agendamento: Agendamento = {
  id: 21,
  clienteId: 7,
  clienteNome: 'Cliente Teste',
  profissionalId: 4,
  profissionalNome: 'Marcelo',
  servicoId: 3,
  servicoNome: 'Corte',
  inicio: '2030-01-07T12:00:00Z',
  fim: '2030-01-07T12:30:00Z',
  status: 'AGENDADO',
}

function pagina(conteudo = [agendamento]): Pagina<Agendamento> {
  return {
    conteudo,
    pagina: 0,
    tamanho: 8,
    totalElementos: conteudo.length,
    totalPaginas: 1,
    primeira: true,
    ultima: true,
  }
}

function renderizar() {
  render(<MemoryRouter><AgendaProfissionalPage /></MemoryRouter>)
}

describe('AgendaProfissionalPage', () => {
  beforeEach(() => {
    api.listarAgendaDoProfissional.mockResolvedValue(pagina())
    api.confirmarAgendamento.mockResolvedValue({ ...agendamento, status: 'CONFIRMADO' })
  })

  it('agrupa atendimentos por dia e abre os detalhes da reserva', async () => {
    const usuario = userEvent.setup()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Cliente Teste' })).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Detalhes' }))

    const dialogo = screen.getByRole('dialog', { name: 'Detalhes da reserva' })
    expect(dialogo).toHaveTextContent('Cliente Teste')
    expect(dialogo).toHaveTextContent('Corte')
    expect(dialogo).toHaveTextContent('Agendado')

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calcula segunda a domingo ao selecionar a visão semanal', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByRole('heading', { name: 'Cliente Teste' })

    await usuario.click(screen.getByRole('button', { name: 'Semana' }))

    await waitFor(() => expect(api.listarAgendaDoProfissional).toHaveBeenCalledTimes(2))
    const filtros = api.listarAgendaDoProfissional.mock.calls[1][1]
    const inicio = new Date(`${filtros.dataInicio}T12:00:00Z`)
    const fim = new Date(`${filtros.dataFim}T12:00:00Z`)
    expect(inicio.getUTCDay()).toBe(1)
    expect((fim.getTime() - inicio.getTime()) / 86_400_000).toBe(6)
  })

  it('confirma o atendimento, informa o sucesso e recarrega a agenda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByRole('heading', { name: 'Cliente Teste' })

    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(api.confirmarAgendamento).toHaveBeenCalledWith(21, 'token-profissional')
    expect(await screen.findByRole('status')).toHaveTextContent('Atendimento de Cliente Teste confirmado.')
    await waitFor(() => expect(api.listarAgendaDoProfissional).toHaveBeenCalledTimes(2))
  })

  it('ignora uma resposta antiga depois que o profissional troca de período', async () => {
    let resolverPrimeira!: (valor: Pagina<Agendamento>) => void
    const atendimentoDaSemana = { ...agendamento, id: 22, clienteNome: 'Cliente da Semana' }
    api.listarAgendaDoProfissional
      .mockImplementationOnce(() => new Promise((resolve) => { resolverPrimeira = resolve }))
      .mockResolvedValueOnce(pagina([atendimentoDaSemana]))
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Semana' }))
    expect(await screen.findByRole('heading', { name: 'Cliente da Semana' })).toBeVisible()

    await act(async () => resolverPrimeira(pagina()))

    expect(screen.getByRole('heading', { name: 'Cliente da Semana' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Cliente Teste' })).not.toBeInTheDocument()
  })
})
