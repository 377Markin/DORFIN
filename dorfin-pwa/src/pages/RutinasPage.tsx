import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Dumbbell, Moon, Trash2, X, Check, History, ChevronDown, ChevronUp } from 'lucide-react'
import { useRoutines, useCreateRoutine, useDeleteRoutine } from '@/lib/hooks'
import { useMutation, useQuery } from '@tanstack/react-query'
import { routinesApi, trainingLogsApi } from '@/lib/api'
import { EmptyState, Skeleton, PageHeader } from '@/components/shared'
import { useQueryClient } from '@tanstack/react-query'

const MUSCLE_GROUPS = [
  'Pectoral, hombro y tríceps',
  'Espalda y bíceps',
  'Cuádriceps, femorales y pantorrilla',
  'Hombros',
  'Bíceps y tríceps',
  'Full body',
  'Descanso',
]

function formatFecha(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatSemana(dateStr: string) {
  const inicio = new Date(dateStr + 'T00:00:00')
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${inicio.getDate()} ${meses[inicio.getMonth()]} — ${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`
}

function HistorialSheet({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['historial-semanal'],
    queryFn: () => trainingLogsApi.getHistorialSemanal(),
    staleTime: 0,
  })

  const [semanaAbierta, setSemanaAbierta] = useState<string | null>(
    data?.[0]?.semana_inicio ?? null
  )

  useEffect(() => {
    if (data && data.length > 0 && !semanaAbierta) {
      setSemanaAbierta(data[0].semana_inicio)
    }
  }, [data])

  // Agrupar semanas por mes
  const porMes: Record<string, typeof data> = {}
  data?.forEach(semana => {
    const d = new Date(semana.semana_inicio + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!porMes[key]) porMes[key] = []
    porMes[key]!.push(semana)
  })

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-dorfin-card rounded-t-3xl p-6 pb-10 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-dorfin-text font-display text-2xl">HISTORIAL</h2>
            <p className="text-dorfin-muted text-xs mt-0.5">Tu evolución semana a semana</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-dorfin-muted" /></button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-dorfin-text font-semibold">Sin entrenos aún</p>
            <p className="text-dorfin-faint text-sm mt-1">Completa tu primera sesión para ver el historial</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(porMes).sort(([a], [b]) => b.localeCompare(a)).map(([mesKey, semanas]) => {
              const [año, mes] = mesKey.split('-')
              const nombreMes = mesesNombres[parseInt(mes) - 1]
              return (
                <div key={mesKey}>
                  <p className="text-dorfin-green text-xs font-bold uppercase tracking-widest mb-3">
                    {nombreMes} {año}
                  </p>
                  <div className="space-y-2">
                    {semanas!.map(semana => {
                      const abierta = semanaAbierta === semana.semana_inicio
                      const totalEjercicios = semana.dias.reduce((acc, d) => acc + d.ejercicios.length, 0)
                      return (
                        <div key={semana.semana_inicio} className="card border-dorfin-border overflow-hidden">
                          <button
                            onClick={() => setSemanaAbierta(abierta ? null : semana.semana_inicio)}
                            className="w-full p-4 flex items-center justify-between"
                          >
                            <div className="text-left">
                              <p className="text-dorfin-text text-sm font-semibold">
                                {formatSemana(semana.semana_inicio)}
                              </p>
                              <p className="text-dorfin-faint text-xs mt-0.5">
                                {semana.dias.length} días · {totalEjercicios} series
                              </p>
                            </div>
                            {abierta
                              ? <ChevronUp size={16} className="text-dorfin-muted" />
                              : <ChevronDown size={16} className="text-dorfin-muted" />
                            }
                          </button>

                          <AnimatePresence>
                            {abierta && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-dorfin-border"
                              >
                                <div className="p-4 space-y-4">
                                  {semana.dias.map(dia => (
                                    <div key={dia.fecha}>
                                      <p className="text-dorfin-muted text-xs tracking-widest mb-2 capitalize">
                                        {formatFecha(dia.fecha)}
                                      </p>
                                      <div className="space-y-1.5">
                                        {dia.ejercicios.map((ej, i) => (
                                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-dorfin-border/50 last:border-0">
                                            <span className="text-dorfin-text text-sm font-medium">{ej.nombre}</span>
                                            <span className="text-dorfin-faint text-xs">
                                              {ej.peso > 0 ? `${ej.peso}kg` : '—'} × {ej.repeticiones}r · RIR {ej.rir}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </>
  )
}

export default function RutinasPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: routines, isLoading } = useRoutines()
  const qc = useQueryClient()
  const [showHistorial, setShowHistorial] = useState(false)

// Detectar ciclo completo y resetear después de 5 horas
  const CICLO_KEY = `dorfin-ciclo-completado-u${routines?.[0]?.usuario_id}`
  
  useEffect(() => {
    if (!routines || routines.length === 0) return
    
    const todosCompletos = routines.every(r => r.completado_hoy === true)
    
    if (todosCompletos) {
      const yaGuardado = localStorage.getItem(CICLO_KEY)
      if (!yaGuardado) {
        // Guardar momento en que se completó el ciclo
        localStorage.setItem(CICLO_KEY, String(Date.now()))
      } else {
        const completadoEn = parseInt(yaGuardado)
        const cincoHoras = 5 * 60 * 60 * 1000
        if (Date.now() - completadoEn >= cincoHoras) {
          // Han pasado 5 horas — resetear
          localStorage.removeItem(CICLO_KEY)
          routinesApi.resetCiclo().then(() => {
            qc.invalidateQueries({ queryKey: ['routines'] })
          })
        }
      }
    } else {
      // Si no todos están completos, limpiar el timer
      localStorage.removeItem(CICLO_KEY)
    }
  }, [routines])

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['routines'] })
  }, [])

  const createMutation = useCreateRoutine()
  const deleteMutation = useDeleteRoutine()
  const registrarDescansoMutation = useMutation({
    mutationFn: (id: number) => routinesApi.registrarDescanso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] })
      qc.invalidateQueries({ queryKey: ['streak'] })
    },
  })
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [dia, setDia] = useState(1)

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      setShowForm(true)
      setSearchParams({})
    }
  }, [searchParams])

  const handleCreate = () => {
    if (!nombre.trim()) return
    const nextDia = dia || (routines?.length ?? 0) + 1
    createMutation.mutate({ nombre, dia: nextDia }, {
      onSuccess: () => { setShowForm(false); setNombre('') }
    })
  }

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-24">
      <div className="px-5 pt-14">
        <div className="flex items-start justify-between">
          <PageHeader title="DORFIN" subtitle="Tus rutinas de entrenamiento" />
          <button
            onClick={() => setShowHistorial(true)}
            className="mt-1 p-2 rounded-xl hover:bg-dorfin-surface transition-colors flex items-center gap-1.5 text-dorfin-muted hover:text-dorfin-text"
          >
            <History size={18} />
            <span className="text-xs font-medium">Historial</span>
          </button>
        </div>
      </div>

      <div className="px-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : routines?.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Sin rutinas aún"
            subtitle="Crea tu primera rutina para comenzar"
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Crear rutina
              </button>
            }
          />
        ) : (
          routines?.map((routine, i) => {
            const isRest = routine.nombre.toLowerCase().includes('descanso')
            const isFirst = routine.completado_hoy === true
            const isRestDone = isRest && isFirst

            return (
              <motion.div
                key={routine.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => { if (!isRest) navigate(`/rutinas/${routine.id}`) }}
                className={`relative rounded-2xl p-5 border-2 cursor-pointer transition-all active:scale-[0.98] ${
                  isFirst
                    ? 'bg-dorfin-green border-transparent'
                    : isRest
                    ? 'card border-dorfin-border cursor-default opacity-70'
                    : 'card border-dorfin-purple/40 hover:border-dorfin-purple'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isRest
                        ? <Moon size={16} className="text-dorfin-muted" />
                        : <Dumbbell size={16} className={isFirst ? 'text-dorfin-bg' : 'text-dorfin-green'} />
                      }
                      <span className={`text-xs font-bold tracking-widest uppercase ${isFirst ? 'text-dorfin-bg/70' : 'text-dorfin-muted'}`}>
                        Día {routine.dia}
                      </span>
                    </div>
                    <h3 className={`font-body font-semibold text-lg leading-tight ${isFirst ? 'text-dorfin-bg' : 'text-dorfin-text'}`}>
                      {routine.nombre}
                    </h3>
                    {isRest && !isRestDone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); registrarDescansoMutation.mutate(routine.id) }}
                        className="mt-2 text-xs bg-dorfin-bg/20 hover:bg-dorfin-bg/30 text-dorfin-bg border border-dorfin-bg/20 rounded-lg px-3 py-1 transition-colors"
                      >
                        ✓ Registrar descanso de hoy
                      </button>
                    )}
                    {isRestDone && (
                      <p className="text-dorfin-bg/70 text-xs mt-1">✓ Descanso registrado hoy</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(routine.id) }}
                    className={`p-2 rounded-lg transition-colors ${isFirst ? 'hover:bg-black/10' : 'hover:bg-dorfin-surface'}`}
                  >
                    <Trash2 size={15} className={isFirst ? 'text-dorfin-bg/60' : 'text-dorfin-faint'} />
                  </button>
                </div>
              </motion.div>
            )
          })
        )}

        {!showForm && (routines?.length ?? 0) > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="w-full card border-dashed border-dorfin-border p-4 flex items-center justify-center gap-2 text-dorfin-muted hover:text-dorfin-text hover:border-dorfin-purple transition-colors"
          >
            <Plus size={18} /> Agregar día
          </motion.button>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-dorfin-text font-semibold">Nuevo día</h3>
                <button onClick={() => { setShowForm(false); setNombre('') }}>
                  <X size={18} className="text-dorfin-muted" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-dorfin-muted text-xs mb-1 block">Día #</label>
                  <input type="number" min={1} value={dia}
                    onChange={(e) => setDia(Number(e.target.value))}
                    className="input-field text-center" />
                </div>
                <div className="col-span-3">
                  <label className="text-dorfin-muted text-xs mb-1 block">Grupo muscular</label>
                  <select value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-field">
                    <option value="">Escribe abajo o selecciona</option>
                    {MUSCLE_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <input placeholder="O escribe un nombre personalizado" value={nombre}
                onChange={(e) => setNombre(e.target.value)} className="input-field" />
              <button onClick={handleCreate}
                disabled={createMutation.isPending || !nombre.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Check size={18} /> Crear día
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showHistorial && <HistorialSheet onClose={() => setShowHistorial(false)} />}
      </AnimatePresence>
    </div>
  )
}