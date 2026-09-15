import { expect, test } from '@playwright/test'

test('admin acompanha indicadores, filtra e confirma um agendamento', async ({ page }) => {
  let status = 'AGENDADO'

  await page.route('**/api/v1/**', async (route) => {
    const requisicao = route.request()
    const url = new URL(requisicao.url())
    const json = (body: unknown, codigo = 200) => route.fulfill({
      status: codigo,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

    if (url.pathname.endsWith('/auth/login')) return json({ id: 1, nome: 'Admin AgendaPro', email: 'admin@teste.com', perfis: ['CLIENTE', 'ADMIN'], token: 'token-admin-e2e', tipo: 'Bearer', expiraEm: '2099-01-01T00:00:00Z' })
    if (url.pathname.endsWith('/auth/me')) return json({ id: 1, nome: 'Admin AgendaPro', email: 'admin@teste.com', perfis: ['CLIENTE', 'ADMIN'] })
    if (url.pathname.endsWith('/usuarios')) return json([{ id: 1, nome: 'Admin AgendaPro', email: 'admin@teste.com', ativo: true, perfis: ['CLIENTE', 'ADMIN'] }])
    if (url.pathname.endsWith('/profissionais')) return json([{ id: 4, usuarioId: 3, nome: 'Ana Profissional', email: 'ana@teste.com', ativo: true, fusoHorario: 'America/Sao_Paulo' }])
    if (url.pathname.endsWith('/servicos')) return json([{ id: 3, nome: 'Corte executivo', descricao: null, duracaoMinutos: 30, preco: 60, ativo: true }])
    if (url.pathname.endsWith('/agendamentos/admin')) return json({ conteudo: [{ id: 31, clienteId: 7, clienteNome: 'Cliente da Agenda', profissionalId: 4, profissionalNome: 'Ana Profissional', servicoId: 3, servicoNome: 'Corte executivo', inicio: '2030-01-07T12:00:00Z', fim: '2030-01-07T12:30:00Z', status }], pagina: 0, tamanho: 10, totalElementos: 1, totalPaginas: 1, primeira: true, ultima: true })
    if (url.pathname.endsWith('/agendamentos/31/confirmar')) {
      status = 'CONFIRMADO'
      return json({ id: 31, status })
    }

    return json({ mensagem: `Rota simulada não configurada: ${url.pathname}` }, 500)
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('admin@teste.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Visão geral' }).click()

  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cliente da Agenda' })).toBeVisible()
  await expect(page.getByText('Profissionais ativos').locator('..')).toContainText('1')

  await page.getByLabel('Profissional').selectOption('4')
  await page.getByRole('button', { name: 'Aplicar filtros' }).click()
  await expect.poll(() => page.getByRole('heading', { name: 'Cliente da Agenda' }).count()).toBe(1)

  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('status')).toContainText('atualizado com sucesso')
  await expect(page.locator('span').filter({ hasText: /^Confirmado$/ })).toBeVisible()
})
