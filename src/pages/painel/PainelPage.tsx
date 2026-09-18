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
          <article><span>Cliente</span><h2>Meus agendamentos</h2><p>Acompanhe seu histórico, filtre e cancele horários.</p><div><Link to="/meus-agendamentos">Ver agenda</Link><Link to="/agendar">Novo horário</Link></div></article>
          <article><span>Equipe</span><h2>Convites profissionais</h2><p>Consulte convites recebidos para trabalhar em uma barbearia.</p><div><Link to="/convites">Ver convites</Link></div></article>
          {possuiPerfil('PROFISSIONAL') && (
            <article><span>Profissional</span><h2>Minha operação</h2><p>Consulte atendimentos, disponibilidade e administre sua própria barbearia.</p><div><Link to="/profissional/agenda">Agenda</Link><Link to="/profissional/disponibilidade">Disponibilidade</Link><Link to="/profissional/barbearia">Minha barbearia</Link></div></article>
          )}
          {possuiPerfil('ADMIN') && (
            <article><span>Administração</span><h2>Gerenciar negócio</h2><p>Acompanhe a operação, a agenda, os serviços e a equipe.</p><div><Link to="/admin">Visão geral</Link><Link to="/admin/profissionais">Equipe</Link></div></article>
          )}
        </section>
      </main>
    </div>
  )
}
