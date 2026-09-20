import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import { useEsperaLonga } from '../../../hooks/useEsperaLonga'
import { useAuth } from '../context/useAuth'
import styles from './AuthPage.module.css'

// Conta de demonstração criada pela carga de dados da API. Existe para que
// quem chega pelo portfólio veja o sistema por dentro sem precisar se
// cadastrar; tem perfis de cliente e de profissional.
const CONTA_DEMONSTRACAO = { email: 'joao.gabriel@demo.agendapro.local', senha: 'Demo123!' }

export function LoginPage() {
  const navigate = useNavigate()
  const { entrar } = useAuth()
  const location = useLocation()
  const cadastroConcluido = Boolean((location.state as { cadastroConcluido?: boolean } | null)?.cadastroConcluido)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const servidorAcordando = useEsperaLonga(enviando)

  async function acessar(credenciais: { email: string; senha: string }) {
    setErro('')
    setEnviando(true)

    try {
      await entrar(credenciais)
      const retorno = (location.state as { retorno?: string } | null)?.retorno
      navigate(retorno || '/painel', { replace: true })
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    return acessar({ email: email.trim(), senha })
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <Link className={styles.brand} to="/">AgendaPro</Link>
        <div>
          <p className={styles.eyebrow}>Bem-vindo de volta</p>
          <h1>Seu próximo horário começa aqui.</h1>
          <p>Acesse sua conta para agendar, acompanhar ou gerenciar atendimentos.</p>
        </div>
        <small>Seu tempo. Seu estilo.</small>
      </section>

      <section className={styles.formSide}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <header><p className={styles.eyebrow}>Acessar conta</p><h2>Entrar</h2></header>
          {cadastroConcluido && <div className={styles.success} role="status">Conta criada. Agora faça seu login.</div>}
          {erro && <div className={styles.error} role="alert">{erro}</div>}

          <label>
            E-mail
            <input autoComplete="email" maxLength={254} onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com" required type="email" value={email} />
          </label>
          <label>
            Senha
            <input autoComplete="current-password" minLength={6} maxLength={72}
              onChange={(event) => setSenha(event.target.value)} placeholder="Sua senha"
              required type="password" value={senha} />
          </label>

          <button disabled={enviando} type="submit">{enviando ? 'Entrando...' : 'Entrar'}</button>

          {servidorAcordando && <div className={styles.aviso} role="status">
            O servidor hiberna quando fica sem uso, porque roda num plano gratuito.
            Estamos acordando ele — a primeira entrada pode levar até um minuto.
          </div>}

          <div className={styles.demonstracao}>
            <span>ou</span>
            <button disabled={enviando} onClick={() => acessar(CONTA_DEMONSTRACAO)} type="button">
              Acessar a demonstração
            </button>
            <small>
              Conta de teste com perfis de cliente e profissional, em dados fictícios.
              Explore sem se cadastrar.
            </small>
          </div>

          <p className={styles.switchPage}>Ainda não possui conta? <Link to="/cadastro">Criar conta</Link></p>
        </form>
      </section>
    </main>
  )
}
