import { useEffect, useState } from 'react'

/**
 * Vira true quando uma espera passa do tempo informado.
 *
 * A API hiberna no plano gratuito e leva perto de um minuto para voltar. Sem
 * aviso, a tela parada parece defeito — e a pessoa vai embora antes de o
 * servidor responder.
 */
export function useEsperaLonga(esperando: boolean, milissegundos = 4000) {
	const [demorou, setDemorou] = useState(false)

	useEffect(() => {
		if (!esperando) {
			// Zerar aqui e nao durante a renderizacao e proposital: cada espera
			// recomeca a contagem, em vez de herdar o aviso da anterior.
			// oxlint-disable-next-line react/set-state-in-effect
			setDemorou(false)
			return
		}

		const temporizador = setTimeout(() => setDemorou(true), milissegundos)
		return () => clearTimeout(temporizador)
	}, [esperando, milissegundos])

	return demorou
}
