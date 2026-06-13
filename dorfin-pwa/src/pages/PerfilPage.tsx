import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User as UserIcon, LogOut, Dumbbell, Star, TrendingUp, Award, Settings, X, Check, Trash2, ChevronRight } from 'lucide-react'
import { useStats, useLogout } from '@/lib/hooks'
import { useAuthStore } from '@/lib/stores/authStore'
import { Skeleton } from '@/components/shared'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/client'
import { authApi } from '@/lib/api/auth'
import { trainingLogsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useMesocicloActivo } from '@/lib/hooks'
import { mesociclosApi } from '@/lib/api'
import type { PersonalRecord } from '@/types'

const METAS = [
  'Hipertrofia', 'Definición', 'Fuerza', 'Powerlifting',
  'Resistencia', 'Pérdida de peso', 'Mantenimiento',
]

const MEDIDAS_LABELS: Record<string, string> = {
  cuello: 'Cuello', hombros: 'Hombros', pecho: 'Pecho',
  bicep_der: 'Bícep der', bicep_izq: 'Bícep izq',
  cintura: 'Cintura', abdomen: 'Abdomen', cadera: 'Cadera',
  muslo_der: 'Muslo der', muslo_izq: 'Muslo izq',
  pantorrilla_der: 'Pantorrilla der', pantorrilla_izq: 'Pantorrilla izq',
}

function StatBadge({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 card flex-1">
      <Icon size={16} className="text-dorfin-green" />
      <span className="font-display text-2xl text-dorfin-text">{value}</span>
      <span className="text-dorfin-faint text-[10px] uppercase tracking-widest text-center leading-tight">{label}</span>
    </div>
  )
}

