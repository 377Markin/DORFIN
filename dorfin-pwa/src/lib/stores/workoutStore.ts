import { create } from 'zustand'
import type { ActiveExercise, ActiveSet, Exercise, RIRLevel } from '@/types'

interface WorkoutState {
  activeExercise: ActiveExercise | null
  sessionStarted: boolean
  restTimerActive: boolean
  restSecondsLeft: number

  startExercise: (ejercicio: Exercise, totalSeries: number, defaultPeso?: number, defaultReps?: number, rirObjetivo?: number[]) => void
  updateSet: (serieNum: number, updates: Partial<ActiveSet>) => void
  completeSet: (serieNum: number) => void
  resetWorkout: () => void
  setRestTimer: (seconds: number) => void
  tickRestTimer: () => void
  stopRestTimer: () => void
}

let restInterval: ReturnType<typeof setInterval> | null = null

const buildSets = (total: number, defaultPeso: number, defaultReps: number, rirObjetivo?: number[]): ActiveSet[] =>
  Array.from({ length: total }, (_, i) => ({
    serieNum: i + 1,
    peso: defaultPeso,
    repeticiones: defaultReps,
    rir: (rirObjetivo?.[i] ?? 2) as RIRLevel,
    completada: false,
  }))

export const useWorkoutStore = create<WorkoutState>()((set, get) => ({
  activeExercise: null,
  sessionStarted: false,
  restTimerActive: false,
  restSecondsLeft: 0,

  startExercise: (ejercicio, totalSeries, defaultPeso = 0, defaultReps = 10, rirObjetivo = []) => {
    if (restInterval) { clearInterval(restInterval); restInterval = null }
    set({
      activeExercise: {
        ejercicio,
        totalSeries,
        sets: buildSets(totalSeries, defaultPeso, defaultReps, rirObjetivo),
      },
      sessionStarted: true,
      restTimerActive: false,
      restSecondsLeft: 0,
    })
  },

  updateSet: (serieNum, updates) => {
    const { activeExercise } = get()
    if (!activeExercise) return
    set({
      activeExercise: {
        ...activeExercise,
        sets: activeExercise.sets.map((s) =>
          s.serieNum === serieNum ? { ...s, ...updates } : s
        ),
      },
    })
  },

  completeSet: (serieNum) => {
    const { activeExercise } = get()
    if (!activeExercise) return
    set({
      activeExercise: {
        ...activeExercise,
        sets: activeExercise.sets.map((s) =>
          s.serieNum === serieNum ? { ...s, completada: true } : s
        ),
      },
    })
  },

  resetWorkout: () => {
    if (restInterval) { clearInterval(restInterval); restInterval = null }
    set({ activeExercise: null, sessionStarted: false, restTimerActive: false, restSecondsLeft: 0 })
  },

  setRestTimer: (seconds) => {
  if (restInterval) { clearInterval(restInterval); restInterval = null }
  console.log('STORE: activando timer con', seconds, 'segundos')
  set({ restTimerActive: true, restSecondsLeft: seconds })
  restInterval = setInterval(() => {
    console.log('STORE: tick', get().restSecondsLeft)
      const { restSecondsLeft } = get()
      if (restSecondsLeft <= 1) {
        clearInterval(restInterval!)
        restInterval = null
        set({ restTimerActive: false, restSecondsLeft: 0 })
      } else {
        set({ restSecondsLeft: restSecondsLeft - 1 })
      }
    }, 1000)
  },

  tickRestTimer: () => {
    const { restSecondsLeft } = get()
    if (restSecondsLeft <= 1) {
      set({ restTimerActive: false, restSecondsLeft: 0 })
    } else {
      set({ restSecondsLeft: restSecondsLeft - 1 })
    }
  },

  stopRestTimer: () => {
    if (restInterval) { clearInterval(restInterval); restInterval = null }
    set({ restTimerActive: false, restSecondsLeft: 0 })
  },
}))