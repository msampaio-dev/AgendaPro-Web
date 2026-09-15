import { expect, test } from '@playwright/test'

test('cliente entra e conclui um agendamento disponível', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const requisicao = route.request()
    const url = new URL(requisicao.url())
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

    if (url.pathname.endsWith('/auth/login') && requisicao.method() === 'POST') {
      return json({
        id: 7,
        nome: 'Cliente Teste',
        email: 'cliente@teste.com',
        perfis: ['CLIENTE'],
        token: 'token-e2e',
        tipo: 'Bearer',
        expiraEm: '2099-01-01T00:00:00Z',
      })
    }
    if (url.pathname.endsWith('/auth/me')) {
      return json({ id: 7, nome: 'Cliente Teste', email: 'cliente@teste.com', perfis: ['CLIENTE'] })
    }
    if (url.pathname.endsWith('/servicos')) {
      return json([{ id: 3, nome: 'Corte', descricao: null, duracaoMinutos: 30, preco: 50, ativo: true }])
    }
    if (url.pathname.endsWith('/profissionais')) {
      return json([{ id: 4, usuarioId: 8, nome: 'Marcelo', email: 'profissional@teste.com', ativo: true, fusoHorario: 'America/Sao_Paulo' }])
    }
    if (url.pathname.endsWith('/profissionais-servicos/por-servico')) {
      return json([{ id: 5, profissionalId: 4, servicoId: 3, ativo: true }])
    }
    if (url.pathname.endsWith('/disponibilidades/proximas')) {
      return json([{
        profissionalId: 4,
        servicoId: 3,
        data: '2030-01-07',
        situacao: 'DISPONIVEL',
        horarios: [
          { inicio: '09:00:00', fim: '09:30:00' },
          { inicio: '13:00:00', fim: '13:30:00' },
        ],
      }])
    }
    if (url.pathname.endsWith('/agendamentos') && requisicao.method() === 'POST') {
      return json({
        id: 10,
        clienteId: 7,
        clienteNome: 'Cliente Teste',
        profissionalId: 4,
        profissionalNome: 'Marcelo',
        servicoId: 3,
        servicoNome: 'Corte',
        inicio: '2030-01-07T12:00:00Z',
        fim: '2030-01-07T12:30:00Z',
        status: 'AGENDADO',
      }, 201)
    }

    return json({ mensagem: `Rota simulada não configurada: ${url.pathname}` }, 500)
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('cliente@teste.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/)

  await page.getByRole('link', { name: 'Novo horário' }).click()
  await page.getByRole('button', { name: /Corte/ }).click()
  await page.getByRole('button', { name: /Marcelo/ }).click()

  await expect(page.getByLabel('Outra data')).toHaveValue('2030-01-07')
  await expect(page.getByRole('button', { name: '09:00', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '12:00', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '09:00', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click()

  await expect(page.getByRole('heading', { name: 'Seu horário está agendado.' })).toBeVisible()
  await expect(page.getByText('Corte com Marcelo')).toBeVisible()
})
