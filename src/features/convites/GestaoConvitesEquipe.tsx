import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { cancelarConviteEquipe, criarConviteEquipe, listarConvitesBarbearia } from './conviteEquipeApi'
import type { ConviteEquipe } from './types'
import styles from './ConvitesEquipe.module.css'

type Props = { barbeariaId: number; token: string }

export function GestaoConvitesEquipe({ barbeariaId, token }: Props) {
	const [email, setEmail] = useState('')
	const [convites, setConvites] = useState<ConviteEquipe[]>([])
	const [processando, setProcessando] = useState(false)
	const [erro, setErro] = useState('')
	const [mensagem, setMensagem] = useState('')

	useEffect(() => {
		listarConvitesBarbearia(barbeariaId, token).then(setConvites)
			.catch((error) => setErro(mensagemErro(error, 'Não foi possível carregar os convites.')))
	}, [barbeariaId, token])

	async function convidar(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setProcessando(true); limparAvisos()
		try {
			await criarConviteEquipe(barbeariaId, email, token)
			setConvites(await listarConvitesBarbearia(barbeariaId, token)); setEmail('')
			setMensagem('Convite criado. Ele aparecerá na conta vinculada a esse e-mail.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível criar o convite.')) }
		finally { setProcessando(false) }
	}

	async function cancelar(convite: ConviteEquipe) {
		if (!window.confirm(`Cancelar o convite para ${convite.email}?`)) return
		setProcessando(true); limparAvisos()
		try {
			await cancelarConviteEquipe(barbeariaId, convite.id, token)
			setConvites(await listarConvitesBarbearia(barbeariaId, token)); setMensagem('Convite cancelado.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível cancelar o convite.')) }
		finally { setProcessando(false) }
	}

	function limparAvisos() { setErro(''); setMensagem('') }

	return <section className={styles.management}>
		<header><span>Equipe</span><h2>Convidar profissional</h2><p>Use o mesmo e-mail que a pessoa utiliza ou utilizará no AgendaPro.</p></header>
		<form onSubmit={convidar}><input aria-label="E-mail do profissional" onChange={(event) => setEmail(event.target.value)} placeholder="profissional@email.com" required type="email" value={email} /><button disabled={processando}>{processando ? 'Enviando...' : 'Criar convite'}</button></form>
		{erro && <p className={styles.error} role="alert">{erro}</p>}{mensagem && <p className={styles.success} role="status">{mensagem}</p>}
		<div className={styles.list}>{convites.length === 0 ? <p>Nenhum convite criado.</p> : convites.map((convite) => <article key={convite.id}><div><strong>{convite.email}</strong><small>{rotuloStatus(convite.status)} · expira em {formatarData(convite.expiraEm)}</small></div>{convite.status === 'PENDENTE' && <button disabled={processando} onClick={() => cancelar(convite)} type="button">Cancelar</button>}</article>)}</div>
	</section>
}

const rotuloStatus = (status: ConviteEquipe['status']) => ({ PENDENTE: 'Pendente', ACEITO: 'Aceito', RECUSADO: 'Recusado', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' })[status]
const formatarData = (valor: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(valor))
const mensagemErro = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback
