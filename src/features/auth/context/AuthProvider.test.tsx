import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../services/api'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

const { buscarSessao, lerSessao, removerSessao } = vi.hoisted(() => ({
	buscarSessao: vi.fn(),
	lerSessao: vi.fn(),
	removerSessao: vi.fn(),
}))

vi.mock('../authApi', () => ({ buscarSessao, login: vi.fn() }))
vi.mock('../authStorage', () => ({ lerSessao, removerSessao, salvarSessao: vi.fn() }))

const credencial = {
	id: 5, nome: 'Profissional', email: 'profissional@teste.com',
	perfis: ['CLIENTE', 'PROFISSIONAL'], token: 'token-salvo', tipo: 'Bearer',
	expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
}

const sessao = {
	id: 5, nome: 'Profissional', email: 'profissional@teste.com',
	perfis: ['CLIENTE', 'PROFISSIONAL'], profissionalId: 9, fusoHorario: 'America/Sao_Paulo',
}

function Sonda() {
	const { autenticado, carregando } = useAuth()
	return <span data-testid="estado">{carregando ? 'carregando' : autenticado ? 'autenticado' : 'anonimo'}</span>
}

function renderizar() {
	render(<AuthProvider><Sonda /></AuthProvider>)
}

function estado() {
	return screen.getByTestId('estado').textContent
}

describe('AuthProvider ao restaurar a sessão salva', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		lerSessao.mockReturnValue(credencial)
	})

	it('desloga quando o servidor recusa o token', async () => {
		buscarSessao.mockRejectedValue(new ApiError(401, 'Token inválido'))
		renderizar()

		await waitFor(() => expect(estado()).toBe('anonimo'))
		expect(removerSessao).toHaveBeenCalled()
	})

	it('mantém a credencial e tenta de novo quando a API não responde', async () => {
		// A API do plano gratuito hiberna: a primeira chamada falha por rede e a
		// seguinte, já com o servidor acordado, funciona.
		buscarSessao
			.mockRejectedValueOnce(new ApiError(0, 'Não foi possível conectar à API.'))
			.mockResolvedValueOnce(sessao)
		renderizar()

		await waitFor(() => expect(estado()).toBe('autenticado'), { timeout: 3000 })
		expect(removerSessao).not.toHaveBeenCalled()
	})

	it('não descarta a credencial enquanto espera o servidor voltar', async () => {
		buscarSessao.mockRejectedValue(new ApiError(0, 'Não foi possível conectar à API.'))
		renderizar()

		await waitFor(() => expect(buscarSessao).toHaveBeenCalled())
		expect(estado()).toBe('carregando')
		expect(removerSessao).not.toHaveBeenCalled()
	})
})
