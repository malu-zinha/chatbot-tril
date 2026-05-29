import { describe, it, expect, vi } from 'vitest'
import { debounce } from '@/lib/debounce'

describe('debounce', () => {
  it('chama apenas uma vez após múltiplos triggers', async () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d(); d(); d()
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(spy).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
