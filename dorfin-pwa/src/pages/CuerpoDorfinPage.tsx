// ═══════════════════════════════════════════════════════════════
// CUERPO DE DORFIN — Pantalla completa de composición corporal
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, TrendingUp, ChevronRight, Info,
  Plus, ArrowLeft, BarChart2, Ruler
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { calcularGrasaCorporal, type MedidasCorporales, type ResultadoGrasa } from '@/lib/bodyfat'
import { useGrasaCorporal } from '@/lib/hooks'

// ── Tipos internos ─────────────────────────────────────────────
interface EntradaHistorial {
  fecha:        string
  peso:         number
  grasa:        number
  confianza:    number
  margenError:  number
  categoria:    string
  masaMuscular: number
  masaGrasa:    number
  cintura?:     number
  medidas?:     Record<string, string | number>
}

// ── Colores por zona anatómica ─────────────────────────────────
const COLOR = {
  verde:    '#39FF14',
  purpura:  '#a78bfa',
  naranja:  '#fb923c',
  azul:     '#60a5fa',
  teal:     '#34d399',
  amarillo: '#fbbf24',
  rosa:     '#f472b6',
}

// ── Anotaciones con coordenadas absolutas (sobre viewBox 320×480) ──
// x,y = punto de conexión en el cuerpo (origen de la línea)
// lx,ly = posición de la etiqueta
// side = 'left' | 'right' — de qué lado del cuerpo aparece la etiqueta
const ANOTACIONES: {
  key:   string
  label: string
  x:     number
  y:     number
  lx:    number
  ly:    number
  color: string
  side:  'left' | 'right' | 'top'
}[] = [
  { key: 'cuello',          label: 'Cuello',       x: 160, y: 72,  lx: 160, ly: 30,  color: COLOR.verde,   side: 'top'   },
  { key: 'hombros',         label: 'Hombros',      x: 230, y: 100, lx: 290, ly: 88,  color: COLOR.purpura, side: 'right' },
  { key: 'pecho',           label: 'Pecho',        x: 220, y: 128, lx: 290, ly: 120, color: COLOR.purpura, side: 'right' },
  { key: 'bicep_der',       label: 'Bíceps D',     x: 85,  y: 138, lx: 28,  ly: 128, color: COLOR.naranja, side: 'left'  },
  { key: 'bicep_izq',       label: 'Bíceps I',     x: 235, y: 142, lx: 290, ly: 155, color: COLOR.naranja, side: 'right' },
  { key: 'cintura',         label: 'Cintura',      x: 218, y: 180, lx: 290, ly: 188, color: COLOR.verde,   side: 'right' },
  { key: 'abdomen',         label: 'Abdomen',      x: 98,  y: 196, lx: 28,  ly: 202, color: COLOR.verde,   side: 'left'  },
  { key: 'cadera',          label: 'Cadera',       x: 210, y: 220, lx: 290, ly: 222, color: COLOR.purpura, side: 'right' },
  { key: 'muslo_der',       label: 'Muslo D',      x: 110, y: 280, lx: 28,  ly: 275, color: COLOR.azul,    side: 'left'  },
  { key: 'muslo_izq',       label: 'Muslo I',      x: 210, y: 280, lx: 290, ly: 275, color: COLOR.azul,    side: 'right' },
  { key: 'pantorrilla_der', label: 'Pantorrilla D',x: 115, y: 360, lx: 28,  ly: 355, color: COLOR.teal,    side: 'left'  },
  { key: 'pantorrilla_izq', label: 'Pantorrilla I',x: 205, y: 360, lx: 290, ly: 355, color: COLOR.teal,    side: 'right' },
]

// ── Colores categoría ─────────────────────────────────────────
function colorCategoria(cat: string): string {
  if (cat.includes('élite') || cat.includes('Atlét')) return COLOR.verde
  if (cat.includes('forma'))   return '#86efac'
  if (cat.includes('Promedio')) return COLOR.amarillo
  if (cat.includes('Sobrepeso')) return COLOR.naranja
  return '#f87171'
}

// ── Componente: badge de confianza ────────────────────────────
function ConfianzaBadge({ valor }: { valor: number }) {
  const c = valor >= 80 ? COLOR.verde : valor >= 60 ? COLOR.amarillo : COLOR.naranja
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: c, borderColor: c, backgroundColor: `${c}20` }}>
      Confianza: {valor}%
    </span>
  )
}