function SparklineChart({ data }: { data: { semana: string; volumen: number }[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.volumen), 1)
  const w = 280, h = 80
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * w,
    y: h - (d.volumen / max) * h * 0.85,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${path} L ${pts[pts.length - 1]?.x} ${h} L 0 ${h} Z`

  // Calcular % cambio real entre primera y última semana
  const pct = data.length >= 2
    ? Math.round(((data[data.length-1].volumen - data[0].volumen) / (data[0].volumen || 1)) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center gap-1.5 bg-dorfin-green/10 rounded-lg px-3 py-1.5 border border-dorfin-green/20 w-fit ml-auto mb-2">
        <TrendingUp size={12} className="text-dorfin-green" />
        <span className="text-dorfin-green text-xs font-medium">{pct >= 0 ? '+' : ''}{pct}%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#39FF14" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g)" />
        <path d={path} fill="none" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#39FF14" />)}
        {data.map((d, i) => (
          <text key={i} x={pts[i].x} y={h - 2} fontSize="9" fill="#4A4468" textAnchor="middle">{d.semana}</text>
        ))}
      </svg>
    </div>
  )
}

function HistorialEjercicioModal({ pr, onClose }: { pr: PersonalRecord; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['historial-ejercicio-nombre', pr.ejercicio_nombre],
    queryFn: () => trainingLogsApi.getHistorialPorNombre(pr.ejercicio_nombre),
  })

  const logs = data?.logs ?? []
  const w = 280, h = 100

  // Definir primero, usar después
  const volumen = (log: { peso: number; repeticiones: number }) => log.peso * log.repeticiones
  const volumenes = logs.map(volumen)
  const maxVol = Math.max(...volumenes, 1)
  const pct = logs.length >= 2
    ? Math.round(((volumenes[volumenes.length-1] - volumenes[0]) / (volumenes[0] || 1)) * 100)
    : 0

  const pts = logs.map((l, i) => ({
    x: (i / (logs.length - 1 || 1)) * w,
    y: h - (volumen(l) / maxVol) * h * 0.85,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-dorfin-text font-display text-2xl">{pr.ejercicio_nombre.toUpperCase()}</h2>
            <p className="text-dorfin-muted text-xs mt-0.5">Historial de progreso</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-dorfin-muted" /></button>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : logs.length === 0 ? (
          <p className="text-dorfin-faint text-sm text-center py-8">Sin registros</p>
        ) : (
          <>
            {/* Resumen del PR */}
            <div className="card p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-dorfin-muted text-xs uppercase tracking-widest">Récord actual</p>
                <p className="font-display text-3xl text-dorfin-green mt-1">{pr.peso_max} <span className="text-sm">kg</span></p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                pct >= 0 ? 'bg-dorfin-green/10 border-dorfin-green/20 text-dorfin-green' : 'bg-red-400/10 border-red-400/20 text-red-400'
              }`}>
                <TrendingUp size={12} />
                {pct >= 0 ? '+' : ''}{pct}%
              </div>
            </div>

            {/* Gráfico de progreso de peso */}
            {logs.length >= 2 && (
              <div className="card p-4 mb-4">
                <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Evolución de progreso</p>
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 100 }}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#39FF14" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${path} L ${pts[pts.length-1].x} ${h} L 0 ${h} Z`} fill="url(#pg)" />
                  <path d={path} fill="none" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#39FF14" />)}
                </svg>
              </div>
            )}

            {/* Lista de logs */}
            <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Registros</p>
            <div className="space-y-2">
              {(() => {
  const reversed = [...logs].reverse().slice(0, 10)
  return reversed.map((log, i) => {
    const prev = reversed[i + 1]
    const diffPeso = prev ? +(log.peso - prev.peso).toFixed(1) : null
    const diffReps = prev ? log.repeticiones - prev.repeticiones : null
    const diffRir = prev ? +(log.rir - prev.rir).toFixed(1) : null

    // Progreso real: subir reps o bajar RIR con mismo peso también es progreso
    const hayProgreso = prev && (
      (diffPeso !== null && diffPeso > 0) ||
      (diffReps !== null && diffReps > 0)
    )
    const hayRegresion = prev && (
      (diffPeso !== null && diffPeso < 0) ||
      (diffReps !== null && diffReps < 0)
    )

    return (
      <div key={i} className={`card p-3 border transition-all ${
        hayProgreso ? 'border-dorfin-green/30 bg-dorfin-green/5'
        : hayRegresion ? 'border-red-400/20'
        : 'border-dorfin-border'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-dorfin-text text-sm font-medium">
              {log.peso} kg × {log.repeticiones} reps
            </p>
            <p className="text-dorfin-faint text-xs mt-0.5">RIR {log.rir} · {log.fecha}</p>
            {prev && (
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {diffPeso !== null && diffPeso !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    diffPeso > 0
                      ? 'bg-dorfin-green/10 text-dorfin-green'
                      : 'bg-red-400/10 text-red-400'
                  }`}>
                    {diffPeso > 0 ? '↑' : '↓'} {Math.abs(diffPeso)} kg
                  </span>
                )}
                {diffReps !== null && diffReps !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    diffReps > 0
                      ? 'bg-dorfin-green/10 text-dorfin-green'
                      : 'bg-red-400/10 text-red-400'
                  }`}>
                    {diffReps > 0 ? '↑' : '↓'} {Math.abs(diffReps)} reps
                  </span>
                )}
                {diffRir !== null && diffRir !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    diffRir < 0
                      ? 'bg-dorfin-green/10 text-dorfin-green'
                      : 'bg-red-400/10 text-red-400'
                  }`}>
                    RIR {diffRir < 0 ? '↓' : '↑'} {Math.abs(diffRir)}
                  </span>
                )}
                {diffPeso === 0 && diffReps === 0 && diffRir === 0 && (
                  <span className="text-[10px] text-dorfin-faint">Sin cambios</span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            {i === 0 && (
              <span className="text-[10px] bg-dorfin-green/10 text-dorfin-green border border-dorfin-green/20 rounded-full px-2 py-0.5">
                Último
              </span>
            )}
            {hayProgreso && (
              <span className="text-[10px] bg-dorfin-green/10 text-dorfin-green rounded-full px-2 py-0.5">
                💪 Progreso
              </span>
            )}
          </div>
        </div>
      </div>
    )
  })
})()}
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}

