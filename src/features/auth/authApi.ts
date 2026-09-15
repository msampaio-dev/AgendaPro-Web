import { apiRequest } from '../../services/api'
import type {
  CadastroUsuarioRequest,
  LoginRequest,
  LoginResponse,
  SessaoResponse,
  UsuarioResponse,
} from './types'

export function cadastrarUsuario(dados: CadastroUsuarioRequest) {
  return apiRequest<UsuarioResponse>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export function login(dados: LoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export function buscarSessao(token: string) {
  return apiRequest<SessaoResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
