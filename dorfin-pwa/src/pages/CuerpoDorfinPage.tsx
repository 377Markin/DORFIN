// ═══════════════════════════════════════════════════════════════
// CUERPO DE DORFIN — Rediseño completo
// Concepto: DORFIN como protagonista absoluto
// Medidas: solo visibles en hover/tap, nunca permanentes
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, TrendingUp, ChevronRight, Info,
  ArrowLeft, BarChart2, Ruler, Activity
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { calcularGrasaCorporal, type MedidasCorporales, type ResultadoGrasa } from '@/lib/bodyfat'
import type { EntradaHistorial, User } from '@/types'
import { useGrasaCorporal } from '@/lib/hooks'

// ── Paleta ────────────────────────────────────────────────────
const C = {
  verde:    '#39FF14',
  purpura:  '#a78bfa',
  naranja:  '#fb923c',
  azul:     '#60a5fa',
  teal:     '#34d399',
  amarillo: '#fbbf24',
  rosa:     '#f472b6',
}

// ── Zonas anatómicas interactivas ────────────────────────────
// Cada zona define:
//   key        → clave en el formulario
//   label      → nombre para mostrar
//   color      → color del highlight
//   hotspot    → área clickable sobre el PNG (% del contenedor)
//   glowPos    → posición del glow de iluminación (% del contenedor)
//   tooltip    → posición del tooltip
// ── Hotspots calibrados desde píxeles reales del PNG 1024×1536 ──
// PNG: ratio 2:3 — contenido entre y=23% y y=78% (cabeza+llama arriba, pies abajo)
// Sistema de coordenadas: % del contenedor (object-contain fits-by-height en desktop,
// fits-by-width solo en móviles muy anchos — en la práctica siempre fits-by-height)
// Coordenadas calculadas con análisis de canal alpha pixel a pixel.
//
// CONVENCIÓN anatómica (DORFIN de frente al usuario):
//   _der = brazo/pierna DERECHA de DORFIN = lado IZQUIERDO visual de la imagen (x < 50%)
//   _izq = brazo/pierna IZQUIERDA de DORFIN = lado DERECHO visual de la imagen (x > 50%)
const ZONAS: {
  key: string
  label: string
  color: string
  hotspot: { l: number; t: number; w: number; h: number }
  glow: { cx: number; cy: number; rx: number; ry: number }
  tooltipSide: 'left' | 'right' | 'top'
}[] = [
  { key: 'cuello',
    label: 'Cuello',       color: C.verde,
    hotspot: { l:37, t:31, w:26, h:6  }, glow: { cx:50,   cy:34,   rx:13,  ry:3.5 }, tooltipSide:'top'   },
  { key: 'hombros',
    label: 'Hombros',      color: C.purpura,
    hotspot: { l:20, t:35, w:60, h:6  }, glow: { cx:50,   cy:38,   rx:30,  ry:3.5 }, tooltipSide:'top'   },
  { key: 'pecho',
    label: 'Pecho',        color: C.purpura,
    hotspot: { l:30, t:39, w:40, h:8  }, glow: { cx:50,   cy:42.5, rx:20,  ry:4.5 }, tooltipSide:'right' },
  { key: 'cintura',
    label: 'Cintura',      color: C.verde,
    hotspot: { l:36, t:43, w:28, h:7  }, glow: { cx:50,   cy:46.5, rx:14,  ry:3.5 }, tooltipSide:'right' },
  { key: 'abdomen',
    label: 'Abdomen',      color: C.verde,
    hotspot: { l:37, t:48, w:26, h:8  }, glow: { cx:49.5, cy:52,   rx:13,  ry:4   }, tooltipSide:'left'  },
  { key: 'cadera',
    label: 'Cadera',       color: C.purpura,
    hotspot: { l:37, t:54, w:26, h:9  }, glow: { cx:50,   cy:58.5, rx:13,  ry:5   }, tooltipSide:'right' },
  // bícep_der = brazo DERECHO de DORFIN = lado izquierdo visual (x < 50%)
  { key: 'bicep_der',
    label: 'Bícep Der.',   color: C.naranja,
    hotspot: { l:10, t:37, w:20, h:10 }, glow: { cx:20,   cy:41,   rx:10,  ry:5   }, tooltipSide:'left'  },
  // bícep_izq = brazo IZQUIERDO de DORFIN = lado derecho visual (x > 50%)
  { key: 'bicep_izq',
    label: 'Bícep Izq.',   color: C.naranja,
    hotspot: { l:70, t:37, w:20, h:10 }, glow: { cx:80,   cy:41,   rx:10,  ry:5   }, tooltipSide:'right' },
  // muslo_der = pierna DERECHA de DORFIN = lado izquierdo visual
  { key: 'muslo_der',
    label: 'Muslo Der.',   color: C.azul,
    hotspot: { l:33, t:62, w:13, h:10 }, glow: { cx:39.5, cy:67,   rx:7,   ry:5   }, tooltipSide:'left'  },
  // muslo_izq = pierna IZQUIERDA de DORFIN = lado derecho visual
  { key: 'muslo_izq',
    label: 'Muslo Izq.',   color: C.azul,
    hotspot: { l:54, t:62, w:13, h:10 }, glow: { cx:60.5, cy:67,   rx:7,   ry:5   }, tooltipSide:'right' },
  { key: 'pantorrilla_der',
    label: 'Pant. Der.',   color: C.teal,
    hotspot: { l:33, t:70, w:11, h:8  }, glow: { cx:38.5, cy:74,   rx:6,   ry:4   }, tooltipSide:'left'  },
  { key: 'pantorrilla_izq',
    label: 'Pant. Izq.',   color: C.teal,
    hotspot: { l:56, t:70, w:11, h:8  }, glow: { cx:61.5, cy:74,   rx:6,   ry:4   }, tooltipSide:'right' },
  { key: 'muneca',
    label: 'Muñeca',       color: C.amarillo,
    hotspot: { l:7,  t:44, w:9,  h:6  }, glow: { cx:11,   cy:47,   rx:5,   ry:3   }, tooltipSide:'left'  },
  { key: 'tobillo',
    label: 'Tobillo',      color: C.rosa,
    hotspot: { l:33, t:73, w:10, h:5  }, glow: { cx:38,   cy:75,   rx:5,   ry:2.5 }, tooltipSide:'left'  },
]