// ── Componente: visualizador de métodos ───────────────────────
function MetodosPanel({ metodos, porcentaje }: { metodos: ResultadoGrasa['metodos']; porcentaje: number }) {
  const min = Math.min(...metodos.map(m => m.valor))
  const max = Math.max(...metodos.map(m => m.valor))
  const rango = max - min || 1

  return (
    <div className="space-y-2">
      {metodos.map(met => {
        const pos = ((met.valor - min) / rango) * 100
        const esResultado = Math.abs(met.valor - porcentaje) < 1
        return (
          <div key={met.nombre}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-dorfin-faint text-[10px]">{met.nombre}</span>
              <span className="text-dorfin-text text-[10px] font-semibold">{met.valor}%</span>
            </div>
            <div className="relative h-1.5 bg-dorfin-surface rounded-full overflow-visible">
              <div className="h-full bg-dorfin-border/50 rounded-full" style={{ width: '100%' }} />
              <div className="absolute top-0 h-full rounded-full"
                style={{
                  left: '0%',
                  width: `${pos + 5}%`,
                  background: esResultado ? COLOR.verde : '#4A4468',
                  opacity: esResultado ? 1 : 0.5
                }} />
            </div>
          </div>
        )
      })}
      {metodos.length > 1 && (
        <p className="text-dorfin-faint text-[9px] mt-1">
          Dispersión: {(max - min).toFixed(1)}% entre métodos
        </p>
      )}
    </div>
  )
}

