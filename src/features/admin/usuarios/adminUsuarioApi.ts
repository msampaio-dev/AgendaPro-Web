import { apiRequest } from '../../../services/api'
import type { Pagina } from '../../agendamentos/types'
import type { PerfilUsuario, UsuarioResponse } from '../../auth/types'

export type FiltrosUsuariosAdmin = {
  termo: string
  ativo: '' | 'true' | 'false'
  perfil: PerfilUsuario | ''
  ordenacao: 'nome,asc' | 'nome,desc' | 'email,asc' | 'id,desc'
}

function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function listarUsuariosAdmin(
  filtros: FiltrosUsuariosAdmin,
  pagina: number,
  token: string,
) {
  const params = new URLSearchParams({
    page: String(pagina),
    size: '10',
    sort: filtros.ordenacao,
  })
  if (filtros.termo.trim()) params.set('termo', filtros.termo.trim())
  if (filtros.ativo) params.set('ativo', filtros.ativo)
  if (filtros.perfil) params.set('perfil', filtros.perfil)

  return apiRequest<Pagina<UsuarioResponse>>(`/usuarios/admin?${params}`, {
    headers: autorizacao(token),
  })
}

export function atualizarUsuarioAdmin(
  id: number,
  dados: { nome: string; email: string },
  token: string,
) {
  return apiRequest<UsuarioResponse>(`/usuarios/${id}`, {
    method: 'PUT',
    headers: autorizacao(token),
    body: JSON.stringify(dados),
  })
}

export function desativarUsuarioAdmin(id: number, token: string) {
  return apiRequest<void>(`/usuarios/${id}`, {
    method: 'DELETE',
    headers: autorizacao(token),
  })
}

export function reativarUsuarioAdmin(id: number, token: string) {
  return apiRequest<UsuarioResponse>(`/usuarios/admin/${id}/reativar`, {
    method: 'PATCH',
    headers: autorizacao(token),
  })
}