// ── Helpers ───────────────────────────────────────────────────
function colorCat(cat: string): string {
  if (cat.includes('élite') || cat.includes('Atlét')) return C.verde
  if (cat.includes('forma'))    return '#86efac'
  if (cat.includes('Promedio')) return C.amarillo
  if (cat.includes('Sobrepeso')) return C.naranja
  return '#f87171'
}

function ConfianzaBadge({ valor }: { valor: number }) {
  const c = valor >= 80 ? C.verde : valor >= 60 ? C.amarillo : C.naranja
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: c, borderColor: c, backgroundColor: `${c}18` }}>
      {valor}%
    </span>
  )
}

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
            <div className="relative h-1.5 bg-dorfin-surface rounded-full overflow-hidden">
              <div className="absolute top-0 h-full rounded-full"
                style={{ left: '0%', width: `${pos + 5}%`, background: esResultado ? C.verde : '#4A4468', opacity: esResultado ? 1 : 0.5 }} />
            </div>
          </div>
        )
      })}
      {metodos.length > 1 && (
        <p className="text-dorfin-faint text-[9px] mt-1">Dispersión: {(max - min).toFixed(1)}% entre métodos</p>
      )}
    </div>
  )
}

function MiniChart({ datos, color = C.verde, height = 48 }: { datos: number[]; color?: string; height?: number }) {
  if (datos.length < 2) return (
    <div className="flex items-center justify-center h-12 text-dorfin-faint text-xs">Sin datos suficientes</div>
  )
  const w = 260; const h = height
  const min = Math.min(...datos); const max = Math.max(...datos); const rango = max - min || 1
  const pts = datos.map((v, i) => ({
    x: (i / (datos.length - 1)) * w,
    y: h - ((v - min) / rango) * h * 0.8 - h * 0.1,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const gradId = `grad-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${pts[pts.length - 1].x} ${h} L 0 ${h} Z`} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
    </svg>
  )
}

// ── AvatarInteractivo ─────────────────────────────────────────
// DORFIN sin etiquetas permanentes.
// Hotspots invisibles encima de la imagen.
// Al hover/tap: glow en la zona + tooltip flotante.
function AvatarInteractivo({
  form,
  activeKey,
  onHover,
  onLeave,
  onTap,
}: {
  form: Record<string, string>
  activeKey: string | null
  onHover: (key: string) => void
  onLeave: () => void
  onTap: (key: string) => void
}) {
  const zonaActiva = activeKey ? ZONAS.find(z => z.key === activeKey) : null
  const valActivo  = activeKey ? form[activeKey] : null

  return (
    <div className="relative w-full h-full select-none">

      {/* Fondo premium — glow ambiental */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 55% 65% at 50% 45%, rgba(57,255,20,0.06) 0%, rgba(124,92,191,0.07) 55%, transparent 100%)',
      }} />

      {/* Glow de zona activa */}
      <AnimatePresence>
        {zonaActiva && (
          <motion.div
            key={zonaActiva.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse ${zonaActiva.glow.rx * 2}% ${zonaActiva.glow.ry * 2}% at ${zonaActiva.glow.cx}% ${zonaActiva.glow.cy}%, ${zonaActiva.color}30 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Personaje PNG — protagonista absoluto */}
      <img
        src="/dorfin-cuerpo.png"
        alt="DORFIN"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{
          filter: zonaActiva
            ? `drop-shadow(0 0 28px ${zonaActiva.color}55) drop-shadow(0 0 8px ${zonaActiva.color}33)`
            : 'drop-shadow(0 0 20px rgba(57,255,20,0.20)) drop-shadow(0 0 6px rgba(57,255,20,0.10))',
          transition: 'filter 0.2s ease',
        }}
      />

      {/* Hotspots invisibles — áreas interactivas */}
      {ZONAS.map(zona => {
        const tieneValor = !!form[zona.key]
        if (!tieneValor) return null
        return (
          <div
            key={zona.key}
            className="absolute cursor-pointer"
            style={{
              left:   `${zona.hotspot.l}%`,
              top:    `${zona.hotspot.t}%`,
              width:  `${zona.hotspot.w}%`,
              height: `${zona.hotspot.h}%`,
            }}
            onMouseEnter={() => onHover(zona.key)}
            onMouseLeave={onLeave}
            onClick={() => onTap(zona.key)}
            onTouchStart={(e) => { e.preventDefault(); onTap(zona.key) }}
          />
        )
      })}

      {/* Tooltip flotante — solo la medida activa */}
      <AnimatePresence>
        {zonaActiva && valActivo && (
          <motion.div
            key={`tooltip-${zonaActiva.key}`}
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-20 pointer-events-none"
            style={{
              left: zonaActiva.tooltipSide === 'left'
                ? `${zonaActiva.hotspot.l - 2}%`
                : zonaActiva.tooltipSide === 'right'
                ? `${zonaActiva.hotspot.l + zonaActiva.hotspot.w + 2}%`
                : `${zonaActiva.hotspot.l + zonaActiva.hotspot.w / 2}%`,
              top: zonaActiva.tooltipSide === 'top'
                ? `${zonaActiva.hotspot.t - 8}%`
                : `${zonaActiva.hotspot.t + zonaActiva.hotspot.h / 2}%`,
              transform: zonaActiva.tooltipSide === 'left'
                ? 'translateX(-100%) translateY(-50%)'
                : zonaActiva.tooltipSide === 'right'
                ? 'translateY(-50%)'
                : 'translateX(-50%) translateY(-100%)',
            }}
          >
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap backdrop-blur-sm"
              style={{
                background: `${zonaActiva.color}18`,
                border: `1px solid ${zonaActiva.color}60`,
                color: zonaActiva.color,
                boxShadow: `0 4px 16px ${zonaActiva.color}20`,
              }}
            >
              <span className="opacity-70 font-normal">{zonaActiva.label} </span>
              {valActivo} cm
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador sutil en esquina: "toca para ver medidas" — solo si hay medidas */}
      {Object.keys(form).some(k => ZONAS.some(z => z.key === k && form[k])) && !activeKey && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-dorfin-faint font-mono opacity-50 tracking-wide">
            toca el cuerpo para ver medidas
          </span>
        </div>
      )}
    </div>
  )
}

