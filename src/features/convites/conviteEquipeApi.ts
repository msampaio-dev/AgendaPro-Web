import { apiRequest } from '../../services/api'
import type { AceiteConviteResponse, ConviteEquipe } from './types'

const headers = (token: string) => ({ Authorization: `Bearer ${token}` })

export function criarConviteEquipe(barbeariaId: number, email: string, token: string) {
	return apiRequest<ConviteEquipe>(`/barbearias/${barbeariaId}/convites`, {
		method: 'POST', headers: headers(token), body: JSON.stringify({ email }),
	})
}

export function listarConvitesBarbearia(barbeariaId: number, token: string) {
	return apiRequest<ConviteEquipe[]>(`/barbearias/${barbeariaId}/convites`, {
		headers: headers(token),
	})
}

export function cancelarConviteEquipe(barbeariaId: number, conviteId: number, token: string) {
	return apiRequest<void>(`/barbearias/${barbeariaId}/convites/${conviteId}`, {
		method: 'DELETE', headers: headers(token),
	})
}

export function listarMeusConvites(token: string) {
	return apiRequest<ConviteEquipe[]>('/convites-equipe/meus', { headers: headers(token) })
}

export function aceitarConviteEquipe(conviteId: number, token: string) {
	return apiRequest<AceiteConviteResponse>(`/convites-equipe/${conviteId}/aceitar`, {
		method: 'POST', headers: headers(token),
	})
}

export function recusarConviteEquipe(conviteId: number, token: string) {
	return apiRequest<void>(`/convites-equipe/${conviteId}/recusar`, {
		method: 'POST', headers: headers(token),
	})
}
