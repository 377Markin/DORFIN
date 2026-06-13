import apiClient from './client'
import type {
  TrainingLog, TrainingLogCreate,
  Exercise, Routine, RoutineCreate,
  Mesociclo, MesocicloCreate,
  UserStats, StreakData,
} from '@/types'

// ── Training Logs ────────────────────────────────────────────
export const trainingLogsApi = {
  list: async (limit = 50, offset = 0): Promise<TrainingLog[]> => {
    const { data } = await apiClient.get<TrainingLog[]>('/training-logs/', { params: { limit, offset } })
    return data
  },

  create: async (body: TrainingLogCreate): Promise<TrainingLog> => {
    const { data } = await apiClient.post<TrainingLog>('/training-logs/', body)
    return data
  },

  getById: async (id: number): Promise<TrainingLog> => {
    const { data } = await apiClient.get<TrainingLog>(`/training-logs/${id}`)
    return data
  },

  getUltimo: async (ejercicioId: number): Promise<TrainingLog | null> => {
    try {
      const { data } = await apiClient.get<TrainingLog>(`/training-logs/ultimo/${ejercicioId}`)
      return data
    } catch {
      return null
    }
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/training-logs/${id}`)
  },

  getStreak: async (): Promise<StreakData> => {
    const { data } = await apiClient.get<StreakData>('/training-logs/streak')
    return data
  },

  getStats: async (): Promise<UserStats> => {
    const { data } = await apiClient.get<UserStats>('/training-logs/stats')
    return data
  },

  getHistorialEjercicio: async (ejercicioId: number) => {
    const { data } = await apiClient.get(`/training-logs/ejercicio/${ejercicioId}/historial`)
    return data as {
      ejercicio_id: number
      ejercicio_nombre: string
      logs: { fecha: string; peso: number; repeticiones: number; rir: number; series: number }[]
    }
  },
  getHistorialSemanal: async () => {
    const { data } = await apiClient.get('/training-logs/historial/semanal')
    return data as {
      semana_inicio: string
      dias: {
        fecha: string
        ejercicios: { nombre: string; peso: number; repeticiones: number; rir: number; series: number }[]
      }[]
    }[]
  },
  getHistorialPorNombre: async (nombre: string) => {
    const { data } = await apiClient.get(`/training-logs/ejercicio/nombre/${encodeURIComponent(nombre)}/historial`)
    return data as {
      ejercicio_nombre: string
      logs: { fecha: string; peso: number; repeticiones: number; rir: number; series: number }[]
    }
  },
}

// ── Exercises ─────────────────────────────────────────────────
export const exercisesApi = {
  list: async (fuente: 'local' | 'wger' = 'local', limit = 50): Promise<Exercise[]> => {
    const { data } = await apiClient.get<Exercise[]>('/ejercicios/', { params: { fuente, limit } })
    return data
  },

  getById: async (id: number): Promise<Exercise> => {
    const { data } = await apiClient.get<Exercise>(`/ejercicios/${id}`)
    return data
  },

  create: async (body: { nombre: string; musculo: string; descripcion: string }): Promise<Exercise> => {
    const { data } = await apiClient.post<Exercise>('/ejercicios/', body)
    return data
  },
}

// ── Routines ──────────────────────────────────────────────────
export const routinesApi = {
  list: async (): Promise<Routine[]> => {
    const { data } = await apiClient.get<Routine[]>('/rutinas/')
    return data
  },

  create: async (body: RoutineCreate): Promise<Routine> => {
    const { data } = await apiClient.post<Routine>('/rutinas/', body)
    return data
  },

  getById: async (id: number): Promise<Routine> => {
    const { data } = await apiClient.get<Routine>(`/rutinas/${id}`)
    return data
  },

  update: async (id: number, body: RoutineCreate): Promise<Routine> => {
    const { data } = await apiClient.put<Routine>(`/rutinas/${id}`, body)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/rutinas/${id}`)
  },

  completar: async (id: number): Promise<Routine> => {
    const { data } = await apiClient.post<Routine>(`/rutinas/${id}/completar`)
    return data
  },
  registrarDescanso: async (id: number): Promise<Routine> => {
    const { data } = await apiClient.post<Routine>(`/rutinas/${id}/descanso`)
    return data
  },
  resetCiclo: async (): Promise<Routine[]> => {
    const { data } = await apiClient.post<Routine[]>('/rutinas/reset-ciclo')
    return data
  },
}

// ── Mesociclos ────────────────────────────────────────────────
export const mesociclosApi = {
  list: async (): Promise<Mesociclo[]> => {
    const { data } = await apiClient.get<Mesociclo[]>('/mesociclos/')
    return data
  },

  getActivo: async (): Promise<Mesociclo | null> => {
    try {
      const { data } = await apiClient.get<Mesociclo>('/mesociclos/activo')
      return data
    } catch {
      return null
    }
  },

  create: async (body: MesocicloCreate): Promise<Mesociclo> => {
    const { data } = await apiClient.post<Mesociclo>('/mesociclos/', body)
    return data
  },

  update: async (id: number, body: MesocicloCreate): Promise<Mesociclo> => {
    const { data } = await apiClient.put<Mesociclo>(`/mesociclos/${id}`, body)
    return data
  },

  agregarMedidas: async (id: number, semana: number, mes: number, medidas: Record<string, number>): Promise<Mesociclo> => {
    const { data } = await apiClient.post<Mesociclo>(`/mesociclos/${id}/medidas`, { semana, mes, medidas })
    return data
  },

  extender: async (id: number, semanas_extra: number, meta: string): Promise<Mesociclo> => {
    const { data } = await apiClient.post<Mesociclo>(`/mesociclos/${id}/extender`, { semanas_extra, meta })
    return data
  },
}
// ── Rutina Ejercicios ─────────────────────────────────────────
export interface RutinaEjercicio {
  id: number
  rutina_id: number
  nombre: string
  musculo?: string
  descripcion?: string
  series?: number
  descanso?: number
  rir_objetivo?: number[] | null
}

export interface RutinaEjercicioCreate {
  nombre: string
  musculo?: string
  descripcion?: string
  series?: number
  descanso?: number
  rir_objetivo?: number[] | null
}

export const rutinaEjerciciosApi = {
  list: async (rutinaId: number): Promise<RutinaEjercicio[]> => {
    const { data } = await apiClient.get<RutinaEjercicio[]>(`/rutinas/${rutinaId}/ejercicios/`)
    return data
  },

  create: async (rutinaId: number, body: RutinaEjercicioCreate): Promise<RutinaEjercicio> => {
    const { data } = await apiClient.post<RutinaEjercicio>(`/rutinas/${rutinaId}/ejercicios/`, body)
    return data
  },

  delete: async (rutinaId: number, ejercicioId: number): Promise<void> => {
    await apiClient.delete(`/rutinas/${rutinaId}/ejercicios/${ejercicioId}`)
  },
}