import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import type { Barbearia, Profissional, Servico } from '../../agendamentos/types'
import { useAuth } from '../../auth/context/useAuth'
import { listarBarbeariasAdmin, listarEquipeDaBarbearia, listarServicosDaBarbearia } from './adminBarbeariaApi'
import styles from './AdminBarbeariaDetalhePage.module.css'

export function AdminBarbeariaDetalhePage() {
	const { id } = useParams()
	const { token } = useAuth()
	const barbeariaId = Number(id)
	const [barbearia, setBarbearia] = useState<Barbearia | null>(null)
	const [equipe, setEquipe] = useState<Profissional[]>([])
	const [servicos, setServicos] = useState<Servico[]>([])
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState('')

	useEffect(() => {
		if (!token || !Number.isInteger(barbeariaId)) {
			setCarregando(false)
			return
		}

		let ativo = true

		// Nao existe GET /barbearias/{id}: a unidade sai da listagem de
		// administracao, que o admin ja tem permissao para ler.
		Promise.all([
			listarBarbeariasAdmin(token),
			listarEquipeDaBarbearia(barbeariaId, token),
			listarServicosDaBarbearia(barbeariaId, token),
		])
			.then(([unidades, profissionais, catalogo]) => {
				if (!ativo) return
				setBarbearia(unidades.find((unidade) => unidade.id === barbeariaId) ?? null)
				setEquipe(profissionais)
				setServicos(catalogo)
			})
			.catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar a unidade.')) })
			.finally(() => { if (ativo) setCarregando(false) })

		return () => { ativo = false }
	}, [barbeariaId, token])

	const endereco = barbearia?.logradouro
		? `${barbearia.logradouro}, ${barbearia.numero} · ${barbearia.cidade}/${barbearia.estado}`
		: 'Endereço pendente'

	return <div className={styles.page}>
		<header className={styles.header}>
			<Link to="/">AgendaPro</Link>
			<nav>
				<Link to="/admin">Visão geral</Link>
				<Link aria-current="page" to="/admin/barbearias">Barbearias</Link>
				<Link to="/admin/usuarios">Usuários</Link>
				<Link to="/admin/profissionais">Profissionais</Link>
				<Link to="/painel">Painel</Link>
			</nav>
		</header>
		<main className={styles.content}>
			<Link className={styles.voltar} to="/admin/barbearias">← Todas as barbearias</Link>
			{erro && <div className={styles.error} role="alert">{erro}</div>}
			{carregando && <p className={styles.feedback}>Carregando unidade...</p>}
			{!carregando && !barbearia && !erro && <p className={styles.feedback}>Unidade não encontrada.</p>}
			{barbearia && <>
				<section className={styles.intro}>
					<div>
						<p className={styles.eyebrow}>Unidade #{barbearia.id}</p>
						<h1>{barbearia.nome}</h1>
						<span className={`${styles.selo} ${barbearia.ativo ? styles.ativa : styles.inativa}`}>
							{barbearia.ativo ? 'Ativa' : 'Inativa'}
						</span>
					</div>
					<p className={styles.resumo}>
						<strong>{barbearia.proprietarioNome ?? 'Sem proprietário definido'}</strong><br />
						{endereco}
					</p>
				</section>
				<div className={styles.secoes}>
					<section>
						<header>
							<div>
								<p className={styles.eyebrow}>Equipe</p>
								<h2>{equipe.filter((profissional) => profissional.ativo).length} profissionais ativos</h2>
							</div>
							<Link to="/admin/profissionais">Gerenciar equipe</Link>
						</header>
						{equipe.length === 0
							? <p className={styles.vazio}>Nenhum profissional nesta unidade.</p>
							: <div className={styles.lista}>{equipe.map((profissional) => (
								<article className={profissional.ativo ? '' : styles.inativo} key={profissional.id}>
									<div>
										<strong>{profissional.nome}</strong>
										<small>{profissional.email ?? 'E-mail indisponível'}</small>
									</div>
									{!profissional.ativo && <small>Inativo</small>}
								</article>
							))}</div>}
					</section>
					<section>
						<header>
							<div>
								<p className={styles.eyebrow}>Catálogo</p>
								<h2>{servicos.filter((servico) => servico.ativo).length} serviços ativos</h2>
							</div>
						</header>
						{servicos.length === 0
							? <p className={styles.vazio}>Nenhum serviço cadastrado nesta unidade.</p>
							: <div className={styles.lista}>{servicos.map((servico) => (
								<article className={servico.ativo ? '' : styles.inativo} key={servico.id}>
									<div>
										<strong>{servico.nome}</strong>
										<small>{servico.duracaoMinutos} min{servico.ativo ? '' : ' · inativo'}</small>
									</div>
									<span className={styles.preco}>R$ {servico.preco.toFixed(2)}</span>
								</article>
							))}</div>}
					</section>
				</div>
			</>}
		</main>
	</div>
}

function mensagemDoErro(error: unknown, fallback: string) {
	return error instanceof ApiError ? error.message : fallback
}
