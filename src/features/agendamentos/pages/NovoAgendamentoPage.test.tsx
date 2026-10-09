import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Disponibilidade, SituacaoDisponibilidade, SugestaoAgendamento } from '../types'
import { NovoAgendamentoPage } from './NovoAgendamentoPage'

const api = vi.hoisted(() => ({
  listarBarbearias: vi.fn(),
  listarProfissionaisDaBarbearia: vi.fn(),
  listarServicosDoProfissional: vi.fn(),
  consultarProximasDisponibilidades: vi.fn(),
  consultarDisponibilidade: vi.fn(),
  criarAgendamento: vi.fn(),
  sugerirAgendamento: vi.fn(),
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
const barba = {
  id: 6,
  nome: 'Barba',
  descricao: null,
  duracaoMinutos: 20,
  preco: 25,
  ativo: true,
}
const barbearia = { id: 2, nome: 'Barbershopping Ipanema', ativo: true }
const profissional = {
  id: 4,
  usuarioId: 8,
  nome: 'Marcelo',
  email: 'profissional@teste.com',
  barbeariaId: 2,
  barbeariaNome: 'Barbershopping Ipanema',
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

const sugestao: SugestaoAgendamento = {
  barbeariaId: 2,
  barbeariaNome: 'Barbershopping Ipanema',
  profissionalId: 4,
  profissionalNome: 'Marcelo',
  servicoId: 3,
  servicoNome: 'Corte',
  servicoAdicionalId: 6,
  servicoAdicionalNome: 'Barba',
  dataPedida: '2030-01-07',
  data: '2030-01-07',
  periodo: 'MANHA',
  horarios: [{ inicio: '09:00:00', fim: '09:50:00' }],
  observacao: '',
  sugestoesRestantesHoje: 9,
}

function renderizarPagina() {
  render(<MemoryRouter><NovoAgendamentoPage /></MemoryRouter>)
}

async function selecionarFluxoBasico() {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: /Barbershopping Ipanema/ }))
  await usuario.click(await screen.findByRole('button', { name: /Marcelo/ }))
  await usuario.click(await screen.findByRole('button', { name: /Corte/ }))
  return usuario
}

describe('NovoAgendamentoPage', () => {
  beforeEach(() => {
    api.listarBarbearias.mockResolvedValue([barbearia])
    api.listarProfissionaisDaBarbearia.mockResolvedValue([profissional])
    api.listarServicosDoProfissional.mockResolvedValue([servico, barba])
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
    await selecionarFluxoBasico()

    expect(await screen.findByDisplayValue('2030-01-07')).toBeVisible()
    expect(screen.getByRole('button', { name: '09:00' })).toBeVisible()
    expect(screen.getByRole('button', { name: '11:30' })).toBeVisible()
    expect(screen.getByRole('button', { name: '13:00' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '12:00' })).not.toBeInTheDocument()
  })

  it.each<[SituacaoDisponibilidade, string]>([
    ['SEM_EXPEDIENTE', 'O profissional não atende neste dia.'],
    ['DIA_BLOQUEADO', 'A agenda está bloqueada nesta data.'],
    ['SEM_ENCAIXE', 'Não há intervalo contínuo suficiente para os serviços selecionados.'],
    ['HORARIOS_ENCERRADOS', 'Todos os horários deste dia já passaram.'],
    ['HORARIOS_OCUPADOS', 'Todos os horários deste dia já foram reservados.'],
    ['HORARIO_LOCAL_INVALIDO', 'Este horário não existe no fuso local.'],
  ])('explica a indisponibilidade %s', async (situacao, mensagem) => {
    api.consultarDisponibilidade.mockResolvedValue({
      ...disponibilidade,
      data: '2030-01-08',
      situacao,
      horarios: [],
    })
    renderizarPagina()
    await selecionarFluxoBasico()

    fireEvent.change(screen.getByLabelText('Outra data'), { target: { value: '2030-01-08' } })

    expect(await screen.findByText(mensagem)).toBeVisible()
  })

  it('informa quando não encontra horários nos próximos trinta dias', async () => {
    api.consultarProximasDisponibilidades.mockResolvedValue([])
    renderizarPagina()
    await selecionarFluxoBasico()

    expect(await screen.findByText(/Nenhum horário livre nos próximos 30 dias/)).toBeVisible()
  })

  it('envia somente os dados selecionados e confirma o agendamento', async () => {
    renderizarPagina()
    const usuario = await selecionarFluxoBasico()
    await usuario.click(await screen.findByRole('button', { name: '09:00' }))
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }))

    expect(api.criarAgendamento).toHaveBeenCalledWith({
      clienteId: 7,
      profissionalId: 4,
      servicoId: 3,
      servicoAdicionalId: null,
      data: '2030-01-07',
      horarioInicio: '09:00:00',
    }, 'token-teste')
    expect(await screen.findByRole('heading', { name: 'Seu horário está agendado.' })).toBeVisible()
  })

  it('recalcula a agenda e envia a barba como serviço adicional', async () => {
    renderizarPagina()
    const usuario = await selecionarFluxoBasico()
    await usuario.click(screen.getByRole('checkbox', { name: /Adicionar barba/ }))
    await usuario.click(await screen.findByRole('button', { name: '09:00' }))
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }))

    expect(api.consultarProximasDisponibilidades).toHaveBeenLastCalledWith(4, 3, expect.any(String), 'token-teste', 6)
    expect(api.criarAgendamento).toHaveBeenCalledWith(expect.objectContaining({ servicoId: 3, servicoAdicionalId: 6 }), 'token-teste')
  })

  it('leva a sugestão da IA para o formulário manual ao ajustar', async () => {
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    renderizarPagina()
    const usuario = userEvent.setup()
    await screen.findByRole('button', { name: /Barbershopping Ipanema/ })

    await usuario.type(screen.getByLabelText('Prefere descrever o que quer?'), 'corte e barba de manhã com o Marcelo')
    await usuario.click(screen.getByRole('button', { name: 'Sugerir horário' }))
    await usuario.click(await screen.findByRole('button', { name: 'Ajustar' }))

    expect(await screen.findByRole('checkbox', { name: /Adicionar barba/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /Ver equipe/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Marcelo/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Corte/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByDisplayValue('2030-01-07')).toBeVisible()
    expect(api.consultarDisponibilidade).toHaveBeenCalledWith(4, 3, '2030-01-07', 'token-teste', 6)
    expect(screen.getByRole('button', { name: '09:00' })).toBeVisible()
  })

  it('deixa o serviço em aberto ao ajustar uma sugestão só de barba', async () => {
    api.sugerirAgendamento.mockResolvedValue({
      ...sugestao, servicoId: 6, servicoNome: 'Barba', servicoAdicionalId: null, servicoAdicionalNome: null,
    })
    renderizarPagina()
    const usuario = userEvent.setup()
    await screen.findByRole('button', { name: /Ver equipe/ })

    await usuario.type(screen.getByLabelText('Prefere descrever o que quer?'), 'só a barba amanhã')
    await usuario.click(screen.getByRole('button', { name: 'Sugerir horário' }))
    await usuario.click(await screen.findByRole('button', { name: 'Ajustar' }))

    expect(await screen.findByText(/a barba entra como adicional de um corte/)).toBeVisible()
    expect(screen.getByRole('button', { name: /Marcelo/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Corte/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('checkbox', { name: /Adicionar barba/ })).not.toBeInTheDocument()
    expect(api.consultarDisponibilidade).not.toHaveBeenCalled()
  })

  it('ignora a equipe de outra barbearia que chega depois do Ajustar', async () => {
    const outraBarbearia = { id: 5, nome: 'Barbershop Morumbi', ativo: true }
    const deMorumbi = { ...profissional, id: 20, usuarioId: 30, nome: 'Henrique', barbeariaId: 5, barbeariaNome: 'Barbershop Morumbi' }
    let entregarMorumbi: (equipe: typeof profissional[]) => void = () => {}
    api.listarBarbearias.mockResolvedValue([barbearia, outraBarbearia])
    api.listarProfissionaisDaBarbearia.mockImplementation((id: number) => id === 5
      ? new Promise((resolver) => { entregarMorumbi = resolver })
      : Promise.resolve([profissional]))
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    renderizarPagina()
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: /Barbershop Morumbi/ }))
    await usuario.type(screen.getByLabelText('Prefere descrever o que quer?'), 'corte e barba com o Marcelo')
    await usuario.click(screen.getByRole('button', { name: 'Sugerir horário' }))
    await usuario.click(await screen.findByRole('button', { name: 'Ajustar' }))
    expect(await screen.findByRole('button', { name: /Marcelo/ })).toHaveAttribute('aria-pressed', 'true')

    await act(async () => { entregarMorumbi([deMorumbi]) })

    expect(screen.queryByRole('button', { name: /Henrique/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Marcelo/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('mostra o horário no fuso do profissional da sugestão, não no escolhido antes à mão', async () => {
    const deManaus = { ...profissional, id: 9, usuarioId: 19, nome: 'Paulo', fusoHorario: 'America/Manaus' }
    api.listarProfissionaisDaBarbearia.mockResolvedValue([profissional, deManaus])
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    api.criarAgendamento.mockResolvedValue({
      id: 12, clienteId: 7, clienteNome: 'Cliente', profissionalId: 4, profissionalNome: 'Marcelo',
      servicoId: 3, servicoNome: 'Corte', inicio: '2030-01-07T12:00:00Z', fim: '2030-01-07T12:30:00Z', status: 'AGENDADO',
    })
    renderizarPagina()
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: /Ver equipe/ }))
    await usuario.click(await screen.findByRole('button', { name: /Paulo/ }))

    await usuario.type(screen.getByLabelText('Prefere descrever o que quer?'), 'corte de manhã com o Marcelo')
    await usuario.click(screen.getByRole('button', { name: 'Sugerir horário' }))
    await usuario.click(await screen.findByRole('button', { name: '09:00' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar às 09:00' }))

    expect(await screen.findByRole('heading', { name: 'Seu horário está agendado.' })).toBeVisible()
    // 12:00 UTC é 09:00 em São Paulo, fuso do Marcelo, e 08:00 em Manaus, fuso do Paulo.
    expect(screen.getByText(/09:00/)).toBeVisible()
  })

  it('confirma direto pela sugestão da IA', async () => {
    api.sugerirAgendamento.mockResolvedValue(sugestao)
    api.criarAgendamento.mockResolvedValue({
      id: 11, clienteId: 7, clienteNome: 'Cliente', profissionalId: 4, profissionalNome: 'Marcelo',
      servicoId: 3, servicoNome: 'Corte', servicoAdicionalId: 6, servicoAdicionalNome: 'Barba',
      inicio: '2030-01-07T12:00:00Z', fim: '2030-01-07T12:50:00Z', status: 'AGENDADO',
    })
    renderizarPagina()
    const usuario = userEvent.setup()
    await screen.findByRole('button', { name: /Barbershopping Ipanema/ })

    await usuario.type(screen.getByLabelText('Prefere descrever o que quer?'), 'corte e barba de manhã')
    await usuario.click(screen.getByRole('button', { name: 'Sugerir horário' }))
    await usuario.click(await screen.findByRole('button', { name: '09:00' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar às 09:00' }))

    expect(await screen.findByRole('heading', { name: 'Seu horário está agendado.' })).toBeVisible()
    expect(screen.getByText('Corte + Barba com Marcelo na Barbershopping Ipanema')).toBeVisible()
  })
})