// ── Componente: sparkline evolución ───────────────────────────
function MiniChart({
  datos, color = COLOR.verde, height = 48
}: {
  datos: number[], color?: string, height?: number
}) {
  if (datos.length < 2) return <div className="flex items-center justify-center h-12 text-dorfin-faint text-xs">Sin datos suficientes</div>
  const w = 260
  const h = height
  const min = Math.min(...datos)
  const max = Math.max(...datos)
  const rango = max - min || 1
  const pts = datos.map((v, i) => ({
    x: (i / (datos.length - 1)) * w,
    y: h - ((v - min) / rango) * h * 0.8 - h * 0.1,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const gradId = `grad-${color.replace('#','')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${pts[pts.length-1].x} ${h} L 0 ${h} Z`} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

// ── Componente: cuerpo con anotaciones SVG ────────────────────
function CuerpoConAnotaciones({ form }: { form: Record<string, string> }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '150%' }}>
      <div className="absolute inset-0">
        <svg
          viewBox="0 0 320 480"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 20 }}
        >
          {ANOTACIONES.map(an => {
            const val = form[an.key]
            if (!val) return null

            const isLeft  = an.side === 'left'
            const isTop   = an.side === 'top'
            const textAnchor = isLeft ? 'end' : isTop ? 'middle' : 'start'
            const labelX  = an.lx
            const labelY  = an.ly

            // Línea desde punto corporal hasta etiqueta
            const lineMidX = isLeft  ? (an.x + labelX) / 2 - 10
                           : isTop   ? an.x
                           : (an.x + labelX) / 2 + 10

            return (
              <g key={an.key}>
                {/* Línea de conexión curva */}
                <path
                  d={`M ${an.x} ${an.y} Q ${lineMidX} ${(an.y + labelY) / 2} ${labelX} ${labelY + 8}`}
                  fill="none"
                  stroke={an.color}
                  strokeWidth="0.8"
                  strokeOpacity="0.6"
                  strokeDasharray="3 2"
                />
                {/* Punto de origen en el cuerpo */}
                <circle cx={an.x} cy={an.y} r="2.5" fill={an.color} opacity="0.9" />
                {/* Punto en la etiqueta */}
                <circle cx={labelX} cy={labelY + 8} r="1.5" fill={an.color} opacity="0.7" />

                {/* Etiqueta */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  fontSize="8.5"
                  fontWeight="700"
                  fill={an.color}
                  style={{ fontFamily: 'DM Sans, sans-serif', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                >
                  {an.label}
                </text>
                <text
                  x={labelX}
                  y={labelY + 11}
                  textAnchor={textAnchor}
                  fontSize="9"
                  fontWeight="800"
                  fill={an.color}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {val} cm
                </text>
              </g>
            )
          })}
        </svg>

        {/* Imagen del personaje — protagonismo total */}
        <img
          src="/dorfin-cuerpo.png"
          alt="Cuerpo DORFIN"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            zIndex: 10,
            filter: 'drop-shadow(0 0 24px rgba(57,255,20,0.25))',
            objectPosition: 'center center',
          }}
        />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════

interface Props {
  onClose:      () => void
  medidasMeso?: Record<string, number> | null
}

export default function CuerpoDorfinPage({ onClose, medidasMeso }: Props) {
  const user = useAuthStore((s) => s.user)
  const { getMedidas, saveMedidas, getHistorial, saveHistorial } = useGrasaCorporal()

  const historialRaw: EntradaHistorial[] = getHistorial()

  // Tab activa
  const [tab, setTab] = useState<'cuerpo' | 'medidas' | 'historial' | 'metodos'>('cuerpo')
  const [showInfo, setShowInfo] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Estado del formulario — inicializa con mesociclo > localStorage > vacío
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    if (medidasMeso) {
      Object.entries(medidasMeso).forEach(([k, v]) => { base[k] = String(v) })
    }
    const local = getMedidas()
    if (local) {
      Object.entries(local).forEach(([k, v]) => {
        if (k !== 'fecha') base[k] = String(v)
      })
    }
    return base
  })

  const edad = useMemo(() => {
    if (!user?.fecha_nacimiento) return 25
    const hoy = new Date()
    const nac = new Date(user.fecha_nacimiento + 'T00:00:00')
    let e = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() < nac.getMonth() ||
       (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
    return e
  }, [user])

  // Construir objeto MedidasCorporales desde el form
  const medidas: MedidasCorporales | null = useMemo(() => {
    if (!user?.sexo || !user?.altura || !user?.peso) return null
    if (!form.cuello || !form.cintura || !form.abdomen || !form.cadera) return null
    const n = (k: string) => form[k] ? Number(form[k]) : undefined
    return {
      sexo:             user.sexo as 'hombre' | 'mujer',
      edad,
      altura:           user.altura,
      peso:             user.peso,
      cuello:           Number(form.cuello),
      cintura:          Number(form.cintura),
      abdomen:          Number(form.abdomen),
      cadera:           Number(form.cadera),
      hombros:          n('hombros'),
      pecho:            n('pecho'),
      bicep_der:        n('bicep_der'),
      bicep_izq:        n('bicep_izq'),
      antebrazo_der:    n('antebrazo_der'),
      antebrazo_izq:    n('antebrazo_izq'),
      muslo_der:        n('muslo_der'),
      muslo_izq:        n('muslo_izq'),
      pantorrilla_der:  n('pantorrilla_der'),
      pantorrilla_izq:  n('pantorrilla_izq'),
      muneca:           n('muneca'),
      tobillo:          n('tobillo'),
      anchura_hombros:  n('anchura_hombros'),
      anchura_cadera:   n('anchura_cadera'),
      altura_sentado:   n('altura_sentado'),
    }
  }, [form, user, edad])

  const resultado: ResultadoGrasa | null = useMemo(() => {
    if (!medidas) return null
    return calcularGrasaCorporal(medidas)
  }, [medidas])

  const colorCat = resultado ? colorCategoria(resultado.categoria) : COLOR.verde

  // Guardar medición en historial
  function handleGuardar() {
    if (!medidas || !resultado || !user) return
    saveMedidas(form)
    const entrada: EntradaHistorial = {
      fecha:        new Date().toISOString().split('T')[0],
      peso:         user.peso ?? 0,
      grasa:        resultado.porcentaje,
      confianza:    resultado.confianza,
      margenError:  resultado.margenError,
      categoria:    resultado.categoria,
      masaMuscular: resultado.masaMuscular,
      masaGrasa:    resultado.masaGrasa,
      cintura:      form.cintura ? Number(form.cintura) : undefined,
      medidas:      form,
    }
    saveHistorial(entrada, { ...form, peso: user.peso, altura: user.altura })
    setTab('cuerpo')
  }

  const oblFaltantes = ['cuello', 'cintura', 'abdomen', 'cadera'].filter(k => !form[k])
  const puedeCalcular = oblFaltantes.length === 0 && !!user?.sexo && !!user?.altura && !!user?.peso

  // Datos para gráficas de historial
  const histGrasa     = historialRaw.map(h => h.grasa)
  const histPeso      = historialRaw.map(h => h.peso)
  const histMuscular  = historialRaw.map(h => h.masaMuscular)
  const histMasaGrasa = historialRaw.map(h => h.masaGrasa)
  const histCintura   = historialRaw.map(h => h.cintura ?? 0).filter(v => v > 0)

  const diffGrasa = histGrasa.length >= 2
    ? +(histGrasa[histGrasa.length-1] - histGrasa[0]).toFixed(1)
    : null

  // ── Grupos de campos para el formulario ────────────────────
  const GRUPOS_FORM = [
    {
      titulo:    'Obligatorias',
      subtitulo: 'Necesarias para calcular el porcentaje de grasa',
      campos: [
        { key: 'cuello',  label: 'Cuello',                unit: 'cm', obligatorio: true },
        { key: 'cintura', label: 'Cintura',               unit: 'cm', obligatorio: true },
        { key: 'abdomen', label: 'Abdomen (al ombligo)',  unit: 'cm', obligatorio: true },
        { key: 'cadera',  label: 'Cadera',                unit: 'cm', obligatorio: true },
      ],
    },
    {
      titulo:    'Circunferencias primarias',
      subtitulo: 'Mejoran precisión del Modelo DORFIN',
      campos: [
        { key: 'hombros',    label: 'Hombros',         unit: 'cm' },
        { key: 'pecho',      label: 'Pecho',           unit: 'cm' },
        { key: 'bicep_der',  label: 'Bícep derecho',   unit: 'cm' },
        { key: 'bicep_izq',  label: 'Bícep izquierdo', unit: 'cm' },
      ],
    },
    {
      titulo:    'Circunferencias secundarias',
      subtitulo: 'Aumentan la confianza del resultado',
      campos: [
        { key: 'muslo_der',       label: 'Muslo derecho',        unit: 'cm' },
        { key: 'muslo_izq',       label: 'Muslo izquierdo',      unit: 'cm' },
        { key: 'pantorrilla_der', label: 'Pantorrilla derecha',  unit: 'cm' },
        { key: 'pantorrilla_izq', label: 'Pantorrilla izquierda',unit: 'cm' },
        { key: 'antebrazo_der',   label: 'Antebrazo derecho',    unit: 'cm' },
        { key: 'antebrazo_izq',   label: 'Antebrazo izquierdo',  unit: 'cm' },
      ],
    },
    {
      titulo:    'Estructura corporal (frame size)',
      subtitulo: 'Determina si tienes frame pequeño, mediano o grande',
      campos: [
        { key: 'muneca',           label: 'Muñeca',           unit: 'cm' },
        { key: 'tobillo',          label: 'Tobillo',          unit: 'cm' },
        { key: 'anchura_hombros',  label: 'Anchura de hombros (biacromial)', unit: 'cm' },
      ],
    },
    {
      titulo:    'Proporcionalidad avanzada',
      subtitulo: 'Para el análisis de distribución corporal',
      campos: [
        { key: 'anchura_cadera',  label: 'Anchura de cadera (biilíaca)', unit: 'cm' },
        { key: 'altura_sentado',  label: 'Altura sentado (vértice)',     unit: 'cm' },
      ],
    },
  ]

  return (
    <div className="min-h-dvh bg-dorfin-bg flex flex-col">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-none px-5 pt-14 pb-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, rgba(15,11,30,1) 0%, rgba(15,11,30,0) 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-dorfin-surface border border-dorfin-border flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-dorfin-muted" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-dorfin-text leading-none">CUERPO DE DORFIN</h1>
            <p className="text-dorfin-faint text-[10px] mt-0.5">Composición corporal estimada</p>
          </div>
        </div>
        <button onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-xl bg-dorfin-surface border border-dorfin-border flex items-center justify-center">
          <Info size={16} className="text-dorfin-muted" />
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex-none px-5 pb-3">
        <div className="flex gap-1 bg-dorfin-surface rounded-2xl p-1">
          {[
            { key: 'cuerpo',    label: 'Cuerpo',   icon: '🧬' },
            { key: 'medidas',   label: 'Medidas',  icon: '📏' },
            { key: 'historial', label: 'Historial',icon: '📊' },
            { key: 'metodos',   label: 'Métodos',  icon: '🔬' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[10px] font-semibold transition-all ${
                tab === t.key
                  ? 'bg-dorfin-card border border-dorfin-green/30 text-dorfin-green'
                  : 'text-dorfin-faint'
              }`}>
              <span className="text-sm mb-0.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido por tab ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ══ TAB: CUERPO ══════════════════════════════════ */}
        {tab === 'cuerpo' && (
          <div>
            {!resultado ? (
              /* Estado vacío */
              <div className="px-5 pt-8 text-center space-y-4">
                <img src="/dorfin-medidas.png" alt="" className="w-36 h-36 object-contain mx-auto opacity-60" />
                <p className="text-dorfin-text font-display text-2xl">SIN MEDIDAS AÚN</p>
                <p className="text-dorfin-faint text-sm max-w-xs mx-auto">
                  Ingresa cuello, cintura, abdomen y cadera para activar el análisis corporal.
                </p>
                <button onClick={() => setTab('medidas')} className="btn-primary px-8 mx-auto block">
                  Ingresar medidas
                </button>
              </div>
            ) : (
              <>
                {/* PERSONAJE — protagonismo absoluto */}
                <div className="relative px-4">
                  {/* Fondo de ambiente */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden"
                    style={{
                      background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(57,255,20,0.06) 0%, rgba(124,92,191,0.08) 50%, rgba(15,11,30,0) 100%)',
                    }} />

                  <CuerpoConAnotaciones form={form} />
                </div>

                {/* Stats strip debajo del personaje */}
                <div className="px-4 mt-3 grid grid-cols-2 gap-2">

                  {/* Grasa corporal — card principal */}
                  <div className="col-span-2 rounded-2xl border p-4"
                    style={{
                      background: `linear-gradient(135deg, ${colorCat}12 0%, rgba(26,21,48,0.9) 100%)`,
                      borderColor: `${colorCat}40`,
                    }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Grasa corporal</p>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-display text-5xl leading-none" style={{ color: colorCat }}>
                            {resultado.porcentaje}
                          </span>
                          <span className="text-xl font-display" style={{ color: colorCat }}>%</span>
                        </div>
                        <p className="text-dorfin-faint text-[10px] mt-1">± {resultado.margenError}% margen de error</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 mt-1">
                        <ConfianzaBadge valor={resultado.confianza} />
                        <div className="text-right">
                          <p className="font-display text-lg leading-none" style={{ color: colorCat }}>
                            {resultado.categoria}
                          </p>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorCat }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Masa muscular */}
                  <div className="card p-3">
                    <p className="text-dorfin-muted text-[10px] uppercase tracking-wide">Masa muscular</p>
                    <p className="font-display text-2xl text-dorfin-green mt-0.5">{resultado.masaMuscular}<span className="text-sm"> kg</span></p>
                    <p className="text-dorfin-faint text-[9px] mt-0.5">Estimado</p>
                  </div>

                  {/* Masa grasa */}
                  <div className="card p-3">
                    <p className="text-dorfin-muted text-[10px] uppercase tracking-wide">Masa grasa</p>
                    <p className="font-display text-2xl text-orange-400 mt-0.5">{resultado.masaGrasa}<span className="text-sm"> kg</span></p>
                    <p className="text-dorfin-faint text-[9px] mt-0.5">Estimado</p>
                  </div>
                </div>

                {/* Descripción de categoría */}
                <div className="px-4 mt-2">
                  <div className="card p-4">
                    <p className="text-dorfin-faint text-xs leading-relaxed">{resultado.descripcion}</p>
                  </div>
                </div>

                {/* Medidas principales rápidas */}
                <div className="px-4 mt-2">
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Ruler size={13} className="text-dorfin-muted" />
                        <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Medidas principales</p>
                      </div>
                      <button onClick={() => setTab('medidas')}
                        className="text-dorfin-green text-[10px] flex items-center gap-1">
                        Actualizar <ChevronRight size={10} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {[
                        { k: 'cuello',  l: 'Cuello',  u: 'cm' },
                        { k: 'cintura', l: 'Cintura', u: 'cm' },
                        { k: 'abdomen', l: 'Abdomen', u: 'cm' },
                        { k: 'cadera',  l: 'Cadera',  u: 'cm' },
                        { k: '__peso',  l: 'Peso',    u: 'kg',   v: user?.peso },
                        { k: '__alt',   l: 'Altura',  u: 'm',    v: user?.altura ? (user.altura/100).toFixed(2) : '—' },
                        { k: '__edad',  l: 'Edad',    u: 'años', v: edad },
                        { k: '__sexo',  l: 'Sexo',    u: '',     v: user?.sexo ? user.sexo.charAt(0).toUpperCase() + user.sexo.slice(1) : '—' },
                      ].map(item => (
                        <div key={item.k} className="flex items-center justify-between border-b border-dorfin-border/20 pb-1.5">
                          <span className="text-dorfin-faint text-[10px]">{item.l}</span>
                          <span className="text-dorfin-text text-[10px] font-semibold">
                            {item.v ?? (form[item.k] ?? '—')} {item.u}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA guardar */}
                <div className="px-4 mt-3">
                  <button onClick={handleGuardar}
                    className="w-full btn-primary flex items-center justify-center gap-2">
                    <Check size={16} /> Guardar medición al historial
                  </button>
                </div>

                {/* Mini evolución si hay historial */}
                {histGrasa.length >= 2 && (
                  <div className="px-4 mt-3">
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={13} className="text-dorfin-green" />
                          <span className="text-dorfin-text text-xs font-semibold">Evolución de grasa</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-base font-bold ${diffGrasa! < 0 ? 'text-dorfin-green' : diffGrasa! > 0 ? 'text-red-400' : 'text-dorfin-faint'}`}>
                            {diffGrasa! > 0 ? '+' : ''}{diffGrasa}% {diffGrasa! < 0 ? '↓' : diffGrasa! > 0 ? '↑' : ''}
                          </span>
                          <p className="text-dorfin-faint text-[9px]">Desde el inicio</p>
                        </div>
                      </div>
                      <MiniChart datos={histGrasa} color={COLOR.verde} height={48} />
                      <button onClick={() => setTab('historial')}
                        className="mt-2 w-full text-center text-dorfin-green text-[10px] flex items-center justify-center gap-1">
                        Ver historial completo <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ TAB: MEDIDAS ═════════════════════════════════ */}
        {tab === 'medidas' && (
          <div className="px-5 space-y-4" ref={formRef}>
            {/* Datos de perfil (solo lectura) */}
            <div className="card p-4 border-dorfin-purple/30 bg-dorfin-purple/5">
              <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-2">Datos del perfil</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { l: 'Sexo',   v: user?.sexo ? user.sexo.charAt(0).toUpperCase() + user.sexo.slice(1) : '⚠ No definido', warn: !user?.sexo },
                  { l: 'Edad',   v: `${edad} años` },
                  { l: 'Altura', v: user?.altura ? `${user.altura} cm` : '⚠ No definida', warn: !user?.altura },
                  { l: 'Peso',   v: user?.peso   ? `${user.peso} kg`  : '⚠ No definido', warn: !user?.peso   },
                ].map(item => (
                  <div key={item.l} className="flex justify-between">
                    <span className="text-dorfin-faint">{item.l}</span>
                    <span className={`font-medium ${item.warn ? 'text-orange-400' : 'text-dorfin-text'}`}>{item.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview en tiempo real */}
            {resultado && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-4 border-dorfin-green/30 bg-dorfin-green/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-1">Vista previa</p>
                    <p className="font-display text-3xl text-dorfin-green">{resultado.porcentaje}<span className="text-lg">%</span></p>
                    <p className="text-dorfin-faint text-[9px]">grasa corporal estimada</p>
                  </div>
                  <div className="text-right space-y-1">
                    <ConfianzaBadge valor={resultado.confianza} />
                    <p className="text-dorfin-faint text-[9px]">± {resultado.margenError}%</p>
                    <p className="text-[10px] font-semibold" style={{ color: colorCategoria(resultado.categoria) }}>
                      {resultado.categoria}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grupos de campos */}
            {GRUPOS_FORM.map(grupo => (
              <div key={grupo.titulo}>
                <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">{grupo.titulo}</p>
                <p className="text-dorfin-faint text-[10px] mb-2 mt-0.5">{grupo.subtitulo}</p>
                <div className="space-y-2">
                  {grupo.campos.map(campo => {
                    const tieneValor = !!form[campo.key]
                    return (
                      <div key={campo.key} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                        tieneValor ? 'border-dorfin-green/30 bg-dorfin-green/5' : 'border-dorfin-border bg-dorfin-surface/30'
                      }`}>
                        <span className="flex-1 text-dorfin-text text-sm">{campo.label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="—"
                            value={form[campo.key] ?? ''}
                            onChange={e => setForm({ ...form, [campo.key]: e.target.value })}
                            className="w-18 bg-dorfin-surface border border-dorfin-border rounded-xl text-center text-dorfin-text text-sm py-2 px-2 outline-none focus:border-dorfin-green transition-colors"
                            style={{ width: 72 }}
                          />
                          <span className="text-dorfin-faint text-xs w-5">{campo.unit}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {oblFaltantes.length > 0 && (
              <p className="text-orange-400 text-xs text-center">
                Faltan obligatorias: {oblFaltantes.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}
              </p>
            )}

            <button
              onClick={handleGuardar}
              disabled={!puedeCalcular}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              <Check size={18} /> Guardar y registrar
            </button>
          </div>
        )}

        {/* ══ TAB: HISTORIAL ═══════════════════════════════ */}
        {tab === 'historial' && (
          <div className="px-5 space-y-4">
            {historialRaw.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-4xl">📊</p>
                <p className="text-dorfin-text font-display text-xl">SIN HISTORIAL</p>
                <p className="text-dorfin-faint text-sm">Guarda tu primera medición para ver la evolución</p>
                <button onClick={() => setTab('medidas')} className="btn-primary mt-2">Ingresar medidas</button>
              </div>
            ) : (
              <>
                {/* Gráficas de evolución */}
                <div className="grid grid-cols-1 gap-3">
                  {/* % Grasa */}
                  {histGrasa.length >= 2 && (
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BarChart2 size={13} className="text-dorfin-green" />
                          <p className="text-dorfin-text text-xs font-semibold">Grasa corporal %</p>
                        </div>
                        {diffGrasa !== null && (
                          <span className={`text-sm font-bold ${diffGrasa < 0 ? 'text-dorfin-green' : 'text-red-400'}`}>
                            {diffGrasa > 0 ? '+' : ''}{diffGrasa}% {diffGrasa < 0 ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                      <MiniChart datos={histGrasa} color={COLOR.verde} height={56} />
                    </div>
                  )}

                  {/* Peso */}
                  {histPeso.length >= 2 && (
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-dorfin-text text-xs font-semibold">Peso corporal (kg)</p>
                        <span className="text-dorfin-muted text-[10px]">
                          {histPeso[histPeso.length-1]} kg actual
                        </span>
                      </div>
                      <MiniChart datos={histPeso} color={COLOR.azul} height={48} />
                    </div>
                  )}

                  {/* Masa muscular vs masa grasa */}
                  {histMuscular.length >= 2 && (
                    <div className="card p-4">
                      <p className="text-dorfin-text text-xs font-semibold mb-3">Composición corporal (kg)</p>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-dorfin-green" />
                        <span className="text-dorfin-faint text-[10px]">Masa muscular</span>
                      </div>
                      <MiniChart datos={histMuscular} color={COLOR.verde} height={40} />
                      <div className="flex items-center gap-2 mb-1 mt-3">
                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                        <span className="text-dorfin-faint text-[10px]">Masa grasa</span>
                      </div>
                      <MiniChart datos={histMasaGrasa} color={COLOR.naranja} height={40} />
                    </div>
                  )}

                  {/* Cintura */}
                  {histCintura.length >= 2 && (
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-dorfin-text text-xs font-semibold">Cintura (cm)</p>
                        <span className="text-dorfin-muted text-[10px]">
                          {(histCintura[histCintura.length-1] - histCintura[0] < 0 ? '↓' : '↑')}{' '}
                          {Math.abs(+(histCintura[histCintura.length-1] - histCintura[0]).toFixed(1))} cm total
                        </span>
                      </div>
                      <MiniChart datos={histCintura} color={COLOR.purpura} height={48} />
                    </div>
                  )}
                </div>

                {/* Lista de entradas */}
                <div className="space-y-2">
                  <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Registros</p>
                  {[...historialRaw].reverse().map((h, i) => {
                    const prev = [...historialRaw].reverse()[i + 1]
                    const diff = prev ? +(h.grasa - prev.grasa).toFixed(1) : null
                    const colCat = colorCategoria(h.categoria)
                    return (
                      <div key={i} className="card p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-dorfin-muted text-[10px]">{h.fecha}</p>
                            <p className="font-display text-3xl mt-0.5" style={{ color: colCat }}>
                              {h.grasa}<span className="text-base">%</span>
                            </p>
                            <p className="text-dorfin-faint text-[10px]">{h.categoria}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {i === 0 && (
                              <span className="text-[9px] bg-dorfin-green/10 text-dorfin-green border border-dorfin-green/20 rounded-full px-2 py-0.5">Último</span>
                            )}
                            {diff !== null && diff !== 0 && (
                              <span className={`text-sm font-bold ${diff < 0 ? 'text-dorfin-green' : 'text-red-400'}`}>
                                {diff > 0 ? '+' : ''}{diff}%
                              </span>
                            )}
                            <ConfianzaBadge valor={h.confianza} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dorfin-border/30">
                          <div className="text-center">
                            <p className="text-dorfin-faint text-[9px]">Peso</p>
                            <p className="text-dorfin-text text-xs font-semibold">{h.peso} kg</p>
                          </div>
                          <div className="text-center">
                            <p className="text-dorfin-faint text-[9px]">Muscular</p>
                            <p className="text-dorfin-green text-xs font-semibold">{h.masaMuscular} kg</p>
                          </div>
                          <div className="text-center">
                            <p className="text-dorfin-faint text-[9px]">Grasa</p>
                            <p className="text-orange-400 text-xs font-semibold">{h.masaGrasa} kg</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ TAB: MÉTODOS ════════════════════════════════ */}
        {tab === 'metodos' && (
          <div className="px-5 space-y-4">
            {!resultado ? (
              <div className="text-center py-12">
                <p className="text-dorfin-faint text-sm">Ingresa medidas para ver los métodos activos</p>
              </div>
            ) : (
              <>
                {/* Resultado actual */}
                <div className="card p-4 border-dorfin-green/30">
                  <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-1">Resultado ponderado</p>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-4xl text-dorfin-green">{resultado.porcentaje}<span className="text-lg">%</span></p>
                    <div className="text-right">
                      <ConfianzaBadge valor={resultado.confianza} />
                      <p className="text-dorfin-faint text-[9px] mt-1">± {resultado.margenError}% margen</p>
                    </div>
                  </div>
                </div>

                {/* Métodos individuales */}
                <div className="card p-4">
                  <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-3">Métodos activos ({resultado.metodos.length}/5)</p>
                  <MetodosPanel metodos={resultado.metodos} porcentaje={resultado.porcentaje} />
                </div>

                {/* Qué aporta cada medida */}
                <div className="card p-4">
                  <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-3">Cómo se construye la confianza</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Base (sexo, edad, altura, peso)',   max: 22, actual: (user?.sexo?8:0)+(edad>0?4:0)+(user?.altura?4:0)+(user?.peso?6:0) },
                      { label: 'Cuello + cintura + abdomen',        max: 18, actual: (form.cuello?8:0)+(form.cintura?5:0)+(form.abdomen?5:0) },
                      { label: 'Cadera + hombros + pecho + bíceps', max: 25, actual: (form.cadera?8:0)+(form.hombros?6:0)+(form.pecho?5:0)+((form.bicep_der||form.bicep_izq)?(form.bicep_der&&form.bicep_izq?6:3):0) },
                      { label: 'Muslos + pantorrillas + antebrazo', max: 20, actual: ((form.muslo_der||form.muslo_izq)?(form.muslo_der&&form.muslo_izq?6:3):0)+((form.pantorrilla_der||form.pantorrilla_izq)?(form.pantorrilla_der&&form.pantorrilla_izq?5:2):0)+((form.antebrazo_der||form.antebrazo_izq)?(form.antebrazo_der&&form.antebrazo_izq?4:2):0)+(form.anchura_cadera?5:0) },
                      { label: 'Muñeca + tobillo + anchura hombros',max: 23, actual: (form.muneca&&form.tobillo?15:form.muneca||form.tobillo?7:0)+(form.anchura_hombros?8:0) },
                      { label: 'Altura sentado',                    max: 6,  actual: form.altura_sentado?6:0 },
                    ].map(item => {
                      const pct = Math.min(100, (item.actual / item.max) * 100)
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-dorfin-faint text-[10px]">{item.label}</span>
                            <span className="text-dorfin-text text-[10px] font-semibold">{item.actual}/{item.max}</span>
                          </div>
                          <div className="h-1.5 bg-dorfin-surface rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: pct >= 80 ? COLOR.verde : pct >= 50 ? COLOR.amarillo : COLOR.naranja }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Nota filosófica */}
                <div className="card p-4 border-dorfin-purple/20 bg-dorfin-purple/5">
                  <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-2">Sobre la precisión</p>
                  <p className="text-dorfin-faint text-xs leading-relaxed">
                    DORFIN combina <span className="text-dorfin-text">5 modelos antropométricos</span> con pesos diferenciados.
                    No usa IA ni fotografías. El resultado es una estimación honesta.
                    La utilidad está en el <span className="text-dorfin-text">seguimiento del progreso</span>, no en la cifra exacta.
                    Para medición precisa, consulta DEXA o hidrostática.
                  </p>
                  <div className="mt-3 space-y-1">
                    {[
                      { n: 'US Navy (DoD, 1986)',              w: 3.0, desc: 'Mayor precisión general' },
                      { n: 'YMCA (Golding, 1989)',             w: 2.0, desc: 'Rápido, solo cintura y peso' },
                      { n: 'WHtR — Lean et al. (1996)',        w: 1.5, desc: 'Predictor de riesgo central' },
                      { n: 'IMC — Gallagher et al. (2000)',    w: 1.5, desc: 'Con corrección latinoamericana' },
                      { n: 'Modelo DORFIN v2',                  w: 1.5, desc: 'Ajuste por composición muscular' },
                    ].map(m => (
                      <div key={m.n} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-dorfin-green mt-1.5 flex-none" />
                        <div>
                          <span className="text-dorfin-text text-[10px] font-medium">{m.n}</span>
                          <span className="text-dorfin-faint text-[9px] block">{m.desc} · peso ×{m.w}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modal info ─────────────────────────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setShowInfo(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-dorfin-text font-display text-2xl">¿CÓMO FUNCIONA?</h2>
                <button onClick={() => setShowInfo(false)}><X size={20} className="text-dorfin-muted" /></button>
              </div>
              <p className="text-dorfin-muted text-sm leading-relaxed">
                DORFIN combina <span className="text-dorfin-text font-medium">5 modelos antropométricos</span> validados bibliográficamente.
                El usuario ingresa todo en cm y kg. Las conversiones de unidades son automáticas e internas.
              </p>
              <p className="text-dorfin-faint text-xs leading-relaxed mt-3">
                La confianza sube progresivamente con cada nueva medida que ingresas.
                Con los 4 datos básicos empiezas en ~40%. Con todas las medidas llegas hasta 100%.
              </p>
              <button onClick={() => { setShowInfo(false); setTab('metodos') }}
                className="mt-4 w-full flex items-center justify-center gap-2 text-dorfin-green text-sm font-medium">
                Ver métodos detallados <ChevronRight size={14} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}