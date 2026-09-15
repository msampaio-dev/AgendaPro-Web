export type PerfilUsuario = 'CLIENTE' | 'PROFISSIONAL' | 'ADMIN'

export type CadastroUsuarioRequest = {
  nome: string
  email: string
  senha: string
}

export type UsuarioResponse = {
  id: number
  nome: string
  email: string
  ativo: boolean
  perfis: PerfilUsuario[]
}

export type LoginRequest = {
  email: string
  senha: string
}

export type LoginResponse = {
  id: number
  nome: string
  email: string
  perfis: PerfilUsuario[]
  token: string
  tipo: 'Bearer'
  expiraEm: string
}

export type SessaoResponse = {
  id: number
  nome: string
  email: string
  perfis: PerfilUsuario[]
  profissionalId?: number | null
  fusoHorario?: string | null
}
