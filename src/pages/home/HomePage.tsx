import { Link, useLocation } from 'react-router-dom'
import styles from './HomePage.module.css'

const servicos = [
  ['01', 'Corte clássico', 'Precisão, acabamento e um visual feito para você.'],
  ['02', 'Barba completa', 'Toalha quente, desenho e cuidado em cada detalhe.'],
  ['03', 'Experiência completa', 'Cabelo e barba em uma sessão sem pressa.'],
]

const etapas = [
  ['Escolha o serviço', 'Encontre o cuidado ideal para o seu estilo.'],
  ['Selecione o profissional', 'Veja quem está disponível para atender você.'],
  ['Confirme seu horário', 'Reserve em poucos segundos e acompanhe online.'],
]

function Brand() {
  return (
    <span className={styles.brand}>
      <span className={styles.monogram} aria-hidden="true"><span>AP</span></span>
      <span>AgendaPro</span>
    </span>
  )
}

export function HomePage() {
  const location = useLocation()
  const loginNome = (location.state as { loginNome?: string } | null)?.loginNome

  return (
    <div className={styles.page}>
      {loginNome && <div className={styles.loginSuccess} role="status">Login realizado. Bem-vindo, {loginNome}!</div>}
      <header className={styles.header}>
        <a href="#inicio" aria-label="AgendaPro, página inicial"><Brand /></a>
        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="#servicos">Serviços</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#contato">Contato</a>
        </nav>
        <div className={styles.accountActions}>
          <Link to="/entrar">Entrar</Link>
          <Link className={styles.headerAction} to="/cadastro">Criar conta</Link>
        </div>
      </header>

      <main>
        <section className={styles.hero} id="inicio">
          <div>
            <p className={styles.eyebrow}>Seu tempo. Seu estilo.</p>
            <h1>O cuidado que você merece, no horário certo.</h1>
            <p className={styles.heroText}>
              Escolha o serviço, encontre seu profissional e reserve sem ligações
              ou espera. Simples do início ao fim.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} to="/cadastro">Quero agendar</Link>
              <Link className={styles.secondaryAction} to="/entrar">Já tenho conta</Link>
            </div>
          </div>

          <div className={styles.agendaPreview} aria-label="Exemplo de agenda disponível">
            <div className={styles.previewTop}>
              <span>Agenda de hoje</span>
              <span className={styles.liveStatus}>Disponível</span>
            </div>
            <p className={styles.previewDate}>Quarta, 26 de agosto</p>
            <div className={styles.timeGrid}>
              <span>09:00</span><span>10:30</span>
              <span className={styles.selectedTime}>13:00</span>
              <span>14:30</span><span>16:00</span><span>17:30</span>
            </div>
            <div className={styles.previewService}>
              <div><small>Serviço selecionado</small><strong>Corte clássico</strong></div>
              <span>45 min</span>
            </div>
          </div>
        </section>

        <section className={styles.trustBar} aria-label="Diferenciais">
          <div><strong>24h</strong><span>Agendamento online</span></div>
          <div><strong>100%</strong><span>Horários atualizados</span></div>
          <div><strong>3 passos</strong><span>Para reservar</span></div>
        </section>

        <section className={styles.section} id="servicos">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Nossos serviços</p><h2>Cuidado nos detalhes.</h2></div>
            <p>Experiências pensadas para valorizar seu estilo e respeitar seu tempo.</p>
          </div>
          <div className={styles.serviceGrid}>
            {servicos.map(([numero, nome, descricao]) => (
              <article className={styles.serviceCard} key={numero}>
                <span>{numero}</span><h3>{nome}</h3><p>{descricao}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.stepsSection} id="como-funciona">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Sem complicação</p><h2>Seu próximo horário em três passos.</h2></div>
          </div>
          <ol className={styles.steps}>
            {etapas.map(([titulo, descricao], index) => (
              <li key={titulo}>
                <span>0{index + 1}</span>
                <div><h3>{titulo}</h3><p>{descricao}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.cta} id="agendar">
          <p className={styles.eyebrow}>Sua cadeira está esperando</p>
          <h2>Pronto para cuidar do seu estilo?</h2>
          <p>Crie sua conta gratuitamente e encontre o melhor horário para você.</p>
          <Link className={styles.primaryAction} to="/cadastro">Criar minha conta</Link>
        </section>
      </main>

      <footer className={styles.footer} id="contato">
        <Brand />
        <p>Agendamento profissional, simples para todos.</p>
        <small>© 2026 AgendaPro</small>
      </footer>
    </div>
  )
}
