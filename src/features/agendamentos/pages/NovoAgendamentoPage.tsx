import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { ApiError, apiAssetUrl } from '../../../services/api'
import {
  consultarDisponibilidade,
  consultarProximasDisponibilidades,
  criarAgendamento,
  listarBarbearias,
  listarProfissionaisDaBarbearia,
  listarServicosDoProfissional,
} from '../agendamentoApi'
import type { Agendamento, Barbearia, Disponibilidade, HorarioDisponivel, Profissional, Servico, SituacaoDisponibilidade } from '../types'
import styles from './NovoAgendamentoPage.module.css'

function dataLocalAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
}

function dataAtualNoFuso(fusoHorario: string) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${data}T12:00:00`))
}

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

const mensagensSemHorario: Record<SituacaoDisponibilidade, string> = {
  DISPONIVEL: '', SEM_EXPEDIENTE: 'O profissional não atende neste dia.', DIA_BLOQUEADO: 'A agenda está bloqueada nesta data.',
  SEM_ENCAIXE: 'Não há intervalo contínuo suficiente para os serviços selecionados.', HORARIO_LOCAL_INVALIDO: 'Este horário não existe no fuso local.',
  HORARIOS_ENCERRADOS: 'Todos os horários deste dia já passaram.', HORARIOS_OCUPADOS: 'Todos os horários deste dia já foram reservados.',
}

export function NovoAgendamentoPage() {
  const { sessao, token } = useAuth()
  const [barbearias, setBarbearias] = useState<Barbearia[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbeariaId, setBarbeariaId] = useState<number | null>(null)
  const [profissionalId, setProfissionalId] = useState<number | null>(null)
  const [servicoId, setServicoId] = useState<number | null>(null)
  const [adicionarBarba, setAdicionarBarba] = useState(false)
  const [data, setData] = useState('')
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [proximasDatas, setProximasDatas] = useState<Disponibilidade[]>([])
  const [horarioInicio, setHorarioInicio] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [consultaRealizada, setConsultaRealizada] = useState(false)
  const [situacao, setSituacao] = useState<SituacaoDisponibilidade | null>(null)
  const [erro, setErro] = useState('')
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const requisicaoAtual = useRef(0)

  useEffect(() => {
    if (!token) return
    let ativo = true
    listarBarbearias(token)
      .then((dados) => { if (ativo) setBarbearias(dados.filter((item) => item.ativo)) })
      .catch((error) => { if (ativo) setErro(mensagemErro(error, 'Não foi possível carregar as barbearias.')) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [token])

  const barbearia = barbearias.find((item) => item.id === barbeariaId)
  const profissional = profissionais.find((item) => item.id === profissionalId)
  const servico = servicos.find((item) => item.id === servicoId)
  const servicoBarba = useMemo(() => servicos.find((item) => item.nome.toLocaleLowerCase('pt-BR') === 'barba'), [servicos])
  const servicosPrincipais = useMemo(() => servicos.filter((item) => item.id !== servicoBarba?.id), [servicos, servicoBarba])
  const servicoAdicionalId = adicionarBarba ? servicoBarba?.id ?? null : null
  const duracaoTotal = (servico?.duracaoMinutos ?? 0) + (adicionarBarba ? servicoBarba?.duracaoMinutos ?? 0 : 0)
  const precoTotal = (servico?.preco ?? 0) + (adicionarBarba ? servicoBarba?.preco ?? 0 : 0)

  function limparAgenda() {
    setData(''); setHorarios([]); setProximasDatas([]); setHorarioInicio(''); setSituacao(null); setConsultaRealizada(false)
    requisicaoAtual.current += 1
  }

  async function selecionarBarbearia(id: number) {
    if (!token) return
    setBarbeariaId(id); setProfissionalId(null); setServicoId(null); setAdicionarBarba(false); setServicos([]); limparAgenda(); setErro(''); setProcessando(true)
    try { setProfissionais((await listarProfissionaisDaBarbearia(id, token)).filter((item) => item.ativo)) }
    catch (error) { setProfissionais([]); setErro(mensagemErro(error, 'Não foi possível carregar os profissionais.')) }
    finally { setProcessando(false) }
  }

  async function selecionarProfissional(id: number) {
    if (!token) return
    setProfissionalId(id); setServicoId(null); setAdicionarBarba(false); limparAgenda(); setErro(''); setProcessando(true)
    try { setServicos(await listarServicosDoProfissional(id, token)) }
    catch (error) { setServicos([]); setErro(mensagemErro(error, 'Não foi possível carregar os serviços.')) }
    finally { setProcessando(false) }
  }

  async function buscarProximasDatas(idServico: number, comBarba: boolean) {
    if (!token || !profissionalId) return
    const atual = profissionais.find((item) => item.id === profissionalId)
    const hoje = atual ? dataAtualNoFuso(atual.fusoHorario) : dataLocalAtual()
    const adicionalId = comBarba ? servicoBarba?.id ?? null : null
    limparAgenda()
    const requisicao = ++requisicaoAtual.current
    setProcessando(true); setErro('')
    try {
      const resultado = await consultarProximasDisponibilidades(profissionalId, idServico, hoje, token, adicionalId)
      if (requisicao !== requisicaoAtual.current) return
      setProximasDatas(resultado)
      if (resultado[0]) { setData(resultado[0].data); setHorarios(resultado[0].horarios); setSituacao(resultado[0].situacao); setConsultaRealizada(true) }
    } catch (error) { if (requisicao === requisicaoAtual.current) setErro(mensagemErro(error, 'Não foi possível consultar as próximas datas.')) }
    finally { if (requisicao === requisicaoAtual.current) setProcessando(false) }
  }

  function selecionarServico(id: number) {
    setServicoId(id); setAdicionarBarba(false); void buscarProximasDatas(id, false)
  }

  function alternarBarba(marcado: boolean) {
    setAdicionarBarba(marcado)
    if (servicoId) void buscarProximasDatas(servicoId, marcado)
  }

  async function consultarData(novaData: string) {
    if (!token || !profissionalId || !servicoId || !novaData) return
    const requisicao = ++requisicaoAtual.current
    setData(novaData); setHorarioInicio(''); setProcessando(true); setErro('')
    try {
      const resposta = await consultarDisponibilidade(profissionalId, servicoId, novaData, token, servicoAdicionalId)
      if (requisicao !== requisicaoAtual.current) return
      setHorarios(resposta.horarios); setSituacao(resposta.situacao); setConsultaRealizada(true)
    } catch (error) { if (requisicao === requisicaoAtual.current) setErro(mensagemErro(error, 'Não foi possível consultar os horários.')) }
    finally { if (requisicao === requisicaoAtual.current) setProcessando(false) }
  }

  async function confirmar() {
    if (!token || !sessao || !profissionalId || !servicoId || !data || !horarioInicio) return
    setProcessando(true); setErro('')
    try { setAgendamento(await criarAgendamento({ clienteId: sessao.id, profissionalId, servicoId, servicoAdicionalId, data, horarioInicio }, token)) }
    catch (error) { setErro(mensagemErro(error, 'Não foi possível confirmar o agendamento.')) }
    finally { setProcessando(false) }
  }

  if (agendamento) return <main className={styles.successPage}><span className={styles.successMark}>✓</span><p className={styles.eyebrow}>Reserva confirmada</p><h1>Seu horário está agendado.</h1><p>{servico?.nome}{adicionarBarba ? ' + Barba' : ''} com {profissional?.nome} na {barbearia?.nome}</p><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: profissional?.fusoHorario }).format(new Date(agendamento.inicio))}</strong><div><Link to="/painel">Voltar ao painel</Link><Link to="/">Página inicial</Link></div></main>

  return <div className={styles.page}><header className={styles.header}><Link to="/">AgendaPro</Link><Link to="/painel">Voltar ao painel</Link></header><main className={styles.content}>
    <p className={styles.eyebrow}>Novo agendamento</p><h1>Escolha onde e como cuidar do seu estilo.</h1><p className={styles.subtitle}>Os horários exibidos consideram todos os serviços escolhidos.</p>{erro && <div className={styles.error} role="alert">{erro}</div>}

    <Etapa numero="01" titulo="Barbearia" descricao="Em qual unidade você deseja ser atendido?">{carregando ? <p>Carregando barbearias...</p> : <div className={styles.cardGrid}>{barbearias.map((item) => <button aria-pressed={barbeariaId === item.id} className={barbeariaId === item.id ? styles.selectedCard : styles.card} key={item.id} onClick={() => selecionarBarbearia(item.id)} type="button"><span className={styles.avatar}>{item.fotoUrl ? <img alt="" src={apiAssetUrl(item.fotoUrl) ?? ''} /> : item.nome.charAt(0)}</span><strong>{item.nome}</strong><span>Ver equipe</span></button>)}</div>}</Etapa>

    {barbeariaId && <Etapa numero="02" titulo="Profissional" descricao={`Escolha a equipe da ${barbearia?.nome}.`}>{processando ? <p>Carregando profissionais...</p> : profissionais.length === 0 ? <p className={styles.empty}>Nenhum profissional ativo nesta barbearia.</p> : <div className={styles.cardGrid}>{profissionais.map((item) => <button aria-pressed={profissionalId === item.id} className={profissionalId === item.id ? styles.selectedCard : styles.card} key={item.id} onClick={() => selecionarProfissional(item.id)} type="button"><span className={styles.avatar}>{item.fotoUrl ? <img alt="" src={apiAssetUrl(item.fotoUrl) ?? ''} /> : item.nome.charAt(0)}</span><strong>{item.nome}</strong><span>{item.barbeariaNome}</span></button>)}</div>}</Etapa>}

    {profissionalId && <Etapa numero="03" titulo="Serviços" descricao="Escolha o corte e, se quiser, adicione barba.">{processando && servicos.length === 0 ? <p>Carregando serviços...</p> : <><div className={styles.cardGrid}>{servicosPrincipais.map((item) => <button aria-pressed={servicoId === item.id} className={servicoId === item.id ? styles.selectedCard : styles.card} key={item.id} onClick={() => selecionarServico(item.id)} type="button"><strong>{item.nome}</strong><span>{item.duracaoMinutos} min</span><b>{moeda(item.preco)}</b></button>)}</div>{servicoId && servicoBarba && <label className={styles.addon}><input checked={adicionarBarba} onChange={(event) => alternarBarba(event.target.checked)} type="checkbox" /><span><strong>Adicionar barba</strong><small>+ {servicoBarba.duracaoMinutos} min · {moeda(servicoBarba.preco)}</small></span></label>}</>}</Etapa>}

    {servicoId && <Etapa numero="04" titulo="Data e horário" descricao={`${duracaoTotal} min · ${moeda(precoTotal)}`}><div className={styles.suggestions}><strong>Próximas datas disponíveis</strong>{processando ? <p>Procurando horários...</p> : proximasDatas.length === 0 ? <p>Nenhum horário livre nos próximos 30 dias.</p> : <div className={styles.suggestionGrid}>{proximasDatas.map((item) => <button className={data === item.data ? styles.selectedSuggestion : ''} key={item.data} onClick={() => consultarData(item.data)} type="button"><strong>{formatarData(item.data)}</strong><span>{item.horarios.length} horários</span><small>{item.horarios[0].inicio.slice(0, 5)}–{item.horarios.at(-1)?.inicio.slice(0, 5)}</small></button>)}</div>}</div><div className={styles.dateRow}><label>Outra data<input min={profissional ? dataAtualNoFuso(profissional.fusoHorario) : dataLocalAtual()} onChange={(event) => consultarData(event.target.value)} type="date" value={data} /></label><button disabled={!data || processando} onClick={() => consultarData(data)} type="button">Atualizar horários</button></div>{consultaRealizada && !processando && horarios.length === 0 && situacao && <p className={styles.empty}>{mensagensSemHorario[situacao]}</p>}{horarios.length > 0 && <div className={styles.slots}>{horarios.map((item) => <button aria-pressed={horarioInicio === item.inicio} className={horarioInicio === item.inicio ? styles.selectedSlot : ''} key={item.inicio} onClick={() => setHorarioInicio(item.inicio)} type="button">{item.inicio.slice(0, 5)}</button>)}</div>}</Etapa>}

    {horarioInicio && <section className={styles.summary}><div><span>Barbearia</span><strong>{barbearia?.nome}</strong></div><div><span>Profissional</span><strong>{profissional?.nome}</strong></div><div><span>Serviços</span><strong>{servico?.nome}{adicionarBarba ? ' + Barba' : ''}</strong></div><div><span>Quando</span><strong>{data.split('-').reverse().join('/')} às {horarioInicio.slice(0, 5)}</strong></div><button disabled={processando} onClick={confirmar} type="button">{processando ? 'Confirmando...' : `Confirmar · ${moeda(precoTotal)}`}</button></section>}
  </main></div>
}

function Etapa({ numero, titulo, descricao, children }: { numero: string; titulo: string; descricao: string; children: ReactNode }) {
  return <section className={styles.step}><div className={styles.stepTitle}><span>{numero}</span><div><h2>{titulo}</h2><p>{descricao}</p></div></div>{children}</section>
}

function mensagemErro(error: unknown, fallback: string) { return error instanceof ApiError ? error.message : fallback }
