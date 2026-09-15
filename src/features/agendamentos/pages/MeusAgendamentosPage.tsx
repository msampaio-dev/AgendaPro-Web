import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import { useAuth } from '../../auth/context/useAuth'
import {
  cancelarAgendamento,
  listarAgendamentosDoCliente,
  type FiltrosAgendamento,
} from '../agendamentoApi'
import type { Pagina, Agendamento, StatusAgendamento } from '../types'
import styles from './MeusAgendamentosPage.module.css'

const filtrosVazios: FiltrosAgendamento = { dataInicio: '', dataFim: '', status: '' }

const nomesStatus: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  CONCLUIDO: 'Concluído',
}

function dataHora(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor))
}

export function MeusAgendamentosPage() {
  const { sessao, token } = useAuth()
  const [filtros, setFiltros] = useState<FiltrosAgendamento>(filtrosVazios)
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosAgendamento>(filtrosVazios)
  const [resultado, setResultado] = useState<Pagina<Agendamento> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (pagina: number, filtrosAtuais: FiltrosAgendamento) => {
    if (!token || !sessao) return

    try {
      setResultado(await listarAgendamentosDoCliente(sessao.id, filtrosAtuais, pagina, token))
      setErro('')
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar seus agendamentos.')
    } finally {
      setCarregando(false)
    }
  }, [sessao, token])

  useEffect(() => {
    if (!token || !sessao) return
    let ativo = true

    listarAgendamentosDoCliente(sessao.id, filtrosVazios, 0, token)
      .then((pagina) => { if (ativo) setResultado(pagina) })
      .catch((error) => {
        if (ativo) setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar seus agendamentos.')
      })
      .finally(() => { if (ativo) setCarregando(false) })

    return () => { ativo = false }
  }, [sessao, token])

  function aplicarFiltros() {
    if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
      setErro('A data inicial não pode ser posterior à data final.')
      return
    }
    const novosFiltros = { ...filtros }
    setFiltrosAplicados(novosFiltros)
    setCarregando(true)
    setErro('')
    carregar(0, novosFiltros)
  }

  function limparFiltros() {
    setFiltros(filtrosVazios)
    setFiltrosAplicados(filtrosVazios)
    setCarregando(true)
    setErro('')
    carregar(0, filtrosVazios)
  }

  function mudarPagina(pagina: number) {
    setCarregando(true)
    setErro('')
    carregar(pagina, filtrosAplicados)
  }

  async function cancelar(agendamento: Agendamento) {
    if (!token) return
    const confirmou = window.confirm(
      `Deseja cancelar ${agendamento.servicoNome} em ${dataHora(agendamento.inicio)}?`,
    )
    if (!confirmou) return

    setCancelandoId(agendamento.id)
    setErro('')

    try {
      await cancelarAgendamento(agendamento.id, token)
      const paginaAtual = resultado?.pagina ?? 0
      const paginaAposCancelamento = resultado?.conteudo.length === 1 && paginaAtual > 0
        ? paginaAtual - 1
        : paginaAtual
      await carregar(paginaAposCancelamento, filtrosAplicados)
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível cancelar o agendamento.')
    } finally {
      setCancelandoId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><Link to="/">AgendaPro</Link><div><Link to="/agendar">Novo agendamento</Link><Link to="/painel">Painel</Link></div></header>
      <main className={styles.content}>
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}>Minha conta</p><h1>Meus agendamentos</h1></div>
          <Link to="/agendar">Agendar horário</Link>
        </div>

        <section className={styles.filters} aria-label="Filtros dos agendamentos">
          <label>De<input type="date" value={filtros.dataInicio} onChange={(event) => setFiltros({ ...filtros, dataInicio: event.target.value })} /></label>
          <label>Até<input type="date" value={filtros.dataFim} onChange={(event) => setFiltros({ ...filtros, dataFim: event.target.value })} /></label>
          <label>Status<select value={filtros.status} onChange={(event) => setFiltros({ ...filtros, status: event.target.value as FiltrosAgendamento['status'] })}>
            <option value="">Todos</option><option value="AGENDADO">Agendado</option><option value="CONFIRMADO">Confirmado</option><option value="CANCELADO">Cancelado</option><option value="CONCLUIDO">Concluído</option>
          </select></label>
          <button onClick={aplicarFiltros} type="button">Filtrar</button>
          <button className={styles.clearButton} onClick={limparFiltros} type="button">Limpar</button>
        </section>

        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {carregando ? <p className={styles.feedback}>Carregando agendamentos...</p> : resultado?.conteudo.length === 0 ? (
          <section className={styles.empty}><span>Agenda livre</span><h2>Nenhum agendamento encontrado.</h2><p>Altere os filtros ou escolha um novo horário.</p><Link to="/agendar">Fazer agendamento</Link></section>
        ) : (
          <section className={styles.list} aria-label="Lista de agendamentos">
            {resultado?.conteudo.map((agendamento) => (
              <article className={styles.appointment} key={agendamento.id}>
                <div className={styles.date}><strong>{dataHora(agendamento.inicio)}</strong><span>até {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(agendamento.fim))}</span></div>
                <div className={styles.details}><span>Serviço</span><strong>{agendamento.servicoNome}</strong><p>com {agendamento.profissionalNome}</p></div>
                <span className={`${styles.status} ${styles[agendamento.status.toLowerCase()]}`}>{nomesStatus[agendamento.status]}</span>
                {(agendamento.status === 'AGENDADO' || agendamento.status === 'CONFIRMADO') && (
                  <button className={styles.cancelButton} disabled={cancelandoId === agendamento.id}
                    onClick={() => cancelar(agendamento)} type="button">
                    {cancelandoId === agendamento.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                )}
              </article>
            ))}
          </section>
        )}

        {resultado && resultado.totalPaginas > 1 && <nav className={styles.pagination} aria-label="Paginação">
          <button disabled={resultado.primeira || carregando} onClick={() => mudarPagina(resultado.pagina - 1)} type="button">Anterior</button>
          <span>Página {resultado.pagina + 1} de {resultado.totalPaginas} · {resultado.totalElementos} registros</span>
          <button disabled={resultado.ultima || carregando} onClick={() => mudarPagina(resultado.pagina + 1)} type="button">Próxima</button>
        </nav>}
      </main>
    </div>
  )
}
