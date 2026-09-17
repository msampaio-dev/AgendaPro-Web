import { apiRequest } from '../../../services/api'
import type { Barbearia, Profissional, ProfissionalServico, Servico } from '../../agendamentos/types'
import type { UsuarioResponse } from '../../auth/types'

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function carregarDadosAdministrativos(token: string) {
  const headers = autorizacao(token)
  const [usuarios, profissionais, servicos, barbearias] = await Promise.all([
    apiRequest<UsuarioResponse[]>('/usuarios', { headers }),
    apiRequest<Profissional[]>('/profissionais', { headers }),
    apiRequest<Servico[]>('/servicos', { headers }),
    apiRequest<Barbearia[]>('/barbearias', { headers }),
  ])
  return { usuarios, profissionais, servicos, barbearias }
}

export function cadastrarProfissional(usuarioId: number, barbeariaId: number, token: string) {
  return apiRequest<Profissional>('/profissionais', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify({ usuarioId, barbeariaId }),
  })
}

export function desativarProfissional(id: number, token: string) {
  return apiRequest<void>(`/profissionais/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}

export function atualizarFotoProfissional(id: number, arquivo: File, token: string) {
	const body = new FormData()
	body.append('arquivo', arquivo)
	return apiRequest<Profissional>(`/profissionais/${id}/foto`, {
		method: 'POST',
		headers: autorizacao(token),
		body,
	})
}

export function removerFotoProfissional(id: number, token: string) {
	return apiRequest<void>(`/profissionais/${id}/foto`, {
		method: 'DELETE',
		headers: autorizacao(token),
	})
}

export function transferirProfissional(id: number, barbeariaId: number, token: string) {
	return apiRequest<Profissional>(`/profissionais/${id}/barbearia`, {
		method: 'PATCH',
		headers: autorizacao(token),
		body: JSON.stringify({ barbeariaId }),
	})
}

export function listarAssociacoes(profissionalId: number, token: string) {
  return apiRequest<ProfissionalServico[]>(`/profissionais-servicos?profissionalId=${profissionalId}`, {
    headers: autorizacao(token),
  })
}

export function associarServico(profissionalId: number, servicoId: number, token: string) {
  return apiRequest<ProfissionalServico>('/profissionais-servicos', {
    method: 'POST',
    headers: autorizacao(token),
    body: JSON.stringify({ profissionalId, servicoId }),
  })
}

export function removerAssociacao(id: number, token: string) {
  return apiRequest<void>(`/profissionais-servicos/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}
