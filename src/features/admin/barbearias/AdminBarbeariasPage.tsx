import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiAssetUrl } from '../../../services/api'
import type { Barbearia, DadosBarbearia, DiaSemana, HorarioFuncionamentoInput, Profissional } from '../../agendamentos/types'
import { useAuth } from '../../auth/context/useAuth'
import {
	atualizarBarbearia,
	atualizarFotoBarbearia,
	cadastrarBarbearia,
	desativarBarbearia,
	listarBarbeariasAdmin,
	listarProfissionaisParaProprietario,
	removerFotoBarbearia,
} from './adminBarbeariaApi'
import styles from './AdminBarbeariasPage.module.css'

const dias: Array<{ valor: DiaSemana; rotulo: string }> = [
	{ valor: 'MONDAY', rotulo: 'Seg' }, { valor: 'TUESDAY', rotulo: 'Ter' },
	{ valor: 'WEDNESDAY', rotulo: 'Qua' }, { valor: 'THURSDAY', rotulo: 'Qui' },
	{ valor: 'FRIDAY', rotulo: 'Sex' }, { valor: 'SATURDAY', rotulo: 'Sáb' },
	{ valor: 'SUNDAY', rotulo: 'Dom' },
]

const enderecoVazio = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' }

export function AdminBarbeariasPage() {
	const { token } = useAuth()
	const [barbearias, setBarbearias] = useState<Barbearia[]>([])
	const [profissionais, setProfissionais] = useState<Profissional[]>([])
	const [editando, setEditando] = useState<Barbearia | null>(null)
	const [nome, setNome] = useState('')
	const [endereco, setEndereco] = useState(enderecoVazio)
	const [proprietarioId, setProprietarioId] = useState('')
	const [diasAbertos, setDiasAbertos] = useState<DiaSemana[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
	const [abertura, setAbertura] = useState('09:00')
	const [inicioIntervalo, setInicioIntervalo] = useState('12:00')
	const [fimIntervalo, setFimIntervalo] = useState('13:00')
	const [fechamento, setFechamento] = useState('19:00')
	const [foto, setFoto] = useState<File | null>(null)
	const [preview, setPreview] = useState<string | null>(null)
	const [mostrarInativas, setMostrarInativas] = useState(false)
	const [carregando, setCarregando] = useState(true)
	const [processando, setProcessando] = useState(false)
	const [erro, setErro] = useState('')
	const [mensagem, setMensagem] = useState('')

	useEffect(() => {
		if (!token) return
		Promise.all([
			listarBarbeariasAdmin(token),
			listarProfissionaisParaProprietario(token),
		]).then(([unidades, equipe]) => { setBarbearias(unidades); setProfissionais(equipe.filter((item) => item.ativo)) })
			.catch((error) => setErro(mensagemDoErro(error, 'Não foi possível carregar as barbearias.')))
			.finally(() => setCarregando(false))
	}, [token])

	useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

	function escolherFoto(event: ChangeEvent<HTMLInputElement>) {
		const arquivo = event.target.files?.[0] ?? null
		if (preview) URL.revokeObjectURL(preview)
		setFoto(arquivo); setPreview(arquivo ? URL.createObjectURL(arquivo) : null)
	}

	async function recarregar() { if (token) setBarbearias(await listarBarbeariasAdmin(token)) }

	async function salvar(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!token) return
		if (!editando && (!proprietarioId || diasAbertos.length === 0)) {
			setErro('Selecione o proprietário e ao menos um dia de funcionamento.'); return
		}
		if (!editando && !(abertura < inicioIntervalo && inicioIntervalo < fimIntervalo && fimIntervalo < fechamento)) {
			setErro('Os horários devem seguir a ordem: abertura, intervalo e fechamento.'); return
		}
		setProcessando(true); limparAvisos()
		try {
			const dados: DadosBarbearia = { nome, endereco }
			const barbearia = editando
				? await atualizarBarbearia(editando.id, dados, token)
				: await cadastrarBarbearia(dados, Number(proprietarioId), gerarHorarios(), token)
			if (foto) await atualizarFotoBarbearia(barbearia.id, foto, token)
			await recarregar(); cancelarEdicao()
			setMensagem(editando ? 'Barbearia atualizada com sucesso.' : 'Barbearia cadastrada com proprietário e funcionamento.')
		} catch (error) { setErro(mensagemDoErro(error, 'Não foi possível salvar a barbearia.')) }
		finally { setProcessando(false) }
	}

	function gerarHorarios(): HorarioFuncionamentoInput[] {
		return diasAbertos.flatMap((diaSemana) => [
			{ diaSemana, horarioInicio: abertura, horarioFim: inicioIntervalo },
			{ diaSemana, horarioInicio: fimIntervalo, horarioFim: fechamento },
		])
	}

	function editar(barbearia: Barbearia) {
		limparAvisos(); setEditando(barbearia); setNome(barbearia.nome)
		setEndereco({ cep: barbearia.cep ?? '', logradouro: barbearia.logradouro ?? '', numero: barbearia.numero ?? '', complemento: barbearia.complemento ?? '', bairro: barbearia.bairro ?? '', cidade: barbearia.cidade ?? '', estado: barbearia.estado ?? '' })
		setFoto(null); if (preview) URL.revokeObjectURL(preview); setPreview(null)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	function cancelarEdicao() {
		setEditando(null); setNome(''); setEndereco(enderecoVazio); setProprietarioId(''); setFoto(null)
		if (preview) URL.revokeObjectURL(preview); setPreview(null)
	}

	async function desativar(barbearia: Barbearia) {
		if (!token || !window.confirm(`Desativar ${barbearia.nome}?`)) return
		setProcessando(true); limparAvisos()
		try { await desativarBarbearia(barbearia.id, token); await recarregar(); setMensagem('Barbearia desativada.') }
		catch (error) { setErro(mensagemDoErro(error, 'Não foi possível desativar a barbearia.')) }
		finally { setProcessando(false) }
	}

	async function removerFoto(barbearia: Barbearia) {
		if (!token || !window.confirm(`Remover a foto de ${barbearia.nome}?`)) return
		setProcessando(true); limparAvisos()
		try { await removerFotoBarbearia(barbearia.id, token); await recarregar(); setMensagem('Foto removida.') }
		catch (error) { setErro(mensagemDoErro(error, 'Não foi possível remover a foto.')) }
		finally { setProcessando(false) }
	}

	function alterarEndereco(campo: keyof typeof endereco, valor: string) { setEndereco({ ...endereco, [campo]: valor }) }
	function alternarDia(dia: DiaSemana) { setDiasAbertos((atuais) => atuais.includes(dia) ? atuais.filter((item) => item !== dia) : [...atuais, dia]) }
	function limparAvisos() { setErro(''); setMensagem('') }

	// A administracao trabalha sobre as unidades ativas; as desativadas
	// continuam alcancaveis pelo filtro, para nao sumirem do painel.
	const visiveis = mostrarInativas ? barbearias : barbearias.filter((barbearia) => barbearia.ativo)

	return <div className={styles.page}>
		<header className={styles.header}><Link to="/">AgendaPro</Link><nav><Link to="/admin">Visão geral</Link><Link aria-current="page" to="/admin/barbearias">Barbearias</Link><Link to="/admin/usuarios">Usuários</Link><Link to="/admin/profissionais">Profissionais</Link><Link to="/painel">Painel</Link></nav></header>
		<main className={styles.content}>
			<section className={styles.intro}><div><p className={styles.eyebrow}>Administração</p><h1>Barbearias</h1></div><p>Cada unidade possui proprietário, endereço e funcionamento próprios.</p></section>
			{erro && <div className={styles.error} role="alert">{erro}</div>}{mensagem && <div className={styles.success} role="status">{mensagem}</div>}
			<section className={styles.editor}>
				<div className={styles.preview}>{preview || editando?.fotoUrl ? <img alt="Prévia da barbearia" src={preview ?? apiAssetUrl(editando?.fotoUrl) ?? ''} /> : <span>{nome.trim().charAt(0).toUpperCase() || 'B'}</span>}</div>
				<div><span>{editando ? `Editando unidade #${editando.id}` : 'Nova unidade'}</span><h2>{editando ? 'Atualizar barbearia' : 'Cadastrar barbearia'}</h2><p>O proprietário precisa ter perfil profissional ativo.</p></div>
				<form onSubmit={salvar}>
					<label>Nome<input maxLength={120} onChange={(event) => setNome(event.target.value)} required value={nome} /></label>
					{!editando && <label>Proprietário<select aria-label="Proprietário" onChange={(event) => setProprietarioId(event.target.value)} required value={proprietarioId}><option value="">Selecione</option>{profissionais.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.barbeariaNome}</option>)}</select></label>}
					<label>CEP<input inputMode="numeric" maxLength={8} pattern="\d{8}" onChange={(event) => alterarEndereco('cep', event.target.value.replace(/\D/g, ''))} required value={endereco.cep} /></label>
					<label>Logradouro<input maxLength={160} onChange={(event) => alterarEndereco('logradouro', event.target.value)} required value={endereco.logradouro} /></label>
					<label>Número<input maxLength={20} onChange={(event) => alterarEndereco('numero', event.target.value)} required value={endereco.numero} /></label>
					<label>Complemento<input maxLength={80} onChange={(event) => alterarEndereco('complemento', event.target.value)} value={endereco.complemento} /></label>
					<label>Bairro<input maxLength={100} onChange={(event) => alterarEndereco('bairro', event.target.value)} required value={endereco.bairro} /></label>
					<label>Cidade<input maxLength={100} onChange={(event) => alterarEndereco('cidade', event.target.value)} required value={endereco.cidade} /></label>
					<label>Estado<input maxLength={2} onChange={(event) => alterarEndereco('estado', event.target.value.toUpperCase())} pattern="[A-Za-z]{2}" required value={endereco.estado} /></label>
					<label>Foto<input accept="image/jpeg,image/png" onChange={escolherFoto} type="file" /></label>
					{!editando && <fieldset className={styles.hours}><legend>Funcionamento inicial</legend><div className={styles.days}>{dias.map((dia) => <label key={dia.valor}><input checked={diasAbertos.includes(dia.valor)} onChange={() => alternarDia(dia.valor)} type="checkbox" />{dia.rotulo}</label>)}</div><div className={styles.times}><label>Abertura<input onChange={(e) => setAbertura(e.target.value)} type="time" value={abertura} /></label><label>Início do intervalo<input onChange={(e) => setInicioIntervalo(e.target.value)} type="time" value={inicioIntervalo} /></label><label>Fim do intervalo<input onChange={(e) => setFimIntervalo(e.target.value)} type="time" value={fimIntervalo} /></label><label>Fechamento<input onChange={(e) => setFechamento(e.target.value)} type="time" value={fechamento} /></label></div></fieldset>}
					<div><button disabled={processando || !nome.trim()} type="submit">{processando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar'}</button>{editando && <button className={styles.secondary} disabled={processando} onClick={cancelarEdicao} type="button">Cancelar</button>}</div>
				</form>
			</section>
			<div className={styles.filtro}><label><input checked={mostrarInativas} onChange={(event) => setMostrarInativas(event.target.checked)} type="checkbox" />Mostrar unidades inativas</label></div>
			{carregando ? <p className={styles.feedback}>Carregando barbearias...</p> : visiveis.length === 0 ? <p className={styles.feedback}>Nenhuma unidade para mostrar.</p> : <section className={styles.grid}>{visiveis.map((barbearia) => <article className={!barbearia.ativo ? styles.inactive : ''} key={barbearia.id}><div className={styles.cover}>{barbearia.fotoUrl ? <img alt="" src={apiAssetUrl(barbearia.fotoUrl) ?? ''} /> : <span>{barbearia.nome.charAt(0)}</span>}<small>{barbearia.ativo ? 'Ativa' : 'Inativa'}</small></div><div className={styles.cardBody}><span>Unidade #{barbearia.id}</span><h2>{barbearia.nome}</h2><p>{barbearia.proprietarioNome ? `Proprietário: ${barbearia.proprietarioNome}` : 'Sem proprietário definido'}</p><p>{barbearia.logradouro ? `${barbearia.logradouro}, ${barbearia.numero} · ${barbearia.cidade}/${barbearia.estado}` : 'Endereço pendente'}</p><div><Link className={styles.linkBotao} to={`/admin/barbearias/${barbearia.id}`}>Ver detalhes</Link><button disabled={processando} onClick={() => editar(barbearia)} type="button">Editar</button>{barbearia.fotoUrl && <button disabled={processando} onClick={() => removerFoto(barbearia)} type="button">Remover foto</button>}{barbearia.ativo && <button className={styles.danger} disabled={processando} onClick={() => desativar(barbearia)} type="button">Desativar</button>}</div></div></article>)}</section>}
		</main>
	</div>
}

function mensagemDoErro(error: unknown, fallback: string) { return error instanceof ApiError ? error.message : fallback }
