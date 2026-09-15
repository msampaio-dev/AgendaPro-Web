import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import type { Servico } from '../../agendamentos/types'
import { useAuth } from '../../auth/context/useAuth'
import {
  atualizarServico,
  cadastrarServico,
  desativarServico,
  listarServicosAdmin,
  type DadosServico,
} from './adminServicoApi'
import styles from './AdminServicosPage.module.css'

type Formulario = {
  nome: string
  descricao: string
  duracaoMinutos: string
  preco: string
}

type ErrosFormulario = Partial<Record<keyof Formulario, string>>

const formularioVazio: Formulario = { nome: '', descricao: '', duracaoMinutos: '', preco: '' }

export function AdminServicosPage() {
  const { token } = useAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [formulario, setFormulario] = useState<Formulario>(formularioVazio)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [errosFormulario, setErrosFormulario] = useState<ErrosFormulario>({})
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [desativandoId, setDesativandoId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    let ativo = true
    listarServicosAdmin(token)
      .then((dados) => { if (ativo) setServicos(dados) })
      .catch((error) => { if (ativo) setErro(mensagemDoErro(error, 'Não foi possível carregar os serviços.')) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [token])

  async function recarregar() {
    if (!token) return
    setServicos(await listarServicosAdmin(token))
  }

  function limparFormulario() {
    setFormulario(formularioVazio)
    setEditandoId(null)
    setErrosFormulario({})
  }

  function editar(servico: Servico) {
    setFormulario({
      nome: servico.nome,
      descricao: servico.descricao ?? '',
      duracaoMinutos: String(servico.duracaoMinutos),
      preco: String(servico.preco),
    })
    setEditandoId(servico.id)
    setErro('')
    setMensagem('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setSalvando(true)
    setErro('')
    setMensagem('')
    setErrosFormulario({})

    const dados: DadosServico = {
      nome: formulario.nome.trim(),
      descricao: formulario.descricao.trim() || null,
      duracaoMinutos: Number(formulario.duracaoMinutos),
      preco: Number(formulario.preco),
    }

    try {
      if (editandoId) {
        await atualizarServico(editandoId, dados, token)
        setMensagem('Serviço atualizado com sucesso.')
      } else {
        await cadastrarServico(dados, token)
        setMensagem('Serviço cadastrado com sucesso.')
      }
      limparFormulario()
      await recarregar()
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível salvar o serviço.'))
      if (error instanceof ApiError) {
        setErrosFormulario(Object.fromEntries(
          error.campos.map((campo) => [campo.campo, campo.mensagem]),
        ) as ErrosFormulario)
      }
    } finally {
      setSalvando(false)
    }
  }

  async function desativar(servico: Servico) {
    if (!token || !window.confirm(`Desativar o serviço “${servico.nome}”?`)) return
    setDesativandoId(servico.id)
    setErro('')
    setMensagem('')
    try {
      await desativarServico(servico.id, token)
      if (editandoId === servico.id) limparFormulario()
      await recarregar()
      setMensagem('Serviço desativado. O histórico foi preservado.')
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível desativar o serviço.'))
    } finally {
      setDesativandoId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/">AgendaPro</Link>
        <nav><Link to="/admin/servicos">Serviços</Link><Link to="/painel">Painel</Link></nav>
      </header>

      <main className={styles.content}>
        <section className={styles.intro}>
          <div><p className={styles.eyebrow}>Administração</p><h1>Serviços</h1></div>
          <p>Defina o catálogo, o tempo reservado na agenda e o preço cobrado.</p>
        </section>

        <section className={styles.workspace}>
          <form className={styles.form} onSubmit={salvar} noValidate>
            <header><span>{editandoId ? `Editando #${editandoId}` : 'Novo serviço'}</span><h2>{editandoId ? 'Atualizar serviço' : 'Cadastrar serviço'}</h2></header>
            {erro && <div className={styles.error} role="alert">{erro}</div>}
            {mensagem && <div className={styles.success} role="status">{mensagem}</div>}

            <label>Nome<input maxLength={120} required value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} />{errosFormulario.nome && <small>{errosFormulario.nome}</small>}</label>
            <label>Descrição<textarea maxLength={500} rows={4} value={formulario.descricao} onChange={(event) => setFormulario({ ...formulario, descricao: event.target.value })} />{errosFormulario.descricao && <small>{errosFormulario.descricao}</small>}</label>
            <div className={styles.formRow}>
              <label>Duração (min)<input min="1" required type="number" value={formulario.duracaoMinutos} onChange={(event) => setFormulario({ ...formulario, duracaoMinutos: event.target.value })} />{errosFormulario.duracaoMinutos && <small>{errosFormulario.duracaoMinutos}</small>}</label>
              <label>Preço (R$)<input min="0" required step="0.01" type="number" value={formulario.preco} onChange={(event) => setFormulario({ ...formulario, preco: event.target.value })} />{errosFormulario.preco && <small>{errosFormulario.preco}</small>}</label>
            </div>
            <div className={styles.formActions}>
              <button disabled={salvando} type="submit">{salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar serviço'}</button>
              {editandoId && <button className={styles.secondary} onClick={limparFormulario} type="button">Cancelar edição</button>}
            </div>
          </form>

          <section className={styles.catalog} aria-label="Catálogo de serviços">
            <header><div><span>Catálogo</span><h2>{servicos.length} serviços</h2></div><p>Ativos aparecem para agendamento.</p></header>
            {carregando ? <p className={styles.feedback}>Carregando serviços...</p> : servicos.length === 0 ? <p className={styles.feedback}>Nenhum serviço cadastrado.</p> : (
              <div className={styles.list}>
                {servicos.map((servico) => (
                  <article className={!servico.ativo ? styles.inactive : undefined} key={servico.id}>
                    <div className={styles.serviceMain}><span className={servico.ativo ? styles.activeBadge : styles.inactiveBadge}>{servico.ativo ? 'Ativo' : 'Inativo'}</span><h3>{servico.nome}</h3><p>{servico.descricao || 'Sem descrição'}</p></div>
                    <div className={styles.details}><span>{servico.duracaoMinutos} min</span><strong>{formatarPreco(servico.preco)}</strong></div>
                    <div className={styles.actions}><button disabled={!servico.ativo} onClick={() => editar(servico)} type="button">Editar</button><button disabled={!servico.ativo || desativandoId === servico.id} onClick={() => desativar(servico)} type="button">{desativandoId === servico.id ? 'Desativando...' : 'Desativar'}</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}

function mensagemDoErro(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function formatarPreco(preco: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco)
}
