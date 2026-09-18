import type { LoginResponse } from '../auth/types'

export type StatusConviteEquipe = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'CANCELADO' | 'EXPIRADO'

export type ConviteEquipe = {
	id: number
	barbeariaId: number
	barbeariaNome: string
	email: string
	status: StatusConviteEquipe
	criadoPorNome: string
	criadoEm: string
	expiraEm: string
	respondidoEm?: string | null
}

export type AceiteConviteResponse = LoginResponse
