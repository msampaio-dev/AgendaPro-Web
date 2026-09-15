import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/useAuth'
import styles from './PainelPage.module.css'

export function PainelPage() {
  const navigate = useNavigate()
  const { sessao, sair, possuiPerfil } = useAuth()

  function handleSair() {
    sair()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/">AgendaPro</Link>
        <button onClick={handleSair} type="button">Sair</button>
      </header>

      <main className={styles.content}>
        <p className={styles.eyebrow}>Área autenticada</p>
        <h1>Olá, {sessao?.nome}.</h1>
        <p className={styles.subtitle}>Sua sessão foi confirmada pelo backend.</p>

        <section className={styles.profileCard}>
          <div><span>Conta</span><strong>{sessao?.email}</strong></div>
          <div><span>Perfis</span><strong>{sessao?.perfis.join(' · ')}</strong></div>
          {sessao?.profissionalId && <div><span>ID profissional</span><strong>{sessao.profissionalId}</strong></div>}
        </section>

        <section className={styles.actions} aria-label="Áreas disponíveis">
          <article><span>Cliente</span><h2>Novo agendamento</h2><p>Escolha serviço, profissional, data e um horário realmente disponível.</p><Link to="/agendar">Agendar agora</Link></article>
          {possuiPerfil('PROFISSIONAL') && (
            <article><span>Profissional</span><h2>Minha agenda</h2><p>Consulte seus atendimentos e gerencie sua disponibilidade.</p></article>
          )}
          {possuiPerfil('ADMIN') && (
            <article><span>Administração</span><h2>Gerenciar negócio</h2><p>Cadastre serviços, profissionais e associações.</p></article>
          )}
        </section>
      </main>
    </div>
  )
}
