import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './api'

describe('apiRequest', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('devolve o conteúdo quando a API responde com sucesso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: 1, nome: 'Marcelo' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(apiRequest('/teste')).resolves.toEqual({ id: 1, nome: 'Marcelo' })
  })

  it('preserva status, mensagem e campos de uma resposta inválida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        mensagem: 'Dados inválidos.',
        campos: [{ campo: 'email', mensagem: 'E-mail inválido.' }],
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )))

    const erro = await apiRequest('/teste').catch((error: unknown) => error)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({
      status: 400,
      message: 'Dados inválidos.',
      campos: [{ campo: 'email', mensagem: 'E-mail inválido.' }],
    })
  })

  it('diferencia falha de conexão de uma resposta HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))

    const erro = await apiRequest('/teste').catch((error: unknown) => error)

    expect(erro).toMatchObject({
      status: 0,
      message: 'Não foi possível conectar à API. Verifique se o backend está ligado.',
    })
  })
})
