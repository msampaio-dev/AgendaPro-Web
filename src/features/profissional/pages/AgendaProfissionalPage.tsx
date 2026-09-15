import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import {
  confirmarAgendamento,
  concluirAgendamento,
  listarAgendaDoProfissional,
  type FiltrosAgendaProfissional,
} from '../../agendamentos/agendamentoApi'
import type { Agendamento, Pagina, StatusAgendamento } from '../../agendamentos/types'
import { useAuth } from '../../auth/context/useAuth'
import styles from './AgendaProfissionalPage.module.css'

function hojeLocal() {
  const data = new Date()
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

const dataHoje = hojeLocal()
const filtrosIniciais: FiltrosAgendaProfissional = { dataInicio: dataHoje, dataFim: dataHoje, status: '' }
const nomesStatus: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', CONCLUIDO: 'Concluído',
}

export function AgendaProfissionalPage() {
  const { sessao, token } = useAuth()
  const profissionalId = sessao?.profissionalId
  const [filtros, setFiltros] = useState<FiltrosAgendaProfissional>(filtrosIniciais)
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosAgendaProfissional>(filtrosIniciais)
  const [resultado, setResultado] = useState<Pagina<Agendamento> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [alterandoId, setAlterandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(() => Date.now())

  const carregar = useCallback(async (pagina: number, filtrosAtuais: FiltrosAgendaProfissional) => {
    if (!token || !profissionalId) return
    try {
      setResultado(await listarAgendaDoProfissional(profissionalId, filtrosAtuais, pagina, token))
      setErro('')
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar sua agenda.')
    } finally {
      setCarregando(false)
    }
  }, [profissionalId, token])

  useEffect(() => {
    if (!token || !profissionalId) return
    let ativo = true
    listarAgendaDoProfissional(profissionalId, filtrosIniciais, 0, token)
      .then((pagina) => { if (ativo) setResultado(pagina) })
      .catch((error) => { if (ativo) setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar sua agenda.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [profissionalId, token])

  useEffect(() => {
    const atualizador = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(atualizador)
  }, [])

  function aplicarFiltros() {
    if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
      setErro('A data inicial não pode ser posterior à data final.')
      return
    }
    const novosFiltros = { ...filtros }
    setFiltrosAplicados(novosFiltros)
    setCarregando(true)
    carregar(0, novosFiltros)
  }

  function mudarPagina(pagina: number) {
    setCarregando(true)
    carregar(pagina, filtrosAplicados)
  }

  async function alterarStatus(agendamento: Agendamento, acao: 'confirmar' | 'concluir') {
    if (!token) return
    if (acao === 'concluir' && !window.confirm(`Concluir o atendimento de ${agendamento.clienteNome}?`)) return
    setAlterandoId(agendamento.id)
    setErro('')
    try {
      if (acao === 'confirmar') await confirmarAgendamento(agendamento.id, token)
      else await concluirAgendamento(agendamento.id, token)
      await carregar(resultado?.pagina ?? 0, filtrosAplicados)
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível alterar o atendimento.')
    } finally {
      setAlterandoId(null)
    }
  }

  function formatar(valor: string, opcoes: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: sessao?.fusoHorario || undefined }).format(new Date(valor))
  }

  if (!profissionalId) {
    return <main className={styles.unavailable}><h1>Perfil profissional indisponível.</h1><p>Entre novamente após o backend ser reiniciado.</p><Link to="/painel">Voltar ao painel</Link></main>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><Link to="/">AgendaPro</Link><div><Link to="/profissional/agenda">Minha agenda</Link><Link to="/profissional/disponibilidade">Disponibilidade</Link><Link to="/painel">Painel</Link></div></header>
      <main className={styles.content}>
        <div className={styles.heading}><div><p className={styles.eyebrow}>Área profissional</p><h1>Minha agenda</h1><p>Horários exibidos em {sessao.fusoHorario || 'seu fuso local'}.</p></div></div>

        <section className={styles.filters} aria-label="Filtros da agenda">
          <label>Data inicial<input type="date" value={filtros.dataInicio} onChange={(event) => setFiltros({ ...filtros, dataInicio: event.target.value })} /></label>
          <label>Data final<input type="date" value={filtros.dataFim} onChange={(event) => setFiltros({ ...filtros, dataFim: event.target.value })} /></label>
          <label>Status<select value={filtros.status} onChange={(event) => setFiltros({ ...filtros, status: event.target.value as FiltrosAgendaProfissional['status'] })}>
            <option value="">Todos</option><option value="AGENDADO">Agendado</option><option value="CONFIRMADO">Confirmado</option><option value="CANCELADO">Cancelado</option><option value="CONCLUIDO">Concluído</option>
          </select></label>
          <button onClick={aplicarFiltros} type="button">Atualizar agenda</button>
        </section>

        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {carregando ? <p className={styles.feedback}>Carregando agenda...</p> : resultado?.conteudo.length === 0 ? (
          <section className={styles.empty}><span>Sem atendimentos</span><h2>Sua agenda está livre neste período.</h2><p>Altere as datas ou o status para consultar outros horários.</p></section>
        ) : <section className={styles.timeline} aria-label="Atendimentos">
          {resultado?.conteudo.map((agendamento) => {
            const podeConcluir = agendamento.status === 'CONFIRMADO' && new Date(agendamento.fim).getTime() <= agora
            return <article className={styles.appointment} key={agendamento.id}>
              <time dateTime={agendamento.inicio}><strong>{formatar(agendamento.inicio, { hour: '2-digit', minute: '2-digit' })}</strong><span>{formatar(agendamento.inicio, { weekday: 'short', day: '2-digit', month: 'short' })}</span></time>
              <div className={styles.customer}><span>Cliente</span><h2>{agendamento.clienteNome}</h2><p>{agendamento.servicoNome} · até {formatar(agendamento.fim, { hour: '2-digit', minute: '2-digit' })}</p></div>
              <span className={`${styles.status} ${styles[agendamento.status.toLowerCase()]}`}>{nomesStatus[agendamento.status]}</span>
              <div className={styles.actions}>
                {agendamento.status === 'AGENDADO' && <button disabled={alterandoId === agendamento.id} onClick={() => alterarStatus(agendamento, 'confirmar')} type="button">Confirmar</button>}
                {agendamento.status === 'CONFIRMADO' && <button disabled={!podeConcluir || alterandoId === agendamento.id} title={podeConcluir ? undefined : 'Disponível após o fim do atendimento'} onClick={() => alterarStatus(agendamento, 'concluir')} type="button">{podeConcluir ? 'Concluir' : 'Aguardando'}</button>}
              </div>
            </article>
          })}
        </section>}

        {resultado && resultado.totalPaginas > 1 && <nav className={styles.pagination} aria-label="Paginação">
          <button disabled={resultado.primeira || carregando} onClick={() => mudarPagina(resultado.pagina - 1)} type="button">Anterior</button>
          <span>Página {resultado.pagina + 1} de {resultado.totalPaginas}</span>
          <button disabled={resultado.ultima || carregando} onClick={() => mudarPagina(resultado.pagina + 1)} type="button">Próxima</button>
        </nav>}
      </main>
    </div>
  )
}
