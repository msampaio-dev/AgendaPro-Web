import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { useAuth } from '../auth/context/useAuth'
import { aceitarConviteEquipe, listarMeusConvites, recusarConviteEquipe } from './conviteEquipeApi'
import type { ConviteEquipe } from './types'
import styles from './MeusConvitesPage.module.css'

export function MeusConvitesPage() {
	const navigate = useNavigate()
	const { token, atualizarCredencial } = useAuth()
	const [convites, setConvites] = useState<ConviteEquipe[]>([])
	const [carregando, setCarregando] = useState(true)
	const [processando, setProcessando] = useState<number | null>(null)
	const [erro, setErro] = useState('')

	useEffect(() => {
		if (!token) return
		listarMeusConvites(token).then(setConvites)
			.catch((error) => setErro(mensagemErro(error, 'Não foi possível carregar seus convites.')))
			.finally(() => setCarregando(false))
	}, [token])

	async function aceitar(convite: ConviteEquipe) {
		if (!token) return
		setProcessando(convite.id); setErro('')
		try {
			const credencial = await aceitarConviteEquipe(convite.id, token)
			await atualizarCredencial(credencial)
			navigate('/painel', { replace: true })
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível aceitar o convite.')) }
		finally { setProcessando(null) }
	}

	async function recusar(convite: ConviteEquipe) {
		if (!token || !window.confirm(`Recusar o convite da ${convite.barbeariaNome}?`)) return
		setProcessando(convite.id); setErro('')
		try { await recusarConviteEquipe(convite.id, token); setConvites(await listarMeusConvites(token)) }
		catch (error) { setErro(mensagemErro(error, 'Não foi possível recusar o convite.')) }
		finally { setProcessando(null) }
	}

	return <div className={styles.page}>
		<header><Link to="/">AgendaPro</Link><nav><Link to="/painel">Painel</Link><Link aria-current="page" to="/convites">Convites</Link></nav></header>
		<main><p className={styles.eyebrow}>Equipe</p><h1>Meus convites</h1><p className={styles.intro}>Aceite apenas unidades que você reconhece. Um perfil ativo em outra barbearia precisa ser transferido pelo administrador.</p>
			{erro && <div className={styles.error} role="alert">{erro}</div>}
			{carregando ? <p className={styles.feedback}>Carregando...</p> : convites.length === 0 ? <section className={styles.empty}><h2>Nenhum convite</h2><p>Quando uma barbearia convidar este e-mail, o convite aparecerá aqui.</p></section> : <section className={styles.list}>{convites.map((convite) => <article key={convite.id}><div><span>{convite.status}</span><h2>{convite.barbeariaNome}</h2><p>Convidado por {convite.criadoPorNome} · expira em {formatarData(convite.expiraEm)}</p></div>{convite.status === 'PENDENTE' && <div className={styles.actions}><button disabled={processando === convite.id} onClick={() => recusar(convite)} type="button">Recusar</button><button disabled={processando === convite.id} onClick={() => aceitar(convite)} type="button">Aceitar convite</button></div>}</article>)}</section>}
		</main>
	</div>
}

const formatarData = (valor: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(valor))
const mensagemErro = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback
