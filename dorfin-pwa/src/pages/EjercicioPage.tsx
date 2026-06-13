import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Check, Clock, ChevronUp, ChevronDown, Zap, SkipForward } from 'lucide-react'
import { useUltimoLog, useCreateLog, useExercise } from '@/lib/hooks'
import { useQuery } from '@tanstack/react-query'
import { trainingLogsApi } from '@/lib/api'
import { useWorkoutStore } from '@/lib/stores/workoutStore'
import { Skeleton } from '@/components/shared'
import type { Exercise, RIRLevel } from '@/types'

const RIR_OPTIONS = [
  { value: 0 as RIRLevel, label: 'RIR 0', color: 'text-red-400', ring: 'border-red-400', bg: 'bg-red-400' },
  { value: 1 as RIRLevel, label: 'RIR 1', color: 'text-orange-400', ring: 'border-orange-400', bg: 'bg-orange-400' },
  { value: 2 as RIRLevel, label: 'RIR 2-3', color: 'text-dorfin-green', ring: 'border-dorfin-green', bg: 'bg-dorfin-green' },
  { value: 4 as RIRLevel, label: 'RIR 4+', color: 'text-blue-400', ring: 'border-blue-400', bg: 'bg-blue-400' },
]

const WARMUP_SETS = [
  { pct: 0.20, reps: 5, label: 'Serie 1' },
  { pct: 0.50, reps: 3, label: 'Serie 2' },
  { pct: 0.70, reps: 2, label: 'Serie 3' },
  { pct: 0.85, reps: 1, label: 'Serie 4' },
]

