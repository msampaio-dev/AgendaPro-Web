import { apiRequest } from '../../../services/api'
import type { Barbearia, DadosBarbearia, DiaSemana, HorarioFuncionamento, HorarioFuncionamentoInput, Profissional, ProfissionalServico, Servico } from '../../agendamentos/types'

function headers(token: string) { return { Authorization: `Bearer ${token}` } }

export function listarMinhasBarbearias(token: string) {
	return apiRequest<Barbearia[]>('/barbearias/minhas', { headers: headers(token) })
}

export function criarMinhaBarbearia(dados: DadosBarbearia, horarios: HorarioFuncionamentoInput[], token: string) {
	return apiRequest<Barbearia>('/barbearias', {
		method: 'POST', headers: headers(token), body: JSON.stringify({ ...dados, horarios }),
	})
}

export function atualizarMinhaBarbearia(id: number, dados: DadosBarbearia, token: string) {
	return apiRequest<Barbearia>(`/barbearias/${id}`, {
		method: 'PUT', headers: headers(token), body: JSON.stringify(dados),
	})
}

export function enviarFotoBarbearia(id: number, arquivo: File, token: string) {
	const body = new FormData(); body.append('arquivo', arquivo)
	return apiRequest<Barbearia>(`/barbearias/${id}/foto`, { method: 'POST', headers: headers(token), body })
}

export function listarHorariosBarbearia(id: number, token: string) {
	return apiRequest<HorarioFuncionamento[]>(`/barbearias/${id}/horarios`, { headers: headers(token) })
}

export function adicionarHorarioBarbearia(
	id: number,
	horario: { diaSemana: DiaSemana; horarioInicio: string; horarioFim: string },
	token: string,
) {
	return apiRequest<HorarioFuncionamento>(`/barbearias/${id}/horarios`, {
		method: 'POST', headers: headers(token), body: JSON.stringify(horario),
	})
}

export function removerHorarioBarbearia(barbeariaId: number, horarioId: number, token: string) {
	return apiRequest<void>(`/barbearias/${barbeariaId}/horarios/${horarioId}`, {
		method: 'DELETE', headers: headers(token),
	})
}

export function listarEquipeBarbearia(id: number, token: string) {
	return apiRequest<Profissional[]>(`/profissionais?barbeariaId=${id}`, { headers: headers(token) })
}

export type DadosServicoBarbearia = {
	nome: string
	descricao: string | null
	duracaoMinutos: number
	preco: number
}

// O catalogo pertence a barbearia: cada unidade so enxerga e edita os proprios
// servicos.
export function listarServicosDisponiveis(barbeariaId: number, token: string) {
	return apiRequest<Servico[]>(`/servicos?barbeariaId=${barbeariaId}`, { headers: headers(token) })
}

export function criarServicoBarbearia(barbeariaId: number, dados: DadosServicoBarbearia, token: string) {
	return apiRequest<Servico>('/servicos', {
		method: 'POST', headers: headers(token), body: JSON.stringify({ ...dados, barbeariaId }),
	})
}

export function desativarServicoBarbearia(servicoId: number, token: string) {
	return apiRequest<void>(`/servicos/${servicoId}`, { method: 'DELETE', headers: headers(token) })
}

export function listarServicosProfissional(profissionalId: number, token: string) {
	return apiRequest<ProfissionalServico[]>(`/profissionais-servicos?profissionalId=${profissionalId}`, {
		headers: headers(token),
	})
}

export function associarServicoProfissional(profissionalId: number, servicoId: number, token: string) {
	return apiRequest<ProfissionalServico>('/profissionais-servicos', {
		method: 'POST', headers: headers(token), body: JSON.stringify({ profissionalId, servicoId }),
	})
}

export function removerServicoProfissional(associacaoId: number, token: string) {
	return apiRequest<void>(`/profissionais-servicos/${associacaoId}`, {
		method: 'DELETE', headers: headers(token),
	})
}

export function transferirPropriedadeBarbearia(
	barbeariaId: number,
	profissionalId: number,
	token: string,
) {
	return apiRequest<Barbearia>(`/barbearias/${barbeariaId}/proprietario`, {
		method: 'PATCH', headers: headers(token), body: JSON.stringify({ profissionalId }),
	})
}
