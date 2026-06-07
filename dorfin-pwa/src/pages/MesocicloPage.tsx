import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, TrendingUp, X, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { useMesocicloActivo, useCreateMesociclo, useAgregarMedidas } from '@/lib/hooks'
import { Skeleton, EmptyState, PageHeader } from '@/components/shared'
import { differenceInDays, differenceInWeeks, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MedidaSnapshot } from '@/types'

const METAS = ['Hipertrofia', 'Definición', 'Fuerza', 'Powerlifting', 'Resistencia', 'Pérdida de peso', 'Mantenimiento']

const MEDIDAS_CORPORALES = [
  { key: 'cuello',           label: 'Cuello',               emoji: '🔵' },
  { key: 'hombros',          label: 'Hombros',              emoji: '🔵' },
  { key: 'pecho',            label: 'Pecho',                emoji: '🔵' },
  { key: 'bicep_der',        label: 'Bícep derecho',        emoji: '💪' },
  { key: 'bicep_izq',        label: 'Bícep izquierdo',      emoji: '💪' },
  { key: 'cintura',          label: 'Cintura',              emoji: '🔵' },
  { key: 'abdomen',          label: 'Abdomen',              emoji: '🔵' },
  { key: 'cadera',           label: 'Cadera',               emoji: '🔵' },
  { key: 'muslo_der',        label: 'Muslo derecho',        emoji: '🦵' },
  { key: 'muslo_izq',        label: 'Muslo izquierdo',      emoji: '🦵' },
  { key: 'pantorrilla_der',  label: 'Pantorrilla derecha',  emoji: '🦵' },
  { key: 'pantorrilla_izq',  label: 'Pantorrilla izquierda',emoji: '🦵' },
]

const SEMANAS_POR_MES = 4

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

