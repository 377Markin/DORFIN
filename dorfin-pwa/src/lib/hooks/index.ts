import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/stores/authStore'
import { authApi } from '@/lib/api/auth'
import { trainingLogsApi } from '@/lib/api'
import type { LoginRequest, RegisterRequest, TrainingLogCreate } from '@/types'

// ── Auth ──────────────────────────────────────────────────────
export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success(`¡Bienvenido, ${data.user.nombre}!`)
      navigate('/')
    },
    onError: () => {
      toast.error('Credenciales incorrectas')
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success('¡Cuenta creada! Bienvenido a DORFIN 🔥')
      navigate('/')
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail: string } } }
      toast.error(e?.response?.data?.detail || 'Error al crear cuenta')
    },
  })
}

export function useLogout() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth()
      qc.clear()
      navigate('/auth')
    },
  })
}

// ── Streak ────────────────────────────────────────────────────
export function useStreak() {
  return useQuery({
    queryKey: ['streak'],
    queryFn: () => trainingLogsApi.getStreak(),
    staleTime: 1000 * 60 * 5, // 5 min
  })
}

// ── Stats ─────────────────────────────────────────────────────
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => trainingLogsApi.getStats(),
    staleTime: 1000 * 60 * 10,
  })
}

// ── Training Logs ─────────────────────────────────────────────
export function useUltimoLog(ejercicioId: number | null) {
  return useQuery({
    queryKey: ['ultimo-log', ejercicioId],
    queryFn: () => trainingLogsApi.getUltimo(ejercicioId!),
    enabled: ejercicioId !== null,
    staleTime: 0,
  })
}

export function useCreateLog() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (body: TrainingLogCreate) => trainingLogsApi.create(body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['ultimo-log', variables.ejercicio_id] })
      qc.invalidateQueries({ queryKey: ['ultimo-log-nombre'] })
      qc.invalidateQueries({ queryKey: ['historial-ejercicio-nombre'] })
      qc.invalidateQueries({ queryKey: ['streak'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('¡Serie registrada! 💪')
    },
    onError: () => {
      toast.error('Error al guardar la serie')
    },
  })
}

// ── Routines ──────────────────────────────────────────────────
import { routinesApi, exercisesApi, mesociclosApi } from '@/lib/api'
import type { RoutineCreate, MesocicloCreate } from '@/types'

export function useRoutines() {
  return useQuery({
    queryKey: ['routines'],
    queryFn: () => routinesApi.list(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RoutineCreate) => routinesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] })
      toast.success('Rutina creada')
    },
  })
}

export function useDeleteRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => routinesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['streak'] })
      toast.success('Rutina eliminada')
    },
  })
}

// ── Exercises ─────────────────────────────────────────────────
export function useExercises(fuente: 'local' | 'wger' = 'local') {
  return useQuery({
    queryKey: ['exercises', fuente],
    queryFn: () => exercisesApi.list(fuente),
    staleTime: 1000 * 60 * 60, // 1h — ejercicios cambian poco
  })
}

export function useExercise(id: number | null) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exercisesApi.getById(id!),
    enabled: id !== null,
    staleTime: 1000 * 60 * 60,
  })
}

// ── Mesociclos ────────────────────────────────────────────────
export function useMesocicloActivo() {
  return useQuery({
    queryKey: ['mesociclo-activo'],
    queryFn: () => mesociclosApi.getActivo(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateMesociclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MesocicloCreate) => mesociclosApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesociclo-activo'] })
      toast.success('Mesociclo creado')
    },
  })
}

export function useAgregarMedidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, semana, mes, medidas }: { id: number; semana: number; mes: number; medidas: Record<string, number> }) =>
      mesociclosApi.agregarMedidas(id, semana, mes, medidas),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesociclo-activo'] })
      toast.success('Medidas guardadas 💪')
    },
    onError: () => toast.error('Error al guardar medidas'),
  })
}
export function useGrasaCorporal() {
  const user = useAuthStore((s) => s.user)
  
  // Leer medidas guardadas en localStorage
  const storageKey = `dorfin-grasa-u${user?.id}`
  
  const getMedidas = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch { return null }
  }

  const saveMedidas = (medidas: Record<string, number | string>) => {
    localStorage.setItem(storageKey, JSON.stringify({
      ...medidas,
      fecha: new Date().toISOString(),
    }))
  }

  const getHistorial = (): any[] => {
    try {
      return JSON.parse(localStorage.getItem(`${storageKey}-historial`) || '[]')
    } catch { return [] }
  }

  const saveHistorial = (resultado: any, medidas: any) => {
    const hist = getHistorial()
    hist.push({
      fecha: new Date().toISOString().split('T')[0],
      porcentaje: resultado.porcentaje,
      confianza: resultado.confianza,
      peso: medidas.peso,
      medidas,
    })
    localStorage.setItem(`${storageKey}-historial`, JSON.stringify(hist))
  }

  return { getMedidas, saveMedidas, getHistorial, saveHistorial, user }
}