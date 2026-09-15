import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import { cadastrarUsuario } from '../authApi'
import styles from './AuthPage.module.css'

type ErrosFormulario = Partial<Record<'nome' | 'email' | 'senha', string>>

export function CadastroPage() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [errosFormulario, setErrosFormulario] = useState<ErrosFormulario>({})
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setErrosFormulario({})
    setEnviando(true)

    try {
      await cadastrarUsuario({ nome: nome.trim(), email: email.trim(), senha })
      navigate('/entrar', { replace: true, state: { cadastroConcluido: true } })
    } catch (error) {
      if (error instanceof ApiError) {
        setErro(error.message)
        setErrosFormulario(Object.fromEntries(
          error.campos.map((campo) => [campo.campo, campo.mensagem]),
        ) as ErrosFormulario)
      } else {
        setErro('Não foi possível criar sua conta.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <Link className={styles.brand} to="/">AgendaPro</Link>
        <div>
          <p className={styles.eyebrow}>Comece agora</p>
          <h1>Seu estilo não precisa esperar.</h1>
          <p>Crie sua conta e encontre os melhores horários para você.</p>
        </div>
        <small>Agendamento simples, cuidado profissional.</small>
      </section>

      <section className={styles.formSide}>
        <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
          <header><p className={styles.eyebrow}>Novo cliente</p><h2>Criar conta</h2></header>
          {erro && <div className={styles.error} role="alert">{erro}</div>}

          <label>Nome
            <input aria-invalid={Boolean(errosFormulario.nome)} autoComplete="name" maxLength={120}
              onChange={(event) => setNome(event.target.value)} placeholder="Seu nome completo" required value={nome} />
            {errosFormulario.nome && <small>{errosFormulario.nome}</small>}
          </label>
          <label>E-mail
            <input aria-invalid={Boolean(errosFormulario.email)} autoComplete="email" maxLength={254}
              onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com"
              required type="email" value={email} />
            {errosFormulario.email && <small>{errosFormulario.email}</small>}
          </label>
          <label>Senha
            <input aria-invalid={Boolean(errosFormulario.senha)} autoComplete="new-password" minLength={6}
              maxLength={72} onChange={(event) => setSenha(event.target.value)}
              placeholder="Entre 6 e 72 caracteres" required type="password" value={senha} />
            {errosFormulario.senha && <small>{errosFormulario.senha}</small>}
          </label>

          <button disabled={enviando} type="submit">{enviando ? 'Criando conta...' : 'Criar minha conta'}</button>
          <p className={styles.switchPage}>Já possui conta? <Link to="/entrar">Entrar</Link></p>
        </form>
      </section>
    </main>
  )
}
