import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeusConvitesPage } from './MeusConvitesPage'

const { aceitarConviteEquipe, atualizarCredencial, listarMeusConvites } = vi.hoisted(() => ({
	aceitarConviteEquipe: vi.fn(),
	atualizarCredencial: vi.fn(),
	listarMeusConvites: vi.fn(),
}))

vi.mock('../auth/context/useAuth', () => ({
	useAuth: () => ({ token: 'token-atual', atualizarCredencial }),
}))

vi.mock('./conviteEquipeApi', () => ({
	aceitarConviteEquipe,
	listarMeusConvites,
	recusarConviteEquipe: vi.fn(),
}))

const convite = {
	id: 8,
	barbeariaId: 3,
	barbeariaNome: 'Barbearia Horizonte',
	email: 'profissional@teste.com',
	status: 'PENDENTE' as const,
	criadoPorNome: 'Responsável',
	criadoEm: '2026-09-17T12:00:00Z',
	expiraEm: '2026-09-24T12:00:00Z',
	respondidoEm: null,
}

function renderizar() {
	render(
		<MemoryRouter initialEntries={['/convites']}>
			<Routes>
				<Route path="/convites" element={<MeusConvitesPage />} />
				<Route path="/painel" element={<h1>Painel atualizado</h1>} />
			</Routes>
		</MemoryRouter>,
	)
}

describe('MeusConvitesPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listarMeusConvites.mockResolvedValue([convite])
	})

	it('aceita o convite, atualiza a credencial e abre o painel', async () => {
		const novaCredencial = {
			id: 5, nome: 'Profissional', email: convite.email,
			perfis: ['CLIENTE', 'PROFISSIONAL'], token: 'token-novo',
			tipo: 'Bearer', expiraEm: '2026-09-18T12:00:00Z',
		}
		aceitarConviteEquipe.mockResolvedValue(novaCredencial)
		atualizarCredencial.mockResolvedValue(undefined)
		renderizar()

		expect(await screen.findByRole('heading', { name: convite.barbeariaNome })).toBeVisible()
		await userEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

		expect(aceitarConviteEquipe).toHaveBeenCalledWith(convite.id, 'token-atual')
		expect(atualizarCredencial).toHaveBeenCalledWith(novaCredencial)
		expect(await screen.findByRole('heading', { name: 'Painel atualizado' })).toBeVisible()
	})

	it('informa quando não há convites', async () => {
		listarMeusConvites.mockResolvedValue([])
		renderizar()
		expect(await screen.findByRole('heading', { name: 'Nenhum convite' })).toBeVisible()
	})
})
