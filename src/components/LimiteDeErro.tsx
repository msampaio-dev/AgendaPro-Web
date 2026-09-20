import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './LimiteDeErro.module.css'

type Props = { children: ReactNode }
type Estado = { falhou: boolean }

/**
 * Última rede de proteção da interface.
 *
 * Sem ela, qualquer exceção durante a renderização desmonta a árvore inteira e
 * entrega uma tela branca, sem explicação e sem saída. Aqui a pessoa ao menos
 * entende o que houve e consegue voltar.
 */
export class LimiteDeErro extends Component<Props, Estado> {
	state: Estado = { falhou: false }

	static getDerivedStateFromError(): Estado {
		return { falhou: true }
	}

	componentDidCatch(erro: Error, info: ErrorInfo) {
		// Sem serviço de monitoramento no projeto, o console é o que resta para
		// investigar depois pelo relato de quem viu a tela.
		console.error('Falha não tratada na interface:', erro, info.componentStack)
	}

	render() {
		if (!this.state.falhou) return this.props.children

		return (
			<main className={styles.page} role="alert">
				<div>
					<p className={styles.eyebrow}>Algo saiu do lugar</p>
					<h1>Esta tela não pôde ser exibida.</h1>
					<p className={styles.texto}>
						O erro foi registrado no console do navegador. Recarregar costuma
						resolver; se insistir, volte ao início e tente por outro caminho.
					</p>
					<div className={styles.acoes}>
						<button onClick={() => window.location.reload()} type="button">Recarregar a página</button>
						<a href="/">Voltar ao início</a>
					</div>
				</div>
			</main>
		)
	}
}
