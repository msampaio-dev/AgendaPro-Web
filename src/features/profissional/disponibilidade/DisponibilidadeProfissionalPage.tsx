import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import { useAuth } from '../../auth/context/useAuth'
import {
  cadastrarExcecao,
  cadastrarHorario,
  cadastrarJornadaComIntervalo,
  listarExcecoes,
  listarHorarios,
  removerExcecao,
  removerHorario,
  type DiaSemana,
  type ExcecaoDisponibilidade,
  type HorarioAtendimento,
  type TipoExcecao,
} from './disponibilidadeApi'
import styles from './DisponibilidadeProfissionalPage.module.css'

const dias: { valor: DiaSemana; nome: string; curto: string }[] = [
  { valor: 'MONDAY', nome: 'Segunda-feira', curto: 'Seg' },
  { valor: 'TUESDAY', nome: 'Terça-feira', curto: 'Ter' },
  { valor: 'WEDNESDAY', nome: 'Quarta-feira', curto: 'Qua' },
  { valor: 'THURSDAY', nome: 'Quinta-feira', curto: 'Qui' },
  { valor: 'FRIDAY', nome: 'Sexta-feira', curto: 'Sex' },
  { valor: 'SATURDAY', nome: 'Sábado', curto: 'Sáb' },
  { valor: 'SUNDAY', nome: 'Domingo', curto: 'Dom' },
]

