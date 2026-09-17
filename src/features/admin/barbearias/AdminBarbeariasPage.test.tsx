import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminBarbeariasPage } from './AdminBarbeariasPage'

const api = vi.hoisted(() => ({
	listarBarbeariasAdmin: vi.fn(),
	cadastrarBarbearia: vi.fn(),
	atualizarBarbearia: vi.fn(),
	desativarBarbearia: vi.fn(),
	atualizarFotoBarbearia: vi.fn(),
	removerFotoBarbearia: vi.fn(),
	listarProfissionaisParaProprietario: vi.fn(),
}))

vi.mock('./adminBarbeariaApi', () => api)
vi.mock('../../auth/context/useAuth', () => ({
	useAuth: () => ({ token: 'token-admin' }),
}))

function renderizar() {
	render(<MemoryRouter><AdminBarbeariasPage /></MemoryRouter>)
}

describe('AdminBarbeariasPage', () => {
	beforeEach(() => {
		api.listarBarbeariasAdmin.mockResolvedValue([
			{ id: 1, nome: 'Barbearia Centro', ativo: true, fotoUrl: null },
			{ id: 2, nome: 'Unidade antiga', ativo: false, fotoUrl: null },
		])
		api.cadastrarBarbearia.mockResolvedValue({ id: 3, nome: 'Barbearia Nova', ativo: true, fotoUrl: null })
		api.listarProfissionaisParaProprietario.mockResolvedValue([
			{ id: 7, usuarioId: 9, nome: 'João', email: 'joao@teste.com', barbeariaId: 1, barbeariaNome: 'Barbearia Centro', ativo: true, fusoHorario: 'America/Sao_Paulo' },
		])
		api.atualizarFotoBarbearia.mockResolvedValue({ id: 3, nome: 'Barbearia Nova', ativo: true, fotoUrl: '/api/v1/imagens/foto.png' })
		vi.stubGlobal('scrollTo', vi.fn())
		vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
	})

	it('lista unidades ativas e inativas', async () => {
		renderizar()
		expect(await screen.findByText('Barbearia Centro')).toBeVisible()
		expect(screen.getByText('Unidade antiga')).toBeVisible()
		expect(screen.getByText('Inativa')).toBeVisible()
	})

	it('cadastra uma barbearia e envia sua foto', async () => {
		const usuario = userEvent.setup()
		renderizar()
		await screen.findByText('Barbearia Centro')

		await usuario.type(screen.getByLabelText('Nome'), 'Barbearia Nova')
		await usuario.selectOptions(screen.getByLabelText('Proprietário'), '7')
		await usuario.type(screen.getByLabelText('CEP'), '01310100')
		await usuario.type(screen.getByLabelText('Logradouro'), 'Avenida Paulista')
		await usuario.type(screen.getByLabelText('Número'), '1000')
		await usuario.type(screen.getByLabelText('Bairro'), 'Bela Vista')
		await usuario.type(screen.getByLabelText('Cidade'), 'São Paulo')
		await usuario.type(screen.getByLabelText('Estado'), 'SP')
		const arquivo = new File(['imagem'], 'foto.png', { type: 'image/png' })
		await usuario.upload(screen.getByLabelText('Foto'), arquivo)
		await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }))

		await waitFor(() => expect(api.cadastrarBarbearia).toHaveBeenCalled())
		expect(api.cadastrarBarbearia.mock.calls[0][0]).toEqual({
			nome: 'Barbearia Nova',
			endereco: { cep: '01310100', logradouro: 'Avenida Paulista', numero: '1000', complemento: '', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' },
		})
		expect(api.cadastrarBarbearia.mock.calls[0][1]).toBe(7)
		expect(api.cadastrarBarbearia.mock.calls[0][2]).toHaveLength(12)
		expect(api.cadastrarBarbearia.mock.calls[0][3]).toBe('token-admin')
		expect(api.atualizarFotoBarbearia).toHaveBeenCalledWith(3, arquivo, 'token-admin')
		expect(await screen.findByRole('status')).toHaveTextContent('Barbearia cadastrada')
	})
})
