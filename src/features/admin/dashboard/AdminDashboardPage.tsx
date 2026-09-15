import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import {
  cancelarAgendamento,
  concluirAgendamento,
  confirmarAgendamento,
} from '../../agendamentos/agendamentoApi'
import type { Agendamento, Pagina, Profissional, Servico, StatusAgendamento } from '../../agendamentos/types'
import type { UsuarioResponse } from '../../auth/types'
import { useAuth } from '../../auth/context/useAuth'
import { carregarResumoAdmin, listarAgendaAdmin, type FiltrosAgendaAdmin } from './adminDashboardApi'
import styles from './AdminDashboardPage.module.css'

const status: Array<{ valor: StatusAgendamento | ''; texto: string }> = [
  { valor: '', texto: 'Todos os status' },
  { valor: 'AGENDADO', texto: 'Agendado' },
  { valor: 'CONFIRMADO', texto: 'Confirmado' },
  { valor: 'CANCELADO', texto: 'Cancelado' },
  { valor: 'CONCLUIDO', texto: 'Concluído' },
]

function hoje() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const filtrosIniciais: FiltrosAgendaAdmin = {
  profissionalId: null,
  dataInicio: hoje(),
  dataFim: hoje(),
  status: '',
}

export function AdminDashboardPage() {
  const { token } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [filtrosFormulario, setFiltrosFormulario] = useState(filtrosIniciais)
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtrosIniciais)
  const [resultado, setResultado] = useState<Pagina<Agendamento> | null>(null)
  const [pagina, setPagina] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [processandoId, setProcessandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const requisicaoAtual = useRef(0)

  const carregarAgenda = useCallback(async (silencioso = false) => {
    if (!token) return
    const requisicao = ++requisicaoAtual.current
    if (!silencioso) setCarregando(true)
    try {
      const dados = await listarAgendaAdmin(filtrosAplicados, pagina, token)
      if (requisicao === requisicaoAtual.current) setResultado(dados)
    } catch (error) {
      if (requisicao === requisicaoAtual.current) {
        setErro(mensagemDoErro(error, 'Não foi possível carregar a agenda administrativa.'))
      }
    } finally {
      if (!silencioso && requisicao === requisicaoAtual.current) setCarregando(false)
    }
  }, [filtrosAplicados, pagina, token])

  useEffect(() => {
    if (!token) return
    let ativo = true
    carregarResumoAdmin(token)
      .then((dados) => {
        if (!ativo) return
        setUsuarios(dados.usuarios)
        setProfissionais(dados.profissionais)
        setServicos(dados.servicos)
      })
      .catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar o resumo administrativo.')) })
    return () => { ativo = false }
  }, [token])

  // A consulta remota precisa acompanhar filtros e paginação.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { carregarAgenda() }, [carregarAgenda])

  useEffect(() => {
    const atualizar = () => { if (document.visibilityState === 'visible') void carregarAgenda(true) }
    const intervalo = window.setInterval(atualizar, 60_000)
    window.addEventListener('focus', atualizar)
    return () => {
      window.clearInterval(intervalo)
      window.removeEventListener('focus', atualizar)
    }
  }, [carregarAgenda])

  const indicadores = useMemo(() => ({
    usuarios: usuarios.filter((item) => item.ativo).length,
    profissionais: profissionais.filter((item) => item.ativo).length,
    servicos: servicos.filter((item) => item.ativo).length,
    atendimentos: resultado?.totalElementos ?? 0,
  }), [profissionais, resultado, servicos, usuarios])

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    if (filtrosFormulario.dataInicio && filtrosFormulario.dataFim
      && filtrosFormulario.dataInicio > filtrosFormulario.dataFim) {
      setErro('A data inicial não pode ser posterior à data final.')
      return
    }
    setPagina(0)
    setFiltrosAplicados({ ...filtrosFormulario })
  }

  function limparFiltros() {
    const novosFiltros = { ...filtrosIniciais }
    setFiltrosFormulario(novosFiltros)
    setFiltrosAplicados(novosFiltros)
    setPagina(0)
    setErro('')
    setMensagem('')
  }

  async function alterarStatus(agendamento: Agendamento, acao: 'confirmar' | 'cancelar' | 'concluir') {
    if (!token) return
    if (acao === 'cancelar' && !window.confirm(`Cancelar o agendamento de ${agendamento.clienteNome}?`)) return
    setProcessandoId(agendamento.id)
    setErro('')
    setMensagem('')
    try {
      if (acao === 'confirmar') await confirmarAgendamento(agendamento.id, token)
      if (acao === 'cancelar') await cancelarAgendamento(agendamento.id, token)
      if (acao === 'concluir') await concluirAgendamento(agendamento.id, token)
      setMensagem(`Agendamento de ${agendamento.clienteNome} atualizado com sucesso.`)
      await carregarAgenda(true)
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível atualizar o agendamento.'))
    } finally {
      setProcessandoId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/">AgendaPro</Link>
        <nav><Link aria-current="page" to="/admin">Visão geral</Link><Link to="/admin/servicos">Serviços</Link><Link to="/admin/profissionais">Profissionais</Link><Link to="/painel">Painel</Link></nav>
      </header>

      <main className={styles.content}>
        <section className={styles.intro}>
          <div><p className={styles.eyebrow}>Central administrativa</p><h1>Visão geral</h1></div>
          <p>Acompanhe a operação, filtre a agenda e resolva pendências sem sair desta tela.</p>
        </section>

        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {mensagem && <div className={styles.success} role="status">{mensagem}</div>}

        <section className={styles.metrics} aria-label="Indicadores da operação">
          <article><span>Usuários ativos</span><strong>{indicadores.usuarios}</strong><Link to="/admin/profissionais">Gerenciar equipe</Link></article>
          <article><span>Profissionais ativos</span><strong>{indicadores.profissionais}</strong><Link to="/admin/profissionais">Ver profissionais</Link></article>
          <article><span>Serviços ativos</span><strong>{indicadores.servicos}</strong><Link to="/admin/servicos">Ver catálogo</Link></article>
          <article><span>No período</span><strong>{indicadores.atendimentos}</strong><small>agendamentos encontrados</small></article>
        </section>

        <section className={styles.agenda}>
          <header><div><span>Operação</span><h2>Agenda do negócio</h2></div><p>Atualização automática a cada minuto.</p></header>

          <form className={styles.filters} onSubmit={aplicarFiltros}>
            <label>Profissional<select aria-label="Profissional" value={filtrosFormulario.profissionalId ?? ''} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, profissionalId: event.target.value ? Number(event.target.value) : null })}><option value="">Todos</option>{profissionais.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? '' : ' (inativo)'}</option>)}</select></label>
            <label>Data inicial<input aria-label="Data inicial" type="date" value={filtrosFormulario.dataInicio} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, dataInicio: event.target.value })} /></label>
            <label>Data final<input aria-label="Data final" type="date" value={filtrosFormulario.dataFim} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, dataFim: event.target.value })} /></label>
            <label>Status<select aria-label="Status" value={filtrosFormulario.status} onChange={(event) => setFiltrosFormulario({ ...filtrosFormulario, status: event.target.value as StatusAgendamento | '' })}>{status.map((item) => <option key={item.valor} value={item.valor}>{item.texto}</option>)}</select></label>
            <div><button type="submit">Aplicar filtros</button><button className={styles.secondary} onClick={limparFiltros} type="button">Hoje</button></div>
          </form>

          {carregando ? <p className={styles.feedback}>Carregando agenda...</p> : resultado?.conteudo.length === 0 ? <div className={styles.empty}><strong>Nenhum agendamento encontrado</strong><p>Ajuste o período ou os filtros para consultar outros atendimentos.</p></div> : (
            <div className={styles.list}>
              {resultado?.conteudo.map((agendamento) => {
                const podeConcluir = agendamento.status === 'CONFIRMADO' && new Date(agendamento.fim) <= new Date()
                return (
                  <article key={agendamento.id}>
                    <time dateTime={agendamento.inicio}><strong>{formatarHora(agendamento.inicio)}</strong><span>{formatarData(agendamento.inicio)}</span></time>
                    <div className={styles.appointment}><span className={`${styles.badge} ${styles[agendamento.status.toLowerCase()]}`}>{rotuloStatus(agendamento.status)}</span><h3>{agendamento.clienteNome}</h3><p>{agendamento.servicoNome} com {agendamento.profissionalNome}</p></div>
                    <div className={styles.actions}>
                      {agendamento.status === 'AGENDADO' && <button disabled={processandoId === agendamento.id} onClick={() => alterarStatus(agendamento, 'confirmar')} type="button">Confirmar</button>}
                      {(agendamento.status === 'AGENDADO' || agendamento.status === 'CONFIRMADO') && <button className={styles.danger} disabled={processandoId === agendamento.id} onClick={() => alterarStatus(agendamento, 'cancelar')} type="button">Cancelar</button>}
                      {podeConcluir && <button disabled={processandoId === agendamento.id} onClick={() => alterarStatus(agendamento, 'concluir')} type="button">Concluir</button>}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {resultado && resultado.totalPaginas > 1 && <nav className={styles.pagination} aria-label="Paginação"><button disabled={resultado.primeira || carregando} onClick={() => setPagina((atual) => atual - 1)} type="button">Anterior</button><span>Página {resultado.pagina + 1} de {resultado.totalPaginas}</span><button disabled={resultado.ultima || carregando} onClick={() => setPagina((atual) => atual + 1)} type="button">Próxima</button></nav>}
        </section>
      </main>
    </div>
  )
}

function mensagemDoErro(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(valor))
}

function formatarHora(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(valor))
}

function rotuloStatus(valor: StatusAgendamento) {
  return status.find((item) => item.valor === valor)?.texto ?? valor
}
