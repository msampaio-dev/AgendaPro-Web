import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiAssetUrl } from '../../../services/api'
import type { Barbearia, DadosBarbearia, DiaSemana, HorarioFuncionamento, HorarioFuncionamentoInput, Profissional, ProfissionalServico, Servico } from '../../agendamentos/types'
import { useAuth } from '../../auth/context/useAuth'
import { GestaoConvitesEquipe } from '../../convites/GestaoConvitesEquipe'
import {
	adicionarHorarioBarbearia,
	associarServicoProfissional,
	atualizarMinhaBarbearia,
	criarMinhaBarbearia,
	criarServicoBarbearia,
	desativarServicoBarbearia,
	enviarFotoBarbearia,
	listarEquipeBarbearia,
	listarHorariosBarbearia,
	listarMinhasBarbearias,
	listarServicosDisponiveis,
	listarServicosProfissional,
	removerHorarioBarbearia,
	removerServicoProfissional,
	transferirPropriedadeBarbearia,
} from './minhaBarbeariaApi'
import styles from './MinhaBarbeariaPage.module.css'

const dias: Array<{ valor: DiaSemana; nome: string; curto: string }> = [
	{ valor: 'MONDAY', nome: 'Segunda-feira', curto: 'Seg' }, { valor: 'TUESDAY', nome: 'Terça-feira', curto: 'Ter' },
	{ valor: 'WEDNESDAY', nome: 'Quarta-feira', curto: 'Qua' }, { valor: 'THURSDAY', nome: 'Quinta-feira', curto: 'Qui' },
	{ valor: 'FRIDAY', nome: 'Sexta-feira', curto: 'Sex' }, { valor: 'SATURDAY', nome: 'Sábado', curto: 'Sáb' },
	{ valor: 'SUNDAY', nome: 'Domingo', curto: 'Dom' },
]
const enderecoVazio = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' }

