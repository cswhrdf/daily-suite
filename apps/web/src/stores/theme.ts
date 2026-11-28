import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'

export type ThemeMode = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'theme-mode'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredMode(): ThemeMode {
  const storedMode = window.localStorage.getItem(STORAGE_KEY)
  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode
  }
  return 'auto'
}

export const useThemeStore = defineStore('theme', () => {
  const vuetifyTheme = useTheme()
  const mode = ref<ThemeMode>(readStoredMode())
  const systemIsDark = ref(false)
  const isDark = computed<boolean>(() =>
    mode.value === 'auto' ? systemIsDark.value : mode.value === 'dark',
  )

  function applyTheme(): void {
    // Vuetify 4 起直接赋值 theme.global.name.value 已弃用，统一走 change()。
    void vuetifyTheme.change(isDark.value ? 'dark' : 'light')
  }

  function setMode(nextMode: ThemeMode): void {
    mode.value = nextMode
    window.localStorage.setItem(STORAGE_KEY, nextMode)
    applyTheme()
  }

  function initialize(): () => void {
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY)
    systemIsDark.value = mediaQuery.matches
    applyTheme()

    function handleSystemChange(event: MediaQueryListEvent): void {
      systemIsDark.value = event.matches
      if (mode.value === 'auto') {
        applyTheme()
      }
    }

    function stopThemeSync(): void {
      mediaQuery.removeEventListener('change', handleSystemChange)
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return stopThemeSync
  }

  return {
    applyTheme,
    initialize,
    isDark,
    mode,
    setMode,
  }
})
