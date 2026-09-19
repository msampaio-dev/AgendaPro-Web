import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MinhaBarbeariaPage } from './MinhaBarbeariaPage'

const { criarServicoBarbearia, listarMinhasBarbearias, listarServicosDisponiveis, sessao } = vi.hoisted(() => ({
	criarServicoBarbearia: vi.fn(),
	listarMinhasBarbearias: vi.fn(),
	listarServicosDisponiveis: vi.fn(),
	sessao: { profissionalId: 0 },
}))

vi.mock('../../auth/context/useAuth', () => ({
	useAuth: () => ({ token: 'token-atual', sessao }),
}))

vi.mock('../../convites/GestaoConvitesEquipe', () => ({
	GestaoConvitesEquipe: () => <h2>Convites da equipe</h2>,
}))

vi.mock('./minhaBarbeariaApi', () => ({
	adicionarHorarioBarbearia: vi.fn(),
	associarServicoProfissional: vi.fn(),
	atualizarMinhaBarbearia: vi.fn(),
	criarMinhaBarbearia: vi.fn(),
	criarServicoBarbearia,
	desativarServicoBarbearia: vi.fn(),
	enviarFotoBarbearia: vi.fn(),
	listarEquipeBarbearia: vi.fn(() => Promise.resolve([])),
	listarHorariosBarbearia: vi.fn(() => Promise.resolve([])),
	listarMinhasBarbearias,
	listarServicosDisponiveis,
	listarServicosProfissional: vi.fn(() => Promise.resolve([])),
	removerHorarioBarbearia: vi.fn(),
	removerServicoProfissional: vi.fn(),
	transferirPropriedadeBarbearia: vi.fn(),
}))

const PROPRIETARIO_ID = 3
const MEMBRO_ID = 9

const barbearia = {
	id: 4, nome: 'Barbearia Horizonte', ativo: true, fotoUrl: null,
	proprietarioProfissionalId: PROPRIETARIO_ID, proprietarioNome: 'Dona da unidade',
	cep: '22041001', logradouro: 'Rua Teste', numero: '10', complemento: null,
	bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ', fusoHorario: 'America/Sao_Paulo',
}

function renderizar(profissionalId: number) {
	sessao.profissionalId = profissionalId
	render(<MemoryRouter><MinhaBarbeariaPage /></MemoryRouter>)
}

describe('MinhaBarbeariaPage', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		vi.clearAllMocks()
		listarMinhasBarbearias.mockResolvedValue([barbearia])
		listarServicosDisponiveis.mockResolvedValue([])
	})

	it('deixa o profissional da equipe criar serviço com duração e preço', async () => {
		criarServicoBarbearia.mockResolvedValue({ id: 1 })
		renderizar(MEMBRO_ID)

		expect(await screen.findByRole('heading', { name: 'Serviços da unidade' })).toBeVisible()
		await userEvent.type(screen.getByLabelText('Nome do serviço'), 'Corte degradê')
		await userEvent.clear(screen.getByLabelText('Duração em minutos'))
		await userEvent.type(screen.getByLabelText('Duração em minutos'), '45')
		await userEvent.type(screen.getByLabelText('Preço'), '70.50')
		await userEvent.click(screen.getByRole('button', { name: 'Criar serviço' }))

		expect(criarServicoBarbearia).toHaveBeenCalledWith(
			barbearia.id,
			{ nome: 'Corte degradê', descricao: null, duracaoMinutos: 45, preco: 70.5 },
			'token-atual',
		)
	})

	it('esconde do profissional da equipe o que só o proprietário administra', async () => {
		renderizar(MEMBRO_ID)

		expect(await screen.findByRole('heading', { name: 'Serviços da unidade' })).toBeVisible()
		expect(screen.getByText('Onde você trabalha')).toBeVisible()
		expect(screen.queryByRole('heading', { name: 'Horários da unidade' })).toBeNull()
		expect(screen.queryByRole('heading', { name: 'Convites da equipe' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Salvar dados' })).toBeNull()
	})

	it('avisa o profissional da equipe antes de tirá-lo da unidade onde trabalha', async () => {
		const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
		renderizar(MEMBRO_ID)

		expect(await screen.findByRole('heading', { name: 'Serviços da unidade' })).toBeVisible()
		await userEvent.click(screen.getByRole('button', { name: '+ Nova barbearia' }))

		expect(confirmar).toHaveBeenCalledWith(expect.stringContaining(barbearia.nome))
		expect(screen.getByRole('heading', { name: 'Serviços da unidade' })).toBeVisible()
		expect(screen.queryByRole('button', { name: 'Criar minha barbearia' })).toBeNull()

		confirmar.mockReturnValue(true)
		await userEvent.click(screen.getByRole('button', { name: '+ Nova barbearia' }))

		expect(screen.getByRole('button', { name: 'Criar minha barbearia' })).toBeVisible()
	})

	it('não avisa o proprietário, que não sai de equipe nenhuma ao criar outra unidade', async () => {
		const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
		renderizar(PROPRIETARIO_ID)

		expect(await screen.findByRole('heading', { name: 'Horários da unidade' })).toBeVisible()
		await userEvent.click(screen.getByRole('button', { name: '+ Nova barbearia' }))

		expect(confirmar).not.toHaveBeenCalled()
		expect(screen.getByRole('button', { name: 'Criar minha barbearia' })).toBeVisible()
	})

	it('mantém a administração completa para o proprietário', async () => {
		renderizar(PROPRIETARIO_ID)

		expect(await screen.findByRole('heading', { name: 'Horários da unidade' })).toBeVisible()
		expect(screen.getByRole('heading', { name: 'Serviços da unidade' })).toBeVisible()
		expect(screen.getByRole('heading', { name: 'Convites da equipe' })).toBeVisible()
		expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeVisible()
	})
})
