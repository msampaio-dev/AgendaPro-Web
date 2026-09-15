import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Disponibilidade, SituacaoDisponibilidade } from '../types'
import { NovoAgendamentoPage } from './NovoAgendamentoPage'

const api = vi.hoisted(() => ({
  listarServicos: vi.fn(),
  listarProfissionaisDoServico: vi.fn(),
  consultarProximasDisponibilidades: vi.fn(),
  consultarDisponibilidade: vi.fn(),
  criarAgendamento: vi.fn(),
}))

vi.mock('../agendamentoApi', () => api)
vi.mock('../../auth/context/useAuth', () => ({
  useAuth: () => ({
    token: 'token-teste',
    sessao: { id: 7, nome: 'Cliente', email: 'cliente@teste.com', perfis: ['CLIENTE'] },
  }),
}))

const servico = {
  id: 3,
  nome: 'Corte',
  descricao: null,
  duracaoMinutos: 30,
  preco: 50,
  ativo: true,
}
const profissional = {
  id: 4,
  usuarioId: 8,
  nome: 'Marcelo',
  email: 'profissional@teste.com',
  ativo: true,
  fusoHorario: 'America/Sao_Paulo',
}
const disponibilidade: Disponibilidade = {
  profissionalId: 4,
  servicoId: 3,
  data: '2030-01-07',
  situacao: 'DISPONIVEL',
  horarios: [
    { inicio: '09:00:00', fim: '09:30:00' },
    { inicio: '11:30:00', fim: '12:00:00' },
    { inicio: '13:00:00', fim: '13:30:00' },
  ],
}

function renderizarPagina() {
  render(<MemoryRouter><NovoAgendamentoPage /></MemoryRouter>)
}

async function selecionarServicoEProfissional() {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: /Corte/ }))
  await usuario.click(await screen.findByRole('button', { name: /Marcelo/ }))
  return usuario
}

describe('NovoAgendamentoPage', () => {
  beforeEach(() => {
    api.listarServicos.mockResolvedValue([servico])
    api.listarProfissionaisDoServico.mockResolvedValue([profissional])
    api.consultarProximasDisponibilidades.mockResolvedValue([disponibilidade])
    api.consultarDisponibilidade.mockResolvedValue(disponibilidade)
    api.criarAgendamento.mockResolvedValue({
      id: 10,
      clienteId: 7,
      clienteNome: 'Cliente',
      profissionalId: 4,
      profissionalNome: 'Marcelo',
      servicoId: 3,
      servicoNome: 'Corte',
      inicio: '2030-01-07T12:00:00Z',
      fim: '2030-01-07T12:30:00Z',
      status: 'AGENDADO',
    })
  })

  it('seleciona a próxima data e não oferece horário durante o almoço', async () => {
    renderizarPagina()
    await selecionarServicoEProfissional()

    expect(await screen.findByDisplayValue('2030-01-07')).toBeVisible()
    expect(screen.getByRole('button', { name: '09:00' })).toBeVisible()
    expect(screen.getByRole('button', { name: '11:30' })).toBeVisible()
    expect(screen.getByRole('button', { name: '13:00' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '12:00' })).not.toBeInTheDocument()
  })

  it.each<[SituacaoDisponibilidade, string]>([
    ['SEM_EXPEDIENTE', 'O profissional não atende neste dia.'],
    ['DIA_BLOQUEADO', 'A agenda está bloqueada nesta data.'],
    ['SEM_ENCAIXE', 'Os intervalos livres são menores que a duração deste serviço.'],
    ['HORARIOS_ENCERRADOS', 'Todos os horários deste dia já passaram.'],
    ['HORARIOS_OCUPADOS', 'Todos os horários deste dia já foram reservados.'],
    ['HORARIO_LOCAL_INVALIDO', 'Este horário não existe no fuso local devido à mudança do relógio.'],
  ])('explica a indisponibilidade %s', async (situacao, mensagem) => {
    api.consultarDisponibilidade.mockResolvedValue({
      ...disponibilidade,
      data: '2030-01-08',
      situacao,
      horarios: [],
    })
    renderizarPagina()
    await selecionarServicoEProfissional()

    fireEvent.change(screen.getByLabelText('Outra data'), { target: { value: '2030-01-08' } })

    expect(await screen.findByText(mensagem)).toBeVisible()
  })

  it('informa quando não encontra horários nos próximos trinta dias', async () => {
    api.consultarProximasDisponibilidades.mockResolvedValue([])
    renderizarPagina()
    await selecionarServicoEProfissional()

    expect(await screen.findByText(/Nenhum horário livre nos próximos 30 dias/)).toBeVisible()
  })

  it('envia somente os dados selecionados e confirma o agendamento', async () => {
    renderizarPagina()
    const usuario = await selecionarServicoEProfissional()
    await usuario.click(await screen.findByRole('button', { name: '09:00' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(api.criarAgendamento).toHaveBeenCalledWith({
      clienteId: 7,
      profissionalId: 4,
      servicoId: 3,
      data: '2030-01-07',
      horarioInicio: '09:00:00',
    }, 'token-teste')
    expect(await screen.findByRole('heading', { name: 'Seu horário está agendado.' })).toBeVisible()
  })
})
