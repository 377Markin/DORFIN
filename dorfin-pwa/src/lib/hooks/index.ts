import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/stores/authStore'
import { authApi } from '@/lib/api/auth'
import { trainingLogsApi } from '@/lib/api'
import type { LoginRequest, RegisterRequest, TrainingLogCreate, EntradaHistorial } from '@/types'
import type { ResultadoGrasa } from '@/lib/bodyfat'

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
// ── Grasa corporal ───────────────────────────────────────────
// Toda la persistencia de composición corporal vive en localStorage
// con claves por usuario para evitar mezcla de datos.
//
// Claves:
//   dorfin-grasa-u{id}            → medidas actuales (último formulario)
//   dorfin-grasa-u{id}-historial  → array de EntradaHistorial
//
// Compatibilidad hacia atrás:
//   Entradas antiguas usan `porcentaje` en lugar de `grasa`.
//   Todos los helpers leen con h.grasa ?? h.porcentaje.
//   Campos nuevos ausentes devuelven undefined, nunca rompen.


// Límite de entradas en historial.
// ~50 mediciones = ~25 KB por usuario. Razonable para localStorage (5 MB).
const MAX_HISTORIAL = 200

export function useGrasaCorporal() {
  const user = useAuthStore((s) => s.user)

  const KEY_MEDIDAS   = `dorfin-grasa-u${user?.id}`
  const KEY_HISTORIAL = `dorfin-grasa-u${user?.id}-historial`

  // ── getMedidas ──────────────────────────────────────────────
  // Devuelve las medidas del último formulario guardado.
  // Útil para pre-rellenar el formulario con los últimos valores.
  const getMedidas = (): Record<string, string | number> | null => {
    try {
      const raw = localStorage.getItem(KEY_MEDIDAS)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  // ── saveMedidas ─────────────────────────────────────────────
  // Persiste el estado actual del formulario de medidas.
  // Llamado cada vez que el usuario guarda desde el formulario semanal
  // o desde CuerpoDorfinPage. Solo guarda el formulario, NO el historial.
  const saveMedidas = (medidas: Record<string, string | number>) => {
    try {
      localStorage.setItem(KEY_MEDIDAS, JSON.stringify({
        ...medidas,
        _guardado: new Date().toISOString(),
      }))
    } catch (e) {
      console.warn('DORFIN: no se pudo guardar medidas en localStorage', e)
    }
  }

  // ── getHistorial ────────────────────────────────────────────
  // Devuelve el historial tipado.
  // Maneja entradas antiguas vía normalización:
  //   - grasa    = entrada.grasa ?? entrada.porcentaje ?? 0
  //   - el resto de campos nuevos son undefined si no existen
  const getHistorial = (): EntradaHistorial[] => {
    try {
      const raw = localStorage.getItem(KEY_HISTORIAL)
      if (!raw) return []
      const parsed: unknown[] = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []

      return parsed.map((h: unknown): EntradaHistorial => {
        const e = h as Record<string, unknown>

        // Normalizar campo canónico de grasa (compat. hacia atrás)
        const grasa = (e.grasa as number | undefined)
                   ?? (e.porcentaje as number | undefined)
                   ?? 0

        // Extraer cintura: campo separado primero, luego desde medidas
        const medidas = (e.medidas as Record<string, number> | undefined) ?? {}
        const cintura = (e.cintura as number | undefined)
                     ?? medidas.cintura
                     ?? undefined

        return {
          fecha:                (e.fecha as string)           ?? 'Sin fecha',
          peso:                 (e.peso  as number)           ?? 0,
          grasa,
          porcentaje:           grasa,                        // alias deprecated — compatibilidad
          margenError:          e.margenError  as number | undefined,
          confianza:            e.confianza    as number | undefined,
          categoria:            e.categoria    as string | undefined,
          masaMuscular:         e.masaMuscular as number | undefined,   // estimada, ver nota UI
          masaGrasa:            e.masaGrasa    as number | undefined,
          masaLibreGrasa:       e.masaLibreGrasa as number | undefined,
          cintura,
          cuello:               (e.cuello  as number | undefined) ?? medidas.cuello,
          abdomen:              (e.abdomen as number | undefined) ?? medidas.abdomen,
          cadera:               (e.cadera  as number | undefined) ?? medidas.cadera,
          medidas,
        }
      })
    } catch {
      return []
    }
  }

  // ── saveHistorial ───────────────────────────────────────────
  // Guarda una nueva entrada completa en el historial.
  //
  // Recibe:
  //   resultado → ResultadoGrasa calculado por bodyfat.ts
  //   medidas   → Record<string, number> con todos los campos del formulario
  //   peso      → número en kg (del perfil del usuario)
  //
  // Guarda un snapshot completo para que en el futuro se pueda
  // reconstruir cualquier medición histórica campo por campo.
  const saveHistorial = (
    resultado: ResultadoGrasa,
    medidas:   Record<string, number | string>,
    peso:      number,
  ) => {
    try {
      const hist = getHistorial()

      // Normalizar medidas a number (el formulario puede tener strings)
      const medidasNum: Record<string, number> = {}
      for (const [k, v] of Object.entries(medidas)) {
        const n = typeof v === 'string' ? parseFloat(v) : v
        if (!isNaN(n) && k !== '_guardado') medidasNum[k] = n
      }

      const entrada: EntradaHistorial = {
        fecha:   new Date().toISOString().split('T')[0],
        peso,

        // Resultado del cálculo
        grasa:          resultado.porcentaje,
        porcentaje:     resultado.porcentaje,   // alias deprecated
        margenError:    resultado.margenError,
        confianza:      resultado.confianza,
        categoria:      resultado.categoria,

        // Composición corporal
        // NOTA UI: masaMuscular es ESTIMADA (~85% de masa libre de grasa)
        // Nunca presentar como medición real
        masaMuscular:   resultado.masaMuscular,
        masaGrasa:      resultado.masaGrasa,
        masaLibreGrasa: resultado.masaLibreGrasa,

        // Campos separados para gráficas rápidas (evita parsear medidas)
        cintura:  medidasNum.cintura,
        cuello:   medidasNum.cuello,
        abdomen:  medidasNum.abdomen,
        cadera:   medidasNum.cadera,

        // Snapshot completo de todas las medidas ingresadas
        medidas: medidasNum,
      }

      hist.push(entrada)

      // Aplicar límite de entradas (FIFO — elimina las más antiguas)
      const limitado = hist.length > MAX_HISTORIAL
        ? hist.slice(hist.length - MAX_HISTORIAL)
        : hist

      localStorage.setItem(KEY_HISTORIAL, JSON.stringify(limitado))
    } catch (e) {
      console.warn('DORFIN: no se pudo guardar historial en localStorage', e)
    }
  }

  // ── clearHistorial ──────────────────────────────────────────
  // Útil para testing o si el usuario quiere reiniciar.
  // NO exportado desde el hook directamente — debe llamarse
  // explícitamente desde una UI de configuración cuando exista.
  const _clearHistorial = () => {
    localStorage.removeItem(KEY_HISTORIAL)
    localStorage.removeItem(KEY_MEDIDAS)
  }

  // ── getUltimaMedicion ───────────────────────────────────────
  // Shortcut para obtener la entrada más reciente del historial.
  // Útil para el dashboard compacto de MesocicloPage.
  const getUltimaMedicion = (): EntradaHistorial | null => {
    const hist = getHistorial()
    return hist.length > 0 ? hist[hist.length - 1] : null
  }

  // ── getEvolucion ────────────────────────────────────────────
  // Extrae series de datos para gráficas.
  // Si un campo no existe en una entrada antigua devuelve null,
  // no rompe el array — la gráfica filtra los nulls.
  const getEvolucion = () => {
    const hist = getHistorial()
    return {
      fechas:         hist.map(h => h.fecha),
      grasa:          hist.map(h => h.grasa ?? h.porcentaje ?? null),
      peso:           hist.map(h => h.peso ?? null),
      masaGrasa:      hist.map(h => h.masaGrasa ?? null),
      masaLibreGrasa: hist.map(h => h.masaLibreGrasa ?? null),
      masaMuscular:   hist.map(h => h.masaMuscular ?? null),  // estimada
      cintura:        hist.map(h => h.cintura ?? h.medidas?.cintura ?? null),
      cadera:         hist.map(h => h.cadera  ?? h.medidas?.cadera  ?? null),
      cuello:         hist.map(h => h.cuello  ?? h.medidas?.cuello  ?? null),
      abdomen:        hist.map(h => h.abdomen ?? h.medidas?.abdomen ?? null),
    }
  }

  return {
    getMedidas,
    saveMedidas,
    getHistorial,
    saveHistorial,
    getUltimaMedicion,
    getEvolucion,
    // No exponer _clearHistorial aquí — agregar cuando haya UI para ello
  }
}