import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiAssetUrl } from '../../../services/api'
import type { Barbearia, Profissional, ProfissionalServico, Servico } from '../../agendamentos/types'
import type { UsuarioResponse } from '../../auth/types'
import { useAuth } from '../../auth/context/useAuth'
import {
  associarServico,
  atualizarFotoProfissional,
  cadastrarProfissional,
  carregarDadosAdministrativos,
  desativarProfissional,
  listarAssociacoes,
  removerAssociacao,
  removerFotoProfissional,
  transferirProfissional,
} from './adminProfissionalApi'
import styles from './AdminProfissionaisPage.module.css'

export function AdminProfissionaisPage() {
  const { token } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbearias, setBarbearias] = useState<Barbearia[]>([])
  const [usuarioId, setUsuarioId] = useState('')
  const [barbeariaId, setBarbeariaId] = useState('')
  const [profissionalId, setProfissionalId] = useState<number | null>(null)
  const [servicoId, setServicoId] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [barbeariaDestinoId, setBarbeariaDestinoId] = useState('')
  const [associacoes, setAssociacoes] = useState<ProfissionalServico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoAssociacoes, setCarregandoAssociacoes] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (!token) return
    let ativo = true
    carregarDadosAdministrativos(token)
      .then((dados) => {
        if (!ativo) return
        setUsuarios(dados.usuarios)
        setProfissionais(dados.profissionais)
        setServicos(dados.servicos)
        setBarbearias(dados.barbearias.filter((item) => item.ativo))
        const primeiroProfissionalId = dados.profissionais.find((item) => item.ativo)?.id ?? null
        setCarregandoAssociacoes(Boolean(primeiroProfissionalId))
        setProfissionalId(primeiroProfissionalId)
      })
      .catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar os profissionais.')) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [token])

  useEffect(() => {
    if (!token || !profissionalId) return
    let ativo = true
    listarAssociacoes(profissionalId, token)
      .then((dados) => { if (ativo) setAssociacoes(dados) })
      .catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar os serviços do profissional.')) })
      .finally(() => { if (ativo) setCarregandoAssociacoes(false) })
    return () => { ativo = false }
  }, [profissionalId, token])

  async function recarregarDados() {
    if (!token) return
    const dados = await carregarDadosAdministrativos(token)
    setUsuarios(dados.usuarios)
    setProfissionais(dados.profissionais)
    setServicos(dados.servicos)
    setBarbearias(dados.barbearias.filter((item) => item.ativo))
  }

  async function recarregarAssociacoes(id: number) {
    if (!token) return
    setAssociacoes(await listarAssociacoes(id, token))
  }

  async function criarPerfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !usuarioId || !barbeariaId) return
    setProcessando(true)
    limparAvisos()
    try {
      const criado = await cadastrarProfissional(Number(usuarioId), Number(barbeariaId), token)
      await recarregarDados()
      setUsuarioId('')
      setBarbeariaId('')
      setAssociacoes([])
      setCarregandoAssociacoes(true)
      setProfissionalId(criado.id)
      setMensagem(`${criado.nome} agora possui um perfil profissional.`)
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível criar o perfil profissional.'))
    } finally {
      setProcessando(false)
    }
  }

  async function desativar(profissional: Profissional) {
    if (!token || !window.confirm(`Desativar o perfil profissional de ${profissional.nome}? A conta de usuário continuará ativa.`)) return
    setProcessando(true)
    limparAvisos()
    try {
      await desativarProfissional(profissional.id, token)
      await recarregarDados()
      if (profissionalId === profissional.id) {
        setProfissionalId(null)
        setAssociacoes([])
        setCarregandoAssociacoes(false)
      }
      setMensagem('Perfil profissional desativado; a conta do usuário foi preservada.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível desativar o profissional.'))
    } finally {
      setProcessando(false)
    }
  }

  async function adicionarServico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !profissionalId || !servicoId) return
    setProcessando(true)
    limparAvisos()
    try {
      await associarServico(profissionalId, Number(servicoId), token)
      await recarregarAssociacoes(profissionalId)
      setServicoId('')
      setMensagem('Serviço associado ao profissional.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível associar o serviço.'))
    } finally {
      setProcessando(false)
    }
  }

  async function salvarFoto() {
    if (!token || !profissionalId || !foto) return
    setProcessando(true)
    limparAvisos()
    try {
      await atualizarFotoProfissional(profissionalId, foto, token)
      await recarregarDados()
      setFoto(null)
      setMensagem('Foto do profissional atualizada.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível atualizar a foto.'))
    } finally {
      setProcessando(false)
    }
  }

  async function removerFoto() {
    if (!token || !profissionalId || !window.confirm('Remover a foto deste profissional?')) return
    setProcessando(true)
    limparAvisos()
    try {
      await removerFotoProfissional(profissionalId, token)
      await recarregarDados()
      setFoto(null)
      setMensagem('Foto do profissional removida.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível remover a foto.'))
    } finally {
      setProcessando(false)
    }
  }

  async function transferir() {
    if (!token || !profissionalId || !barbeariaDestinoId) return
    setProcessando(true)
    limparAvisos()
    try {
      await transferirProfissional(profissionalId, Number(barbeariaDestinoId), token)
      await recarregarDados()
      setBarbeariaDestinoId('')
      setMensagem('Profissional transferido para a nova barbearia.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível transferir o profissional.'))
    } finally {
      setProcessando(false)
    }
  }

  async function remover(associacao: ProfissionalServico, servico: Servico | undefined) {
    if (!token || !profissionalId || !window.confirm(`Remover “${servico?.nome ?? 'este serviço'}” deste profissional?`)) return
    setProcessando(true)
    limparAvisos()
    try {
      await removerAssociacao(associacao.id, token)
      await recarregarAssociacoes(profissionalId)
      setMensagem('Serviço removido do perfil profissional.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível remover o serviço.'))
    } finally {
      setProcessando(false)
    }
  }

  function limparAvisos() {
    setErro('')
    setMensagem('')
  }

  const idsComPerfil = new Set(profissionais.map((profissional) => profissional.usuarioId))
  const usuariosElegiveis = usuarios.filter((usuario) => usuario.ativo && !idsComPerfil.has(usuario.id))
  const profissionalSelecionado = profissionais.find((profissional) => profissional.id === profissionalId)
  const idsAssociados = new Set(associacoes.map((associacao) => associacao.servicoId))
  const servicosDisponiveis = servicos.filter((servico) => servico.ativo && !idsAssociados.has(servico.id))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/">AgendaPro</Link>
        <nav><Link to="/admin">Visão geral</Link><Link to="/admin/barbearias">Barbearias</Link><Link to="/admin/usuarios">Usuários</Link><Link to="/admin/servicos">Serviços</Link><Link to="/admin/profissionais">Profissionais</Link><Link to="/painel">Painel</Link></nav>
      </header>

      <main className={styles.content}>
        <section className={styles.intro}><div><p className={styles.eyebrow}>Administração</p><h1>Profissionais</h1></div><p>Transforme usuários em profissionais e defina quais serviços cada um realiza.</p></section>
        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {mensagem && <div className={styles.success} role="status">{mensagem}</div>}

        <section className={styles.creation}>
          <div><span>Novo perfil</span><h2>Adicionar profissional</h2><p>Somente usuários ativos e ainda sem perfil profissional aparecem aqui.</p></div>
          <form onSubmit={criarPerfil}>
            <select aria-label="Usuário" disabled={processando || usuariosElegiveis.length === 0} onChange={(event) => setUsuarioId(event.target.value)} required value={usuarioId}>
              <option value="">Selecione um usuário</option>
              {usuariosElegiveis.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome} · {usuario.email}</option>)}
            </select>
            <select aria-label="Barbearia" disabled={processando || barbearias.length === 0} onChange={(event) => setBarbeariaId(event.target.value)} required value={barbeariaId}>
              <option value="">Selecione uma barbearia</option>
              {barbearias.map((barbearia) => <option key={barbearia.id} value={barbearia.id}>{barbearia.nome}</option>)}
            </select>
            <button disabled={processando || !usuarioId || !barbeariaId} type="submit">Criar perfil</button>
          </form>
        </section>

        {carregando ? <p className={styles.feedback}>Carregando profissionais...</p> : (
          <section className={styles.workspace}>
            <aside className={styles.professionals}>
              <header><span>Equipe</span><h2>{profissionais.filter((item) => item.ativo).length} ativos</h2></header>
              {profissionais.length === 0 ? <p className={styles.feedback}>Nenhum profissional cadastrado.</p> : profissionais.map((profissional) => (
                <button className={`${styles.professional} ${profissionalId === profissional.id ? styles.selected : ''}`} key={profissional.id} onClick={() => {
                  if (profissionalId !== profissional.id) {
                    setAssociacoes([])
                    setCarregandoAssociacoes(true)
                    setProfissionalId(profissional.id)
                  }
                  limparAvisos()
                }} type="button">
                  <span className={styles.avatar}>{profissional.fotoUrl ? <img alt="" src={apiAssetUrl(profissional.fotoUrl) ?? ''} /> : profissional.nome.charAt(0)}</span>
                  <span className={profissional.ativo ? styles.active : styles.inactive}>{profissional.ativo ? 'Ativo' : 'Inativo'}</span>
                  <strong>{profissional.nome}</strong><small>{profissional.barbeariaNome ?? 'Sem barbearia'} · {profissional.email}</small>
                </button>
              ))}
            </aside>

            <section className={styles.assignment}>
              {!profissionalSelecionado ? <div className={styles.empty}><span>Serviços</span><h2>Selecione um profissional</h2><p>Escolha alguém da equipe para administrar seus serviços.</p></div> : (
                <>
                  <header className={styles.profileHeader}><span className={styles.profilePhoto}>{profissionalSelecionado.fotoUrl ? <img alt={`Foto de ${profissionalSelecionado.nome}`} src={apiAssetUrl(profissionalSelecionado.fotoUrl) ?? ''} /> : profissionalSelecionado.nome.charAt(0)}</span><div><span>Perfil #{profissionalSelecionado.id}</span><h2>{profissionalSelecionado.nome}</h2><p>{profissionalSelecionado.barbeariaNome ?? 'Sem barbearia'} · {profissionalSelecionado.fusoHorario}</p></div>{profissionalSelecionado.ativo && <button disabled={processando} onClick={() => desativar(profissionalSelecionado)} type="button">Desativar perfil</button>}</header>
                  <div className={styles.photoEditor}><label>Foto do profissional<input accept="image/jpeg,image/png" onChange={(event) => setFoto(event.target.files?.[0] ?? null)} type="file" /></label><button disabled={processando || !foto} onClick={salvarFoto} type="button">Enviar foto</button>{profissionalSelecionado.fotoUrl && <button className={styles.removePhoto} disabled={processando} onClick={removerFoto} type="button">Remover foto</button>}<small>JPEG ou PNG, até 5 MB.</small></div>
                  <div className={styles.transferEditor}><label>Transferir para<select aria-label="Barbearia de destino" onChange={(event) => setBarbeariaDestinoId(event.target.value)} value={barbeariaDestinoId}><option value="">Selecione outra unidade</option>{barbearias.filter((item) => item.id !== profissionalSelecionado.barbeariaId).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><button disabled={processando || !barbeariaDestinoId} onClick={transferir} type="button">Transferir profissional</button><small>A transferência é bloqueada se houver agendamentos futuros ou jornada incompatível.</small></div>
                  {!profissionalSelecionado.ativo ? <p className={styles.feedback}>Este perfil está inativo e não pode receber novos serviços.</p> : (
                    <>
                      <form className={styles.assignForm} onSubmit={adicionarServico}>
                        <select aria-label="Serviço" disabled={processando || servicosDisponiveis.length === 0} onChange={(event) => setServicoId(event.target.value)} required value={servicoId}>
                          <option value="">{servicosDisponiveis.length ? 'Selecione um serviço' : 'Todos os serviços ativos já estão associados'}</option>
                          {servicosDisponiveis.map((servico) => <option key={servico.id} value={servico.id}>{servico.nome} · {servico.duracaoMinutos} min</option>)}
                        </select>
                        <button disabled={processando || !servicoId} type="submit">Associar</button>
                      </form>
                      <div className={styles.services}>
                        {carregandoAssociacoes ? <p className={styles.feedback}>Carregando serviços...</p> : associacoes.length === 0 ? <p className={styles.feedback}>Este profissional ainda não realiza serviços.</p> : associacoes.map((associacao) => {
                          const servico = servicos.find((item) => item.id === associacao.servicoId)
                          return <article key={associacao.id}><div><strong>{servico?.nome ?? `Serviço #${associacao.servicoId}`}</strong><span>{servico ? `${servico.duracaoMinutos} min · ${formatarPreco(servico.preco)}` : 'Serviço associado'}</span></div><button disabled={processando} onClick={() => remover(associacao, servico)} type="button">Remover</button></article>
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          </section>
        )}
      </main>
    </div>
  )
}

function mensagemDoErro(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function formatarPreco(preco: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco)
}
