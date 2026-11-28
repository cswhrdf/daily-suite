import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '@/stores/theme'

const themeName = vi.hoisted(() => ({ value: 'light' }))

vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  return {
    ...actual,
    useTheme: () => ({
      change: (name: string): Promise<void> => {
        themeName.value = name
        return Promise.resolve()
      },
    }),
  }
})

type SystemThemeListener = (event: MediaQueryListEvent) => void

interface MatchMediaController {
  dispatchChange: (matches: boolean) => void
  matchMedia: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

function stubMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<SystemThemeListener>()
  const removeEventListener = vi.fn(
    (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.delete(listener)
      }
    },
  )
  const mediaQuery = {
    get matches(): boolean {
      return matches
    },
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject): void => {
      if (typeof listener === 'function') {
        listeners.add(listener)
      }
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    removeEventListener,
  } as unknown as MediaQueryList
  const matchMedia = vi.fn(() => mediaQuery)
  vi.stubGlobal('matchMedia', matchMedia)

  function dispatchChange(nextMatches: boolean): void {
    matches = nextMatches
    const event = { matches, media: mediaQuery.media } as MediaQueryListEvent
    listeners.forEach((listener) => {
      listener(event)
    })
  }

  return { dispatchChange, matchMedia, removeEventListener }
}

function createThemeStore(): ReturnType<typeof useThemeStore> {
  setActivePinia(createPinia())
  return useThemeStore()
}

beforeEach(() => {
  localStorage.clear()
  themeName.value = 'light'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('theme store', () => {
  it('没有持久化设置时默认跟随浅色系统偏好，并可停止监听', () => {
    const system = stubMatchMedia(false)
    const theme = createThemeStore()

    expect(theme.mode).toBe('auto')
    expect(theme.isDark).toBe(false)

    const stopThemeSync = theme.initialize()

    expect(system.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(themeName.value).toBe('light')

    stopThemeSync()
    expect(system.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('auto 模式初始化时跟随深色系统偏好', () => {
    stubMatchMedia(true)
    const theme = createThemeStore()

    theme.initialize()

    expect(theme.isDark).toBe(true)
    expect(themeName.value).toBe('dark')
  })

  it.each(['light', 'dark'] as const)('读取已持久化的 %s 模式', (savedMode) => {
    stubMatchMedia(false)
    localStorage.setItem('theme-mode', savedMode)
    const theme = createThemeStore()

    theme.initialize()

    expect(theme.mode).toBe(savedMode)
    expect(theme.isDark).toBe(savedMode === 'dark')
    expect(themeName.value).toBe(savedMode)
  })

  it('setMode 强制切换亮暗主题并持久化，支持恢复 auto', () => {
    stubMatchMedia(false)
    const theme = createThemeStore()
    theme.initialize()

    theme.setMode('dark')
    expect(theme.mode).toBe('dark')
    expect(theme.isDark).toBe(true)
    expect(themeName.value).toBe('dark')
    expect(localStorage.getItem('theme-mode')).toBe('dark')

    theme.setMode('light')
    expect(theme.mode).toBe('light')
    expect(theme.isDark).toBe(false)
    expect(themeName.value).toBe('light')
    expect(localStorage.getItem('theme-mode')).toBe('light')

    theme.setMode('auto')
    expect(theme.mode).toBe('auto')
    expect(localStorage.getItem('theme-mode')).toBe('auto')
  })

  it('auto 模式实时响应系统偏好变化', () => {
    const system = stubMatchMedia(false)
    const theme = createThemeStore()
    theme.initialize()

    system.dispatchChange(true)
    expect(theme.isDark).toBe(true)
    expect(themeName.value).toBe('dark')

    system.dispatchChange(false)
    expect(theme.isDark).toBe(false)
    expect(themeName.value).toBe('light')
  })

  it('手动模式不跟随系统偏好变化', () => {
    const system = stubMatchMedia(false)
    const theme = createThemeStore()
    theme.initialize()

    theme.setMode('light')
    system.dispatchChange(true)
    expect(theme.isDark).toBe(false)
    expect(themeName.value).toBe('light')

    theme.setMode('dark')
    system.dispatchChange(false)
    expect(theme.isDark).toBe(true)
    expect(themeName.value).toBe('dark')
  })
})
