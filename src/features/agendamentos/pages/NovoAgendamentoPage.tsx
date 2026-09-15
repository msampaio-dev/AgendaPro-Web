import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { ApiError } from '../../../services/api'
import {
  consultarDisponibilidade,
  consultarProximasDisponibilidades,
  criarAgendamento,
  listarProfissionaisDoServico,
  listarServicos,
} from '../agendamentoApi'
import type { Agendamento, Disponibilidade, HorarioDisponivel, Profissional, Servico, SituacaoDisponibilidade } from '../types'
import styles from './NovoAgendamentoPage.module.css'

function dataLocalAtual() {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

function dataAtualNoFuso(fusoHorario: string) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

function formatarData(data: string, opcoes?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', opcoes ?? {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${data}T12:00:00`))
}

const mensagensSemHorario: Record<SituacaoDisponibilidade, string> = {
  DISPONIVEL: '',
  SEM_EXPEDIENTE: 'O profissional não atende neste dia.',
  DIA_BLOQUEADO: 'A agenda está bloqueada nesta data.',
  SEM_ENCAIXE: 'Os intervalos livres são menores que a duração deste serviço.',
  HORARIO_LOCAL_INVALIDO: 'Este horário não existe no fuso local devido à mudança do relógio.',
  HORARIOS_ENCERRADOS: 'Todos os horários deste dia já passaram.',
  HORARIOS_OCUPADOS: 'Todos os horários deste dia já foram reservados.',
}

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function NovoAgendamentoPage() {
  const { sessao, token } = useAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [proximasDatas, setProximasDatas] = useState<Disponibilidade[]>([])
  const [servicoId, setServicoId] = useState<number | null>(null)
  const [profissionalId, setProfissionalId] = useState<number | null>(null)
  const [data, setData] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(false)
  const [carregandoProximasDatas, setCarregandoProximasDatas] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [consultaRealizada, setConsultaRealizada] = useState(false)
  const [situacao, setSituacao] = useState<SituacaoDisponibilidade | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const selecaoAtual = useRef(0)

  useEffect(() => {
    if (!token) return
    let ativo = true

    listarServicos(token)
      .then((resultado) => { if (ativo) setServicos(resultado.filter((servico) => servico.ativo)) })
      .catch((error) => { if (ativo) setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar os serviços.') })
      .finally(() => { if (ativo) setCarregando(false) })

    return () => { ativo = false }
  }, [token])

  const servicoSelecionado = useMemo(
    () => servicos.find((servico) => servico.id === servicoId),
    [servicoId, servicos],
  )
  const profissionalSelecionado = useMemo(
    () => profissionais.find((profissional) => profissional.id === profissionalId),
    [profissionalId, profissionais],
  )

  async function selecionarServico(id: number) {
    if (!token) return
    setServicoId(id)
    setProfissionalId(null)
    setData('')
    setHorarios([])
    setProximasDatas([])
    setHorarioInicio('')
    setConsultaRealizada(false)
    setSituacao(null)
    setErro('')
    setConsultando(false)
    setCarregandoProximasDatas(false)
    selecaoAtual.current += 1
    setCarregandoProfissionais(true)

    try {
      setProfissionais(await listarProfissionaisDoServico(id, token))
    } catch (error) {
      setProfissionais([])
      setErro(error instanceof ApiError ? error.message : 'Não foi possível carregar os profissionais.')
    } finally {
      setCarregandoProfissionais(false)
    }
  }

  async function consultarData(dataSelecionada: string) {
    if (!token || !servicoId || !profissionalId || !dataSelecionada) return
    const requisicao = selecaoAtual.current + 1
    selecaoAtual.current = requisicao
    setData(dataSelecionada)
    setErro('')
    setHorarioInicio('')
    setConsultaRealizada(false)
    setConsultando(true)

    try {
      const disponibilidade = await consultarDisponibilidade(profissionalId, servicoId, dataSelecionada, token)
      if (requisicao !== selecaoAtual.current) return
      setHorarios(disponibilidade.horarios)
      setSituacao(disponibilidade.situacao)
      setConsultaRealizada(true)
    } catch (error) {
      if (requisicao !== selecaoAtual.current) return
      setHorarios([])
      setSituacao(null)
      setConsultaRealizada(true)
      setErro(error instanceof ApiError ? error.message : 'Não foi possível consultar os horários.')
    } finally {
      if (requisicao === selecaoAtual.current) setConsultando(false)
    }
  }

  async function selecionarProfissional(id: number) {
    if (!token || !servicoId) return
    const requisicao = selecaoAtual.current + 1
    selecaoAtual.current = requisicao
    const profissional = profissionais.find((item) => item.id === id)
    const hoje = profissional ? dataAtualNoFuso(profissional.fusoHorario) : dataLocalAtual()

    setProfissionalId(id)
    setData('')
    setHorarios([])
    setProximasDatas([])
    setHorarioInicio('')
    setSituacao(null)
    setConsultaRealizada(false)
    setErro('')
    setCarregandoProximasDatas(true)

    try {
      const resultado = await consultarProximasDisponibilidades(id, servicoId, hoje, token)
      if (requisicao !== selecaoAtual.current) return
      setProximasDatas(resultado)
      if (resultado.length > 0) {
        const primeiraData = resultado[0]
        setData(primeiraData.data)
        setHorarios(primeiraData.horarios)
        setSituacao(primeiraData.situacao)
        setConsultaRealizada(true)
      }
    } catch (error) {
      if (requisicao !== selecaoAtual.current) return
      setErro(error instanceof ApiError ? error.message : 'Não foi possível consultar as próximas datas.')
    } finally {
      if (requisicao === selecaoAtual.current) setCarregandoProximasDatas(false)
    }
  }

  async function confirmar() {
    if (!token || !sessao || !servicoId || !profissionalId || !data || !horarioInicio) return
    setErro('')
    setConfirmando(true)

    try {
      setAgendamento(await criarAgendamento({
        clienteId: sessao.id,
        profissionalId,
        servicoId,
        data,
        horarioInicio,
      }, token))
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível confirmar o agendamento.')
    } finally {
      setConfirmando(false)
    }
  }

  if (agendamento) {
    const inicio = new Date(agendamento.inicio)
    return (
      <main className={styles.successPage}>
        <span className={styles.successMark} aria-hidden="true">✓</span>
        <p className={styles.eyebrow}>Reserva confirmada</p>
        <h1>Seu horário está agendado.</h1>
        <p>{servicoSelecionado?.nome} com {profissionalSelecionado?.nome}</p>
        <strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: profissionalSelecionado?.fusoHorario }).format(inicio)}</strong>
        <div><Link to="/painel">Voltar ao painel</Link><Link to="/">Página inicial</Link></div>
      </main>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><Link to="/">AgendaPro</Link><Link to="/painel">Voltar ao painel</Link></header>
      <main className={styles.content}>
        <p className={styles.eyebrow}>Novo agendamento</p>
        <h1>Escolha seu próximo horário.</h1>
        <p className={styles.subtitle}>Você só poderá avançar com opções realmente disponíveis na agenda.</p>
        {erro && <div className={styles.error} role="alert">{erro}</div>}

        <section className={styles.step}>
          <div className={styles.stepTitle}><span>01</span><div><h2>Serviço</h2><p>O que você deseja fazer?</p></div></div>
          {carregando ? <p>Carregando serviços...</p> : (
            <div className={styles.cardGrid}>
              {servicos.map((servico) => (
                <button aria-pressed={servicoId === servico.id}
                  className={servicoId === servico.id ? styles.selectedCard : styles.card}
                  disabled={carregandoProfissionais} key={servico.id}
                  onClick={() => selecionarServico(servico.id)} type="button">
                  <strong>{servico.nome}</strong><span>{servico.duracaoMinutos} min</span><b>{moeda(servico.preco)}</b>
                </button>
              ))}
            </div>
          )}
        </section>

        {servicoId && <section className={styles.step}>
          <div className={styles.stepTitle}><span>02</span><div><h2>Profissional</h2><p>Quem cuidará de você?</p></div></div>
          {carregandoProfissionais ? <p>Carregando profissionais...</p> : profissionais.length === 0 ? (
            <p className={styles.empty}>Nenhum profissional ativo oferece este serviço.</p>
          ) : (
            <div className={styles.cardGrid}>
              {profissionais.map((profissional) => (
                <button aria-pressed={profissionalId === profissional.id}
                  className={profissionalId === profissional.id ? styles.selectedCard : styles.card}
                  key={profissional.id} onClick={() => selecionarProfissional(profissional.id)} type="button">
                  <span className={styles.avatar}>{profissional.nome.charAt(0)}</span>
                  <strong>{profissional.nome}</strong><span>{profissional.fusoHorario.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </section>}

        {profissionalId && <section className={styles.step}>
          <div className={styles.stepTitle}><span>03</span><div><h2>Data e horário</h2><p>Consulte a agenda em tempo real.</p></div></div>
          <div className={styles.suggestions} aria-live="polite">
            <strong>Próximas datas disponíveis</strong>
            {carregandoProximasDatas ? <p>Procurando horários nos próximos 30 dias...</p> : proximasDatas.length === 0 ? (
              <p>Nenhum horário livre nos próximos 30 dias. O profissional pode estar sem jornada configurada ou com a agenda totalmente ocupada.</p>
            ) : (
              <div className={styles.suggestionGrid}>
                {proximasDatas.map((disponibilidade) => (
                  <button className={data === disponibilidade.data ? styles.selectedSuggestion : ''}
                    key={disponibilidade.data} onClick={() => consultarData(disponibilidade.data)} type="button">
                    <strong>{formatarData(disponibilidade.data)}</strong>
                    <span>{disponibilidade.horarios.length} {disponibilidade.horarios.length === 1 ? 'horário' : 'horários'}</span>
                    <small>{disponibilidade.horarios[0].inicio.slice(0, 5)}–{disponibilidade.horarios.at(-1)?.inicio.slice(0, 5)}</small>
                  </button>
                ))}
              </div>
            )}
            <small>As sugestões consideram expediente, almoço, bloqueios, duração do serviço e reservas existentes.</small>
          </div>
          <div className={styles.dateRow}>
            <label>Outra data<input min={profissionalSelecionado ? dataAtualNoFuso(profissionalSelecionado.fusoHorario) : dataLocalAtual()} onChange={(event) => consultarData(event.target.value)} type="date" value={data} /></label>
            <button disabled={!data || consultando} onClick={() => consultarData(data)} type="button">{consultando ? 'Consultando...' : 'Atualizar horários'}</button>
          </div>
          {consultaRealizada && !consultando && horarios.length === 0 && situacao && <p className={styles.empty}>{mensagensSemHorario[situacao]}</p>}
          {horarios.length > 0 && <div className={styles.slots}>
            {horarios.map((horario) => (
              <button aria-pressed={horarioInicio === horario.inicio}
                className={horarioInicio === horario.inicio ? styles.selectedSlot : ''}
                key={horario.inicio} onClick={() => setHorarioInicio(horario.inicio)} type="button">
                {horario.inicio.slice(0, 5)}
              </button>
            ))}
          </div>}
        </section>}

        {horarioInicio && <section className={styles.summary}>
          <div><span>Serviço</span><strong>{servicoSelecionado?.nome}</strong></div>
          <div><span>Profissional</span><strong>{profissionalSelecionado?.nome}</strong></div>
          <div><span>Quando</span><strong>{data.split('-').reverse().join('/')} às {horarioInicio.slice(0, 5)}</strong></div>
          <button disabled={confirmando} onClick={confirmar} type="button">{confirmando ? 'Confirmando...' : 'Confirmar agendamento'}</button>
        </section>}
      </main>
    </div>
  )
}
