import { type FormEvent, useState } from 'react'
import { mensagemDeErro } from '../../../services/api'
import { criarAgendamento, sugerirAgendamento } from '../agendamentoApi'
import { formatarDiaPorExtenso } from '../agendamentoFormatters'
import type { Agendamento, SugestaoAgendamento } from '../types'
import styles from './AssistenteAgendamento.module.css'

type Props = {
  token: string
  clienteId: number
  onAjustar: (sugestao: SugestaoAgendamento) => void
  onAgendado: (agendamento: Agendamento, sugestao: SugestaoAgendamento) => void
}

const LIMITE_TEXTO = 300

// A IA só preenche a sugestão. Confirmar usa o mesmo POST /agendamentos da
// escolha manual, e qualquer erro aqui manda o cliente para o fluxo manual.
export function AssistenteAgendamento({ token, clienteId, onAjustar, onAgendado }: Props) {
  const [texto, setTexto] = useState('')
  const [sugestao, setSugestao] = useState<SugestaoAgendamento | null>(null)
  const [horarioInicio, setHorarioInicio] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')

  async function sugerir(event: FormEvent) {
    event.preventDefault()
    // Durante a confirmação, uma nova sugestão apagaria o cartão que está sendo
    // confirmado e gastaria cota à toa.
    if (!texto.trim() || carregando || confirmando) return
    setCarregando(true); setErro(''); setSugestao(null); setHorarioInicio('')
    try { setSugestao(await sugerirAgendamento(texto.trim(), token)) }
    catch (error) { setErro(mensagemDeErro(error, 'Não foi possível montar uma sugestão agora.')) }
    finally { setCarregando(false) }
  }

  async function confirmar() {
    if (!sugestao || !horarioInicio) return
    setConfirmando(true); setErro('')
    try {
      const agendamento = await criarAgendamento({
        clienteId,
        profissionalId: sugestao.profissionalId,
        servicoId: sugestao.servicoId,
        servicoAdicionalId: sugestao.servicoAdicionalId,
        data: sugestao.data,
        horarioInicio,
      }, token)
      onAgendado(agendamento, sugestao)
    } catch (error) { setErro(mensagemDeErro(error, 'Não foi possível confirmar o agendamento.')) }
    finally { setConfirmando(false) }
  }

  function ajustar() {
    if (!sugestao) return
    onAjustar(sugestao)
    setSugestao(null); setHorarioInicio('')
  }

  const diaMudou = sugestao?.dataPedida != null && sugestao.dataPedida !== sugestao.data

  return <section aria-label="Sugestão por texto" className={styles.assistente}>
    <form onSubmit={sugerir}>
      <label htmlFor="assistente-texto">Prefere descrever o que quer?</label>
      <textarea id="assistente-texto" maxLength={LIMITE_TEXTO} onChange={(event) => setTexto(event.target.value)} placeholder="Ex.: corte e barba sexta à tarde com o João" rows={2} value={texto} />
      <div className={styles.rodape}>
        <small>A sugestão é feita por IA e pode errar. Nada é reservado antes da sua confirmação.</small>
        <button disabled={!texto.trim() || carregando || confirmando} type="submit">{carregando ? 'Procurando...' : 'Sugerir horário'}</button>
      </div>
    </form>

    {erro && <div className={styles.erro} role="alert"><p>{erro}</p><p>Você pode escolher tudo manualmente logo abaixo.</p></div>}

    {sugestao && <div className={styles.sugestao}>
      <dl>
        <div><dt>Barbearia</dt><dd>{sugestao.barbeariaNome}</dd></div>
        <div><dt>Profissional</dt><dd>{sugestao.profissionalNome}</dd></div>
        <div><dt>Serviços</dt><dd>{sugestao.servicoNome}{sugestao.servicoAdicionalNome ? ` + ${sugestao.servicoAdicionalNome}` : ''}</dd></div>
        <div><dt>Data</dt><dd>{formatarDiaPorExtenso(sugestao.data)}</dd></div>
      </dl>
      {sugestao.observacao && <p className={styles.nota}>{sugestao.observacao}</p>}
      {diaMudou && sugestao.dataPedida && <p className={styles.nota}>Não havia horário livre em {formatarDiaPorExtenso(sugestao.dataPedida)} no período pedido. Esta é a data mais próxima com vaga.</p>}
      {sugestao.horarios.length === 0
        ? <p className={styles.nota}>Não encontrei horário livre nos próximos dias. Use Ajustar para trocar a data ou o profissional.</p>
        : <div className={styles.horarios}>{sugestao.horarios.map((item) => <button aria-pressed={horarioInicio === item.inicio} key={item.inicio} onClick={() => setHorarioInicio(item.inicio)} type="button">{item.inicio.slice(0, 5)}</button>)}</div>}
      <div className={styles.acoes}>
        <button disabled={!horarioInicio || confirmando} onClick={confirmar} type="button">{confirmando ? 'Confirmando...' : horarioInicio ? `Confirmar às ${horarioInicio.slice(0, 5)}` : 'Escolha um horário'}</button>
        <button className={styles.secundario} disabled={confirmando} onClick={ajustar} type="button">Ajustar</button>
      </div>
      <small>Você ainda pode pedir {sugestao.sugestoesRestantesHoje} {sugestao.sugestoesRestantesHoje === 1 ? 'sugestão' : 'sugestões'} hoje.</small>
    </div>}
  </section>
}