// ── Panel de métricas derecho ─────────────────────────────────
function MetricasPanel({
  resultado, catColor, user, edad, form, histGrasa, diffGrasa,
  onGuardar, onVerHistorial, onActualizarMedidas, activeKey, onHoverMedida, onLeaveMedida,
}: {
  resultado: ResultadoGrasa
  catColor: string
  user: User | null
  edad: number
  form: Record<string, string>
  histGrasa: number[]
  diffGrasa: number | null
  onGuardar: () => void
  onVerHistorial: () => void
  onActualizarMedidas: () => void
  activeKey: string | null
  onHoverMedida: (key: string) => void
  onLeaveMedida: () => void
}) {
  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto px-5 py-4 pb-8"
      style={{ WebkitOverflowScrolling: 'touch' }}>

      {/* Card principal — Grasa corporal */}
      <div className="rounded-2xl border p-4 flex-none"
        style={{
          background: `linear-gradient(135deg, ${catColor}0e 0%, rgba(26,21,48,0.98) 100%)`,
          borderColor: `${catColor}35`,
        }}>
        <div className="flex items-start justify-between mb-1">
          <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Grasa corporal</p>
          <div className="flex items-center gap-1.5">
            <span className="text-dorfin-faint text-[10px]">Confianza</span>
            <ConfianzaBadge valor={resultado.confianza} />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-display leading-none"
              style={{ fontSize: 'clamp(3.5rem, 7vw, 5rem)', color: catColor, lineHeight: 1 }}>
              {resultado.porcentaje}
            </span>
            <span className="font-display text-2xl" style={{ color: catColor }}>%</span>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl leading-none" style={{ color: catColor }}>
              {resultado.categoria.toUpperCase()}
            </p>
            <p className="text-dorfin-faint text-[10px] mt-1">± {resultado.margenError}% margen</p>
          </div>
        </div>
        {resultado.descripcion && (
          <p className="text-dorfin-faint text-[11px] leading-relaxed mt-3 pt-3 border-t border-dorfin-border/20">
            {resultado.descripcion}
          </p>
        )}
      </div>

      {/* Masa muscular + masa grasa */}
      <div className="grid grid-cols-2 gap-2 flex-none">
        <div className="card p-3">
          <p className="text-dorfin-muted text-[10px] uppercase tracking-wide mb-1">Masa muscular</p>
          <p className="font-display text-2xl text-dorfin-green">
            {resultado.masaMuscular}<span className="text-sm font-body"> kg</span>
          </p>
          <p className="text-dorfin-faint text-[9px] mt-0.5">Estimada</p>
        </div>
        <div className="card p-3">
          <p className="text-dorfin-muted text-[10px] uppercase tracking-wide mb-1">Masa grasa</p>
          <p className="font-display text-2xl text-orange-400">
            {resultado.masaGrasa}<span className="text-sm font-body"> kg</span>
          </p>
          <p className="text-dorfin-faint text-[9px] mt-0.5">Estimada</p>
        </div>
      </div>

      {/* Medidas interactivas — lista que sincroniza con el avatar */}
      <div className="card p-3 flex-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-dorfin-muted" />
            <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Medidas</p>
          </div>
          <button onClick={onActualizarMedidas}
            className="text-dorfin-green text-[10px] flex items-center gap-0.5">
            Editar <ChevronRight size={10} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {ZONAS.filter(z => form[z.key]).map(zona => (
            <button
              key={zona.key}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all"
              style={{
                background: activeKey === zona.key ? `${zona.color}12` : 'transparent',
                border: `1px solid ${activeKey === zona.key ? zona.color + '40' : 'transparent'}`,
              }}
              onMouseEnter={() => onHoverMedida(zona.key)}
              onMouseLeave={onLeaveMedida}
              onClick={() => onHoverMedida(activeKey === zona.key ? '' : zona.key)}
            >
              <span className="text-[10px]"
                style={{ color: activeKey === zona.key ? zona.color : '#8B84A8' }}>
                {zona.label}
              </span>
              <span className="text-[10px] font-semibold"
                style={{ color: activeKey === zona.key ? zona.color : '#F0EEF8' }}>
                {form[zona.key]} cm
              </span>
            </button>
          ))}
          {/* Datos de perfil inline */}
          {[
            { l: 'Peso', v: user?.peso ? `${user.peso} kg` : '—' },
            { l: 'Altura', v: user?.altura ? `${(user.altura / 100).toFixed(2)} m` : '—' },
          ].map(item => (
            <div key={item.l}
              className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[10px] text-dorfin-faint">{item.l}</span>
              <span className="text-[10px] font-semibold text-dorfin-text">{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botón guardar */}
      <button onClick={onGuardar}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 flex-none">
        <Check size={16} /> Guardar medición
      </button>

      {/* Mini chart evolución */}
      {histGrasa.length >= 2 && (
        <div className="card p-3 flex-none">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-dorfin-green" />
              <span className="text-dorfin-text text-xs font-semibold">Evolución</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${diffGrasa! < 0 ? 'text-dorfin-green' : diffGrasa! > 0 ? 'text-red-400' : 'text-dorfin-faint'}`}>
                {diffGrasa! > 0 ? '+' : ''}{diffGrasa}% {diffGrasa! < 0 ? '↓' : diffGrasa! > 0 ? '↑' : ''}
              </span>
              <button onClick={onVerHistorial}
                className="text-dorfin-green text-[10px] flex items-center gap-0.5">
                Ver todo <ChevronRight size={10} />
              </button>
            </div>
          </div>
          <MiniChart datos={histGrasa} color={C.verde} height={40} />
        </div>
      )}
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

  const [tab, setTab]         = useState<'cuerpo' | 'medidas' | 'historial' | 'metodos'>('cuerpo')
  const [showInfo, setShowInfo] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    if (medidasMeso) Object.entries(medidasMeso).forEach(([k, v]) => { base[k] = String(v) })
    const local = getMedidas()
    if (local) Object.entries(local).forEach(([k, v]) => {
      if (k !== 'fecha' && k !== '_guardado') base[k] = String(v)
    })
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

  const medidas: MedidasCorporales | null = useMemo(() => {
    if (!user?.sexo || !user?.altura || !user?.peso) return null
    if (!form.cuello || !form.cintura || !form.abdomen || !form.cadera) return null
    const n = (k: string) => form[k] ? Number(form[k]) : undefined
    return {
      sexo: user.sexo as 'hombre' | 'mujer', edad,
      altura: user.altura, peso: user.peso,
      cuello: Number(form.cuello), cintura: Number(form.cintura),
      abdomen: Number(form.abdomen), cadera: Number(form.cadera),
      hombros: n('hombros'), pecho: n('pecho'),
      bicep_der: n('bicep_der'), bicep_izq: n('bicep_izq'),
      antebrazo_der: n('antebrazo_der'), antebrazo_izq: n('antebrazo_izq'),
      muslo_der: n('muslo_der'), muslo_izq: n('muslo_izq'),
      pantorrilla_der: n('pantorrilla_der'), pantorrilla_izq: n('pantorrilla_izq'),
      muneca: n('muneca'), tobillo: n('tobillo'),
      anchura_hombros: n('anchura_hombros'), anchura_cadera: n('anchura_cadera'),
      altura_sentado: n('altura_sentado'),
    }
  }, [form, user, edad])

  const resultado: ResultadoGrasa | null = useMemo(() => {
    if (!medidas) return null
    return calcularGrasaCorporal(medidas)
  }, [medidas])

  const catColor = resultado ? colorCat(resultado.categoria) : C.verde

  // Hover handlers con debounce al salir
  const handleHover = useCallback((key: string) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setActiveKey(key)
  }, [])

  const handleLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setActiveKey(null), 200)
  }, [])

  const handleTap = useCallback((key: string) => {
    setActiveKey(prev => prev === key ? null : key)
  }, [])

  function handleGuardar() {
    if (!medidas || !resultado || !user) return
    saveMedidas(form)
    const medidasNum: Record<string, number> = {}
    Object.entries(form).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) medidasNum[k] = n
    })
    saveHistorial(resultado, medidasNum, user.peso ?? 0)
    setTab('cuerpo')
  }

  const oblFaltantes = ['cuello', 'cintura', 'abdomen', 'cadera'].filter(k => !form[k])
  const puedeCalcular = oblFaltantes.length === 0 && !!user?.sexo && !!user?.altura && !!user?.peso

  const histGrasa     = historialRaw.map(h => h.grasa ?? h.porcentaje ?? 0)
  const histPeso      = historialRaw.map(h => h.peso ?? 0)
  const histMuscular  = historialRaw.map(h => h.masaMuscular ?? 0).filter(v => v > 0)
  const histMasaGrasa = historialRaw.map(h => h.masaGrasa ?? 0).filter(v => v > 0)
  const histCintura   = historialRaw.map(h =>
    h.cintura ?? (h.medidas as Record<string, number> | undefined)?.cintura ?? 0
  ).filter(v => v > 0)

  const diffGrasa = histGrasa.length >= 2
    ? +(histGrasa[histGrasa.length - 1] - histGrasa[0]).toFixed(1)
    : null

  const GRUPOS_FORM = [
    {
      titulo: 'Obligatorias', subtitulo: 'Necesarias para calcular el porcentaje de grasa',
      campos: [
        { key: 'cuello',  label: 'Cuello',               unit: 'cm' },
        { key: 'cintura', label: 'Cintura',               unit: 'cm' },
        { key: 'abdomen', label: 'Abdomen (al ombligo)',  unit: 'cm' },
        { key: 'cadera',  label: 'Cadera',                unit: 'cm' },
      ],
    },
    {
      titulo: 'Circunferencias primarias', subtitulo: 'Mejoran precisión del Modelo DORFIN',
      campos: [
        { key: 'hombros',   label: 'Hombros',         unit: 'cm' },
        { key: 'pecho',     label: 'Pecho',           unit: 'cm' },
        { key: 'bicep_der', label: 'Bícep derecho',   unit: 'cm' },
        { key: 'bicep_izq', label: 'Bícep izquierdo', unit: 'cm' },
      ],
    },
    {
      titulo: 'Circunferencias secundarias', subtitulo: 'Aumentan la confianza del resultado',
      campos: [
        { key: 'muslo_der',       label: 'Muslo derecho',         unit: 'cm' },
        { key: 'muslo_izq',       label: 'Muslo izquierdo',       unit: 'cm' },
        { key: 'pantorrilla_der', label: 'Pantorrilla derecha',   unit: 'cm' },
        { key: 'pantorrilla_izq', label: 'Pantorrilla izquierda', unit: 'cm' },
        { key: 'antebrazo_der',   label: 'Antebrazo derecho',     unit: 'cm' },
        { key: 'antebrazo_izq',   label: 'Antebrazo izquierdo',   unit: 'cm' },
      ],
    },
    {
      titulo: 'Estructura corporal', subtitulo: 'Frame size y proporciones',
      campos: [
        { key: 'muneca',          label: 'Muñeca',                            unit: 'cm' },
        { key: 'tobillo',         label: 'Tobillo',                           unit: 'cm' },
        { key: 'anchura_hombros', label: 'Anchura de hombros (biacromial)',   unit: 'cm' },
        { key: 'anchura_cadera',  label: 'Anchura de cadera (biilíaca)',      unit: 'cm' },
        { key: 'altura_sentado',  label: 'Altura sentado (vértice)',          unit: 'cm' },
      ],
    },
  ]

  // ══════════════════════════════════════════════════════════════
  return (
    <div className="bg-dorfin-bg flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-none px-4 pt-12 pb-3 flex items-center justify-between z-10"
        style={{ background: 'linear-gradient(180deg, rgba(15,11,30,1) 0%, rgba(15,11,30,0) 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-dorfin-surface border border-dorfin-border flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-dorfin-muted" />
          </button>
          <div>
            <h1 className="font-display text-xl text-dorfin-text leading-none">CUERPO DE DORFIN</h1>
            <p className="text-dorfin-faint text-[10px] mt-0.5">Composición corporal estimada</p>
          </div>
        </div>
        <button onClick={() => setShowInfo(true)}
          className="w-9 h-9 rounded-xl bg-dorfin-surface border border-dorfin-border flex items-center justify-center">
          <Info size={16} className="text-dorfin-muted" />
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex-none px-4 pb-2">
        <div className="flex gap-1 bg-dorfin-surface rounded-2xl p-1">
          {([
            { key: 'cuerpo',    label: 'Cuerpo',    icon: <Ruler size={13} /> },
            { key: 'medidas',   label: 'Medidas',   icon: <Activity size={13} /> },
            { key: 'historial', label: 'Historial', icon: <BarChart2 size={13} /> },
            { key: 'metodos',   label: 'Métodos',   icon: <TrendingUp size={13} /> },
          ] as const).map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[10px] font-semibold transition-all ${
                tab === t.key
                  ? 'bg-dorfin-card border border-dorfin-green/30 text-dorfin-green'
                  : 'text-dorfin-faint'
              }`}>
              <span className="mb-0.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CUERPO ─────────────────────────────────────── */}
      {tab === 'cuerpo' && (
        <div className="flex-1 overflow-hidden">
          {!resultado ? (
            /* Estado vacío */
            <div className="flex flex-col items-center justify-center h-full space-y-5 px-6 text-center">
              <img src="/dorfin-medidas.png" alt="" className="w-32 h-32 object-contain opacity-50" />
              <p className="text-dorfin-text font-display text-2xl">SIN MEDIDAS AÚN</p>
              <p className="text-dorfin-faint text-sm max-w-xs">
                Ingresa cuello, cintura, abdomen y cadera para activar el análisis corporal.
              </p>
              <button onClick={() => setTab('medidas')} className="btn-primary px-10">
                Ingresar medidas
              </button>
            </div>
          ) : (
            <>
              {/* ── DESKTOP: dos columnas fijas ── */}
              <div className="hidden lg:grid h-full"
                style={{ gridTemplateColumns: '1fr 420px' }}>

                {/* Izquierda: DORFIN protagonista */}
                <div className="relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(160deg, rgba(15,11,30,1) 0%, rgba(20,14,38,1) 100%)',
                    borderRight: '1px solid rgba(58,48,96,0.4)',
                  }}>
                  {/* Piso / gradiente inferior */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                      background: 'linear-gradient(0deg, rgba(15,11,30,1) 0%, transparent 100%)',
                      zIndex: 1,
                    }} />
                  <AvatarInteractivo
                    form={form}
                    activeKey={activeKey}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    onTap={handleTap}
                  />
                </div>

                {/* Derecha: métricas */}
                <div className="bg-dorfin-bg overflow-hidden flex flex-col">
                  {resultado && (
                    <MetricasPanel
                      resultado={resultado}
                      catColor={catColor}
                      user={user ?? null}
                      edad={edad}
                      form={form}
                      histGrasa={histGrasa}
                      diffGrasa={diffGrasa}
                      onGuardar={handleGuardar}
                      onVerHistorial={() => setTab('historial')}
                      onActualizarMedidas={() => setTab('medidas')}
                      activeKey={activeKey}
                      onHoverMedida={handleHover}
                      onLeaveMedida={handleLeave}
                    />
                  )}
                </div>
              </div>

              {/* ── MOBILE: una columna ── */}
              <div className="lg:hidden flex flex-col h-full overflow-y-auto overflow-x-hidden"
                style={{ WebkitOverflowScrolling: 'touch' }}>

                {/* Avatar — 58dvh */}
                <div className="flex-none relative overflow-hidden"
                  style={{
                    height: 'clamp(380px, 58dvh, 560px)',
                    background: 'linear-gradient(160deg, rgba(15,11,30,1) 0%, rgba(20,14,38,1) 100%)',
                  }}>
                  <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                    style={{
                      background: 'linear-gradient(0deg, rgba(15,11,30,1) 0%, transparent 100%)',
                      zIndex: 1,
                    }} />
                  <AvatarInteractivo
                    form={form}
                    activeKey={activeKey}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    onTap={handleTap}
                  />
                </div>

                {/* Métricas mobile — comprimidas */}
                <div className="flex-none px-4 py-4 pb-10 space-y-3">
                  {/* Grasa */}
                  <div className="rounded-2xl border p-4"
                    style={{
                      background: `linear-gradient(135deg, ${catColor}0e 0%, rgba(26,21,48,0.98) 100%)`,
                      borderColor: `${catColor}35`,
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Grasa corporal</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-dorfin-faint text-[10px]">Conf.</span>
                        <ConfianzaBadge valor={resultado.confianza} />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-6xl leading-none" style={{ color: catColor }}>
                          {resultado.porcentaje}
                        </span>
                        <span className="font-display text-2xl" style={{ color: catColor }}>%</span>
                      </div>
                      <p className="font-display text-xl" style={{ color: catColor }}>
                        {resultado.categoria.toUpperCase()}
                      </p>
                    </div>
                    {resultado.descripcion && (
                      <p className="text-dorfin-faint text-[11px] leading-relaxed mt-3 pt-3 border-t border-dorfin-border/20">
                        {resultado.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Masa */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="card p-3">
                      <p className="text-dorfin-muted text-[10px] mb-1">Masa muscular</p>
                      <p className="font-display text-2xl text-dorfin-green">
                        {resultado.masaMuscular}<span className="text-sm font-body"> kg</span>
                      </p>
                      <p className="text-dorfin-faint text-[9px] mt-0.5">Estimada</p>
                    </div>
                    <div className="card p-3">
                      <p className="text-dorfin-muted text-[10px] mb-1">Masa grasa</p>
                      <p className="font-display text-2xl text-orange-400">
                        {resultado.masaGrasa}<span className="text-sm font-body"> kg</span>
                      </p>
                      <p className="text-dorfin-faint text-[9px] mt-0.5">Estimada</p>
                    </div>
                  </div>

                  {/* Medidas interactivas mobile */}
                  <div className="card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Medidas registradas</p>
                      <button onClick={() => setTab('medidas')}
                        className="text-dorfin-green text-[10px] flex items-center gap-0.5">
                        Editar <ChevronRight size={10} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {ZONAS.filter(z => form[z.key]).map(zona => (
                        <button key={zona.key}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all"
                          style={{
                            background: activeKey === zona.key ? `${zona.color}12` : 'transparent',
                            border: `1px solid ${activeKey === zona.key ? zona.color + '40' : 'transparent'}`,
                          }}
                          onClick={() => handleTap(zona.key)}
                        >
                          <span className="text-[10px]"
                            style={{ color: activeKey === zona.key ? zona.color : '#8B84A8' }}>
                            {zona.label}
                          </span>
                          <span className="text-[10px] font-semibold"
                            style={{ color: activeKey === zona.key ? zona.color : '#F0EEF8' }}>
                            {form[zona.key]} cm
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleGuardar}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                    <Check size={16} /> Guardar medición
                  </button>

                  {histGrasa.length >= 2 && (
                    <div className="card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-dorfin-green" />
                          <span className="text-dorfin-text text-xs font-semibold">Evolución</span>
                        </div>
                        <button onClick={() => setTab('historial')}
                          className="text-dorfin-green text-[10px] flex items-center gap-0.5">
                          Ver todo <ChevronRight size={10} />
                        </button>
                      </div>
                      <MiniChart datos={histGrasa} color={C.verde} height={40} />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RESTO DE TABS ──────────────────────────────────── */}
      {tab !== 'cuerpo' && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="pb-10">

            {/* ══ TAB: MEDIDAS ══════════════════════════════ */}
            {tab === 'medidas' && (
              <div className="px-4 space-y-4" ref={formRef}>
                <div className="card p-4 border-dorfin-purple/30 bg-dorfin-purple/5">
                  <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-2">Datos del perfil</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { l: 'Sexo',   v: user?.sexo   ? user.sexo.charAt(0).toUpperCase() + user.sexo.slice(1) : '⚠ No definido', warn: !user?.sexo },
                      { l: 'Edad',   v: `${edad} años` },
                      { l: 'Altura', v: user?.altura  ? `${user.altura} cm`  : '⚠ No definida', warn: !user?.altura },
                      { l: 'Peso',   v: user?.peso    ? `${user.peso} kg`    : '⚠ No definido', warn: !user?.peso },
                    ].map(item => (
                      <div key={item.l} className="flex justify-between">
                        <span className="text-dorfin-faint">{item.l}</span>
                        <span className={`font-medium ${'warn' in item && item.warn ? 'text-orange-400' : 'text-dorfin-text'}`}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {resultado && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
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
                        <p className="text-[10px] font-semibold" style={{ color: colorCat(resultado.categoria) }}>{resultado.categoria}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {GRUPOS_FORM.map(grupo => (
                  <div key={grupo.titulo}>
                    <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">{grupo.titulo}</p>
                    <p className="text-dorfin-faint text-[10px] mb-2 mt-0.5">{grupo.subtitulo}</p>
                    <div className="space-y-2">
                      {grupo.campos.map(campo => {
                        const tieneValor = !!form[campo.key]
                        return (
                          <div key={campo.key}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                              tieneValor ? 'border-dorfin-green/30 bg-dorfin-green/5' : 'border-dorfin-border bg-dorfin-surface/30'
                            }`}>
                            <span className="flex-1 text-dorfin-text text-sm min-w-0 truncate">{campo.label}</span>
                            <div className="flex items-center gap-1.5 flex-none">
                              <input
                                type="number" inputMode="decimal" placeholder="—"
                                value={form[campo.key] ?? ''}
                                onChange={e => setForm({ ...form, [campo.key]: e.target.value })}
                                className="bg-dorfin-surface border border-dorfin-border rounded-xl text-center text-dorfin-text text-sm py-2 px-2 outline-none focus:border-dorfin-green transition-colors"
                                style={{ width: 68 }}
                              />
                              <span className="text-dorfin-faint text-xs w-6 text-left">{campo.unit}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {oblFaltantes.length > 0 && (
                  <p className="text-orange-400 text-xs text-center">
                    Faltan: {oblFaltantes.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}
                  </p>
                )}

                <button onClick={handleGuardar} disabled={!puedeCalcular}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
                  <Check size={18} /> Guardar y registrar
                </button>
              </div>
            )}

            {/* ══ TAB: HISTORIAL ════════════════════════════ */}
            {tab === 'historial' && (
              <div className="px-4 space-y-4">
                {historialRaw.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <BarChart2 size={40} className="mx-auto text-dorfin-faint" />
                    <p className="text-dorfin-text font-display text-xl">SIN HISTORIAL</p>
                    <p className="text-dorfin-faint text-sm">Guarda tu primera medición para ver la evolución</p>
                    <button onClick={() => setTab('medidas')} className="btn-primary mt-2">Ingresar medidas</button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3">
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
                          <MiniChart datos={histGrasa} color={C.verde} height={56} />
                        </div>
                      )}
                      {histPeso.length >= 2 && (
                        <div className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-dorfin-text text-xs font-semibold">Peso corporal (kg)</p>
                            <span className="text-dorfin-muted text-[10px]">{histPeso[histPeso.length - 1]} kg actual</span>
                          </div>
                          <MiniChart datos={histPeso} color={C.azul} height={48} />
                        </div>
                      )}
                      {histMuscular.length >= 2 && (
                        <div className="card p-4">
                          <p className="text-dorfin-text text-xs font-semibold mb-3">Composición corporal (kg)</p>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-dorfin-green" />
                            <span className="text-dorfin-faint text-[10px]">Masa muscular estimada</span>
                          </div>
                          <MiniChart datos={histMuscular} color={C.verde} height={40} />
                          <div className="flex items-center gap-2 mb-1 mt-3">
                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                            <span className="text-dorfin-faint text-[10px]">Masa grasa</span>
                          </div>
                          <MiniChart datos={histMasaGrasa} color={C.naranja} height={40} />
                        </div>
                      )}
                      {histCintura.length >= 2 && (
                        <div className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-dorfin-text text-xs font-semibold">Cintura (cm)</p>
                            <span className="text-dorfin-muted text-[10px]">
                              {histCintura[histCintura.length - 1] - histCintura[0] < 0 ? '↓' : '↑'}{' '}
                              {Math.abs(+(histCintura[histCintura.length - 1] - histCintura[0]).toFixed(1))} cm total
                            </span>
                          </div>
                          <MiniChart datos={histCintura} color={C.purpura} height={48} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-dorfin-muted text-[10px] uppercase tracking-widest">Registros</p>
                      {[...historialRaw].reverse().map((h, i) => {
                        const prev = [...historialRaw].reverse()[i + 1]
                        const hGrasa    = h.grasa    ?? h.porcentaje    ?? 0
                        const prevGrasa = prev?.grasa ?? prev?.porcentaje ?? 0
                        const diff = prev ? +(hGrasa - prevGrasa).toFixed(1) : null
                        const col = colorCat(h.categoria ?? '')
                        return (
                          <div key={i} className="card p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-dorfin-muted text-[10px]">{h.fecha}</p>
                                <p className="font-display text-3xl mt-0.5" style={{ color: col }}>
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
                                <ConfianzaBadge valor={h.confianza ?? 0} />
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

            {/* ══ TAB: MÉTODOS ══════════════════════════════ */}
            {tab === 'metodos' && (
              <div className="px-4 space-y-4">
                {!resultado ? (
                  <div className="text-center py-12">
                    <p className="text-dorfin-faint text-sm">Ingresa medidas para ver los métodos activos</p>
                  </div>
                ) : (
                  <>
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

                    <div className="card p-4">
                      <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-3">Métodos activos ({resultado.metodos.length}/5)</p>
                      <MetodosPanel metodos={resultado.metodos} porcentaje={resultado.porcentaje} />
                    </div>

                    <div className="card p-4">
                      <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-3">Cómo se construye la confianza</p>
                      <div className="space-y-2">
                        {[
                          { label: 'Base (sexo, edad, altura, peso)',   max: 22, actual: (user?.sexo ? 8 : 0) + (edad > 0 ? 4 : 0) + (user?.altura ? 4 : 0) + (user?.peso ? 6 : 0) },
                          { label: 'Cuello + cintura + abdomen',        max: 18, actual: (form.cuello ? 8 : 0) + (form.cintura ? 5 : 0) + (form.abdomen ? 5 : 0) },
                          { label: 'Cadera + hombros + pecho + bíceps', max: 25, actual: (form.cadera ? 8 : 0) + (form.hombros ? 6 : 0) + (form.pecho ? 5 : 0) + ((form.bicep_der || form.bicep_izq) ? (form.bicep_der && form.bicep_izq ? 6 : 3) : 0) },
                          { label: 'Muslos + pantorrillas + antebrazo', max: 20, actual: ((form.muslo_der || form.muslo_izq) ? (form.muslo_der && form.muslo_izq ? 6 : 3) : 0) + ((form.pantorrilla_der || form.pantorrilla_izq) ? (form.pantorrilla_der && form.pantorrilla_izq ? 5 : 2) : 0) + ((form.antebrazo_der || form.antebrazo_izq) ? (form.antebrazo_der && form.antebrazo_izq ? 4 : 2) : 0) + (form.anchura_cadera ? 5 : 0) },
                          { label: 'Muñeca + tobillo + anchura hombros', max: 23, actual: (form.muneca && form.tobillo ? 15 : form.muneca || form.tobillo ? 7 : 0) + (form.anchura_hombros ? 8 : 0) },
                          { label: 'Altura sentado',                    max: 6,  actual: form.altura_sentado ? 6 : 0 },
                        ].map(item => {
                          const pct = Math.min(100, (item.actual / item.max) * 100)
                          return (
                            <div key={item.label}>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-dorfin-faint text-[10px]">{item.label}</span>
                                <span className="text-dorfin-text text-[10px] font-semibold">{item.actual}/{item.max}</span>
                              </div>
                              <div className="h-1.5 bg-dorfin-surface rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full"
                                  style={{ background: pct >= 80 ? C.verde : pct >= 50 ? C.amarillo : C.naranja }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="card p-4 border-dorfin-purple/20 bg-dorfin-purple/5">
                      <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-2">Sobre la precisión</p>
                      <p className="text-dorfin-faint text-xs leading-relaxed">
                        DORFIN combina <span className="text-dorfin-text">5 modelos antropométricos</span> con pesos diferenciados.
                        No usa IA ni fotografías. El resultado es una estimación honesta.
                        La utilidad está en el <span className="text-dorfin-text">seguimiento del progreso</span>, no en la cifra exacta.
                      </p>
                      <div className="mt-3 space-y-1">
                        {[
                          { n: 'US Navy (DoD, 1986)',           w: 3.0, desc: 'Mayor precisión general' },
                          { n: 'YMCA (Golding, 1989)',          w: 2.0, desc: 'Rápido, solo cintura y peso' },
                          { n: 'WHtR — Lean et al. (1996)',     w: 1.5, desc: 'Predictor de riesgo central' },
                          { n: 'IMC — Gallagher et al. (2000)', w: 1.5, desc: 'Con corrección latinoamericana' },
                          { n: 'Modelo DORFIN v2',               w: 1.5, desc: 'Ajuste por composición muscular' },
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
        </div>
      )}

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
                <button onClick={() => setShowInfo(false)}>
                  <X size={20} className="text-dorfin-muted" />
                </button>
              </div>
              <p className="text-dorfin-muted text-sm leading-relaxed">
                DORFIN combina <span className="text-dorfin-text font-medium">5 modelos antropométricos</span> validados
                bibliográficamente. Ingresa tus medidas en cm y kg. Las zonas del cuerpo son interactivas — tócalas para ver cada medida.
              </p>
              <p className="text-dorfin-faint text-xs leading-relaxed mt-3">
                La confianza sube con cada medida adicional. Con los 4 datos básicos empiezas en ~40%.
                Con todas las medidas llegas hasta 100%.
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