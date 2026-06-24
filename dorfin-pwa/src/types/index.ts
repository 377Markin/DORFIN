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
// ── Composición corporal — Medidas ───────────────────────────
// Todas las medidas que el usuario puede ingresar.
// El formulario semanal y CuerpoDorfinPage comparten esta estructura.
export interface MedidasFormulario {
  // Obligatorias (activan US Navy)
  cuello:   number
  cintura:  number
  abdomen:  number
  cadera:   number

  // Recomendadas (mejoran Modelo DORFIN)
  hombros?:         number
  pecho?:           number
  bicep_der?:       number
  bicep_izq?:       number
  muslo_der?:       number
  muslo_izq?:       number
  pantorrilla_der?: number
  pantorrilla_izq?: number
  antebrazo_der?:   number
  antebrazo_izq?:   number

  // Avanzadas (frame size + proporcionalidad)
  muneca?:          number
  tobillo?:         number
  anchura_hombros?: number
  anchura_cadera?:  number
  altura_sentado?:  number
}

// ── Composición corporal — Historial ─────────────────────────
// Una entrada por medición guardada en localStorage.
// Diseñado para compatibilidad hacia atrás: todos los campos
// nuevos son opcionales. Entradas antiguas siguen siendo válidas.
export interface EntradaHistorial {
  fecha:           string     // ISO date YYYY-MM-DD
  peso:            number     // kg

  // Resultado de grasa
  grasa:           number     // % grasa estimado
  margenError?:    number     // ± porcentaje
  confianza?:      number     // 0-100
  categoria?:      string     // 'Atlético', 'Promedio', etc.

  // Composición — NOTA: masaMuscular es ESTIMACIÓN, no medición real.
  // Representa aprox. el 85% de la masa libre de grasa.
  masaMuscular?:   number     // kg — estimado
  masaGrasa?:      number     // kg — calculado de grasa%
  masaLibreGrasa?: number     // kg — peso - masaGrasa (músculo+hueso+agua+órganos)

  // Medidas para gráficas individuales (extraídas del objeto medidas)
  cintura?:        number     // cm — campo separado para la gráfica
  cuello?:         number     // cm
  abdomen?:        number     // cm
  cadera?:         number     // cm

  // Objeto completo de medidas — todo lo que el usuario ingresó
  medidas?:        Record<string, number>

  // Retrocompatibilidad con entradas antiguas que usaban 'porcentaje'
  porcentaje?:     number     // alias de grasa — DEPRECATED, usar grasa
}

// ── Composición corporal — Niveles de precisión ───────────────
// Mapea el % de confianza a un nivel visual para la barra de precisión.
export type NivelPrecision = 'baja' | 'media' | 'alta' | 'muy_alta'

export function confianzaANivel(confianza: number): NivelPrecision {
  if (confianza >= 85) return 'muy_alta'
  if (confianza >= 70) return 'alta'
  if (confianza >= 50) return 'media'
  return 'baja'
}

export const LABEL_PRECISION: Record<NivelPrecision, string> = {
  baja:     'Baja',
  media:    'Media',
  alta:     'Alta',
  muy_alta: 'Muy alta',
}

export const COLOR_PRECISION: Record<NivelPrecision, string> = {
  baja:     '#f87171',   // rojo
  media:    '#fb923c',   // naranja
  alta:     '#facc15',   // amarillo
  muy_alta: '#39FF14',   // verde DORFIN
}

// ── Advertencia antropométrica (re-exportada desde bodyfat.ts) ──
// Se define en bodyfat.ts y se re-exporta aquí para que los
// componentes solo necesiten importar desde @/types.
export type { AdvertenciaAntropometrica } from '@/lib/bodyfat'