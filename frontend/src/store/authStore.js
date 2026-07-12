import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('transitops_token') || null,
  user: JSON.parse(localStorage.getItem('transitops_user') || 'null'),

  login: (token, user) => {
    localStorage.setItem('transitops_token', token)
    localStorage.setItem('transitops_user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('transitops_token')
    localStorage.removeItem('transitops_user')
    set({ token: null, user: null })
  },

  isAuthenticated: () => {
    const state = useAuthStore.getState()
    return !!state.token
  },
}))

export default useAuthStore
