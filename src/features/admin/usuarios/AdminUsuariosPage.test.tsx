import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pagina } from '../../agendamentos/types'
import type { UsuarioResponse } from '../../auth/types'
import { AdminUsuariosPage } from './AdminUsuariosPage'

const api = vi.hoisted(() => ({
  listarUsuariosAdmin: vi.fn(),
  atualizarUsuarioAdmin: vi.fn(),
  desativarUsuarioAdmin: vi.fn(),
  reativarUsuarioAdmin: vi.fn(),
}))

vi.mock('./adminUsuarioApi', () => api)
vi.mock('../../auth/context/useAuth', () => ({
  useAuth: () => ({
    token: 'token-admin',
    sessao: { id: 1, nome: 'Admin', email: 'admin@teste.com', perfis: ['CLIENTE', 'ADMIN'] },
  }),
}))

const admin: UsuarioResponse = { id: 1, nome: 'Admin', email: 'admin@teste.com', ativo: true, perfis: ['CLIENTE', 'ADMIN'] }
const cliente: UsuarioResponse = { id: 2, nome: 'Cliente Teste', email: 'cliente@teste.com', ativo: false, perfis: ['CLIENTE'] }

function pagina(): Pagina<UsuarioResponse> {
  return { conteudo: [admin, cliente], pagina: 0, tamanho: 10, totalElementos: 2, totalPaginas: 1, primeira: true, ultima: true }
}

function renderizar() {
  render(<MemoryRouter><AdminUsuariosPage /></MemoryRouter>)
}

describe('AdminUsuariosPage', () => {
  beforeEach(() => {
    api.listarUsuariosAdmin.mockResolvedValue(pagina())
    api.atualizarUsuarioAdmin.mockResolvedValue({ ...cliente, nome: 'Cliente Atualizado' })
    api.reativarUsuarioAdmin.mockResolvedValue({ ...cliente, ativo: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lista contas e impede desativar o próprio administrador', async () => {
    renderizar()

    expect(await screen.findByText('Cliente Teste')).toBeVisible()
    expect(screen.getByTitle('Sua própria conta não pode ser desativada por esta tela')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reativar' })).toBeEnabled()
  })

  it('aplica busca e filtros no servidor', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByText('Cliente Teste')

    await usuario.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'cliente')
    await usuario.selectOptions(screen.getByLabelText('Situação'), 'false')
    await usuario.selectOptions(screen.getByLabelText('Perfil'), 'CLIENTE')
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }))

    await waitFor(() => expect(api.listarUsuariosAdmin).toHaveBeenCalledTimes(2))
    expect(api.listarUsuariosAdmin.mock.calls[1][0]).toMatchObject({ termo: 'cliente', ativo: 'false', perfil: 'CLIENTE' })
  })

  it('edita e reativa uma conta preservando o histórico', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByText('Cliente Teste')

    const linhaCliente = screen.getByText('Cliente Teste').closest('article')!
    await usuario.click(linhaCliente.querySelector('button')!)
    const nome = screen.getByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Cliente Atualizado')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(api.atualizarUsuarioAdmin).toHaveBeenCalledWith(2, { nome: 'Cliente Atualizado', email: 'cliente@teste.com' }, 'token-admin')
    expect(await screen.findByRole('status')).toHaveTextContent('Usuário atualizado')

    await usuario.click(screen.getByRole('button', { name: 'Reativar' }))
    expect(api.reativarUsuarioAdmin).toHaveBeenCalledWith(2, 'token-admin')
  })
})
