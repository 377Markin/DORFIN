import apiClient from './client'
import type { AuthTokens, LoginRequest, RegisterRequest } from '@/types'

export const authApi = {
  login: async (body: LoginRequest): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', body)
    return data
  },

  register: async (body: RegisterRequest): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/register', body)
    return data
  },

  googleLogin: async (idToken: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/google', { id_token: idToken })
    return data
  },

  appleLogin: async (idToken: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/apple', { id_token: idToken })
    return data
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me')
    return data
  },

checkEmail: async (email: string): Promise<{ exists: boolean }> => {
  const { data } = await apiClient.post('/auth/check-email', { email })
  return data
},

uploadFoto: async (file: File): Promise<{ foto_url: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/auth/me/foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
},
}
