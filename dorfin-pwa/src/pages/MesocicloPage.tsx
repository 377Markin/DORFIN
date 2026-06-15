import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, TrendingUp, X, ChevronDown, ChevronUp, Lock, Trophy, ChevronRight, Info, Shield, Calendar, Dumbbell } from 'lucide-react'
import CuerpoDorfinPage from '@/pages/CuerpoDorfinPage'
import { useMesocicloActivo, useCreateMesociclo, useAgregarMedidas } from '@/lib/hooks'
import { Skeleton, PageHeader } from '@/components/shared'
import { differenceInDays, differenceInWeeks, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mesociclosApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/authStore'
import { calcularGrasaCorporal, type MedidasCorporales } from '@/lib/bodyfat'
import { useGrasaCorporal } from '@/lib/hooks'
import type { MedidaSnapshot } from '@/types'

const METAS = ['Hipertrofia', 'Definición', 'Fuerza', 'Powerlifting', 'Resistencia', 'Pérdida de peso', 'Mantenimiento']

const MEDIDAS_CORPORALES_LIST = [
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

const ANOTACIONES = [
  { key: 'cuello',          label: 'Cuello',       x: 50,  y: 8,   color: '#39FF14', side: 'center' },
  { key: 'hombros',         label: 'Hombros',      x: 88,  y: 20,  color: '#a78bfa', side: 'right'  },
  { key: 'pecho',           label: 'Pecho',        x: 88,  y: 30,  color: '#a78bfa', side: 'right'  },
  { key: 'bicep_der',       label: 'Bíceps D',     x: 12,  y: 35,  color: '#fb923c', side: 'left'   },
  { key: 'bicep_izq',       label: 'Bíceps I',     x: 88,  y: 38,  color: '#fb923c', side: 'right'  },
  { key: 'cintura',         label: 'Cintura',      x: 88,  y: 48,  color: '#39FF14', side: 'right'  },
  { key: 'abdomen',         label: 'Abdomen',      x: 12,  y: 52,  color: '#39FF14', side: 'left'   },
  { key: 'cadera',          label: 'Cadera',       x: 88,  y: 58,  color: '#a78bfa', side: 'right'  },
  { key: 'muslo_der',       label: 'Muslo D',      x: 12,  y: 68,  color: '#60a5fa', side: 'left'   },
  { key: 'muslo_izq',       label: 'Muslo I',      x: 88,  y: 68,  color: '#60a5fa', side: 'right'  },
  { key: 'pantorrilla_der', label: 'Pant. D',      x: 12,  y: 82,  color: '#34d399', side: 'left'   },
  { key: 'pantorrilla_izq', label: 'Pant. I',      x: 88,  y: 82,  color: '#34d399', side: 'right'  },
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

function getColorCategoria(cat: string) {
  if (cat.includes('élite') || cat.includes('Atlét')) return '#39FF14'
  if (cat.includes('forma')) return '#86efac'
  if (cat.includes('Promedio')) return '#fbbf24'
  if (cat.includes('Sobrepeso')) return '#fb923c'
  return '#f87171'
}

function SparklineGrasa({ historial }: { historial: { fecha: string; porcentaje: number }[] }) {
  if (historial.length < 2) return null
  const valores = historial.map(h => h.porcentaje)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const w = 280, h = 60
  const pts = historial.map((entry, i) => ({
    x: (i / (historial.length - 1)) * w,
    y: h - ((entry.porcentaje - min) / rango) * h * 0.8 - h * 0.1,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const diff = +(historial[historial.length-1].porcentaje - historial[0].porcentaje).toFixed(1)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-dorfin-green" />
          <p className="text-dorfin-text text-sm font-semibold">Evolución de grasa corporal</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${diff < 0 ? 'text-dorfin-green' : diff > 0 ? 'text-red-400' : 'text-dorfin-faint'}`}>
            {diff > 0 ? '+' : ''}{diff}% {diff < 0 ? '↓' : diff > 0 ? '↑' : ''}
          </p>
          <p className="text-dorfin-faint text-[10px]">Desde el inicio</p>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 60 }}>
        <defs>
          <linearGradient id="grasa-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#39FF14" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${pts[pts.length-1].x} ${h} L 0 ${h} Z`} fill="url(#grasa-grad)" />
        <path d={path} fill="none" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#39FF14" />
            <text x={p.x} y={h} fontSize="8" fill="#4A4468" textAnchor="middle">
              {historial[i].fecha.slice(5)}
            </text>
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
  const user = useAuthStore((s) => s.user)
  const { getHistorial, saveHistorial } = useGrasaCorporal()

  // Mesociclo states
  const [showCreate, setShowCreate]             = useState(false)
  const [showMedidas, setShowMedidas]           = useState(false)
  const [showHistorialMeso, setShowHistorialMeso] = useState<MedidaSnapshot | null>(null)
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(1)
  const [mesSeleccionado, setMesSeleccionado]   = useState(1)
  const [medidasForm, setMedidasForm]           = useState<Record<string, string>>({})
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [mesHistorial, setMesHistorial]         = useState<number | null>(null)
  const [showFinCiclo, setShowFinCiclo]         = useState(false)
  const [nuevaMeta, setNuevaMeta]               = useState('')
  const [semanasExtra, setSemanasExtra]         = useState('8')
  const [showInfo, setShowInfo]                 = useState(false)

  // Cuerpo de DORFIN states
  const [showCuerpoSection, setShowCuerpoSection] = useState(true)
  const [showCuerpoPage, setShowCuerpoPage]       = useState(false)
  const [cuerpoTab, setCuerpoTab]               = useState<'resultado' | 'medidas' | 'historial'>('resultado')
  const [cuerpoForm, setCuerpoForm]             = useState<Record<string, string>>(() => {
    const ultimo = meso?.historial_medidas?.[meso.historial_medidas.length - 1]
    const base: Record<string, string> = {}
    if (ultimo?.medidas) {
      Object.entries(ultimo.medidas).forEach(([k, v]) => { base[k] = String(v) })
    }
    return base
  })

  const grasaHistorial = getHistorial()

  const extenderMutation = useMutation({
    mutationFn: ({ semanas_extra, meta }: { semanas_extra: number; meta: string }) =>
      mesociclosApi.extender(meso!.id, semanas_extra, meta),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mesociclo-activo'] }); setShowFinCiclo(false) },
  })

  const [form, setForm] = useState({
    meta: 'Hipertrofia', duracion_semanas: '12',
    frecuencia_medidas: 'semanal', peso_inicial: '',
  })

  const duracionSemanas = meso?.duracion_semanas ?? 12
  const fechaInicio     = useMemo(() => meso ? parseISO(meso.fecha_inicio) : new Date(), [meso])
  const diasDesdeInicio = useMemo(() => meso ? differenceInDays(new Date(), fechaInicio) : 0, [meso, fechaInicio])
  const currentWeek     = useMemo(() => meso ? Math.min(differenceInWeeks(new Date(), fechaInicio) + 1, duracionSemanas) : 0, [meso, fechaInicio, duracionSemanas])
  const totalMeses      = Math.ceil(duracionSemanas / SEMANAS_POR_MES)
  const currentMes      = Math.ceil(currentWeek / SEMANAS_POR_MES)
  const semanasRegistradas = meso?.historial_medidas?.length ?? 0
  const progress        = Math.round((semanasRegistradas / duracionSemanas) * 100)
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

  // Calcular edad
  const edad = useMemo(() => {
    if (!user?.fecha_nacimiento) return 25
    const hoy = new Date()
    const nac = new Date(user.fecha_nacimiento + 'T00:00:00')
    let e = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
    return e
  }, [user])

  // Calcular grasa con medidas del cuerpoForm
  const medidasCuerpo: MedidasCorporales | null = useMemo(() => {
    if (!user?.sexo || !user?.altura || !user?.peso) return null
    if (!cuerpoForm.cuello || !cuerpoForm.cintura || !cuerpoForm.abdomen || !cuerpoForm.cadera) return null
    const n = (k: string) => cuerpoForm[k] ? Number(cuerpoForm[k]) : undefined
    return {
      sexo: user.sexo as 'hombre' | 'mujer',
      edad, altura: user.altura, peso: user.peso,
      cuello:           Number(cuerpoForm.cuello),
      cintura:          Number(cuerpoForm.cintura),
      abdomen:          Number(cuerpoForm.abdomen),
      cadera:           Number(cuerpoForm.cadera),
      hombros:          n('hombros'),
      pecho:            n('pecho'),
      bicep_der:        n('bicep_der'),
      bicep_izq:        n('bicep_izq'),
      muslo_der:        n('muslo_der'),
      muslo_izq:        n('muslo_izq'),
      pantorrilla_der:  n('pantorrilla_der'),
      pantorrilla_izq:  n('pantorrilla_izq'),
      antebrazo_der:    n('antebrazo_der'),
      antebrazo_izq:    n('antebrazo_izq'),
      muneca:           n('muneca'),
      tobillo:          n('tobillo'),
      anchura_hombros:  n('anchura_hombros'),
      anchura_cadera:   n('anchura_cadera'),
      altura_sentado:   n('altura_sentado'),
    }
  }, [cuerpoForm, user, edad])

  const resultadoGrasa = useMemo(() => {
    if (!medidasCuerpo) return null
    return calcularGrasaCorporal(medidasCuerpo)
  }, [medidasCuerpo])

  // Sincronizar cuerpoForm cuando llegan medidas del mesociclo
  useMemo(() => {
    const ultimo = meso?.historial_medidas?.[meso.historial_medidas.length - 1]
    if (ultimo?.medidas && Object.keys(cuerpoForm).length === 0) {
      const base: Record<string, string> = {}
      Object.entries(ultimo.medidas).forEach(([k, v]) => { base[k] = String(v) })
      setCuerpoForm(base)
    }
  }, [meso])

  function puedeRegistrarSemana(semana: number): boolean {
    return diasDesdeInicio >= (semana - 1) * 5
  }

  function diasParaDesbloquear(semana: number): number {
    return Math.max(0, (semana - 1) * 5 - diasDesdeInicio)
  }

  function abrirSemana(semana: number) {
    const snap = meso?.historial_medidas?.find(h => h.semana === semana)
    if (snap) { setShowHistorialMeso(snap); return }
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
      { onSuccess: () => {
        // Sincronizar con cuerpoForm
        const newForm: Record<string, string> = {}
        Object.entries(medidas).forEach(([k, v]) => { newForm[k] = String(v) })
        setCuerpoForm(prev => ({ ...prev, ...newForm }))
        setShowMedidas(false)
        setMedidasForm({})
      }}
    )
  }

  function handleGuardarGrasa() {
    if (!resultadoGrasa) return
    saveHistorial(resultadoGrasa, { ...cuerpoForm, peso: user?.peso, altura: user?.altura })
    setCuerpoTab('resultado')
  }

  function handleCreate() {
    createMeso.mutate({
      fecha_inicio: new Date().toISOString().split('T')[0],
      peso_inicial: Number(form.peso_inicial) || 0,
      medidas: {}, meta: form.meta,
      duracion_semanas: form.frecuencia_medidas === 'mensual'
        ? Number(form.duracion_semanas) * 4 : Number(form.duracion_semanas),
      frecuencia_medidas: form.frecuencia_medidas,
    }, { onSuccess: () => setShowCreate(false) })
  }

  function renderSemanas(semanas: number[], bloqueadas = false) {
    return (
      <div className="relative">
        {/* Línea conectora horizontal detrás de los círculos */}
        <div className="absolute top-[52px] left-[56px] right-[56px] h-0 pointer-events-none"
          style={{ borderTop: '2px dashed rgba(57,255,20,0.25)' }} />

        <div className="flex items-start justify-between px-0">
          {semanas.map((semana, i) => {
            const snap       = meso?.historial_medidas?.find(h => h.semana === semana)
            const tieneSnap  = !!snap
            const esCurrent  = semana === currentWeek
            const puede      = !bloqueadas && puedeRegistrarSemana(semana)
            const diasFaltan = !bloqueadas && !tieneSnap && !puede ? diasParaDesbloquear(semana) : 0
            return (
              <div key={semana} className="flex flex-col items-center flex-1">
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: esCurrent && puede ? 1.12 : 1, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => !bloqueadas && abrirSemana(semana)}
                  disabled={bloqueadas || (!tieneSnap && !puede && semana !== 1)}
                  className={`relative flex flex-col items-center justify-center rounded-full border-[3px] transition-all active:scale-95
                    ${esCurrent && puede
                      ? 'w-[72px] h-[72px] border-dorfin-green bg-dorfin-green shadow-glow'
                      : tieneSnap
                      ? 'w-[60px] h-[60px] border-dorfin-green bg-dorfin-green/15'
                      : puede
                      ? 'w-[60px] h-[60px] border-dorfin-border bg-dorfin-surface'
                      : 'w-[60px] h-[60px] border-dorfin-border/30 bg-dorfin-surface/30 opacity-50'
                    }`}
                >
                  {tieneSnap && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-dorfin-green flex items-center justify-center shadow-glow">
                      <Check size={10} className="text-dorfin-bg" />
                    </div>
                  )}
                  {!tieneSnap && !puede && semana > 1 && !bloqueadas && (
                    <Lock size={12} className="text-dorfin-faint mb-0.5" />
                  )}
                  <span className={`text-[8px] font-semibold tracking-widest uppercase leading-none
                    ${esCurrent && puede ? 'text-dorfin-bg' : tieneSnap ? 'text-dorfin-green' : 'text-dorfin-muted'}`}>
                    SEMANA
                  </span>
                  <span className={`font-display leading-none
                    ${esCurrent && puede ? 'text-[32px] text-dorfin-bg' : 'text-[28px]'}
                    ${tieneSnap ? 'text-dorfin-green' : esCurrent && puede ? 'text-dorfin-bg' : 'text-dorfin-faint'}`}>
                    {semana}
                  </span>
                  {diasFaltan > 0 && (
                    <span className="text-[8px] text-dorfin-faint leading-none mt-0.5">En {diasFaltan}d</span>
                  )}
                </motion.button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const colorCat = resultadoGrasa ? getColorCategoria(resultadoGrasa.categoria) : '#39FF14'

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-14 flex items-start justify-between">
        <PageHeader title="MESOCICLO" subtitle="Tu ciclo de entrenamiento" />
        <button onClick={() => setShowCuerpoPage(true)}
          className="mt-1 flex items-center gap-2 bg-dorfin-surface border border-dorfin-purple/40 rounded-xl px-3 py-2 hover:border-dorfin-purple transition-colors active:scale-95">
          <Shield size={14} className="text-dorfin-green" />
          <span className="text-dorfin-text text-xs font-medium">Cuerpo de DORFIN</span>
          <ChevronRight size={12} className="text-dorfin-faint" />
        </button>
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
                <p className="text-dorfin-muted text-sm mt-1 mb-4">Terminaste {duracionSemanas} semanas de {meso.meta}</p>
                <button onClick={() => { setNuevaMeta(meso.meta ?? ''); setShowFinCiclo(true) }} className="btn-primary w-full">
                  ¿Qué sigue?
                </button>
              </motion.div>
            )}

            {/* Header mesociclo */}
            <div className="card p-5 border-dorfin-purple/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-dorfin-muted text-[10px] tracking-widest uppercase font-medium">Mesociclo Activo</p>
                  <h2 className="font-display text-4xl text-dorfin-text mt-0.5 leading-none">{meso.meta?.toUpperCase()}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-dorfin-faint" />
                      <span className="text-dorfin-faint text-[11px]">Inicio: {format(fechaInicio, 'd MMM', { locale: es })}</span>
                    </div>
                    <span className="text-dorfin-border">•</span>
                    <span className="text-dorfin-faint text-[11px]">Duración: {duracionSemanas} semanas</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-dorfin-green/10 border border-dorfin-green/30 rounded-xl px-3 py-2 mt-1">
                  <TrendingUp size={13} className="text-dorfin-green" />
                  <span className="text-dorfin-green text-xs font-semibold">Sem {currentWeek} • Mes {currentMes}</span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="relative h-2.5 bg-dorfin-surface rounded-full overflow-hidden mb-1">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #22CC00 0%, #39FF14 100%)' }} />
              </div>
              <div className="flex justify-end mb-3">
                <span className="text-dorfin-text text-sm font-semibold">{Math.min(progress, 100)}%</span>
              </div>

              {/* Peso inicial + Día */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Dumbbell size={13} className="text-dorfin-muted" />
                  <span className="text-dorfin-muted text-xs">Peso inicial: <span className="text-dorfin-text font-semibold">{meso.peso_inicial} kg</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-dorfin-muted" />
                  <span className="text-dorfin-muted text-xs font-semibold">Día {diasDesdeInicio + 1}</span>
                </div>
              </div>
            </div>

            {/* Mes actual */}
            {!cicloTerminado && (
              <div className="card p-5">
                <h3 className="text-dorfin-text text-sm font-semibold uppercase tracking-widest mb-0.5">Mes {currentMes} — Progresión</h3>
                <p className="text-dorfin-faint text-[11px] mb-5">Toca una semana para registrar medidas</p>
                {renderSemanas(semanasDelMes)}
              </div>
            )}

            {/* ── CUERPO DE DORFIN — Dashboard compacto ── */}
            <AnimatePresence>
              {showCuerpoSection && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }} className="card p-5 border-dorfin-purple/30">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-dorfin-green" />
                      <div>
                        <p className="text-dorfin-text font-display text-xl leading-none">CUERPO DE DORFIN</p>
                        <p className="text-dorfin-faint text-[10px] mt-0.5">Análisis de composición corporal</p>
                      </div>
                    </div>
                    <button onClick={() => setShowCuerpoPage(true)}
                      className="flex items-center gap-1.5 bg-dorfin-purple/20 border border-dorfin-purple/40 rounded-xl px-3 py-1.5 hover:border-dorfin-purple transition-colors active:scale-95">
                      <TrendingUp size={12} className="text-dorfin-purple-light" />
                      <span className="text-dorfin-purple-light text-[11px] font-medium">Ver historial</span>
                      <ChevronRight size={11} className="text-dorfin-purple-light" />
                    </button>
                  </div>

                  {!resultadoGrasa ? (
                    /* Estado vacío compacto */
                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-1">
                        <p className="text-dorfin-text text-sm font-semibold">Sin medidas registradas</p>
                        <p className="text-dorfin-faint text-xs mt-0.5">Registra cuello, cintura, abdomen y cadera para activar el análisis</p>
                      </div>
                      <button onClick={() => setShowCuerpoPage(true)}
                        className="flex-none flex items-center gap-1.5 btn-primary text-xs px-4 py-2">
                        <Plus size={13} /> Iniciar
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Stats compactos en fila */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {/* Grasa */}
                        <div className="rounded-2xl p-3"
                          style={{ background: `linear-gradient(135deg, ${colorCat}15 0%, rgba(26,21,48,0.9) 100%)`, border: `1px solid ${colorCat}30` }}>
                          <p className="text-dorfin-faint text-[9px] uppercase tracking-wide">Grasa</p>
                          <p className="font-display text-2xl leading-tight mt-0.5" style={{ color: colorCat }}>
                            {resultadoGrasa.porcentaje}<span className="text-xs">%</span>
                          </p>
                          <p className="text-[8px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
                            style={{ color: colorCat, backgroundColor: `${colorCat}20` }}>
                            {resultadoGrasa.confianza}% conf.
                          </p>
                        </div>

                        {/* Masa muscular */}
                        <div className="card p-3">
                          <p className="text-dorfin-faint text-[9px] uppercase tracking-wide">Muscular</p>
                          <p className="font-display text-2xl text-dorfin-green leading-tight mt-0.5">
                            {resultadoGrasa.masaMuscular}<span className="text-xs"> kg</span>
                          </p>
                          <p className="text-dorfin-faint text-[9px] mt-0.5">estimado</p>
                        </div>

                        {/* Categoría */}
                        <div className="card p-3">
                          <p className="text-dorfin-faint text-[9px] uppercase tracking-wide">Categoría</p>
                          <p className="text-[11px] font-bold leading-tight mt-1" style={{ color: colorCat }}>
                            {resultadoGrasa.categoria}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorCat }} />
                            <p className="text-dorfin-faint text-[8px]">± {resultadoGrasa.margenError}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Mini sparkline si hay historial */}
                      {grasaHistorial.length >= 2 && (
                        <div className="mb-3">
                          <SparklineGrasa historial={grasaHistorial} />
                        </div>
                      )}

                      {/* CTA pantalla completa */}
                      <button onClick={() => setShowCuerpoPage(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dorfin-green/30 bg-dorfin-green/5 py-3 text-dorfin-green text-sm font-semibold hover:bg-dorfin-green/10 transition-all active:scale-98">
                        <Shield size={14} />
                        Ver análisis completo del cuerpo
                        <ChevronRight size={14} />
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>



            {/* Historial de meses */}
            {totalMeses > 1 && (
              <div className="card p-5">
                <button onClick={() => setHistorialAbierto(!historialAbierto)}
                  className="w-full flex items-center justify-between">
                  <h3 className="text-dorfin-muted text-xs tracking-widest uppercase">Historial de meses</h3>
                  {historialAbierto ? <ChevronUp size={16} className="text-dorfin-muted" /> : <ChevronDown size={16} className="text-dorfin-muted" />}
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
                      {(form.frecuencia_medidas === 'semanal' ? ['8','12','16','24'] : ['3','6','9','12']).map(s => (
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

        {/* Sheet — Registrar medidas semana */}
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
                  {MEDIDAS_CORPORALES_LIST.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3 py-1">
                      <div className="flex-1"><p className="text-dorfin-text text-sm font-medium">{label}</p></div>
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

        {/* Sheet — Ver historial semana */}
        <AnimatePresence>
          {showHistorialMeso && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowHistorialMeso(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-dorfin-text font-display text-2xl">Semana {showHistorialMeso.semana}</h2>
                  <button onClick={() => setShowHistorialMeso(null)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
                <p className="text-dorfin-muted text-xs mb-5">
                  Registrado el {format(parseISO(showHistorialMeso.fecha), "d 'de' MMMM yyyy", { locale: es })}
                </p>
                <div className="space-y-2">
                  {showHistorialMeso.medidas['peso_kg'] != null && (
                    <div className="flex items-center justify-between py-2 pb-4 border-b border-dorfin-border">
                      <p className="text-dorfin-text text-sm font-medium">Peso actual</p>
                      <span className="font-display text-xl text-dorfin-green">{showHistorialMeso.medidas['peso_kg']} <span className="text-sm">kg</span></span>
                    </div>
                  )}
                  {MEDIDAS_CORPORALES_LIST.filter(m => showHistorialMeso.medidas[m.key] != null).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1.5">
                      <span className="text-dorfin-muted text-sm">{label}</span>
                      <span className="font-display text-lg text-dorfin-green">{showHistorialMeso.medidas[key]} <span className="text-xs">cm</span></span>
                    </div>
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
                  Completaste <span className="text-dorfin-green font-semibold">{duracionSemanas} semanas</span> de <span className="text-dorfin-text font-semibold">{meso?.meta}</span>.
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
                      {['4','8','12','16'].map(s => (
                        <button key={s} onClick={() => setSemanasExtra(s)}
                          className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                            semanasExtra === s ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green' : 'card border-dorfin-border text-dorfin-muted'
                          }`}>{s} sem</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => extenderMutation.mutate({ semanas_extra: Number(semanasExtra), meta: nuevaMeta })}
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

        {/* Sheet — Info */}
        <AnimatePresence>
          {showInfo && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowInfo(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-dorfin-text font-display text-2xl">¿CÓMO FUNCIONA?</h2>
                  <button onClick={() => setShowInfo(false)}><X size={20} className="text-dorfin-muted" /></button>
                </div>
                <div className="space-y-3 text-sm text-dorfin-muted">
                  <p>DORFIN combina <span className="text-dorfin-text font-medium">5 métodos antropométricos</span>:</p>
                  {['US Navy (DoD, 1986)', 'YMCA (Golding, 1989)', 'WHtR — Lean et al. (1996)', 'IMC — Gallagher et al. (2000)', 'Modelo DORFIN v2'].map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-dorfin-green" />
                      <span>{m}</span>
                    </div>
                  ))}
                  <p className="text-dorfin-faint text-xs leading-relaxed mt-3">
                    El resultado es una <span className="text-dorfin-text">estimación</span>. La utilidad está en seguir tu <span className="text-dorfin-text">progreso</span>, no en la cifra exacta.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── PANTALLA COMPLETA CUERPO DE DORFIN ──────────────────
          Montada sobre todo el layout con z-index alto.
          Se abre al pulsar "Cuerpo de DORFIN" o "Ver análisis completo". */}
      <AnimatePresence>
        {showCuerpoPage && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[80]"
          >
            <CuerpoDorfinPage
              onClose={() => setShowCuerpoPage(false)}
              medidasMeso={
                meso?.historial_medidas?.length
                  ? (meso.historial_medidas[meso.historial_medidas.length - 1].medidas ?? null)
                  : null
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}