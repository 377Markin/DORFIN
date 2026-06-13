import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, TrendingUp, X, ChevronDown, ChevronUp, Lock, Trophy } from 'lucide-react'
import { useMesocicloActivo, useCreateMesociclo, useAgregarMedidas } from '@/lib/hooks'
import { Skeleton, EmptyState, PageHeader } from '@/components/shared'
import { differenceInDays, differenceInWeeks, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mesociclosApi } from '@/lib/api'
import type { MedidaSnapshot } from '@/types'

const METAS = ['Hipertrofia', 'Definición', 'Fuerza', 'Powerlifting', 'Resistencia', 'Pérdida de peso', 'Mantenimiento']

const MEDIDAS_CORPORALES = [
  { key: 'cuello',          label: 'Cuello' },
  { key: 'hombros',         label: 'Hombros' },
  { key: 'pecho',           label: 'Pecho' },
  { key: 'bicep_der',       label: 'Bícep derecho' },
  { key: 'bicep_izq',       label: 'Bícep izquierdo' },
  { key: 'cintura',         label: 'Cintura' },
  { key: 'abdomen',         label: 'Abdomen' },
  { key: 'cadera',          label: 'Cadera' },
  { key: 'muslo_der',       label: 'Muslo derecho' },
  { key: 'muslo_izq',       label: 'Muslo izquierdo' },
  { key: 'pantorrilla_der', label: 'Pantorrilla derecha' },
  { key: 'pantorrilla_izq', label: 'Pantorrilla izquierda' },
]

const SEMANAS_POR_MES = 4
const MEDIDAS_INVERSAS = ['cintura', 'abdomen', 'cadera']

function snakePath(total: number): string {
  const pts: string[] = []
  for (let i = 0; i < total; i++) {
    const isLeft = i % 2 === 0
    const x = isLeft ? 60 : 220
    const y = i * 100 + 56
    pts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)
    if (i < total - 1) {
      const nextLeft = (i + 1) % 2 === 0
      const nextX = nextLeft ? 60 : 220
      const nextY = (i + 1) * 100 + 56
      const midY = (y + nextY) / 2
      pts.push(`C ${x} ${midY}, ${nextX} ${midY}, ${nextX} ${nextY}`)
    }
  }
  return pts.join(' ')
}

