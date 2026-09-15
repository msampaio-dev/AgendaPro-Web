import { expect, test } from '@playwright/test'

test('profissional consulta a semana, abre detalhes e confirma atendimento', async ({ page }) => {
  let status = 'AGENDADO'

  await page.route('**/api/v1/**', async (route) => {
    const requisicao = route.request()
    const url = new URL(requisicao.url())
    const json = (body: unknown, codigo = 200) => route.fulfill({
      status: codigo,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

    if (url.pathname.endsWith('/auth/login') && requisicao.method() === 'POST') {
      return json({
        id: 8,
        nome: 'Marcelo Profissional',
        email: 'profissional@teste.com',
        perfis: ['CLIENTE', 'PROFISSIONAL'],
        token: 'token-profissional-e2e',
        tipo: 'Bearer',
        expiraEm: '2099-01-01T00:00:00Z',
      })
    }
    if (url.pathname.endsWith('/auth/me')) {
      return json({
        id: 8,
        nome: 'Marcelo Profissional',
        email: 'profissional@teste.com',
        perfis: ['CLIENTE', 'PROFISSIONAL'],
        profissionalId: 4,
        fusoHorario: 'America/Sao_Paulo',
      })
    }
    if (url.pathname.endsWith('/agendamentos') && requisicao.method() === 'GET') {
      return json({
        conteudo: [{
          id: 21,
          clienteId: 7,
          clienteNome: 'Cliente Teste',
          profissionalId: 4,
          profissionalNome: 'Marcelo Profissional',
          servicoId: 3,
          servicoNome: 'Corte',
          inicio: '2030-01-07T12:00:00Z',
          fim: '2030-01-07T12:30:00Z',
          status,
        }],
        pagina: 0,
        tamanho: 8,
        totalElementos: 1,
        totalPaginas: 1,
        primeira: true,
        ultima: true,
      })
    }
    if (url.pathname.endsWith('/agendamentos/21/confirmar') && requisicao.method() === 'PATCH') {
      status = 'CONFIRMADO'
      return json({
        id: 21,
        clienteId: 7,
        clienteNome: 'Cliente Teste',
        profissionalId: 4,
        profissionalNome: 'Marcelo Profissional',
        servicoId: 3,
        servicoNome: 'Corte',
        inicio: '2030-01-07T12:00:00Z',
        fim: '2030-01-07T12:30:00Z',
        status,
      })
    }

    return json({ mensagem: `Rota simulada não configurada: ${url.pathname}` }, 500)
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('profissional@teste.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Abrir agenda' }).click()

  await expect(page.getByRole('heading', { name: 'Cliente Teste' })).toBeVisible()
  await page.getByRole('button', { name: 'Semana' }).click()
  await expect(page.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Detalhes' }).click()
  await expect(page.getByRole('dialog', { name: 'Detalhes da reserva' })).toContainText('Corte')
  await page.getByRole('button', { name: 'Fechar detalhes' }).click()

  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('status')).toContainText('Atendimento de Cliente Teste confirmado.')
  await expect(page.locator('span').filter({ hasText: /^Confirmado$/ })).toBeVisible()
})
