// ── Auth ─────────────────────────────────────────────────────
export interface User {
  id: number
  nombre: string
  email: string
  fecha_nacimiento?: string
  altura?: number
  peso?: number
  meta?: string
  foto_url?: string
  sexo?: string
  fecha_creacion?: string
}

/** Calcula la edad actual a partir de fecha_nacimiento */
export function calcularEdad(user: User): number | undefined {
  if (user.fecha_nacimiento) {
    const hoy = new Date()
    const nac = new Date(user.fecha_nacimiento + 'T00:00:00')
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }
  return undefined
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface LoginRequest {
  email: string
  contrasena: string
}

export interface RegisterRequest {
  nombre: string
  email: string
  contrasena: string
  fecha_nacimiento: string
  altura: number
  peso: number
  meta: string
}

export interface RegisterRequest {
  nombre: string
  email: string
  contrasena: string
  fecha_nacimiento: string
  altura: number
  peso: number
  meta: string
  sexo: string
}

// ── Exercise ──────────────────────────────────────────────────
export interface Exercise {
  id: number
  nombre: string  
  musculo: string
  descripcion: string
  imagen_url?: string | null
}

// ── Routine ───────────────────────────────────────────────────
export interface Routine {
  id: number
  usuario_id: number
  nombre: string
  dia: number
  fecha_creacion?: string
  completado_hoy?: boolean
}

export interface RoutineCreate {
  nombre: string
  dia: number
}

// ── Training Log ──────────────────────────────────────────────
export interface TrainingLog {
  id: number
  usuario_id: number
  ejercicio_id: number
  series: number
  repeticiones: string
  rir: number
  descanso: string
  fecha?: string
  anotaciones?: string
  fecha_creacion?: string
}

export interface TrainingLogCreate {
  ejercicio_id: number
  series: number
  repeticiones: string
  rir: number
  descanso: string
  fecha?: string
  anotaciones?: string
}

// ── Mesociclo ─────────────────────────────────────────────────
export interface MedidaSnapshot {
  fecha: string
  semana: number
  mes: number
  medidas: Record<string, number>
}

export interface Mesociclo {
  id: number
  usuario_id: number
  fecha_inicio: string
  peso_inicial: number
  medidas: Record<string, number>
  meta: string
  duracion_semanas: number
  frecuencia_medidas: string
  historial_medidas: MedidaSnapshot[]
  fecha_creacion?: string
}

export interface MesocicloCreate {
  fecha_inicio: string
  peso_inicial: number
  medidas: Record<string, number>
  meta: string
  duracion_semanas: number
  frecuencia_medidas: string
}

// ── Stats ─────────────────────────────────────────────────────
export interface WeeklyVolume {
  semana: string
  volumen: number
}

export interface PersonalRecord {
  ejercicio_id: number
  ejercicio_nombre: string
  peso_max: number
  fecha: string
}

export interface UserStats {
  entrenos_mes: number
  kg_totales_mes: number
  prs_nuevos: number
  volumen_semanal: WeeklyVolume[]
  personal_records: PersonalRecord[]
}

// ── Streak ────────────────────────────────────────────────────
export interface DiaCompletado {
  dia: string
  completado: boolean
}

export interface StreakData {
  racha: number
  dias_completados: DiaCompletado[]
}

// ── RIR ───────────────────────────────────────────────────────
export type RIRLevel = 0 | 1 | 2 | 4

export interface RIROption {
  value: RIRLevel
  label: string
  description: string
  color: string
  bgColor: string
}

// ── API Error ─────────────────────────────────────────────────
export interface ApiError {
  detail: string
  status?: number
}

// ── Active Workout Session ─────────────────────────────────────
export interface ActiveSet {
  serieNum: number
  peso: number
  repeticiones: number
  rir: RIRLevel
  completada: boolean
}

export interface ActiveExercise {
  ejercicio: Exercise
  sets: ActiveSet[]
  totalSeries: number
}