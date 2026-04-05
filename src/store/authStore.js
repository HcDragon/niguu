import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { apiLogin, apiSignup, apiGetMe, apiPatientLogin } from '../lib/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────
      user: null,           // full user profile object
      accessToken: null,    // JWT access token
      refreshToken: null,   // JWT refresh token
      role: null,           // 'doctor' | 'patient'
      isLoading: false,

      // ── Actions ────────────────────────────────────────────

      /**
       * Sign in with email + password via Django JWT.
       */
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await apiLogin(email, password)
          set({
            user: data.user,
            accessToken: data.access,
            refreshToken: data.refresh,
            role: data.user.role,
            isLoading: false,
          })
          return { user: data.user, role: data.user.role }
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      /**
       * Register a new user via Django API.
       */
      signup: async (fullName, email, password) => {
        set({ isLoading: true })
        try {
          const data = await apiSignup(fullName, email, password)
          set({ isLoading: false })
          return { user: data.user }
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      /**
       * Login as a patient using doctor-assigned patient_id + password.
       */
      patientLogin: async (patientId, password) => {
        set({ isLoading: true })
        try {
          const data = await apiPatientLogin(patientId, password)
          set({
            user: data.user,
            accessToken: data.access,
            refreshToken: data.refresh,
            role: data.user.role,
            isLoading: false,
          })
          return { user: data.user, role: data.user.role }
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      /**
       * Sign out and clear all auth state.
       */
      logout: async () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          role: null,
          isLoading: false,
        })
      },

      /**
       * Re-fetch the user profile from Django API.
       */
      refreshUser: async () => {
        const token = get().accessToken
        if (!token) return
        try {
          const profile = await apiGetMe()
          set({ user: profile, role: profile.role })
        } catch {
          // token may be expired
        }
      },
    }),
    {
      name: 'nakshatra-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

export default useAuthStore
