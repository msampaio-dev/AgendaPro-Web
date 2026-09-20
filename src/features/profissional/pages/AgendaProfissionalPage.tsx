import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import {
  confirmarAgendamento,
  concluirAgendamento,
  listarAgendaDoProfissional,
  type FiltrosAgendaProfissional,
} from '../../agendamentos/agendamentoApi'
import { nomeCompletoServicos } from '../../agendamentos/agendamentoFormatters'
import type { Agendamento, Pagina, StatusAgendamento } from '../../agendamentos/types'
import { useAuth } from '../../auth/context/useAuth'
import styles from './AgendaProfissionalPage.module.css'

type VisaoAgenda = 'DIA' | 'SEMANA'

const nomesStatus: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  CONCLUIDO: 'Concluído',
}

function dataNoFuso(fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

function somarDias(data: string, quantidade: number) {
  const [ano, mes, dia] = data.split('-').map(Number)
  const resultado = new Date(Date.UTC(ano, mes - 1, dia + quantidade))
  return resultado.toISOString().slice(0, 10)
}

function inicioDaSemana(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
  return somarDias(data, -(diaSemana === 0 ? 6 : diaSemana - 1))
}

function criarFiltros(
  visao: VisaoAgenda,
  dataReferencia: string,
  status: StatusAgendamento | '',
): FiltrosAgendaProfissional {
  const dataInicio = visao === 'DIA' ? dataReferencia : inicioDaSemana(dataReferencia)
  return {
    dataInicio,
    dataFim: visao === 'DIA' ? dataReferencia : somarDias(dataInicio, 6),
    status,
  }
}

export function AgendaProfissionalPage() {
  const { sessao, token } = useAuth()
  const profissionalId = sessao?.profissionalId
  const hoje = dataNoFuso(sessao?.fusoHorario)
  const [visao, setVisao] = useState<VisaoAgenda>('DIA')
  const [dataReferencia, setDataReferencia] = useState(hoje)
  const [status, setStatus] = useState<StatusAgendamento | ''>('')
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => criarFiltros('DIA', hoje, ''))
  const [resultado, setResultado] = useState<Pagina<Agendamento> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [alterandoId, setAlterandoId] = useState<number | null>(null)
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [agora, setAgora] = useState(() => Date.now())
  const [atualizadoEm, setAtualizadoEm] = useState(() => Date.now())
  const paginaAtual = useRef(0)
  const filtrosAtuais = useRef(filtrosAplicados)
  const requisicaoAtual = useRef(0)

  const carregar = useCallback(async (
    pagina: number,
    filtros: FiltrosAgendaProfissional,
    silencioso = false,
  ) => {
    if (!token || !profissionalId) return
    const requisicao = requisicaoAtual.current + 1
    requisicaoAtual.current = requisicao
    if (!silencioso) setCarregando(true)
    try {
      const resposta = await listarAgendaDoProfissional(profissionalId, filtros, pagina, token)
      if (requisicao !== requisicaoAtual.current) return
      setResultado(resposta)
      paginaAtual.current = resposta.pagina
      filtrosAtuais.current = filtros
      setAtualizadoEm(Date.now())
      setErro('')
    } catch (error) {
      if (requisicao !== requisicaoAtual.current) return
      setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar sua agenda.')
    } finally {
      if (!silencioso && requisicao === requisicaoAtual.current) setCarregando(false)
    }
  }, [profissionalId, token])

  useEffect(() => {
    if (!token || !profissionalId) return
    carregar(0, filtrosAtuais.current)
  }, [carregar, profissionalId, token])

  useEffect(() => {
    const atualizar = () => {
      setAgora(Date.now())
      carregar(paginaAtual.current, filtrosAtuais.current, true)
    }
    const intervalo = window.setInterval(atualizar, 60_000)
    window.addEventListener('focus', atualizar)
    return () => {
      window.clearInterval(intervalo)
      window.removeEventListener('focus', atualizar)
    }
  }, [carregar])

  useEffect(() => {
    if (!selecionado) return
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelecionado(null)
    }
    window.addEventListener('keydown', fecharComEscape)
    return () => window.removeEventListener('keydown', fecharComEscape)
  }, [selecionado])

  function aplicarPeriodo(
    novaVisao: VisaoAgenda,
    novaData: string,
    novoStatus = status,
  ) {
    const novosFiltros = criarFiltros(novaVisao, novaData, novoStatus)
    setVisao(novaVisao)
    setDataReferencia(novaData)
    setFiltrosAplicados(novosFiltros)
    setMensagem('')
    carregar(0, novosFiltros)
  }

  function navegar(direcao: -1 | 1) {
    aplicarPeriodo(visao, somarDias(dataReferencia, direcao * (visao === 'DIA' ? 1 : 7)))
  }

  function aplicarFiltros() {
    aplicarPeriodo(visao, dataReferencia, status)
  }

  function mudarPagina(pagina: number) {
    carregar(pagina, filtrosAplicados)
  }

  async function alterarStatus(agendamento: Agendamento, acao: 'confirmar' | 'concluir') {
    if (!token) return
    if (acao === 'concluir' && !window.confirm(`Concluir o atendimento de ${agendamento.clienteNome}?`)) return
    setAlterandoId(agendamento.id)
    setErro('')
    setMensagem('')
    try {
      const atualizado = acao === 'confirmar'
        ? await confirmarAgendamento(agendamento.id, token)
        : await concluirAgendamento(agendamento.id, token)
      setSelecionado((atual) => atual?.id === atualizado.id ? atualizado : atual)
      setMensagem(acao === 'confirmar'
        ? `Atendimento de ${agendamento.clienteNome} confirmado.`
        : `Atendimento de ${agendamento.clienteNome} concluído.`)
      await carregar(paginaAtual.current, filtrosAtuais.current, true)
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível alterar o atendimento.')
    } finally {
      setAlterandoId(null)
    }
  }

  function formatar(valor: string, opcoes: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat('pt-BR', {
      ...opcoes,
      timeZone: sessao?.fusoHorario || undefined,
    }).format(new Date(valor))
  }

  function dataLocalDoAgendamento(valor: string) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: sessao?.fusoHorario || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(valor))
    const obter = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value
    return `${obter('year')}-${obter('month')}-${obter('day')}`
  }

  const grupos = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>()
    for (const agendamento of resultado?.conteudo ?? []) {
      const data = dataLocalDoAgendamento(agendamento.inicio)
      mapa.set(data, [...(mapa.get(data) ?? []), agendamento])
    }
    return [...mapa.entries()]
  // O fuso faz parte da sessão e muda apenas quando uma nova sessão é carregada.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado?.conteudo, sessao?.fusoHorario])

  const rotuloPeriodo = visao === 'DIA'
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${dataReferencia}T12:00:00`))
    : `${filtrosAplicados.dataInicio.split('-').reverse().join('/')} – ${filtrosAplicados.dataFim.split('-').reverse().join('/')}`

  if (!profissionalId) {
    return <main className={styles.unavailable}><h1>Perfil profissional indisponível.</h1><p>Entre novamente após o backend ser reiniciado.</p><Link to="/painel">Voltar ao painel</Link></main>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><Link to="/">AgendaPro</Link><div><Link to="/profissional/agenda">Minha agenda</Link><Link to="/profissional/disponibilidade">Disponibilidade</Link><Link to="/profissional/barbearia">Minha barbearia</Link><Link to="/painel">Painel</Link></div></header>
      <main className={styles.content}>
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}>Área profissional</p><h1>Minha agenda</h1><p>Horários exibidos em {sessao.fusoHorario || 'seu fuso local'}.</p></div>
          <small>Atualizada às {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(atualizadoEm)}</small>
        </div>

        <section className={styles.viewControls} aria-label="Visualização da agenda">
          <div className={styles.viewSwitch}>
            <button aria-pressed={visao === 'DIA'} onClick={() => aplicarPeriodo('DIA', dataReferencia)} type="button">Dia</button>
            <button aria-pressed={visao === 'SEMANA'} onClick={() => aplicarPeriodo('SEMANA', dataReferencia)} type="button">Semana</button>
          </div>
          <div className={styles.periodNavigation}>
            <button aria-label="Período anterior" onClick={() => navegar(-1)} type="button">←</button>
            <strong>{rotuloPeriodo}</strong>
            <button aria-label="Próximo período" onClick={() => navegar(1)} type="button">→</button>
          </div>
          <button className={styles.todayButton} onClick={() => aplicarPeriodo(visao, hoje)} type="button">Hoje</button>
        </section>

        <section className={styles.filters} aria-label="Filtros da agenda">
          <label>Data de referência<input type="date" value={dataReferencia} onChange={(event) => aplicarPeriodo(visao, event.target.value)} /></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as StatusAgendamento | '')}>
            <option value="">Todos</option><option value="AGENDADO">Agendado</option><option value="CONFIRMADO">Confirmado</option><option value="CANCELADO">Cancelado</option><option value="CONCLUIDO">Concluído</option>
          </select></label>
          <button onClick={aplicarFiltros} type="button">Atualizar agenda</button>
        </section>

        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {mensagem && <div className={styles.success} role="status">{mensagem}</div>}
        {carregando ? <p className={styles.feedback}>Carregando agenda...</p> : resultado?.conteudo.length === 0 ? (
          <section className={styles.empty}><span>Sem atendimentos</span><h2>Sua agenda está livre neste período.</h2><p>Altere a data, a visualização ou o status para consultar outros horários.</p></section>
        ) : <div className={styles.days}>
          {grupos.map(([data, agendamentos]) => (
            <section className={styles.dayGroup} key={data}>
              <header><h2>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${data}T12:00:00`))}</h2><span>{agendamentos.length} {agendamentos.length === 1 ? 'atendimento' : 'atendimentos'}</span></header>
              <div className={styles.timeline} aria-label={`Atendimentos de ${data}`}>
                {agendamentos.map((agendamento) => {
                  const inicio = new Date(agendamento.inicio).getTime()
                  const fim = new Date(agendamento.fim).getTime()
                  const emAtendimento = agendamento.status === 'CONFIRMADO' && inicio <= agora && fim > agora
                  const podeConcluir = agendamento.status === 'CONFIRMADO' && fim <= agora
                  return <article className={`${styles.appointment} ${emAtendimento ? styles.current : ''}`} key={agendamento.id}>
                    <time dateTime={agendamento.inicio}><strong>{formatar(agendamento.inicio, { hour: '2-digit', minute: '2-digit' })}</strong><span>até {formatar(agendamento.fim, { hour: '2-digit', minute: '2-digit' })}</span></time>
                    <div className={styles.customer}><span>Cliente</span><h3>{agendamento.clienteNome}</h3><p>{nomeCompletoServicos(agendamento)}{emAtendimento ? ' · em atendimento' : ''}</p></div>
                    <span className={`${styles.status} ${styles[agendamento.status.toLowerCase()]}`}>{nomesStatus[agendamento.status]}</span>
                    <div className={styles.actions}>
                      <button className={styles.detailsButton} onClick={() => setSelecionado(agendamento)} type="button">Detalhes</button>
                      {agendamento.status === 'AGENDADO' && <button disabled={alterandoId === agendamento.id} onClick={() => alterarStatus(agendamento, 'confirmar')} type="button">Confirmar</button>}
                      {agendamento.status === 'CONFIRMADO' && <button disabled={!podeConcluir || alterandoId === agendamento.id} title={podeConcluir ? undefined : 'Disponível após o fim do atendimento'} onClick={() => alterarStatus(agendamento, 'concluir')} type="button">{podeConcluir ? 'Concluir' : 'Aguardando'}</button>}
                    </div>
                  </article>
                })}
              </div>
            </section>
          ))}
        </div>}

        {resultado && resultado.totalPaginas > 1 && <nav className={styles.pagination} aria-label="Paginação">
          <button disabled={resultado.primeira || carregando} onClick={() => mudarPagina(resultado.pagina - 1)} type="button">Anterior</button>
          <span>Página {resultado.pagina + 1} de {resultado.totalPaginas}</span>
          <button disabled={resultado.ultima || carregando} onClick={() => mudarPagina(resultado.pagina + 1)} type="button">Próxima</button>
        </nav>}
      </main>

      {selecionado && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelecionado(null) }}>
        <section aria-labelledby="detalhes-atendimento" aria-modal="true" className={styles.details} role="dialog">
          <header><div><p className={styles.eyebrow}>Atendimento #{selecionado.id}</p><h2 id="detalhes-atendimento">Detalhes da reserva</h2></div><button aria-label="Fechar detalhes" onClick={() => setSelecionado(null)} type="button">×</button></header>
          <dl>
            <div><dt>Cliente</dt><dd>{selecionado.clienteNome}</dd></div>
            <div><dt>Serviço</dt><dd>{nomeCompletoServicos(selecionado)}</dd></div>
            <div><dt>Data</dt><dd>{formatar(selecionado.inicio, { dateStyle: 'full' })}</dd></div>
            <div><dt>Horário</dt><dd>{formatar(selecionado.inicio, { hour: '2-digit', minute: '2-digit' })}–{formatar(selecionado.fim, { hour: '2-digit', minute: '2-digit' })}</dd></div>
            <div><dt>Status</dt><dd>{nomesStatus[selecionado.status]}</dd></div>
          </dl>
          <div className={styles.detailActions}>
            {selecionado.status === 'AGENDADO' && <button disabled={alterandoId === selecionado.id} onClick={() => alterarStatus(selecionado, 'confirmar')} type="button">Confirmar atendimento</button>}
            {selecionado.status === 'CONFIRMADO' && <button disabled={new Date(selecionado.fim).getTime() > agora || alterandoId === selecionado.id} onClick={() => alterarStatus(selecionado, 'concluir')} type="button">Concluir atendimento</button>}
          </div>
        </section>
      </div>}
    </div>
  )
}