function hojeLocal() {
  const data = new Date()
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

export function DisponibilidadeProfissionalPage() {
  const { sessao, token } = useAuth()
  const profissionalId = sessao?.profissionalId
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([])
  const [diaSemana, setDiaSemana] = useState<DiaSemana>('MONDAY')
  const [inicioSemanal, setInicioSemanal] = useState('09:00')
  const [fimSemanal, setFimSemanal] = useState('18:00')
  const [possuiIntervalo, setPossuiIntervalo] = useState(false)
  const [inicioIntervalo, setInicioIntervalo] = useState('12:00')
  const [fimIntervalo, setFimIntervalo] = useState('13:00')
  const [dataExcecao, setDataExcecao] = useState(hojeLocal)
  const [tipoExcecao, setTipoExcecao] = useState<TipoExcecao>('BLOQUEIO')
  const [diaInteiro, setDiaInteiro] = useState(true)
  const [inicioExcecao, setInicioExcecao] = useState('12:00')
  const [fimExcecao, setFimExcecao] = useState('13:00')
  const [excecoes, setExcecoes] = useState<ExcecaoDisponibilidade[]>([])
  const [carregandoHorarios, setCarregandoHorarios] = useState(true)
  const [carregandoExcecoes, setCarregandoExcecoes] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (!token || !profissionalId) return
    let ativo = true
    listarHorarios(profissionalId, token)
      .then((dados) => { if (ativo) setHorarios(dados) })
      .catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar os horários.')) })
      .finally(() => { if (ativo) setCarregandoHorarios(false) })
    return () => { ativo = false }
  }, [profissionalId, token])

  useEffect(() => {
    if (!token || !profissionalId) return
    let ativo = true
    listarExcecoes(profissionalId, dataExcecao, token)
      .then((dados) => { if (ativo) setExcecoes(dados) })
      .catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar as exceções.')) })
      .finally(() => { if (ativo) setCarregandoExcecoes(false) })
    return () => { ativo = false }
  }, [dataExcecao, profissionalId, token])

  async function recarregarHorarios() {
    if (!token || !profissionalId) return
    setHorarios(await listarHorarios(profissionalId, token))
  }

  async function recarregarExcecoes() {
    if (!token || !profissionalId) return
    setExcecoes(await listarExcecoes(profissionalId, dataExcecao, token))
  }

  async function adicionarHorario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !profissionalId || !intervaloValido(inicioSemanal, fimSemanal)) {
      setErro('O início do horário deve ser anterior ao fim.')
      return
    }
    if (possuiIntervalo && !jornadaComIntervaloValida(
      inicioSemanal,
      inicioIntervalo,
      fimIntervalo,
      fimSemanal,
    )) {
      setErro('O almoço deve começar e terminar dentro do horário de trabalho.')
      return
    }
    iniciarProcessamento()
    try {
      if (possuiIntervalo) {
        await cadastrarJornadaComIntervalo({
          profissionalId,
          diaSemana,
          horarioInicio: inicioSemanal,
          inicioIntervalo,
          fimIntervalo,
          horarioFim: fimSemanal,
        }, token)
      } else {
        await cadastrarHorario({ profissionalId, diaSemana, horarioInicio: inicioSemanal, horarioFim: fimSemanal }, token)
      }
      await recarregarHorarios()
      setMensagem(possuiIntervalo
        ? 'Jornada adicionada com intervalo de almoço.'
        : 'Horário semanal adicionado.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível adicionar o horário.'))
    } finally {
      finalizarProcessamento()
    }
  }

  async function excluirHorario(horario: HorarioAtendimento) {
    if (!token || !window.confirm(`Remover o intervalo ${hora(horario.horarioInicio)}–${hora(horario.horarioFim)}?`)) return
    iniciarProcessamento()
    try {
      await removerHorario(horario.id, token)
      await recarregarHorarios()
      setMensagem('Horário semanal removido.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível remover o horário.'))
    } finally {
      finalizarProcessamento()
    }
  }

  async function adicionarExcecao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !profissionalId) return
    const usaIntervalo = tipoExcecao === 'DISPONIBILIDADE_EXTRA' || !diaInteiro
    if (usaIntervalo && !intervaloValido(inicioExcecao, fimExcecao)) {
      setErro('O início da exceção deve ser anterior ao fim.')
      return
    }
    iniciarProcessamento()
    try {
      await cadastrarExcecao({
        profissionalId,
        data: dataExcecao,
        tipo: tipoExcecao,
        horarioInicio: usaIntervalo ? inicioExcecao : null,
        horarioFim: usaIntervalo ? fimExcecao : null,
      }, token)
      await recarregarExcecoes()
      setMensagem(tipoExcecao === 'BLOQUEIO' ? 'Bloqueio adicionado.' : 'Disponibilidade extra adicionada.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível adicionar a exceção.'))
    } finally {
      finalizarProcessamento()
    }
  }

  async function excluirExcecao(excecao: ExcecaoDisponibilidade) {
    if (!token || !window.confirm('Remover esta exceção de disponibilidade?')) return
    iniciarProcessamento()
    try {
      await removerExcecao(excecao.id, token)
      await recarregarExcecoes()
      setMensagem('Exceção removida.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível remover a exceção.'))
    } finally {
      finalizarProcessamento()
    }
  }

  function iniciarProcessamento() {
    setProcessando(true)
    setErro('')
    setMensagem('')
  }

  function finalizarProcessamento() {
    setProcessando(false)
  }

  if (!profissionalId) {
    return <main className={styles.unavailable}><h1>Perfil profissional indisponível.</h1><Link to="/painel">Voltar ao painel</Link></main>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><Link to="/">AgendaPro</Link><nav><Link to="/profissional/agenda">Agenda</Link><Link to="/profissional/disponibilidade">Disponibilidade</Link><Link to="/painel">Painel</Link></nav></header>
      <main className={styles.content}>
        <section className={styles.intro}><div><p className={styles.eyebrow}>Área profissional</p><h1>Disponibilidade</h1></div><p>Horários definidos em <strong>{sessao?.fusoHorario || 'seu fuso local'}</strong>. A agenda semanal se repete; exceções valem apenas na data escolhida.</p></section>
        {erro && <div className={styles.error} role="alert">{erro}</div>}
        {mensagem && <div className={styles.success} role="status">{mensagem}</div>}

        <section className={styles.block}>
          <header><div><span>Rotina</span><h2>Horários semanais</h2></div><p>Defina a jornada completa e, se desejar, reserve automaticamente o intervalo de almoço.</p></header>
          <form className={styles.scheduleForm} onSubmit={adicionarHorario}>
            <label>Dia<select onChange={(event) => setDiaSemana(event.target.value as DiaSemana)} value={diaSemana}>{dias.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.nome}</option>)}</select></label>
            <label>Início do trabalho<input required type="time" value={inicioSemanal} onChange={(event) => setInicioSemanal(event.target.value)} /></label>
            <label>Fim do trabalho<input required type="time" value={fimSemanal} onChange={(event) => setFimSemanal(event.target.value)} /></label>
            <label className={styles.lunchToggle}><input checked={possuiIntervalo} type="checkbox" onChange={(event) => setPossuiIntervalo(event.target.checked)} />Reservar almoço</label>
            {possuiIntervalo && <label>Início do almoço<input required type="time" value={inicioIntervalo} onChange={(event) => setInicioIntervalo(event.target.value)} /></label>}
            {possuiIntervalo && <label>Fim do almoço<input required type="time" value={fimIntervalo} onChange={(event) => setFimIntervalo(event.target.value)} /></label>}
            <button disabled={processando} type="submit">Adicionar jornada</button>
          </form>
          {carregandoHorarios ? <p className={styles.feedback}>Carregando horários...</p> : <div className={styles.week}>
            {dias.map((dia) => {
              const horariosDoDia = horarios.filter((horario) => horario.diaSemana === dia.valor)
              return <article key={dia.valor}><div className={styles.day}><span>{dia.curto}</span><strong>{dia.nome}</strong></div><div className={styles.intervals}>{horariosDoDia.length === 0 ? <small>Sem atendimento</small> : horariosDoDia.map((horario) => <div key={horario.id}><span>{hora(horario.horarioInicio)}–{hora(horario.horarioFim)}</span><button disabled={processando} onClick={() => excluirHorario(horario)} type="button" aria-label={`Remover ${dia.nome} das ${hora(horario.horarioInicio)} às ${hora(horario.horarioFim)}`}>Remover</button></div>)}</div></article>
            })}
          </div>}
        </section>

        <section className={styles.block}>
          <header><div><span>Ajustes pontuais</span><h2>Exceções e bloqueios</h2></div><label className={styles.datePicker}>Data<input min={hojeLocal()} type="date" value={dataExcecao} onChange={(event) => { setCarregandoExcecoes(true); setDataExcecao(event.target.value) }} /></label></header>
          <form className={styles.exceptionForm} onSubmit={adicionarExcecao}>
            <label>Tipo<select value={tipoExcecao} onChange={(event) => { const tipo = event.target.value as TipoExcecao; setTipoExcecao(tipo); if (tipo === 'DISPONIBILIDADE_EXTRA') setDiaInteiro(false) }}><option value="BLOQUEIO">Bloqueio</option><option value="DISPONIBILIDADE_EXTRA">Disponibilidade extra</option></select></label>
            <label className={styles.checkbox}><input checked={diaInteiro} disabled={tipoExcecao === 'DISPONIBILIDADE_EXTRA'} type="checkbox" onChange={(event) => setDiaInteiro(event.target.checked)} />Dia inteiro</label>
            <label>Início<input disabled={diaInteiro} required={!diaInteiro} type="time" value={inicioExcecao} onChange={(event) => setInicioExcecao(event.target.value)} /></label>
            <label>Fim<input disabled={diaInteiro} required={!diaInteiro} type="time" value={fimExcecao} onChange={(event) => setFimExcecao(event.target.value)} /></label>
            <button disabled={processando} type="submit">Adicionar exceção</button>
          </form>
          {carregandoExcecoes ? <p className={styles.feedback}>Carregando exceções...</p> : excecoes.length === 0 ? <p className={styles.feedback}>Nenhuma exceção nesta data.</p> : <div className={styles.exceptions}>{excecoes.map((excecao) => <article key={excecao.id}><span className={excecao.tipo === 'BLOQUEIO' ? styles.blocked : styles.extra}>{excecao.tipo === 'BLOQUEIO' ? 'Bloqueio' : 'Horário extra'}</span><strong>{excecao.diaInteiro ? 'Dia inteiro' : `${hora(excecao.horarioInicio)}–${hora(excecao.horarioFim)}`}</strong><button disabled={processando} onClick={() => excluirExcecao(excecao)} type="button">Remover</button></article>)}</div>}
        </section>
      </main>
    </div>
  )
}

function intervaloValido(inicio: string, fim: string) {
  return Boolean(inicio && fim && inicio < fim)
}

function jornadaComIntervaloValida(
  inicio: string,
  inicioIntervalo: string,
  fimIntervalo: string,
  fim: string,
) {
  return Boolean(
    inicio
    && inicioIntervalo
    && fimIntervalo
    && fim
    && inicio < inicioIntervalo
    && inicioIntervalo < fimIntervalo
    && fimIntervalo < fim,
  )
}

function hora(valor: string | null) {
  return valor?.slice(0, 5) ?? ''
}

function mensagemDoErro(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}
