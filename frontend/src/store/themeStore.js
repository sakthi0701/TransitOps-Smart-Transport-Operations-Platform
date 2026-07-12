import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      isDark: false, // default: light mode
      toggleTheme: () => {
        const next = !get().isDark
        applyTheme(next)
        set({ isDark: next })
      },
      initTheme: () => {
        applyTheme(get().isDark)
      },
    }),
    {
      name: 'transitops-theme',
    }
  )
)

export default useThemeStore