function MesocicloStats({ meso }: { meso: any }) {
  const hist = meso?.historial_medidas ?? []
  if (hist.length < 1) return null

  const [semanaBase, setSemanaBase] = useState(0)
  const [semanaComp, setSemanaComp] = useState(hist.length > 1 ? hist.length - 1 : 0)

  const MEDIDAS_LABELS: Record<string, string> = {
    peso_kg: 'Peso', cuello: 'Cuello', hombros: 'Hombros', pecho: 'Pecho',
    bicep_der: 'Bícep der', bicep_izq: 'Bícep izq',
    cintura: 'Cintura', abdomen: 'Abdomen', cadera: 'Cadera',
    muslo_der: 'Muslo der', muslo_izq: 'Muslo izq',
    pantorrilla_der: 'Pantorrilla der', pantorrilla_izq: 'Pantorrilla izq',
  }

  const snapBase = hist[semanaBase]
  const snapComp = hist[semanaComp]

  const todasLasClaves = [
    ...new Set([
      ...Object.keys(snapBase?.medidas ?? {}),
      ...Object.keys(snapComp?.medidas ?? {}),
    ])
  ].filter(k => MEDIDAS_LABELS[k])

  const cambios = todasLasClaves.map(k => ({
    key: k,
    label: MEDIDAS_LABELS[k] ?? k,
    antes: snapBase?.medidas[k] ?? null,
    despues: snapComp?.medidas[k] ?? null,
    unidad: k === 'peso_kg' ? 'kg' : 'cm',
  })).filter(c => c.antes != null && c.despues != null)

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-dorfin-green" />
        <p className="text-dorfin-text font-semibold">Progreso del mesociclo</p>
      </div>

      {hist.length === 1 ? (
        <p className="text-dorfin-faint text-xs text-center py-2">
          Registra la semana 2 para ver comparativas
        </p>
      ) : (
        <>
          {/* Selector de semanas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-1">Semana base</p>
              <div className="flex flex-wrap gap-1">
                {hist.map((h: any, i: number) => (
                  <button key={i} onClick={() => setSemanaBase(i)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                      semanaBase === i
                        ? 'bg-dorfin-purple/20 border-dorfin-purple text-dorfin-text'
                        : 'border-dorfin-border text-dorfin-faint'
                    }`}>
                    S{h.semana}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-dorfin-muted text-[10px] uppercase tracking-widest mb-1">Comparar con</p>
              <div className="flex flex-wrap gap-1">
                {hist.map((h: any, i: number) => (
                  <button key={i} onClick={() => setSemanaComp(i)}
                    disabled={i === semanaBase}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                      semanaComp === i
                        ? 'bg-dorfin-green/20 border-dorfin-green text-dorfin-green'
                        : i === semanaBase
                        ? 'border-dorfin-border/30 text-dorfin-faint/30'
                        : 'border-dorfin-border text-dorfin-faint'
                    }`}>
                    S{h.semana}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-dorfin-faint text-xs">
            Sem {snapBase?.semana} → Sem {snapComp?.semana}
          </p>

          {cambios.length === 0 ? (
            <p className="text-dorfin-faint text-xs text-center py-2">Sin medidas en común para comparar</p>
          ) : (
            <div className="space-y-2">
              {cambios.map(c => {
                const diff = +(c.despues! - c.antes!).toFixed(1)
                // Para cintura/abdomen/cadera bajar es positivo
                const esMedidaInversa = ['cintura', 'abdomen', 'cadera'].includes(c.key)
                const esBueno = esMedidaInversa ? diff < 0 : diff > 0
                return (
                  <div key={c.key} className="flex items-center justify-between py-1">
                    <span className="text-dorfin-muted text-sm">{c.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-dorfin-faint text-xs">{c.antes} → {c.despues} {c.unidad}</span>
                      <span className={`text-xs font-bold w-16 text-right ${
                        diff === 0 ? 'text-dorfin-faint'
                        : esBueno ? 'text-dorfin-green'
                        : 'text-red-400'
                      }`}>
                        {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff} ${c.unidad}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResetPasswordFlow({ email, onClose }: { email: string; onClose: () => void }) {
  const [step, setStep] = useState<'idle' | 'codigo' | 'nueva'>('idle')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSolicitar = async () => {
    setLoading(true)
    try {
      await authApi.solicitarReset(email)
      setStep('codigo')
      toast.success('Código enviado a tu correo')
    } catch {
      toast.error('Error al enviar el código')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmar = async () => {
    if (nueva !== confirmar) { toast.error('Las contraseñas no coinciden'); return }
    if (nueva.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setLoading(true)
    try {
      await authApi.confirmarReset(email, codigo, nueva)
      toast.success('Contraseña actualizada')
      setStep('idle')
      setCodigo('')
      setNueva('')
      setConfirmar('')
      onClose()
    } catch {
      toast.error('Código inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={handleSolicitar}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 border border-dorfin-border rounded-2xl py-3 text-dorfin-muted text-sm font-medium hover:border-dorfin-purple hover:text-dorfin-text transition-colors"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-dorfin-muted/40 border-t-dorfin-muted rounded-full animate-spin" />
          : '🔑 Cambiar contraseña'
        }
      </button>
    )
  }

  if (step === 'codigo') {
    return (
      <div className="space-y-3">
        <p className="text-dorfin-faint text-xs">Ingresa el código de 6 dígitos enviado a <span className="text-dorfin-text">{email}</span></p>
        <input
          placeholder="000000"
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          maxLength={6}
          className="input-field text-center text-2xl tracking-widest font-display"
        />
        <button
          onClick={() => setStep('nueva')}
          disabled={codigo.length !== 6}
          className="btn-primary w-full"
        >
          Verificar código
        </button>
        <button onClick={() => setStep('idle')} className="w-full text-dorfin-faint text-xs text-center py-1">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-dorfin-faint text-xs">Ingresa tu nueva contraseña</p>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={nueva}
        onChange={e => setNueva(e.target.value)}
        className="input-field"
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirmar}
        onChange={e => setConfirmar(e.target.value)}
        className="input-field"
      />
      <button
        onClick={handleConfirmar}
        disabled={loading || !nueva || !confirmar}
        className="btn-primary w-full flex items-center justify-center"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
          : 'Guardar contraseña'
        }
      </button>
      <button onClick={() => setStep('idle')} className="w-full text-dorfin-faint text-xs text-center py-1">
        Cancelar
      </button>
    </div>
  )
}

export default function PerfilPage() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { data: stats, isLoading } = useStats()
  const logout = useLogout()
  const navigate = useNavigate()

  const [showSettings, setShowSettings] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedMeta, setSelectedMeta] = useState(user?.meta ?? '')
  const [selectedPR, setSelectedPR] = useState<PersonalRecord | null>(null)

  const qc = useQueryClient()
  const { data: mesoActivo } = useMesocicloActivo()

  const updateMeta = useMutation({
    mutationFn: async (meta: string) => {
      await apiClient.put('/auth/me', { meta })
      if (mesoActivo) {
        await mesociclosApi.update(mesoActivo.id, {
          fecha_inicio: mesoActivo.fecha_inicio,
          peso_inicial: mesoActivo.peso_inicial,
          medidas: mesoActivo.medidas,
          meta,
          duracion_semanas: mesoActivo.duracion_semanas,
          frecuencia_medidas: mesoActivo.frecuencia_medidas,
        })
      }
    },
    onSuccess: (_, meta) => {
      updateUser({ meta })
      qc.invalidateQueries({ queryKey: ['mesociclo-activo'] })
      toast.success('Meta actualizada')
      setShowSettings(false)
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteAccount = useMutation({
    mutationFn: () => apiClient.delete('/auth/me'),
    onSuccess: () => {
      clearAuth()
      navigate('/auth')
      toast.success('Cuenta eliminada')
    },
    onError: () => toast.error('Error al eliminar cuenta'),
  })

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-24">
      <div className="px-5 pt-14 pb-6">
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl hover:bg-dorfin-surface transition-colors">
            <Settings size={20} className="text-dorfin-muted" />
          </button>
        </div>

        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-dorfin-surface border-2 border-dorfin-purple overflow-hidden flex items-center justify-center">
              {user?.foto_url
                ? <img src={user.foto_url} alt="foto" className="w-full h-full object-cover" />
                : <UserIcon size={36} className="text-dorfin-muted" />
              }
            </div>
            <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-dorfin-green border-2 border-dorfin-bg flex items-center justify-center cursor-pointer">
              <span className="text-dorfin-bg text-[10px] font-bold">✎</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const result = await authApi.uploadFoto(file)
                    updateUser({ foto_url: result.foto_url })
                    toast.success('Foto actualizada')
                  } catch {
                    toast.error('Error al subir la foto')
                  }
                }}
              />
            </label>
          </div>
          <div className="flex-1 pt-2">
            <h1 className="font-display text-3xl text-dorfin-text">{user?.nombre?.toUpperCase()}</h1>
            <p className="text-dorfin-muted text-sm mt-0.5">{user?.email}</p>
            {user?.meta && (
              <span className="inline-block mt-2 text-xs bg-dorfin-green/10 text-dorfin-green border border-dorfin-green/20 rounded-full px-3 py-1">
                🎯 {user.meta}
              </span>
            )}
          </div>
        </div>

        {(user?.peso || user?.altura) && (
          <div className="flex gap-3">
            {user.fecha_nacimiento && (() => {
              const hoy = new Date()
              const nac = new Date(user.fecha_nacimiento! + 'T00:00:00')
              let edad = hoy.getFullYear() - nac.getFullYear()
              const m = hoy.getMonth() - nac.getMonth()
              if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
              return <div className="card px-4 py-2 flex-1 text-center"><p className="font-display text-2xl text-dorfin-text">{edad}</p><p className="text-dorfin-faint text-xs">años</p></div>
            })()}
            {user.peso && <div className="card px-4 py-2 flex-1 text-center"><p className="font-display text-2xl text-dorfin-text">{user.peso}</p><p className="text-dorfin-faint text-xs">kg</p></div>}
            {user.altura && <div className="card px-4 py-2 flex-1 text-center"><p className="font-display text-2xl text-dorfin-text">{user.altura}</p><p className="text-dorfin-faint text-xs">cm</p></div>}
          </div>
        )}
      </div>

      <div className="px-5 space-y-5">
        {/* Stats del mes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-dorfin-green" />
            <h2 className="text-dorfin-text font-semibold">Stats del mes</h2>
          </div>
          {isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="flex gap-3">
              <StatBadge icon={Dumbbell} label="Entrenos" value={stats?.entrenos_mes ?? 0} />
              <StatBadge icon={TrendingUp} label="KG totales" value={stats?.kg_totales_mes?.toLocaleString() ?? 0} />
              <StatBadge icon={Star} label="PRs nuevos" value={stats?.prs_nuevos ?? 0} />
            </div>
          )}
        </div>

        {/* Volumen semanal */}
        {!isLoading && stats?.volumen_semanal?.length ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-dorfin-muted text-xs uppercase tracking-widest">Volumen mensual</p>
                <p className="font-display text-3xl text-dorfin-text mt-1">{stats.kg_totales_mes.toLocaleString()} kg</p>
              </div>
            </div>
            <SparklineChart data={stats.volumen_semanal} />
          </div>
        ) : null}

        {/* Progreso mesociclo */}
        {mesoActivo && <MesocicloStats meso={mesoActivo} />}

        {/* Records personales */}
        {!isLoading && stats?.personal_records?.length ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} className="text-dorfin-green" />
              <h2 className="text-dorfin-text font-semibold">Récords personales</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats.personal_records.slice(0, 6).map((pr, i) => (
                <motion.button
                  key={pr.ejercicio_id}
                  onClick={() => setSelectedPR(pr)}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="card p-4 border-dorfin-purple/30 text-left active:scale-95 transition-transform"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Star size={14} className="text-dorfin-green" />
                    <ChevronRight size={12} className="text-dorfin-faint" />
                  </div>
                  <p className="font-display text-2xl text-dorfin-green">{pr.peso_max} <span className="text-sm">kg</span></p>
                  <p className="text-dorfin-text text-sm font-medium leading-tight mt-0.5">{pr.ejercicio_nombre}</p>
                  <p className="text-dorfin-faint text-[10px] mt-0.5">{pr.fecha}</p>
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/5 border border-red-400/20 rounded-2xl py-4"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>

      {/* Modal historial ejercicio */}
      <AnimatePresence>
        {selectedPR && (
          <HistorialEjercicioModal pr={selectedPR} onClose={() => setSelectedPR(null)} />
        )}
      </AnimatePresence>

      {/* Settings sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-8 max-w-md mx-auto max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-dorfin-text font-display text-2xl">Ajustes</h2>
                <button onClick={() => setShowSettings(false)}><X size={20} className="text-dorfin-muted" /></button>
              </div>
              <div className="mb-6">
                <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Meta de entrenamiento</p>
                <div className="grid grid-cols-2 gap-2">
                  {METAS.map((meta) => (
                    <button key={meta} onClick={() => setSelectedMeta(meta)}
                      className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                        selectedMeta === meta
                          ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green'
                          : 'card border-dorfin-border text-dorfin-muted hover:border-dorfin-purple/50'
                      }`}>
                      {meta}
                    </button>
                  ))}
                </div>
                <button onClick={() => updateMeta.mutate(selectedMeta)}
                  disabled={updateMeta.isPending || selectedMeta === user?.meta || !selectedMeta}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                  <Check size={16} /> Guardar meta
                </button>
              </div>
              <div className="border-t border-dorfin-border pt-5 mb-5">
                <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Contraseña</p>
                <ResetPasswordFlow email={user?.email ?? ''} onClose={() => setShowSettings(false)} />
              </div>
              <div className="border-t border-dorfin-border pt-5">
                <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-3">Zona de peligro</p>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 text-red-400 border border-red-400/20 rounded-2xl py-3 hover:bg-red-400/5 transition-colors text-sm font-medium">
                    <Trash2 size={16} /> Eliminar cuenta
                  </button>
                ) : (
                  <div className="card border-red-400/30 p-4 space-y-3">
                    <p className="text-dorfin-text text-sm">¿Estás seguro? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-dorfin-border text-dorfin-muted text-sm">
                        Cancelar
                      </button>
                      <button onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}
                        className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-400/40 text-red-400 text-sm font-medium">
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}