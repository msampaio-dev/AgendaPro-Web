import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEsperaLonga } from './useEsperaLonga'

describe('useEsperaLonga', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	function montar(esperando: boolean) {
		return renderHook(({ ativo }) => useEsperaLonga(ativo, 4000), { initialProps: { ativo: esperando } })
	}

	it('só avisa depois que a espera passa do limite', () => {
		const { result } = montar(true)

		expect(result.current).toBe(false)
		act(() => { vi.advanceTimersByTime(3999) })
		expect(result.current).toBe(false)

		act(() => { vi.advanceTimersByTime(1) })
		expect(result.current).toBe(true)
	})

	it('não avisa quando a resposta chega rápido', () => {
		const { result, rerender } = montar(true)

		act(() => { vi.advanceTimersByTime(1000) })
		rerender({ ativo: false })

		expect(result.current).toBe(false)
	})

	it('recomeça a contagem a cada nova espera', () => {
		const { result, rerender } = montar(true)

		act(() => { vi.advanceTimersByTime(4000) })
		expect(result.current).toBe(true)

		rerender({ ativo: false })
		rerender({ ativo: true })

		// A segunda espera não pode herdar o aviso da primeira.
		expect(result.current).toBe(false)
		act(() => { vi.advanceTimersByTime(4000) })
		expect(result.current).toBe(true)
	})
})