export default function MesocicloPage() {
  const { data: meso, isLoading } = useMesocicloActivo()
  const createMeso = useCreateMesociclo()
  const agregarMedidas = useAgregarMedidas()

  const [showCreate, setShowCreate]       = useState(false)
  const [showMedidas, setShowMedidas]     = useState(false)
  const [showHistorial, setShowHistorial] = useState<MedidaSnapshot | null>(null)
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(1)
  const [mesSeleccionado, setMesSeleccionado]       = useState(1)
  const [medidasForm, setMedidasForm]     = useState<Record<string, string>>({})
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [mesHistorial, setMesHistorial]   = useState<number | null>(null)

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
  const progress        = Math.round((currentWeek / duracionSemanas) * 100)

  // Semanas del mes activo
  const semanasDelMes = useMemo(() => {
    const inicio = (currentMes - 1) * SEMANAS_POR_MES + 1
    const fin    = Math.min(currentMes * SEMANAS_POR_MES, duracionSemanas)
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i)
  }, [currentMes, duracionSemanas])

  // Semanas del mes en historial
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
    const diasNecesarios = (semana - 1) * 5
    return Math.max(0, diasNecesarios - diasDesdeInicio)
  }

  function abrirSemana(semana: number) {
    const snap = meso?.historial_medidas?.find(h => h.semana === semana)
    if (snap) {
      setShowHistorial(snap)
      return
    }
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
        <svg
          className="absolute inset-0 w-full pointer-events-none"
          style={{ height: svgH }}
          viewBox={`0 0 280 ${svgH}`}
          preserveAspectRatio="none"
        >
          <path
            d={snakePath(total)}
            fill="none"
            stroke="#39FF14"
            strokeWidth="3"
            strokeDasharray="8 4"
            opacity="0.25"
          />
        </svg>

        <div style={{ paddingBottom: 8 }}>
          {semanas.map((semana, i) => {
            const isLeft       = i % 2 === 0
            const snap         = meso?.historial_medidas?.find(h => h.semana === semana)
            const tieneSnap    = !!snap
            const esCurrent    = semana === currentWeek
            const esAnterior   = semana < currentWeek
            const puede        = !bloqueadas && puedeRegistrarSemana(semana)
            const diasFaltan   = !bloqueadas && !tieneSnap && !puede ? diasParaDesbloquear(semana) : 0

            return (
              <motion.div
                key={semana}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                style={{ marginBottom: i < total - 1 ? 16 : 0 }}
              >
                <button
                  onClick={() => !bloqueadas && abrirSemana(semana)}
                  disabled={bloqueadas || (!tieneSnap && !puede && semana !== 1)}
                  className={`relative flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 transition-all active:scale-95 ${
                    tieneSnap
                      ? 'border-dorfin-green bg-dorfin-green/15'
                      : esCurrent && puede
                      ? 'border-dorfin-green bg-dorfin-green shadow-glow scale-110'
                      : esAnterior && !tieneSnap
                      ? 'border-dorfin-purple/60 bg-dorfin-surface/60'
                      : puede
                      ? 'border-dorfin-border bg-dorfin-surface'
                      : 'border-dorfin-border/30 bg-dorfin-surface/30 opacity-50'
                  }`}
                >
                  {tieneSnap && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-dorfin-green flex items-center justify-center shadow-glow">
                      <Check size={12} className="text-dorfin-bg" />
                    </div>
                  )}
                  {!tieneSnap && !puede && semana > 1 && !bloqueadas && (
                    <Lock size={14} className="text-dorfin-faint mb-1" />
                  )}
                  <span className={`text-[10px] font-medium tracking-widest uppercase ${
                    tieneSnap ? 'text-dorfin-green'
                    : esCurrent && puede ? 'text-dorfin-bg'
                    : 'text-dorfin-muted'
                  }`}>Semana</span>
                  <span className={`font-display text-4xl ${
                    tieneSnap ? 'text-dorfin-green'
                    : esCurrent && puede ? 'text-dorfin-bg'
                    : 'text-dorfin-faint'
                  }`}>{semana}</span>
                  {diasFaltan > 0 && (
                    <span className="text-[9px] text-dorfin-faint mt-0.5">En {diasFaltan}d</span>
                  )}
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
                <div className="flex items-center gap-1.5 bg-dorfin-green/10 border border-dorfin-green/20 rounded-lg px-3 py-1.5">
                  <TrendingUp size={12} className="text-dorfin-green" />
                  <span className="text-dorfin-green text-xs font-medium">Sem {currentWeek} · Mes {currentMes}</span>
                </div>
              </div>
              <div className="relative h-2 bg-dorfin-surface rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-green rounded-full"
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-dorfin-faint text-xs">
                  Inicio: {format(fechaInicio, 'd MMM', { locale: es })}
                </span>
                <span className="text-dorfin-muted text-xs">{progress}%</span>
              </div>
              <p className="text-dorfin-muted text-xs mt-2">
                Peso inicial: <span className="text-dorfin-text font-medium">{meso.peso_inicial} kg</span>
                <span className="ml-3">Día {diasDesdeInicio + 1}</span>
              </p>
            </div>

            {/* Mes actual */}
            <div className="card p-5">
              <h3 className="text-dorfin-muted text-xs tracking-widest uppercase mb-1">
                Mes {currentMes} — Progresión
              </h3>
              <p className="text-dorfin-faint text-[11px] mb-5">Toca una semana para registrar medidas</p>
              {renderSemanas(semanasDelMes)}
            </div>

            {/* Historial de meses */}
            {totalMeses > 1 && (
              <div className="card p-5">
                <button
                  onClick={() => setHistorialAbierto(!historialAbierto)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-dorfin-muted text-xs tracking-widest uppercase">Historial de meses</h3>
                  {historialAbierto
                    ? <ChevronUp size={16} className="text-dorfin-muted" />
                    : <ChevronDown size={16} className="text-dorfin-muted" />
                  }
                </button>

                <AnimatePresence>
                  {historialAbierto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Selector de mes */}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {Array.from({ length: totalMeses }, (_, i) => i + 1).map(mes => {
                          const semanasM = Array.from({ length: SEMANAS_POR_MES }, (_, i) => (mes - 1) * SEMANAS_POR_MES + i + 1).filter(s => s <= duracionSemanas)
                          const completado = semanasM.every(s => meso.historial_medidas?.some(h => h.semana === s))
                          const esActual = mes === currentMes
                          return (
                            <button
                              key={mes}
                              onClick={() => setMesHistorial(mesHistorial === mes ? null : mes)}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                mesHistorial === mes
                                  ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green'
                                  : completado
                                  ? 'border-dorfin-green/40 text-dorfin-green/70 bg-dorfin-green/5'
                                  : esActual
                                  ? 'border-dorfin-purple text-dorfin-text'
                                  : 'border-dorfin-border text-dorfin-faint'
                              }`}
                            >
                              Mes {mes} {completado ? '✓' : esActual ? '●' : ''}
                            </button>
                          )
                        })}
                      </div>

                      {/* Semanas del mes seleccionado */}
                      <AnimatePresence>
                        {mesHistorial && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-5"
                          >
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
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
              >
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
{(form.frecuencia_medidas === 'semanal'
  ? ['8', '12', '16', '24']
  : ['3', '6', '9', '12']
).map(s => (
  <button key={s} onClick={() => setForm({ ...form, duracion_semanas: s })}
    className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
      form.duracion_semanas === s ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
    }`}>{s}{form.frecuencia_medidas === 'semanal' ? 'w' : 'm'}</button>
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
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-dorfin-text font-display text-2xl">Semana {semanaSeleccionada}</h2>
                  <button onClick={() => setShowMedidas(false)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
<p className="text-dorfin-muted text-xs mb-5">Registra tus medidas en cm</p>
<div className="space-y-3">
  <div className="flex items-center gap-3 pb-3 mb-2 border-b border-dorfin-border">
    <span className="text-lg">⚖️</span>
    <span className="text-dorfin-text text-sm flex-1 font-medium">Peso actual</span>
    <input type="number" placeholder="0" className="input-field w-20 text-center text-sm"
      value={medidasForm['peso_kg'] ?? ''}
      onChange={e => setMedidasForm({ ...medidasForm, peso_kg: e.target.value })} />
    <span className="text-dorfin-faint text-xs">kg</span>
  </div>
                  {MEDIDAS_CORPORALES.map(({ key, label, emoji }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-dorfin-text text-sm flex-1">{label}</span>
                      <input type="number" placeholder="0" className="input-field w-20 text-center text-sm"
                        value={medidasForm[key] ?? ''}
                        onChange={e => setMedidasForm({ ...medidasForm, [key]: e.target.value })} />
                      <span className="text-dorfin-faint text-xs">cm</span>
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
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-dorfin-text font-display text-2xl">Semana {showHistorial.semana}</h2>
                  <button onClick={() => setShowHistorial(null)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
                <p className="text-dorfin-muted text-xs mb-5">
                  Registrado el {format(parseISO(showHistorial.fecha), "d 'de' MMMM yyyy", { locale: es })}
                </p>
                <div className="space-y-3">
{showHistorial.medidas['peso_kg'] != null && showHistorial.medidas['peso_kg'] !== undefined ? (
  <div className="flex items-center gap-3 pb-3 mb-2 border-b border-dorfin-border">
    <span className="text-lg">⚖️</span>
    <span className="text-dorfin-text text-sm flex-1 font-medium">Peso actual</span>
    <span className="font-mono text-dorfin-green font-medium">{showHistorial.medidas['peso_kg']} kg</span>
  </div>
) : null}
{MEDIDAS_CORPORALES.filter(m => showHistorial.medidas[m.key] != null && showHistorial.medidas[m.key] !== undefined).map(({ key, label, emoji }) => (
  <div key={key} className="flex items-center gap-3">
    <span className="text-lg">{emoji}</span>
    <span className="text-dorfin-text text-sm flex-1">{label}</span>
    <span className="font-mono text-dorfin-green font-medium">{showHistorial.medidas[key]} cm</span>
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
      </div>
    </div>
  )
}