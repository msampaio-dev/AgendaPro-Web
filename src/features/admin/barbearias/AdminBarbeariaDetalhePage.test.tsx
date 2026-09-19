import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminBarbeariaDetalhePage } from './AdminBarbeariaDetalhePage'

const api = vi.hoisted(() => ({
	listarBarbeariasAdmin: vi.fn(),
	listarEquipeDaBarbearia: vi.fn(),
	listarServicosDaBarbearia: vi.fn(),
}))

vi.mock('./adminBarbeariaApi', () => api)
vi.mock('../../auth/context/useAuth', () => ({ useAuth: () => ({ token: 'token-admin' }) }))

function renderizar(id = '4') {
	render(
		<MemoryRouter initialEntries={[`/admin/barbearias/${id}`]}>
			<Routes>
				<Route path="/admin/barbearias/:id" element={<AdminBarbeariaDetalhePage />} />
			</Routes>
		</MemoryRouter>,
	)
}

describe('AdminBarbeariaDetalhePage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		api.listarBarbeariasAdmin.mockResolvedValue([
			{ id: 4, nome: 'Barbershopping Ipanema', ativo: true, proprietarioNome: 'João Gabriel', logradouro: 'Rua Visconde', numero: '10', cidade: 'Rio de Janeiro', estado: 'RJ' },
			{ id: 9, nome: 'Outra unidade', ativo: true },
		])
		api.listarEquipeDaBarbearia.mockResolvedValue([
			{ id: 1, usuarioId: 2, nome: 'Victor Ruiz', email: 'victor@demo.local', barbeariaId: 4, barbeariaNome: 'Barbershopping Ipanema', ativo: true, fusoHorario: 'America/Sao_Paulo' },
		])
		api.listarServicosDaBarbearia.mockResolvedValue([
			{ id: 11, nome: 'Barba', descricao: null, duracaoMinutos: 30, preco: 30, ativo: true },
			{ id: 12, nome: 'Degradê', descricao: null, duracaoMinutos: 45, preco: 55, ativo: true },
		])
	})

	it('mostra a equipe e o catálogo daquela unidade', async () => {
		renderizar()

		expect(await screen.findByRole('heading', { name: 'Barbershopping Ipanema' })).toBeVisible()
		expect(api.listarEquipeDaBarbearia).toHaveBeenCalledWith(4, 'token-admin')
		expect(api.listarServicosDaBarbearia).toHaveBeenCalledWith(4, 'token-admin')

		expect(screen.getByText('Victor Ruiz')).toBeVisible()
		expect(screen.getByText('Barba')).toBeVisible()
		expect(screen.getByText('R$ 55.00')).toBeVisible()
		// A unidade vizinha não pode vazar para o catálogo desta.
		expect(screen.queryByText('Outra unidade')).toBeNull()
	})

	it('apresenta o catálogo em leitura, sem criação nem edição', async () => {
		renderizar()
		await screen.findByRole('heading', { name: 'Barbershopping Ipanema' })

		expect(screen.queryByRole('button', { name: /criar|cadastrar|salvar|desativar/i })).toBeNull()
		expect(screen.queryByLabelText(/preço/i)).toBeNull()
	})

	it('avisa quando a unidade não existe', async () => {
		renderizar('999')
		expect(await screen.findByText('Unidade não encontrada.')).toBeVisible()
	})
})
