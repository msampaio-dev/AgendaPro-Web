import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { ApiError } from '../../../services/api'
import {
  consultarDisponibilidade,
  criarAgendamento,
  listarProfissionaisDoServico,
  listarServicos,
} from '../agendamentoApi'
import type { Agendamento, HorarioDisponivel, Profissional, Servico } from '../types'
import styles from './NovoAgendamentoPage.module.css'

function dataLocalAtual() {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function NovoAgendamentoPage() {
  const { sessao, token } = useAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [servicoId, setServicoId] = useState<number | null>(null)
  const [profissionalId, setProfissionalId] = useState<number | null>(null)
  const [data, setData] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [consultaRealizada, setConsultaRealizada] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)

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
    setHorarioInicio('')
    setConsultaRealizada(false)
    setErro('')
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

  async function buscarHorarios() {
    if (!token || !servicoId || !profissionalId || !data) return
    setErro('')
    setHorarioInicio('')
    setConsultaRealizada(false)
    setConsultando(true)

    try {
      const disponibilidade = await consultarDisponibilidade(profissionalId, servicoId, data, token)
      setHorarios(disponibilidade.horarios)
      setConsultaRealizada(true)
    } catch (error) {
      setHorarios([])
      setConsultaRealizada(true)
      setErro(error instanceof ApiError ? error.message : 'Não foi possível consultar os horários.')
    } finally {
      setConsultando(false)
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
        <strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(inicio)}</strong>
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
                  key={profissional.id} onClick={() => { setProfissionalId(profissional.id); setData(''); setHorarios([]); setHorarioInicio(''); setConsultaRealizada(false) }} type="button">
                  <span className={styles.avatar}>{profissional.nome.charAt(0)}</span>
                  <strong>{profissional.nome}</strong><span>{profissional.fusoHorario.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </section>}

        {profissionalId && <section className={styles.step}>
          <div className={styles.stepTitle}><span>03</span><div><h2>Data e horário</h2><p>Consulte a agenda em tempo real.</p></div></div>
          <div className={styles.dateRow}>
            <label>Data<input min={dataLocalAtual()} onChange={(event) => { setData(event.target.value); setHorarios([]); setHorarioInicio(''); setConsultaRealizada(false) }} type="date" value={data} /></label>
            <button disabled={!data || consultando} onClick={buscarHorarios} type="button">{consultando ? 'Consultando...' : 'Ver horários'}</button>
          </div>
          {data && !consultando && !consultaRealizada && <p className={styles.empty}>Clique em “Ver horários” para consultar a agenda.</p>}
          {consultaRealizada && !consultando && horarios.length === 0 && <p className={styles.empty}>Não há horários disponíveis nessa data.</p>}
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
