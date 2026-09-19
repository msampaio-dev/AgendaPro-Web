import { apiRequest } from '../../../services/api'
import type { Barbearia, DadosBarbearia, HorarioFuncionamentoInput, Profissional, Servico } from '../../agendamentos/types'

function autorizacao(token: string) {
	return { Authorization: `Bearer ${token}` }
}

export function listarBarbeariasAdmin(token: string) {
	return apiRequest<Barbearia[]>('/barbearias/admin', { headers: autorizacao(token) })
}

export function listarProfissionaisParaProprietario(token: string) {
	return apiRequest<Profissional[]>('/profissionais', { headers: autorizacao(token) })
}

// A equipe e o catalogo de uma unidade. O admin ve os dois em modo leitura: quem
// cria e edita servico e o proprietario ou a equipe, pela tela Minha Barbearia.
export function listarEquipeDaBarbearia(id: number, token: string) {
	return apiRequest<Profissional[]>(`/profissionais?barbeariaId=${id}`, { headers: autorizacao(token) })
}

export function listarServicosDaBarbearia(id: number, token: string) {
	return apiRequest<Servico[]>(`/servicos?barbeariaId=${id}`, { headers: autorizacao(token) })
}

export function cadastrarBarbearia(
	dados: DadosBarbearia,
	proprietarioProfissionalId: number,
	horarios: HorarioFuncionamentoInput[],
	token: string,
) {
	return apiRequest<Barbearia>('/barbearias/admin', {
		method: 'POST',
		headers: autorizacao(token),
		body: JSON.stringify({ ...dados, proprietarioProfissionalId, horarios }),
	})
}

export function atualizarBarbearia(id: number, dados: DadosBarbearia, token: string) {
	return apiRequest<Barbearia>(`/barbearias/${id}`, {
		method: 'PUT', headers: autorizacao(token), body: JSON.stringify(dados),
	})
}

export function desativarBarbearia(id: number, token: string) {
	return apiRequest<void>(`/barbearias/${id}`, { method: 'DELETE', headers: autorizacao(token) })
}

export function atualizarFotoBarbearia(id: number, arquivo: File, token: string) {
	const body = new FormData()
	body.append('arquivo', arquivo)
	return apiRequest<Barbearia>(`/barbearias/${id}/foto`, {
		method: 'POST', headers: autorizacao(token), body,
	})
}

export function removerFotoBarbearia(id: number, token: string) {
	return apiRequest<void>(`/barbearias/${id}/foto`, { method: 'DELETE', headers: autorizacao(token) })
}
