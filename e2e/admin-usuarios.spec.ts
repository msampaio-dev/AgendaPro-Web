import { expect, test } from '@playwright/test'

test('admin pesquisa, edita e reativa um usuário', async ({ page }) => {
  let nome = 'Cliente Teste'
  let ativo = false

  await page.route('**/api/v1/**', async (route) => {
    const requisicao = route.request()
    const url = new URL(requisicao.url())
    const json = (body: unknown, codigo = 200) => route.fulfill({ status: codigo, contentType: 'application/json', body: JSON.stringify(body) })
    const usuario = { id: 2, nome, email: 'cliente@teste.com', ativo, perfis: ['CLIENTE'] }

    if (url.pathname.endsWith('/auth/login')) return json({ id: 1, nome: 'Admin AgendaPro', email: 'admin@teste.com', perfis: ['CLIENTE', 'ADMIN'], token: 'token-admin-e2e', tipo: 'Bearer', expiraEm: '2099-01-01T00:00:00Z' })
    if (url.pathname.endsWith('/auth/me')) return json({ id: 1, nome: 'Admin AgendaPro', email: 'admin@teste.com', perfis: ['CLIENTE', 'ADMIN'] })
    if (url.pathname.endsWith('/usuarios/admin') && requisicao.method() === 'GET') return json({ conteudo: [usuario], pagina: 0, tamanho: 10, totalElementos: 1, totalPaginas: 1, primeira: true, ultima: true })
    if (url.pathname.endsWith('/usuarios/2') && requisicao.method() === 'PUT') {
      nome = (requisicao.postDataJSON() as { nome: string }).nome
      return json({ ...usuario, nome })
    }
    if (url.pathname.endsWith('/usuarios/admin/2/reativar')) {
      ativo = true
      return json({ ...usuario, nome, ativo })
    }
    return json({ mensagem: `Rota simulada não configurada: ${url.pathname}` }, 500)
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('admin@teste.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/admin/usuarios')

  await expect(page.getByText('Cliente Teste')).toBeVisible()
  await page.getByLabel('Buscar por nome ou e-mail').fill('cliente')
  await page.getByLabel('Situação').selectOption('false')
  await page.getByRole('button', { name: 'Aplicar' }).click()

  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Cliente Atualizado')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText('Usuário atualizado')
  await expect(page.getByText('Cliente Atualizado')).toBeVisible()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reativar' }).click()
  await expect(page.getByRole('status')).toContainText('reativada com sucesso')
  await expect(page.getByText('Ativo', { exact: true })).toBeVisible()
})
