import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import type { Pagina } from '../../agendamentos/types'
import type { PerfilUsuario, UsuarioResponse } from '../../auth/types'
import { useAuth } from '../../auth/context/useAuth'
import {
  atualizarUsuarioAdmin,
  desativarUsuarioAdmin,
  listarUsuariosAdmin,
  reativarUsuarioAdmin,
  type FiltrosUsuariosAdmin,
} from './adminUsuarioApi'
import styles from './AdminUsuariosPage.module.css'

const filtrosIniciais: FiltrosUsuariosAdmin = {
  termo: '',
  ativo: '',
  perfil: '',
  ordenacao: 'nome,asc',
}

export function AdminUsuariosPage() {
  const { token, sessao } = useAuth()
  const [filtrosFormulario, setFiltrosFormulario] = useState(filtrosIniciais)
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtrosIniciais)
  const [resultado, setResultado] = useState<Pagina<UsuarioResponse> | null>(null)
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<UsuarioResponse | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const requisicaoAtual = useRef(0)

  const carregar = useCallback(async () => {
    if (!token) return
    const requisicao = ++requisicaoAtual.current
    setCarregando(true)
    try {
      const dados = await listarUsuariosAdmin(filtrosAplicados, pagina, token)
      if (requisicao === requisicaoAtual.current) {
        setResultado(dados)
        setErro('')
      }
    } catch (error) {
      if (requisicao === requisicaoAtual.current) setErro(mensagemDoErro(error, 'Não foi possível carregar os usuários.'))
    } finally {
      if (requisicao === requisicaoAtual.current) setCarregando(false)
    }
  }, [filtrosAplicados, pagina, token])

  // A consulta remota acompanha filtros e paginação.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { carregar() }, [carregar])

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPagina(0)
    setFiltrosAplicados({ ...filtrosFormulario })
    setErro('')
    setMensagem('')
  }

  function limparFiltros() {
    setFiltrosFormulario(filtrosIniciais)
    setFiltrosAplicados(filtrosIniciais)
    setPagina(0)
    setErro('')
    setMensagem('')
  }

  function iniciarEdicao(usuario: UsuarioResponse) {
    setEditando(usuario)
    setNome(usuario.nome)
    setEmail(usuario.email)
    setErro('')
    setMensagem('')
  }

  async function salvarEdicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !editando) return
    setProcessandoId(editando.id)
    setErro('')
    setMensagem('')
    try {
      await atualizarUsuarioAdmin(editando.id, { nome: nome.trim(), email: email.trim() }, token)
      setEditando(null)
      setMensagem('Usuário atualizado com sucesso.')
      await carregar()
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível atualizar o usuário.'))
    } finally {
      setProcessandoId(null)
    }
  }

  async function alterarAtivacao(usuario: UsuarioResponse) {
    if (!token || usuario.id === sessao?.id) return
    const acao = usuario.ativo ? 'desativar' : 'reativar'
    if (!window.confirm(`${acao === 'desativar' ? 'Desativar' : 'Reativar'} a conta de ${usuario.nome}?`)) return
    setProcessandoId(usuario.id)
    setErro('')
    setMensagem('')
    try {
      if (usuario.ativo) await desativarUsuarioAdmin(usuario.id, token)
      else await reativarUsuarioAdmin(usuario.id, token)
      setMensagem(`Conta de ${usuario.nome} ${usuario.ativo ? 'desativada' : 'reativada'} com sucesso.`)
      if (editando?.id === usuario.id) setEditando(null)
      await carregar()
    } catch (error) {
      setErro(mensagemDoErro(error, `Não foi possível ${acao} o usuário.`))
    } finally {
      setProcessandoId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/">AgendaPro</Link>
        <nav><Link to="/admin">Visão geral</Link><Link to="/admin/barbearias">Barbearias</Link><Link aria-current="page" to="/admin/usuarios">Usuários</Link><Link to="/admin/servicos">Serviços</Link><Link to="/admin/profissionais">Profissionais</Link><Link to="/painel">Painel</Link></nav>
      </header>

      <main className={styles.content}>
        <section className={styles.intro}><div><p className={styles.eyebrow}>Administração</p><h1>Usuários</h1></div><p>Consulte contas, corrija dados e controle o acesso sem apagar o histórico.</p></section>
        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {mensagem && <div className={styles.success} role="status">{mensagem}</div>}

        <form className={styles.filters} onSubmit={aplicarFiltros}>
          <label>Busca<input aria-label="Buscar por nome ou e-mail" placeholder="Nome ou e-mail" value={filtrosFormulario.termo} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, termo: event.target.value })} /></label>
          <label>Situação<select aria-label="Situação" value={filtrosFormulario.ativo} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, ativo: event.target.value as '' | 'true' | 'false' })}><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select></label>
          <label>Perfil<select aria-label="Perfil" value={filtrosFormulario.perfil} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, perfil: event.target.value as PerfilUsuario | '' })}><option value="">Todos</option><option value="CLIENTE">Cliente</option><option value="PROFISSIONAL">Profissional</option><option value="ADMIN">Admin</option></select></label>
          <label>Ordenação<select aria-label="Ordenação" value={filtrosFormulario.ordenacao} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, ordenacao: event.target.value as FiltrosUsuariosAdmin['ordenacao'] })}><option value="nome,asc">Nome A–Z</option><option value="nome,desc">Nome Z–A</option><option value="email,asc">E-mail A–Z</option><option value="id,desc">Mais recentes</option></select></label>
          <div><button type="submit">Aplicar</button><button className={styles.secondary} onClick={limparFiltros} type="button">Limpar</button></div>
        </form>

        <section className={styles.workspace}>
          <section className={styles.users} aria-label="Lista de usuários">
            <header><div><span>Contas</span><h2>{resultado?.totalElementos ?? 0} usuários</h2></div><p>Desativar preserva dados e bloqueia novos acessos.</p></header>
            {carregando ? <p className={styles.feedback}>Carregando usuários...</p> : resultado?.conteudo.length === 0 ? <p className={styles.feedback}>Nenhum usuário encontrado.</p> : resultado?.conteudo.map((usuario) => (
              <article className={!usuario.ativo ? styles.inactiveRow : undefined} key={usuario.id}>
                <div className={styles.identity}><span className={usuario.ativo ? styles.active : styles.inactive}>{usuario.ativo ? 'Ativo' : 'Inativo'}</span><strong>{usuario.nome}</strong><small>{usuario.email}</small><div>{usuario.perfis.map((perfil) => <span key={perfil}>{rotuloPerfil(perfil)}</span>)}</div></div>
                <div className={styles.actions}><button disabled={processandoId === usuario.id} onClick={() => iniciarEdicao(usuario)} type="button">Editar</button><button className={usuario.ativo ? styles.danger : styles.reactivate} disabled={processandoId === usuario.id || usuario.id === sessao?.id} onClick={() => alterarAtivacao(usuario)} title={usuario.id === sessao?.id ? 'Sua própria conta não pode ser desativada por esta tela' : undefined} type="button">{usuario.ativo ? 'Desativar' : 'Reativar'}</button></div>
              </article>
            ))}
            {resultado && resultado.totalPaginas > 1 && <nav className={styles.pagination} aria-label="Paginação"><button disabled={resultado.primeira || carregando} onClick={() => setPagina((atual) => atual - 1)} type="button">Anterior</button><span>Página {resultado.pagina + 1} de {resultado.totalPaginas}</span><button disabled={resultado.ultima || carregando} onClick={() => setPagina((atual) => atual + 1)} type="button">Próxima</button></nav>}
          </section>

          <aside className={styles.editor} aria-label="Edição de usuário">
            {!editando ? <div className={styles.empty}><span>Edição</span><h2>Selecione uma conta</h2><p>Use “Editar” para alterar nome ou e-mail.</p></div> : <form onSubmit={salvarEdicao}><header><span>Usuário #{editando.id}</span><h2>Editar conta</h2></header><label>Nome<input maxLength={120} required value={nome} onChange={(event) => setNome(event.target.value)} /></label><label>E-mail<input maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><div><button disabled={processandoId === editando.id || !nome.trim() || !email.trim()} type="submit">Salvar alterações</button><button className={styles.secondary} onClick={() => setEditando(null)} type="button">Cancelar</button></div></form>}
          </aside>
        </section>
      </main>
    </div>
  )
}

function mensagemDoErro(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function rotuloPerfil(perfil: PerfilUsuario) {
  return { CLIENTE: 'Cliente', PROFISSIONAL: 'Profissional', ADMIN: 'Admin' }[perfil]
}