export function MinhaBarbeariaPage() {
	const { token } = useAuth()
	const [barbearias, setBarbearias] = useState<Barbearia[]>([])
	const [selecionadaId, setSelecionadaId] = useState<number | null>(null)
	const [criando, setCriando] = useState(true)
	const [nome, setNome] = useState('')
	const [endereco, setEndereco] = useState(enderecoVazio)
	const [foto, setFoto] = useState<File | null>(null)
	const [diasAbertos, setDiasAbertos] = useState<DiaSemana[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
	const [abertura, setAbertura] = useState('09:00')
	const [inicioIntervalo, setInicioIntervalo] = useState('12:00')
	const [fimIntervalo, setFimIntervalo] = useState('13:00')
	const [fechamento, setFechamento] = useState('19:00')
	const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([])
	const [equipe, setEquipe] = useState<Profissional[]>([])
	const [servicos, setServicos] = useState<Servico[]>([])
	const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
	const [associacoes, setAssociacoes] = useState<ProfissionalServico[]>([])
	const [servicoId, setServicoId] = useState('')
	const [novoServicoNome, setNovoServicoNome] = useState('')
	const [novoServicoDescricao, setNovoServicoDescricao] = useState('')
	const [novoServicoDuracao, setNovoServicoDuracao] = useState('30')
	const [novoServicoPreco, setNovoServicoPreco] = useState('')
	const [novoDia, setNovoDia] = useState<DiaSemana>('MONDAY')
	const [novoInicio, setNovoInicio] = useState('09:00')
	const [novoFim, setNovoFim] = useState('12:00')
	const [processando, setProcessando] = useState(false)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState('')
	const [mensagem, setMensagem] = useState('')

	const selecionada = barbearias.find((item) => item.id === selecionadaId) ?? null

	useEffect(() => {
		if (!token) return
		listarMinhasBarbearias(token).then((dados) => {
			setBarbearias(dados)
			if (dados[0]) selecionar(dados[0])
		}).catch((error) => setErro(mensagemErro(error, 'Não foi possível carregar suas barbearias.')))
			.finally(() => setCarregando(false))
	// A seleção inicial depende apenas do carregamento autenticado.
	// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, [token])

	async function selecionar(barbearia: Barbearia) {
		if (!token) return
		setSelecionadaId(barbearia.id); setCriando(false); preencher(barbearia); limparAvisos()
		try {
			const [periodos, profissionais, catalogo] = await Promise.all([
				listarHorariosBarbearia(barbearia.id, token), listarEquipeBarbearia(barbearia.id, token),
				listarServicosDisponiveis(barbearia.id, token),
			])
			setHorarios(periodos); setEquipe(profissionais); setServicos(catalogo); setProfissionalSelecionado(null); setAssociacoes([])
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível carregar os detalhes da unidade.')) }
	}

	function iniciarCriacao() {
		setCriando(true); setSelecionadaId(null); setNome(''); setEndereco(enderecoVazio); setFoto(null); setHorarios([]); setEquipe([]); limparAvisos()
	}

	async function salvar(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); if (!token) return
		if (criando && diasAbertos.length === 0) { setErro('Escolha ao menos um dia de funcionamento.'); return }
		if (criando && !(abertura < inicioIntervalo && inicioIntervalo < fimIntervalo && fimIntervalo < fechamento)) { setErro('Revise a ordem dos horários e do intervalo.'); return }
		setProcessando(true); limparAvisos()
		try {
			const dados: DadosBarbearia = { nome, endereco }
			const salva = criando
				? await criarMinhaBarbearia(dados, horariosIniciais(), token)
				: await atualizarMinhaBarbearia(selecionadaId!, dados, token)
			const atualizada = foto ? await enviarFotoBarbearia(salva.id, foto, token) : salva
			const lista = await listarMinhasBarbearias(token); setBarbearias(lista); setFoto(null)
			await selecionar(lista.find((item) => item.id === atualizada.id) ?? atualizada)
			setMensagem(criando ? 'Barbearia criada. Você agora é o proprietário desta unidade.' : 'Dados da barbearia atualizados.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível salvar a barbearia.')) }
		finally { setProcessando(false) }
	}

	async function adicionarHorario(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); if (!token || !selecionadaId) return
		if (!(novoInicio < novoFim)) { setErro('O início deve ser anterior ao fim.'); return }
		setProcessando(true); limparAvisos()
		try { await adicionarHorarioBarbearia(selecionadaId, { diaSemana: novoDia, horarioInicio: novoInicio, horarioFim: novoFim }, token); setHorarios(await listarHorariosBarbearia(selecionadaId, token)); setMensagem('Funcionamento atualizado.') }
		catch (error) { setErro(mensagemErro(error, 'Não foi possível adicionar o horário.')) }
		finally { setProcessando(false) }
	}

	async function removerHorario(horario: HorarioFuncionamento) {
		if (!token || !selecionadaId || !window.confirm('Remover este período de funcionamento?')) return
		setProcessando(true); limparAvisos()
		try { await removerHorarioBarbearia(selecionadaId, horario.id, token); setHorarios(await listarHorariosBarbearia(selecionadaId, token)); setMensagem('Período removido.') }
		catch (error) { setErro(mensagemErro(error, 'Não foi possível remover o período.')) }
		finally { setProcessando(false) }
	}

	async function criarServico(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); if (!token || !selecionada) return
		setProcessando(true); limparAvisos()
		try {
			await criarServicoBarbearia(selecionada.id, {
				nome: novoServicoNome,
				descricao: novoServicoDescricao.trim() || null,
				duracaoMinutos: Number(novoServicoDuracao),
				preco: Number(novoServicoPreco),
			}, token)
			setServicos(await listarServicosDisponiveis(selecionada.id, token))
			setNovoServicoNome(''); setNovoServicoDescricao(''); setNovoServicoDuracao('30'); setNovoServicoPreco('')
			setMensagem('Serviço criado.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível criar o serviço.')) }
		finally { setProcessando(false) }
	}

	async function desativarServico(servico: Servico) {
		if (!token || !selecionada) return
		setProcessando(true); limparAvisos()
		try {
			await desativarServicoBarbearia(servico.id, token)
			setServicos(await listarServicosDisponiveis(selecionada.id, token))
			if (profissionalSelecionado) setAssociacoes(await listarServicosProfissional(profissionalSelecionado.id, token))
			setMensagem('Serviço desativado.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível desativar o serviço.')) }
		finally { setProcessando(false) }
	}

	async function gerenciarServicos(profissional: Profissional) {
		if (!token) return
		setProfissionalSelecionado(profissional); setServicoId(''); limparAvisos()
		try { setAssociacoes(await listarServicosProfissional(profissional.id, token)) }
		catch (error) { setErro(mensagemErro(error, 'Não foi possível carregar os serviços do profissional.')) }
	}

	async function associarServico(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); if (!token || !profissionalSelecionado || !servicoId) return
		setProcessando(true); limparAvisos()
		try {
			await associarServicoProfissional(profissionalSelecionado.id, Number(servicoId), token)
			setAssociacoes(await listarServicosProfissional(profissionalSelecionado.id, token)); setServicoId('')
			setMensagem('Serviço associado ao profissional.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível associar o serviço.')) }
		finally { setProcessando(false) }
	}

	async function removerServico(associacao: ProfissionalServico) {
		if (!token || !profissionalSelecionado) return
		setProcessando(true); limparAvisos()
		try {
			await removerServicoProfissional(associacao.id, token)
			setAssociacoes(await listarServicosProfissional(profissionalSelecionado.id, token))
			setMensagem('Serviço removido do profissional.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível remover o serviço.')) }
		finally { setProcessando(false) }
	}

	async function transferirPropriedade(profissional: Profissional) {
		if (!token || !selecionadaId || !window.confirm(`Tornar ${profissional.nome} proprietário desta unidade? Você deixará de administrá-la.`)) return
		setProcessando(true); limparAvisos()
		try {
			await transferirPropriedadeBarbearia(selecionadaId, profissional.id, token)
			const lista = await listarMinhasBarbearias(token); setBarbearias(lista)
			if (lista[0]) await selecionar(lista[0]); else iniciarCriacao()
			setMensagem('Propriedade transferida com segurança.')
		} catch (error) { setErro(mensagemErro(error, 'Não foi possível transferir a propriedade.')) }
		finally { setProcessando(false) }
	}

	function escolherFoto(event: ChangeEvent<HTMLInputElement>) { setFoto(event.target.files?.[0] ?? null) }
	function preencher(barbearia: Barbearia) { setNome(barbearia.nome); setEndereco({ cep: barbearia.cep ?? '', logradouro: barbearia.logradouro ?? '', numero: barbearia.numero ?? '', complemento: barbearia.complemento ?? '', bairro: barbearia.bairro ?? '', cidade: barbearia.cidade ?? '', estado: barbearia.estado ?? '' }) }
	function alterarEndereco(campo: keyof typeof endereco, valor: string) { setEndereco({ ...endereco, [campo]: valor }) }
	function alternarDia(dia: DiaSemana) { setDiasAbertos((atuais) => atuais.includes(dia) ? atuais.filter((item) => item !== dia) : [...atuais, dia]) }
	function horariosIniciais(): HorarioFuncionamentoInput[] { return diasAbertos.flatMap((diaSemana) => [{ diaSemana, horarioInicio: abertura, horarioFim: inicioIntervalo }, { diaSemana, horarioInicio: fimIntervalo, horarioFim: fechamento }]) }
	function limparAvisos() { setErro(''); setMensagem('') }

	return <div className={styles.page}>
		<header className={styles.header}><Link to="/">AgendaPro</Link><nav><Link to="/profissional/agenda">Agenda</Link><Link to="/profissional/disponibilidade">Disponibilidade</Link><Link aria-current="page" to="/profissional/barbearia">Minha barbearia</Link><Link to="/painel">Painel</Link></nav></header>
		<main className={styles.content}>
			<section className={styles.intro}><div><p className={styles.eyebrow}>Gestão da unidade</p><h1>Minha barbearia</h1></div><p>Crie sua unidade e administre endereço, identidade, funcionamento e equipe.</p></section>
			{erro && <div className={styles.error} role="alert">{erro}</div>}{mensagem && <div className={styles.success} role="status">{mensagem}</div>}
			{!carregando && <div className={styles.tabs}>{barbearias.map((item) => <button className={selecionadaId === item.id ? styles.activeTab : ''} key={item.id} onClick={() => selecionar(item)} type="button">{item.nome}</button>)}<button className={criando ? styles.activeTab : ''} onClick={iniciarCriacao} type="button">+ Nova barbearia</button></div>}
			<section className={styles.editor}>
				<div className={styles.identity}>{!criando && selecionada?.fotoUrl ? <img alt="" src={apiAssetUrl(selecionada.fotoUrl) ?? ''} /> : <span>{nome.charAt(0) || 'B'}</span>}<div><small>{criando ? 'Nova unidade' : 'Unidade própria'}</small><h2>{nome || 'Sua próxima barbearia'}</h2></div></div>
				<form onSubmit={salvar}><label>Nome<input maxLength={120} onChange={(e) => setNome(e.target.value)} required value={nome} /></label><label>Foto<input accept="image/jpeg,image/png" onChange={escolherFoto} type="file" /></label><label>CEP<input inputMode="numeric" maxLength={8} pattern="\d{8}" onChange={(e) => alterarEndereco('cep', e.target.value.replace(/\D/g, ''))} required value={endereco.cep} /></label><label>Logradouro<input onChange={(e) => alterarEndereco('logradouro', e.target.value)} required value={endereco.logradouro} /></label><label>Número<input onChange={(e) => alterarEndereco('numero', e.target.value)} required value={endereco.numero} /></label><label>Complemento<input onChange={(e) => alterarEndereco('complemento', e.target.value)} value={endereco.complemento} /></label><label>Bairro<input onChange={(e) => alterarEndereco('bairro', e.target.value)} required value={endereco.bairro} /></label><label>Cidade<input onChange={(e) => alterarEndereco('cidade', e.target.value)} required value={endereco.cidade} /></label><label>Estado<input maxLength={2} pattern="[A-Za-z]{2}" onChange={(e) => alterarEndereco('estado', e.target.value.toUpperCase())} required value={endereco.estado} /></label>
					{criando && <fieldset><legend>Funcionamento inicial</legend><div className={styles.days}>{dias.map((dia) => <label key={dia.valor}><input checked={diasAbertos.includes(dia.valor)} onChange={() => alternarDia(dia.valor)} type="checkbox" />{dia.curto}</label>)}</div><div className={styles.times}><label>Abertura<input onChange={(e) => setAbertura(e.target.value)} type="time" value={abertura} /></label><label>Início do intervalo<input onChange={(e) => setInicioIntervalo(e.target.value)} type="time" value={inicioIntervalo} /></label><label>Fim do intervalo<input onChange={(e) => setFimIntervalo(e.target.value)} type="time" value={fimIntervalo} /></label><label>Fechamento<input onChange={(e) => setFechamento(e.target.value)} type="time" value={fechamento} /></label></div></fieldset>}
					<button disabled={processando} type="submit">{processando ? 'Salvando...' : criando ? 'Criar minha barbearia' : 'Salvar dados'}</button></form>
			</section>
			{!criando && selecionada && <div className={styles.management}><section><header><span>Funcionamento</span><h2>Horários da unidade</h2></header><form className={styles.hourForm} onSubmit={adicionarHorario}><select aria-label="Dia" onChange={(e) => setNovoDia(e.target.value as DiaSemana)} value={novoDia}>{dias.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.nome}</option>)}</select><input aria-label="Início" onChange={(e) => setNovoInicio(e.target.value)} type="time" value={novoInicio} /><input aria-label="Fim" onChange={(e) => setNovoFim(e.target.value)} type="time" value={novoFim} /><button disabled={processando}>Adicionar</button></form><div className={styles.schedule}>{dias.map((dia) => <article key={dia.valor}><strong>{dia.curto}</strong><div>{horarios.filter((item) => item.diaSemana === dia.valor).map((item) => <span key={item.id}>{item.horarioInicio.slice(0,5)}–{item.horarioFim.slice(0,5)} <button aria-label={`Remover ${dia.nome} ${item.horarioInicio}`} onClick={() => removerHorario(item)} type="button">×</button></span>)}</div></article>)}</div></section><section><header><span>Catálogo</span><h2>Serviços da unidade</h2></header><form className={styles.hourForm} onSubmit={criarServico}><input aria-label="Nome do serviço" onChange={(e) => setNovoServicoNome(e.target.value)} placeholder="Nome" required value={novoServicoNome} /><input aria-label="Descrição do serviço" onChange={(e) => setNovoServicoDescricao(e.target.value)} placeholder="Descrição (opcional)" value={novoServicoDescricao} /><input aria-label="Duração em minutos" min="1" onChange={(e) => setNovoServicoDuracao(e.target.value)} required type="number" value={novoServicoDuracao} /><input aria-label="Preço" min="0" onChange={(e) => setNovoServicoPreco(e.target.value)} placeholder="Preço" required step="0.01" type="number" value={novoServicoPreco} /><button disabled={processando}>Criar serviço</button></form><div className={styles.services}>{servicos.length === 0 && <p>Nenhum serviço cadastrado ainda.</p>}{servicos.map((servico) => <p key={servico.id}><span>{servico.nome} · {servico.duracaoMinutos} min · R$ {servico.preco.toFixed(2)}{!servico.ativo && ' (inativo)'}</span>{servico.ativo && <button disabled={processando} onClick={() => desativarServico(servico)} type="button">Desativar</button>}</p>)}</div></section><section><header><span>Equipe</span><h2>{equipe.filter((item) => item.ativo).length} profissionais ativos</h2></header><div className={styles.team}>{equipe.map((item) => <article key={item.id}><span>{item.fotoUrl ? <img alt="" src={apiAssetUrl(item.fotoUrl) ?? ''} /> : item.nome.charAt(0)}</span><div><strong>{item.nome}</strong><small>{item.id === selecionada.proprietarioProfissionalId ? 'Proprietário da unidade' : item.email}</small></div><button onClick={() => gerenciarServicos(item)} type="button">Serviços</button>{item.id !== selecionada.proprietarioProfissionalId && <button disabled={processando} onClick={() => transferirPropriedade(item)} type="button">Tornar dono</button>}</article>)}</div>{profissionalSelecionado && <div className={styles.services}><h3>Serviços de {profissionalSelecionado.nome}</h3><form onSubmit={associarServico}><select aria-label="Novo serviço" onChange={(event) => setServicoId(event.target.value)} required value={servicoId}><option value="">Selecione um serviço</option>{servicos.filter((servico) => servico.ativo && !associacoes.some((item) => item.servicoId === servico.id)).map((servico) => <option key={servico.id} value={servico.id}>{servico.nome} · {servico.duracaoMinutos} min</option>)}</select><button disabled={processando || !servicoId}>Associar</button></form><div>{associacoes.map((associacao) => { const servico = servicos.find((item) => item.id === associacao.servicoId); return <p key={associacao.id}><span>{servico?.nome ?? `Serviço ${associacao.servicoId}`}</span><button disabled={processando} onClick={() => removerServico(associacao)} type="button">Remover</button></p> })}</div></div>}</section></div>}
			{!criando && selecionada && token && <GestaoConvitesEquipe key={selecionada.id} barbeariaId={selecionada.id} token={token} />}
		</main>
	</div>
}

function mensagemErro(error: unknown, fallback: string) { return error instanceof ApiError ? error.message : fallback }
