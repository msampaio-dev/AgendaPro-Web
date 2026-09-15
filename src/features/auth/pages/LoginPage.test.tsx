import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const { entrar } = vi.hoisted(() => ({ entrar: vi.fn() }))

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ entrar }),
}))

function renderizarLogin() {
  render(
    <MemoryRouter initialEntries={['/entrar']}>
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/painel" element={<h1>Painel autenticado</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => entrar.mockReset())

  it('normaliza o e-mail, autentica e abre o painel', async () => {
    entrar.mockResolvedValue(undefined)
    const usuario = userEvent.setup()
    renderizarLogin()

    await usuario.type(screen.getByLabelText('E-mail'), '  cliente@agendapro.com  ')
    await usuario.type(screen.getByLabelText('Senha'), 'senha-segura')
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!)

    expect(entrar).toHaveBeenCalledWith({
      email: 'cliente@agendapro.com',
      senha: 'senha-segura',
    })
    expect(await screen.findByRole('heading', { name: 'Painel autenticado' })).toBeVisible()
  })

})