function RIRSelector({ value, onChange }: { value: RIRLevel; onChange: (v: RIRLevel) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RIR_OPTIONS.map((opt) => (
        <motion.button key={opt.value} whileTap={{ scale: 0.92 }} onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${value === opt.value ? `${opt.ring} ${opt.bg}/10` : 'border-dorfin-border'}`}>
          <div className={`w-3 h-3 rounded-full ${opt.bg}`} />
          <span className={`text-xs font-bold ${value === opt.value ? opt.color : 'text-dorfin-faint'}`}>{opt.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

function NumericStepper({ label, value, onChange, step = 1, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number
}) {
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(value))

  const startHold = (delta: number) => { interval.current = setInterval(() => onChange(Math.max(min, value + delta)), 120) }
  const stopHold = () => { if (interval.current) clearInterval(interval.current) }

  const commitEdit = () => {
    const parsed = parseFloat(inputVal)
    if (!isNaN(parsed)) onChange(Math.max(min, parsed))
    setEditing(false)
  }

  return (
    <div className="bg-dorfin-surface rounded-2xl p-4 border border-dorfin-border">
      <p className="text-dorfin-muted text-xs font-medium tracking-widest uppercase mb-3 text-center">{label}</p>
      <div className="flex items-center gap-4">
        <motion.button whileTap={{ scale: 0.88 }}
          onPointerDown={() => { onChange(Math.max(min, value - step)); startHold(-step) }}
          onPointerUp={stopHold} onPointerLeave={stopHold}
          className="w-14 h-14 rounded-2xl bg-dorfin-green flex items-center justify-center shadow-glow-sm">
          <ChevronDown size={22} className="text-dorfin-bg" strokeWidth={3} />
        </motion.button>
        <div className="flex-1 text-center">
          {editing ? (
            <input
              type="number"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => e.key === 'Enter' && commitEdit()}
              className="w-full text-center font-display text-5xl text-dorfin-text bg-transparent border-b-2 border-dorfin-green outline-none"
              autoFocus
            />
          ) : (
            <span
              className="font-display text-5xl text-dorfin-text cursor-pointer"
              onClick={() => { setInputVal(String(value)); setEditing(true) }}
            >
              {value}
            </span>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.88 }}
          onPointerDown={() => { onChange(value + step); startHold(step) }}
          onPointerUp={stopHold} onPointerLeave={stopHold}
          className="w-14 h-14 rounded-2xl bg-dorfin-green flex items-center justify-center shadow-glow-sm">
          <ChevronUp size={22} className="text-dorfin-bg" strokeWidth={3} />
        </motion.button>
      </div>
    </div>
  )
}

function RestTimer({ seconds, onStop, label = 'Descanso' }: { seconds: number; onStop: () => void; label?: string }) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 left-4 right-4 mx-auto bg-dorfin-card border border-dorfin-green/30 rounded-2xl p-4 flex items-center gap-4 shadow-glow-sm z-40" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
      <Clock size={20} className="text-dorfin-green shrink-0" />
      <div className="flex-1">
        <p className="text-dorfin-muted text-xs">{label}</p>
        <p className="font-display text-2xl text-dorfin-green">{mins}:{secs.toString().padStart(2, '0')}</p>
      </div>
      <button onClick={onStop} className="btn-ghost text-sm py-2 px-4">Saltar</button>
    </motion.div>
  )
}

// Redondea al múltiplo de 2.5 más cercano
function roundTo2_5(val: number): number {
  return Math.round(val / 2.5) * 2.5
}

type Phase = 'warmup' | 'workout'

export default function EjercicioPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const stateExercise = location.state?.exercise as Exercise | undefined
  const { data: fetchedExercise } = useExercise(stateExercise ? null : Number(id))
  const exercise = stateExercise ?? fetchedExercise

  const { data: ultimoLog, isLoading: loadingLog } = useUltimoLog(exercise?.id ?? null)
  const rirObjetivo: number[] = location.state?.rir_objetivo ?? []
  const createLog = useCreateLog()

  const { activeExercise, startExercise, updateSet, completeSet, restTimerActive, restSecondsLeft, setRestTimer, stopRestTimer } = useWorkoutStore()

  const TOTAL_SERIES = location.state?.series ?? 4
  const DESCANSO = location.state?.descanso ?? 90

  const [phase, setPhase] = useState<Phase>('warmup')
  const [warmupIndex, setWarmupIndex] = useState(0)
  const [warmupResting, setWarmupResting] = useState(false)
  const [currentSerie, setCurrentSerie] = useState(1)
  // Busca último log por nombre para compartir historial entre días
  const { data: ultimoLogNombre } = useQuery({
    queryKey: ['ultimo-log-nombre', exercise?.nombre],
    staleTime: 0,
    queryFn: async () => {
      if (!exercise?.nombre) return null
      const historial = await trainingLogsApi.getHistorialPorNombre(exercise.nombre)
      if (!historial.logs || historial.logs.length === 0) return null
      return historial.logs[historial.logs.length - 1]
    },
    enabled: !!exercise?.nombre,
  })
  const initialized = useRef(false)

  const lastPeso = ultimoLogNombre
    ? ultimoLogNombre.peso
    : (ultimoLog?.anotaciones ? parseFloat(String(ultimoLog.anotaciones)) : 0)

  // Series de aproximación calculadas
  const warmupSets = WARMUP_SETS.map(s => ({
    ...s,
    peso: lastPeso > 0 ? roundTo2_5(lastPeso * s.pct) : 0,
  }))

  const currentWarmup = warmupSets[warmupIndex]
  const currentSet = activeExercise?.sets.find((s) => s.serieNum === currentSerie)
  const completedCount = activeExercise?.sets.filter((s) => s.completada).length ?? 0
  const allDone = completedCount >= TOTAL_SERIES

  useEffect(() => {
    if (exercise && ultimoLog !== undefined && ultimoLogNombre !== undefined && !initialized.current) {
      initialized.current = true
      stopRestTimer()
      // Usa el log más reciente entre ultimoLog (por ID) y ultimoLogNombre (por nombre entre todos los días)
      const defaultPeso = ultimoLogNombre
        ? ultimoLogNombre.peso
        : (ultimoLog?.anotaciones ? parseFloat(String(ultimoLog.anotaciones)) : 0)
      const defaultReps = ultimoLogNombre
        ? ultimoLogNombre.repeticiones
        : (ultimoLog ? parseInt(String(ultimoLog.repeticiones)) || 10 : 10)
      startExercise(exercise, TOTAL_SERIES, defaultPeso, defaultReps, rirObjetivo)
    }
  }, [exercise, ultimoLog, ultimoLogNombre])

  const timerStarted = useRef(false)
  useEffect(() => {
    if (restTimerActive) timerStarted.current = true
  }, [restTimerActive])

  useEffect(() => {
    if (!restTimerActive && restSecondsLeft === 0 && timerStarted.current && allDone && phase === 'workout') {
      timerStarted.current = false
      navigate(`/rutinas/${location.state?.rutinaId}`, { state: { ejercicioCompletado: exercise?.id }, replace: true })
    }
  }, [restTimerActive, restSecondsLeft, allDone, phase])

  // Cuando termina el timer de descanso de aproximación, avanza a la siguiente
  useEffect(() => {
    if (phase === 'warmup' && warmupResting && !restTimerActive && restSecondsLeft === 0 && timerStarted.current) {
      timerStarted.current = false
      setWarmupResting(false)
      const next = warmupIndex + 1
      if (next < warmupSets.length) {
        setWarmupIndex(next)
      } else {
        setPhase('workout')
      }
    }
  }, [restTimerActive, restSecondsLeft, warmupResting, phase])

  const handleCompleteWarmup = () => {
    setWarmupResting(true)
    setRestTimer(60)
  }

  const handleSkipWarmup = () => {
    stopRestTimer()
    setPhase('workout')
  }

  const handleCompleteSet = async () => {
    if (!currentSet || !exercise) return
    completeSet(currentSerie)
    await createLog.mutateAsync({
      ejercicio_id: exercise.id,
      series: 1,
      repeticiones: String(currentSet.repeticiones),
      rir: currentSet.rir,
      descanso: `${DESCANSO}s`,
      anotaciones: String(currentSet.peso),
    })
    if (currentSerie < TOTAL_SERIES) {
      setRestTimer(DESCANSO)
      setTimeout(() => setCurrentSerie((s) => s + 1), 100)
    } else {
      setRestTimer(DESCANSO)
    }
  }

  if (!exercise) {
    return (
      <div className="min-h-dvh bg-dorfin-bg px-5 pt-14">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-28">
      <div className="px-5 pt-14 pb-2">
        <button
          onClick={() => navigate(`/rutinas/${location.state?.rutinaId}`, { replace: true })}
          className="flex items-center gap-2 text-dorfin-muted text-sm mb-3"
        >
          <ChevronLeft size={16} /> Volver
        </button>
        <h1 className="font-display text-4xl text-dorfin-text">{exercise.nombre.toUpperCase()}</h1>

        {/* Indicador de fase */}
        <div className="flex items-center gap-2 mt-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            phase === 'warmup'
              ? 'bg-orange-400/10 text-orange-400 border border-orange-400/30'
              : 'bg-dorfin-green/10 text-dorfin-green border border-dorfin-green/30'
          }`}>
            {phase === 'warmup' ? '🔥 Aproximación' : '💪 Series efectivas'}
          </span>
        </div>

        {phase === 'workout' && (
          <div className="flex gap-2 mt-2">
            {Array.from({ length: TOTAL_SERIES }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i < completedCount ? 'bg-dorfin-green' : i === completedCount ? 'bg-dorfin-green/40' : 'bg-dorfin-surface'
              }`} />
            ))}
          </div>
        )}

        {phase === 'warmup' && (
          <div className="flex gap-2 mt-2">
            {warmupSets.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i < warmupIndex ? 'bg-orange-400' : i === warmupIndex ? 'bg-orange-400/40' : 'bg-dorfin-surface'
              }`} />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 space-y-4 mt-4">
        {/* Último log */}
        {(loadingLog || ultimoLogNombre === undefined) ? (
          <Skeleton className="h-16 w-full" />
        ) : (ultimoLogNombre || ultimoLog) ? (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="card border-dorfin-purple/50 p-4 text-center">
            <p className="text-dorfin-muted text-xs font-medium tracking-wide uppercase mb-1">La última vez</p>
            {(() => {
              const logRef = ultimoLogNombre ?? ultimoLog
              const peso = ultimoLogNombre
                ? ultimoLogNombre.peso
                : (ultimoLog?.anotaciones ?? '?')
              const reps = ultimoLogNombre
                ? ultimoLogNombre.repeticiones
                : ultimoLog?.repeticiones
              const rir = ultimoLogNombre
                ? ultimoLogNombre.rir
                : ultimoLog?.rir
              return (
                <p className="font-display text-xl text-dorfin-text">
                  {peso}KG / {reps} REPS / RIR {rir}
                </p>
              )
            })()}
          </motion.div>
        ) : (
          <div className="card p-3 border-dashed border-dorfin-border">
            <p className="text-dorfin-faint text-xs text-center">Sin registro previo — primer intento 💪</p>
          </div>
        )}

        {/* ── FASE APROXIMACIÓN ── */}
        <AnimatePresence mode="wait">
          {phase === 'warmup' && !allDone && (
            <motion.div key="warmup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-4">

              {/* Explicación solo en la primera serie */}
              {warmupIndex === 0 && (
                <div className="card p-4 border-orange-400/20 bg-orange-400/5">
                  <div className="flex items-start gap-3">
                    <Zap size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Series de aproximación</p>
                      <p className="text-dorfin-muted text-xs leading-relaxed">
                        Prepara tu cuerpo antes de las series efectivas. Estas series <span className="text-dorfin-text font-medium">no se cuentan</span> en tu historial. Descansa ~1 min entre cada una.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="card p-5 space-y-4">
                <div className="text-center">
                  <p className="text-dorfin-muted text-xs tracking-widest uppercase mb-1">
                    {currentWarmup.label} de {warmupSets.length} — {Math.round(currentWarmup.pct * 100)}% del peso
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <div className="text-center">
                      <p className="font-display text-5xl text-orange-400">
                        {lastPeso > 0 ? currentWarmup.peso : '—'}
                      </p>
                      <p className="text-dorfin-faint text-xs mt-1">kg</p>
                    </div>
                    <div className="text-dorfin-faint text-2xl">×</div>
                    <div className="text-center">
                      <p className="font-display text-5xl text-dorfin-text">{currentWarmup.reps}</p>
                      <p className="text-dorfin-faint text-xs mt-1">reps</p>
                    </div>
                  </div>
                  {lastPeso === 0 && (
                    <p className="text-dorfin-faint text-xs mt-3">
                      Sin registro previo — usa un peso ligero con el que te sientas cómodo
                    </p>
                  )}
                </div>

                {/* Tabla resumen de todas las series */}
                <div className="border-t border-dorfin-border pt-4">
                  <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Plan completo</p>
                  <div className="space-y-2">
                    {warmupSets.map((s, i) => (
                      <div key={i} className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                        i === warmupIndex
                          ? 'bg-orange-400/10 border border-orange-400/30'
                          : i < warmupIndex
                          ? 'opacity-40'
                          : 'opacity-60'
                      }`}>
                        <div className="flex items-center gap-2">
                          {i < warmupIndex
                            ? <Check size={14} className="text-orange-400" />
                            : <div className={`w-3.5 h-3.5 rounded-full border-2 ${i === warmupIndex ? 'border-orange-400' : 'border-dorfin-border'}`} />
                          }
                          <span className="text-dorfin-muted text-xs">{s.label}</span>
                        </div>
                        <span className="text-dorfin-text text-xs font-medium">
                          {lastPeso > 0 ? `${s.peso} kg` : '—'} × {s.reps} reps
                        </span>
                        <span className="text-dorfin-faint text-[10px]">{Math.round(s.pct * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleCompleteWarmup}
                disabled={warmupResting}
                className="btn-primary w-full flex items-center justify-center gap-3 !py-5 !text-lg !bg-orange-400 hover:!bg-orange-300"
                style={{ backgroundColor: '#fb923c' }}
              >
                <Check size={22} strokeWidth={3} />
                {warmupIndex < warmupSets.length - 1 ? 'Listo — siguiente aproximación' : 'Listo — pasar a series efectivas'}
              </motion.button>

              <button onClick={handleSkipWarmup}
                className="w-full flex items-center justify-center gap-2 text-dorfin-muted text-sm py-3 hover:text-dorfin-text transition-colors">
                <SkipForward size={16} /> Saltar aproximación
              </button>
            </motion.div>
          )}

          {/* ── FASE EFECTIVA ── */}
          {phase === 'workout' && !allDone && currentSet && (
            <motion.div key="workout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="card p-5 space-y-4">
              <div className="text-center">
                <p className="text-dorfin-muted text-xs tracking-widest uppercase mb-1">Serie</p>
                <p className="font-display text-5xl text-dorfin-text">
                  {currentSerie} <span className="text-dorfin-faint text-2xl">de {TOTAL_SERIES}</span>
                </p>
              </div>
              <NumericStepper label="Peso (KG)" value={currentSet.peso} step={2.5} onChange={(v) => updateSet(currentSerie, { peso: v })} />
              <NumericStepper label="Repeticiones" value={currentSet.repeticiones} min={1} onChange={(v) => updateSet(currentSerie, { repeticiones: v })} />
              <div>
                <p className="text-dorfin-muted text-xs font-medium tracking-widest uppercase mb-2">Esfuerzo (RIR)</p>
                <RIRSelector value={currentSet.rir} onChange={(v) => updateSet(currentSerie, { rir: v })} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completado */}
        <AnimatePresence>
          {allDone && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="card p-8 text-center border-dorfin-green/40">
              <p className="text-5xl mb-3">🎉</p>
              <h3 className="font-display text-3xl text-dorfin-green mb-2">¡COMPLETADO!</h3>
              <p className="text-dorfin-muted text-sm mb-6">{TOTAL_SERIES} series de {exercise.nombre}</p>
              <button
                onClick={() => navigate(`/rutinas/${location.state?.rutinaId}`, { state: { ejercicioCompletado: exercise.id }, replace: true })}
                className="btn-primary w-full">
                Siguiente ejercicio
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón completar serie efectiva */}
        {phase === 'workout' && !allDone && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleCompleteSet} disabled={createLog.isPending}
            className="btn-primary w-full flex items-center justify-center gap-3 !py-5 !text-lg">
            {createLog.isPending
              ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
              : <><Check size={22} strokeWidth={3} /> Completar serie</>
            }
          </motion.button>
        )}
      </div>

      {/* Timer — diferente label según fase */}
      <AnimatePresence>
        {restTimerActive && (
          <RestTimer
            seconds={restSecondsLeft}
            label={phase === 'warmup' ? 'Descanso aproximación' : 'Descanso'}
            onStop={() => {
              stopRestTimer()
              if (phase === 'warmup') {
                setWarmupResting(false)
                const next = warmupIndex + 1
                if (next < warmupSets.length) {
                  setWarmupIndex(next)
                } else {
                  setPhase('workout')
                }
              } else if (allDone) {
                navigate(`/rutinas/${location.state?.rutinaId}`, { state: { ejercicioCompletado: exercise?.id }, replace: true })
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}