// Componente de línea de tiempo por medida
function MedidaTimeline({ historial, medidaKey, label }: {
  historial: MedidaSnapshot[]
  medidaKey: string
  label: string
}) {
  const datos = historial
    .filter(h => h.medidas[medidaKey] != null)
    .sort((a, b) => a.semana - b.semana)

  if (datos.length < 2) return null

  const valores = datos.map(d => d.medidas[medidaKey])
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const w = 260, h = 60

  const pts = datos.map((d, i) => ({
    x: (i / (datos.length - 1)) * w,
    y: h - ((d.medidas[medidaKey] - min) / rango) * h * 0.8 - h * 0.1,
  }))

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const primero = valores[0]
  const ultimo = valores[valores.length - 1]
  const diff = +(ultimo - primero).toFixed(1)
  const esInversa = MEDIDAS_INVERSAS.includes(medidaKey)
  const esBueno = esInversa ? diff < 0 : diff > 0

  return (
    <div className="card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-dorfin-text text-sm font-semibold">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-dorfin-faint text-xs">{primero} → {ultimo} cm</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
            diff === 0 ? 'text-dorfin-faint bg-dorfin-surface'
            : esBueno ? 'text-dorfin-green bg-dorfin-green/10'
            : 'text-red-400 bg-red-400/10'
          }`}>
            {diff > 0 ? '+' : ''}{diff} cm
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 60 }}>
        <defs>
          <linearGradient id={`grad-${medidaKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={esBueno ? '#39FF14' : '#f87171'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={esBueno ? '#39FF14' : '#f87171'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${pts[pts.length-1].x} ${h} L 0 ${h} Z`} fill={`url(#grad-${medidaKey})`} />
        <path d={path} fill="none" stroke={esBueno ? '#39FF14' : '#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={esBueno ? '#39FF14' : '#f87171'} />
            <text x={p.x} y={h - 2} fontSize="8" fill="#4A4468" textAnchor="middle">S{datos[i].semana}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function MesocicloPage() {
  const { data: meso, isLoading } = useMesocicloActivo()
  const createMeso = useCreateMesociclo()
  const agregarMedidas = useAgregarMedidas()
  const qc = useQueryClient()

  const [showCreate, setShowCreate]         = useState(false)
  const [showMedidas, setShowMedidas]       = useState(false)
  const [showHistorial, setShowHistorial]   = useState<MedidaSnapshot | null>(null)
  const [showEstadisticas, setShowEstadisticas] = useState(false)
  const [showFinCiclo, setShowFinCiclo]     = useState(false)
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(1)
  const [mesSeleccionado, setMesSeleccionado]       = useState(1)
  const [medidasForm, setMedidasForm]       = useState<Record<string, string>>({})
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [mesHistorial, setMesHistorial]     = useState<number | null>(null)
  const [nuevaMeta, setNuevaMeta]           = useState('')
  const [semanasExtra, setSemanasExtra]     = useState('8')

  const extenderMutation = useMutation({
    mutationFn: ({ semanas_extra, meta }: { semanas_extra: number; meta: string }) =>
      mesociclosApi.extender(meso!.id, semanas_extra, meta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesociclo-activo'] })
      setShowFinCiclo(false)
    },
  })

  const [form, setForm] = useState({
    meta: 'Hipertrofia',
    duracion_semanas: '12',
    frecuencia_medidas: 'semanal',
    peso_inicial: '',
  })

  const duracionSemanas = meso?.duracion_semanas ?? 12
  const fechaInicio     = useMemo(() => meso ? parseISO(meso.fecha_inicio) : new Date(), [meso])
  const diasDesdeInicio = useMemo(() => meso ? differenceInDays(new Date(), fechaInicio) : 0, [meso, fechaInicio])
  const currentWeek     = useMemo(() => meso ? Math.min(differenceInWeeks(new Date(), fechaInicio) + 1, duracionSemanas) : 0, [meso, fechaInicio, duracionSemanas])
  const totalMeses      = Math.ceil(duracionSemanas / SEMANAS_POR_MES)
  const currentMes      = Math.ceil(currentWeek / SEMANAS_POR_MES)
  const semanasRegistradas = meso?.historial_medidas?.length ?? 0
  const progress = Math.round((semanasRegistradas / duracionSemanas) * 100)
  const cicloTerminado  = progress >= 100

  const semanasDelMes = useMemo(() => {
    const inicio = (currentMes - 1) * SEMANAS_POR_MES + 1
    const fin    = Math.min(currentMes * SEMANAS_POR_MES, duracionSemanas)
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i)
  }, [currentMes, duracionSemanas])

  const semanasDelMesHistorial = useMemo(() => {
    if (!mesHistorial) return []
    const inicio = (mesHistorial - 1) * SEMANAS_POR_MES + 1
    const fin    = Math.min(mesHistorial * SEMANAS_POR_MES, duracionSemanas)
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i)
  }, [mesHistorial, duracionSemanas])

  function puedeRegistrarSemana(semana: number): boolean {
    return diasDesdeInicio >= (semana - 1) * 5
  }

  function diasParaDesbloquear(semana: number): number {
    return Math.max(0, (semana - 1) * 5 - diasDesdeInicio)
  }

  function abrirSemana(semana: number) {
    const snap = meso?.historial_medidas?.find(h => h.semana === semana)
    if (snap) { setShowHistorial(snap); return }
    if (!puedeRegistrarSemana(semana)) return
    setSemanaSeleccionada(semana)
    setMesSeleccionado(Math.ceil(semana / SEMANAS_POR_MES))
    setMedidasForm({})
    setShowMedidas(true)
  }

  function handleGuardarMedidas() {
    if (!meso) return
    const medidas: Record<string, number> = {}
    Object.entries(medidasForm).forEach(([k, v]) => { if (v) medidas[k] = Number(v) })
    agregarMedidas.mutate(
      { id: meso.id, semana: semanaSeleccionada, mes: mesSeleccionado, medidas },
      { onSuccess: () => { setShowMedidas(false); setMedidasForm({}) } }
    )
  }

  function handleCreate() {
    createMeso.mutate({
      fecha_inicio: new Date().toISOString().split('T')[0],
      peso_inicial: Number(form.peso_inicial) || 0,
      medidas: {},
      meta: form.meta,
      duracion_semanas: form.frecuencia_medidas === 'mensual'
        ? Number(form.duracion_semanas) * 4
        : Number(form.duracion_semanas),
      frecuencia_medidas: form.frecuencia_medidas,
    }, { onSuccess: () => setShowCreate(false) })
  }

  function renderSemanas(semanas: number[], bloqueadas = false) {
    const total = semanas.length
    const svgH  = total * 100 + 20
    return (
      <div className="relative">
        <svg className="absolute inset-0 w-full pointer-events-none" style={{ height: svgH }}
          viewBox={`0 0 280 ${svgH}`} preserveAspectRatio="none">
          <path d={snakePath(total)} fill="none" stroke="#39FF14" strokeWidth="3"
            strokeDasharray="8 4" opacity="0.25" />
        </svg>
        <div style={{ paddingBottom: 8 }}>
          {semanas.map((semana, i) => {
            const isLeft     = i % 2 === 0
            const snap       = meso?.historial_medidas?.find(h => h.semana === semana)
            const tieneSnap  = !!snap
            const esCurrent  = semana === currentWeek
            const esAnterior = semana < currentWeek
            const puede      = !bloqueadas && puedeRegistrarSemana(semana)
            const diasFaltan = !bloqueadas && !tieneSnap && !puede ? diasParaDesbloquear(semana) : 0

            return (
              <motion.div key={semana} initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.05 }}
                className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                style={{ marginBottom: i < total - 1 ? 16 : 0 }}>
                <button onClick={() => !bloqueadas && abrirSemana(semana)}
                  disabled={bloqueadas || (!tieneSnap && !puede && semana !== 1)}
                  className={`relative flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 transition-all active:scale-95 ${
                    tieneSnap ? 'border-dorfin-green bg-dorfin-green/15'
                    : esCurrent && puede ? 'border-dorfin-green bg-dorfin-green shadow-glow scale-110'
                    : esAnterior && !tieneSnap ? 'border-dorfin-purple/60 bg-dorfin-surface/60'
                    : puede ? 'border-dorfin-border bg-dorfin-surface'
                    : 'border-dorfin-border/30 bg-dorfin-surface/30 opacity-50'
                  }`}>
                  {tieneSnap && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-dorfin-green flex items-center justify-center shadow-glow">
                      <Check size={12} className="text-dorfin-bg" />
                    </div>
                  )}
                  {!tieneSnap && !puede && semana > 1 && !bloqueadas && (
                    <Lock size={14} className="text-dorfin-faint mb-1" />
                  )}
                  <span className={`text-[10px] font-medium tracking-widest uppercase ${
                    tieneSnap ? 'text-dorfin-green' : esCurrent && puede ? 'text-dorfin-bg' : 'text-dorfin-muted'
                  }`}>Semana</span>
                  <span className={`font-display text-4xl ${
                    tieneSnap ? 'text-dorfin-green' : esCurrent && puede ? 'text-dorfin-bg' : 'text-dorfin-faint'
                  }`}>{semana}</span>
                  {diasFaltan > 0 && <span className="text-[9px] text-dorfin-faint mt-0.5">En {diasFaltan}d</span>}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-24">
      <div className="px-5 pt-14">
        <PageHeader title="MESOCICLO" subtitle="Tu ciclo de entrenamiento" />
      </div>

      <div className="px-5 space-y-5">
        {isLoading ? (
          <><Skeleton className="h-28 w-full" /><Skeleton className="h-52 w-full" /></>
        ) : !meso ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <img src="/dorfin-medidas.png" alt="Dorfin" className="w-48 h-48 object-contain drop-shadow-lg" />
            <div className="text-center">
              <p className="text-dorfin-text font-semibold text-lg">Sin mesociclo activo</p>
              <p className="text-dorfin-muted text-sm mt-1">Crea tu primer ciclo de entrenamiento</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Crear mesociclo
            </button>
          </div>
        ) : (
          <>
            {/* Banner fin de ciclo */}
            {cicloTerminado && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5 border-dorfin-green/50 bg-dorfin-green/5 text-center">
                <Trophy size={32} className="text-dorfin-green mx-auto mb-2" />
                <p className="font-display text-2xl text-dorfin-green">¡CICLO COMPLETADO!</p>
                <p className="text-dorfin-muted text-sm mt-1 mb-4">
                  Terminaste {duracionSemanas} semanas de {meso.meta}
                </p>
                <button onClick={() => { setNuevaMeta(meso.meta ?? ''); setShowFinCiclo(true) }}
                  className="btn-primary w-full">
                  ¿Qué sigue?
                </button>
              </motion.div>
            )}

            {/* Header */}
            <div className="card p-5 border-dorfin-purple/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-dorfin-muted text-xs tracking-widest uppercase">Mesociclo Activo</p>
                  <h2 className="font-display text-3xl text-dorfin-text mt-0.5">{meso.meta?.toUpperCase()}</h2>
                  <p className="text-dorfin-faint text-xs mt-1">
                    {meso.frecuencia_medidas === 'semanal' ? 'Medidas semanales' : 'Medidas mensuales'} · {duracionSemanas} semanas
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 bg-dorfin-green/10 border border-dorfin-green/20 rounded-lg px-3 py-1.5">
                    <TrendingUp size={12} className="text-dorfin-green" />
                    <span className="text-dorfin-green text-xs font-medium">Sem {currentWeek} · Mes {currentMes}</span>
                  </div>
                  {(meso.historial_medidas?.length ?? 0) >= 2 && (
                    <button onClick={() => setShowEstadisticas(true)}
                      className="text-xs text-dorfin-muted hover:text-dorfin-green transition-colors flex items-center gap-1">
                      <TrendingUp size={12} /> Ver estadísticas
                    </button>
                  )}
                </div>
              </div>
              <div className="relative h-2 bg-dorfin-surface rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-green rounded-full" />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-dorfin-faint text-xs">
                  Inicio: {format(fechaInicio, 'd MMM', { locale: es })}
                </span>
                <span className="text-dorfin-muted text-xs">{Math.min(progress, 100)}%</span>
              </div>
              <p className="text-dorfin-muted text-xs mt-2">
                Peso inicial: <span className="text-dorfin-text font-medium">{meso.peso_inicial} kg</span>
                <span className="ml-3">Día {diasDesdeInicio + 1}</span>
              </p>
            </div>

            {/* Mes actual */}
            {!cicloTerminado && (
              <div className="card p-5">
                <h3 className="text-dorfin-muted text-xs tracking-widest uppercase mb-1">
                  Mes {currentMes} — Progresión
                </h3>
                <p className="text-dorfin-faint text-[11px] mb-5">Toca una semana para registrar medidas</p>
                {renderSemanas(semanasDelMes)}
              </div>
            )}

            {/* Historial de meses */}
            {totalMeses > 1 && (
              <div className="card p-5">
                <button onClick={() => setHistorialAbierto(!historialAbierto)}
                  className="w-full flex items-center justify-between">
                  <h3 className="text-dorfin-muted text-xs tracking-widest uppercase">Historial de meses</h3>
                  {historialAbierto
                    ? <ChevronUp size={16} className="text-dorfin-muted" />
                    : <ChevronDown size={16} className="text-dorfin-muted" />
                  }
                </button>
                <AnimatePresence>
                  {historialAbierto && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {Array.from({ length: totalMeses }, (_, i) => i + 1).map(mes => {
                          const semanasM = Array.from({ length: SEMANAS_POR_MES }, (_, i) =>
                            (mes - 1) * SEMANAS_POR_MES + i + 1).filter(s => s <= duracionSemanas)
                          const completado = semanasM.every(s => meso.historial_medidas?.some(h => h.semana === s))
                          const esActual = mes === currentMes
                          return (
                            <button key={mes} onClick={() => setMesHistorial(mesHistorial === mes ? null : mes)}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                mesHistorial === mes ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green'
                                : completado ? 'border-dorfin-green/40 text-dorfin-green/70 bg-dorfin-green/5'
                                : esActual ? 'border-dorfin-purple text-dorfin-text'
                                : 'border-dorfin-border text-dorfin-faint'
                              }`}>
                              Mes {mes} {completado ? '✓' : esActual ? '●' : ''}
                            </button>
                          )
                        })}
                      </div>
                      <AnimatePresence>
                        {mesHistorial && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }} className="mt-5">
                            <p className="text-dorfin-muted text-xs mb-4">Mes {mesHistorial}</p>
                            {renderSemanas(semanasDelMesHistorial, mesHistorial !== currentMes)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Sheet — Crear mesociclo */}
        <AnimatePresence>
          {showCreate && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowCreate(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-dorfin-text font-display text-2xl">Nuevo mesociclo</h2>
                  <button onClick={() => setShowCreate(false)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">¿Cuál es tu objetivo?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {METAS.map(meta => (
                        <button key={meta} onClick={() => setForm({ ...form, meta })}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                            form.meta === meta ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
                          }`}>{meta}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">¿Cuántas semanas dura?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(form.frecuencia_medidas === 'semanal' ? ['8', '12', '16', '24'] : ['3', '6', '9', '12']).map(s => (
                        <button key={s} onClick={() => setForm({ ...form, duracion_semanas: s })}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                            form.duracion_semanas === s ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
                          }`}>{s}{form.frecuencia_medidas === 'semanal' ? ' sem' : ' mes'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">¿Cada cuánto registrar medidas?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ val: 'semanal', label: 'Semanal' }, { val: 'mensual', label: 'Mensual' }].map(op => (
                        <button key={op.val} onClick={() => setForm({ ...form, frecuencia_medidas: op.val, duracion_semanas: op.val === 'semanal' ? '12' : '6' })}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                            form.frecuencia_medidas === op.val ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
                          }`}>{op.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-dorfin-muted text-xs uppercase tracking-widest mb-2 block">Peso inicial (kg)</label>
                    <input type="number" className="input-field" placeholder="75"
                      value={form.peso_inicial} onChange={e => setForm({ ...form, peso_inicial: e.target.value })} />
                  </div>
                  <button onClick={handleCreate} disabled={createMeso.isPending} className="btn-primary w-full">
                    Crear mesociclo
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sheet — Registrar medidas */}
        <AnimatePresence>
          {showMedidas && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowMedidas(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-dorfin-text font-display text-2xl">Semana {semanaSeleccionada}</h2>
                  <button onClick={() => setShowMedidas(false)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
                <p className="text-dorfin-muted text-xs mb-5">Registra tus medidas en cm</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 py-2 pb-4 mb-2 border-b border-dorfin-border">
                    <div className="flex-1">
                      <p className="text-dorfin-text text-sm font-medium">Peso actual</p>
                      <p className="text-dorfin-faint text-xs">kg</p>
                    </div>
                    <input type="number" placeholder="—"
                      className="w-20 bg-dorfin-surface border border-dorfin-border rounded-xl text-center text-dorfin-text text-sm py-2 outline-none focus:border-dorfin-green transition-colors"
                      value={medidasForm['peso_kg'] ?? ''}
                      onChange={e => setMedidasForm({ ...medidasForm, peso_kg: e.target.value })} />
                  </div>
                  {MEDIDAS_CORPORALES.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3 py-1">
                      <div className="flex-1">
                        <p className="text-dorfin-text text-sm font-medium">{label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="—"
                          className="w-20 bg-dorfin-surface border border-dorfin-border rounded-xl text-center text-dorfin-text text-sm py-2 outline-none focus:border-dorfin-green transition-colors"
                          value={medidasForm[key] ?? ''}
                          onChange={e => setMedidasForm({ ...medidasForm, [key]: e.target.value })} />
                        <span className="text-dorfin-faint text-xs w-4">cm</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleGuardarMedidas} disabled={agregarMedidas.isPending} className="btn-primary w-full mt-6">
                  <Check size={16} className="inline mr-2" /> Guardar medidas
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sheet — Ver historial de semana */}
        <AnimatePresence>
          {showHistorial && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowHistorial(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-dorfin-text font-display text-2xl">Semana {showHistorial.semana}</h2>
                  <button onClick={() => setShowHistorial(null)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
                <p className="text-dorfin-muted text-xs mb-5">
                  Registrado el {format(parseISO(showHistorial.fecha), "d 'de' MMMM yyyy", { locale: es })}
                </p>
                <div className="space-y-2">
                  {showHistorial.medidas['peso_kg'] != null && (
                    <div className="flex items-center justify-between py-2 pb-4 border-b border-dorfin-border">
                      <div>
                        <p className="text-dorfin-text text-sm font-medium">Peso actual</p>
                      </div>
                      <span className="font-display text-xl text-dorfin-green">{showHistorial.medidas['peso_kg']} <span className="text-sm">kg</span></span>
                    </div>
                  )}
                  {MEDIDAS_CORPORALES.filter(m => showHistorial.medidas[m.key] != null).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1.5">
                      <span className="text-dorfin-muted text-sm">{label}</span>
                      <span className="font-display text-lg text-dorfin-green">{showHistorial.medidas[key]} <span className="text-xs">cm</span></span>
                    </div>
                  ))}
                  {Object.keys(showHistorial.medidas).length === 0 && (
                    <p className="text-dorfin-faint text-sm text-center py-4">Sin medidas registradas</p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sheet — Estadísticas por medida */}
        <AnimatePresence>
          {showEstadisticas && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowEstadisticas(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-dorfin-text font-display text-2xl">ESTADÍSTICAS</h2>
                    <p className="text-dorfin-muted text-xs mt-0.5">{meso?.meta} · {meso?.historial_medidas?.length} semanas registradas</p>
                  </div>
                  <button onClick={() => setShowEstadisticas(false)}><X size={20} className="text-dorfin-muted" /></button>
                </div>

                <div className="mt-4">
                  {/* Peso */}
                  {(meso?.historial_medidas?.filter(h => h.medidas['peso_kg'] != null).length ?? 0) >= 2 && (
                    <div className="card p-4 mb-3">
                      {(() => {
                        const datos = (meso?.historial_medidas ?? [])
                          .filter(h => h.medidas['peso_kg'] != null)
                          .sort((a, b) => a.semana - b.semana)
                        const primero = datos[0].medidas['peso_kg']
                        const ultimo = datos[datos.length - 1].medidas['peso_kg']
                        const diff = +(ultimo - primero).toFixed(1)
                        return (
                          <div className="flex items-center justify-between">
                            <p className="text-dorfin-text text-sm font-semibold">Peso corporal</p>
                            <div className="flex items-center gap-2">
                              <span className="text-dorfin-faint text-xs">{primero} → {ultimo} kg</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                                diff === 0 ? 'text-dorfin-faint bg-dorfin-surface'
                                : diff < 0 ? 'text-dorfin-green bg-dorfin-green/10'
                                : 'text-red-400 bg-red-400/10'
                              }`}>
                                {diff > 0 ? '+' : ''}{diff} kg
                              </span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Medidas corporales */}
                  {MEDIDAS_CORPORALES.map(({ key, label }) => (
                    <MedidaTimeline
                      key={key}
                      historial={meso?.historial_medidas ?? []}
                      medidaKey={key}
                      label={label}
                    />
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sheet — Fin de ciclo */}
        <AnimatePresence>
          {showFinCiclo && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowFinCiclo(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-dorfin-text font-display text-2xl">¿QUÉ SIGUE?</h2>
                  <button onClick={() => setShowFinCiclo(false)}><X size={20} className="text-dorfin-muted" /></button>
                </div>

                <p className="text-dorfin-muted text-sm mb-6">
                  Completaste <span className="text-dorfin-green font-semibold">{duracionSemanas} semanas</span> de <span className="text-dorfin-text font-semibold">{meso?.meta}</span>. ¿Quieres continuar o cambiar de objetivo?
                </p>

                <div className="space-y-5">
                  <div>
                    <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Nuevo objetivo</p>
                    <div className="grid grid-cols-2 gap-2">
                      {METAS.map(meta => (
                        <button key={meta} onClick={() => setNuevaMeta(meta)}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                            nuevaMeta === meta ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
                          }`}>
                          {meta}
                          {meta === meso?.meta && <span className="text-[10px] text-dorfin-faint block">actual</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">¿Cuántas semanas más?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['4', '8', '12', '16'].map(s => (
                        <button key={s} onClick={() => setSemanasExtra(s)}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                            semanasExtra === s ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
                          }`}>{s} sem</button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => extenderMutation.mutate({ semanas_extra: Number(semanasExtra), meta: nuevaMeta })}
                    disabled={extenderMutation.isPending || !nuevaMeta}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {extenderMutation.isPending
                      ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
                      : <><Check size={18} /> Continuar entrenando</>
                    }
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}