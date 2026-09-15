import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Agendamento, Pagina } from '../../agendamentos/types'
import { AdminDashboardPage } from './AdminDashboardPage'

const dashboardApi = vi.hoisted(() => ({
  carregarResumoAdmin: vi.fn(),
  listarAgendaAdmin: vi.fn(),
}))

const agendamentoApi = vi.hoisted(() => ({
  confirmarAgendamento: vi.fn(),
  cancelarAgendamento: vi.fn(),
  concluirAgendamento: vi.fn(),
}))

vi.mock('./adminDashboardApi', () => dashboardApi)
vi.mock('../../agendamentos/agendamentoApi', () => agendamentoApi)
vi.mock('../../auth/context/useAuth', () => ({
  useAuth: () => ({ token: 'token-admin' }),
}))

const agendamento: Agendamento = {
  id: 31,
  clienteId: 7,
  clienteNome: 'Cliente da Agenda',
  profissionalId: 4,
  profissionalNome: 'Ana Profissional',
  servicoId: 3,
  servicoNome: 'Corte executivo',
  inicio: '2030-01-07T12:00:00Z',
  fim: '2030-01-07T12:30:00Z',
  status: 'AGENDADO',
}

function pagina(status = agendamento.status): Pagina<Agendamento> {
  return {
    conteudo: [{ ...agendamento, status }],
    pagina: 0,
    tamanho: 10,
    totalElementos: 1,
    totalPaginas: 1,
    primeira: true,
    ultima: true,
  }
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    dashboardApi.carregarResumoAdmin.mockResolvedValue({
      usuarios: [
        { id: 1, nome: 'Admin', email: 'admin@teste.com', ativo: true, perfis: ['ADMIN'] },
        { id: 2, nome: 'Inativo', email: 'inativo@teste.com', ativo: false, perfis: ['CLIENTE'] },
      ],
      profissionais: [{ id: 4, usuarioId: 3, nome: 'Ana Profissional', email: 'ana@teste.com', ativo: true, fusoHorario: 'America/Sao_Paulo' }],
      servicos: [{ id: 3, nome: 'Corte executivo', descricao: null, duracaoMinutos: 30, preco: 60, ativo: true }],
    })
    dashboardApi.listarAgendaAdmin.mockResolvedValue(pagina())
    agendamentoApi.confirmarAgendamento.mockResolvedValue({ ...agendamento, status: 'CONFIRMADO' })
  })

  it('apresenta indicadores e a agenda global do negócio', async () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Cliente da Agenda' })).toBeVisible()
    expect(screen.getByText('Corte executivo com Ana Profissional')).toBeVisible()
    expect(screen.getByText('Usuários ativos').parentElement).toHaveTextContent('1')
    expect(screen.getByText('Profissionais ativos').parentElement).toHaveTextContent('1')
    expect(screen.getByText('Serviços ativos').parentElement).toHaveTextContent('1')
  })

  it('confirma um agendamento e atualiza a lista', async () => {
    const usuario = userEvent.setup()
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Cliente da Agenda' })

    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(agendamentoApi.confirmarAgendamento).toHaveBeenCalledWith(31, 'token-admin')
    expect(await screen.findByRole('status')).toHaveTextContent('atualizado com sucesso')
    await waitFor(() => expect(dashboardApi.listarAgendaAdmin).toHaveBeenCalledTimes(2))
  })

  it('bloqueia no navegador um intervalo de datas invertido', async () => {
    const usuario = userEvent.setup()
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Cliente da Agenda' })

    await usuario.clear(screen.getByLabelText('Data inicial'))
    await usuario.type(screen.getByLabelText('Data inicial'), '2030-01-10')
    await usuario.clear(screen.getByLabelText('Data final'))
    await usuario.type(screen.getByLabelText('Data final'), '2030-01-07')
    await usuario.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(screen.getByRole('alert')).toHaveTextContent('A data inicial não pode ser posterior')
    expect(dashboardApi.listarAgendaAdmin).toHaveBeenCalledTimes(1)
  })
})
