import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Dumbbell, Plus, X, Check, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { routinesApi, rutinaEjerciciosApi } from '@/lib/api'
import { Skeleton, EmptyState } from '@/components/shared'
import type { RutinaEjercicio } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/authStore'

export default function RutinaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const user = useAuthStore((s) => s.user)
  const [showForm, setShowForm]       = useState(false)
  const [nombre, setNombre]           = useState('')
  const [musculo, setMusculo]         = useState('')
  const [series, setSeries]           = useState(1)
  const [descanso, setDescanso]       = useState(90)
  const [rirObjetivo, setRirObjetivo] = useState<number[]>([])
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)

  const storageKey = `dorfin-completados-u${user?.id}-r${id}-${new Date().toDateString()}`
  const [completados, setCompletados] = useState<number[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return Array.isArray(saved) ? saved : []
    } catch { return [] }
  })

  useEffect(() => {
    const ejId = location.state?.ejercicioCompletado
    if (ejId) {
      setCompletados(prev => {
        const next = prev.includes(ejId) ? prev : [...prev, ejId]
        localStorage.setItem(storageKey, JSON.stringify(next))
        return next
      })
    }
  }, [location.state])

  const { data: routine, isLoading: loadingRoutine } = useQuery({
    queryKey: ['routine', id],
    queryFn: () => routinesApi.getById(Number(id)),
    enabled: !!id,
  })

  const { data: ejercicios, isLoading: loadingEjercicios } = useQuery({
    queryKey: ['rutina-ejercicios', id],
    queryFn: () => rutinaEjerciciosApi.list(Number(id)),
    enabled: !!id,
  })

  // Todas las rutinas del usuario para sacar ejercicios sugeridos
  const { data: todasRutinas } = useQuery({
    queryKey: ['routines-all'],
    queryFn: () => routinesApi.list(),
  })

  // Ejercicios de todas las rutinas para autocompletar
  const { data: ejerciciosOtrasRutinas } = useQuery({
    queryKey: ['ejercicios-todas-rutinas', todasRutinas?.map(r => r.id)],
    queryFn: async () => {
      if (!todasRutinas) return []
      const results = await Promise.all(
        todasRutinas.map(r => rutinaEjerciciosApi.list(r.id))
      )
      return results.flat()
    },
    enabled: !!todasRutinas && todasRutinas.length > 0,
  })

  useEffect(() => {
    if (ejercicios !== undefined) {
      if (ejercicios.length === 0) {
        // Sin ejercicios — limpiar todo
        localStorage.removeItem(storageKey)
        setCompletados([])
      } else {
        const validIds = ejercicios.map(e => e.id)
        setCompletados(prev => {
          const clean = prev.filter(i => validIds.includes(i))
          localStorage.setItem(storageKey, JSON.stringify(clean))
          return clean
        })
      }
    }
  }, [ejercicios])

  const createMutation = useMutation({
    mutationFn: (body: { nombre: string; musculo?: string; series: number; descanso?: number; rir_objetivo?: number[] }) =>
      rutinaEjerciciosApi.create(Number(id), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutina-ejercicios', id] })
      qc.invalidateQueries({ queryKey: ['ejercicios-todas-rutinas'] })
      setShowForm(false)
      setNombre('')
      setMusculo('')
      setSeries(1)
      setDescanso(90)
      setRirObjetivo([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (ejercicioId: number) =>
      rutinaEjerciciosApi.delete(Number(id), ejercicioId),
    onSuccess: (_, ejercicioId) => {
      qc.invalidateQueries({ queryKey: ['rutina-ejercicios', id] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['streak'] })
      qc.invalidateQueries({ queryKey: ['routines'] })
      // Limpiar completado del ejercicio borrado del localStorage
      setCompletados(prev => {
        const next = prev.filter(i => i !== ejercicioId)
        localStorage.setItem(storageKey, JSON.stringify(next))
        return next
      })
    },
  })

  function handleNombreChange(val: string) {
    setNombre(val)
    if (val.trim().length < 2) {
      setSugerencias([])
      setShowSugerencias(false)
      return
    }
    // Nombres únicos de todas las rutinas del usuario
    const todosNombres = (ejerciciosOtrasRutinas ?? []).map((e: RutinaEjercicio) => e.nombre)
    const unicos = [...new Set(todosNombres)]
    const filtradas = unicos.filter((n: string) =>
      n.toLowerCase().includes(val.toLowerCase()) &&
      n.toLowerCase() !== val.toLowerCase()
    )
    setSugerencias(filtradas)
    setShowSugerencias(filtradas.length > 0)
  }

  const handleCreate = () => {
    if (!nombre.trim()) return
    createMutation.mutate({
      nombre,
      musculo: musculo || undefined,
      series,
      descanso,
      rir_objetivo: rirObjetivo.length === series ? rirObjetivo : undefined,
    })
  }

  function handleEjercicioClick(ej: RutinaEjercicio) {
    navigate(`/ejercicio/${ej.id}`, {
      state: {
        exercise: { id: ej.id, nombre: ej.nombre, musculo: ej.musculo ?? '', descripcion: ej.descripcion ?? '' },
        series: ej.series ?? 4,
        rutinaId: id,
        descanso: ej.descanso ?? 90,
        rir_objetivo: ej.rir_objetivo ?? [],
      }
    })
  }

  function marcarCompletado(ejId: number) {
    setCompletados(prev => {
      const next = prev.includes(ejId) ? prev.filter(i => i !== ejId) : [...prev, ejId]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const todosCompletos = ejercicios?.length
    ? ejercicios.every(ej => completados.includes(ej.id))
    : false

  useEffect(() => {
    if (todosCompletos && id) {
      routinesApi.completar(Number(id))
    }
  }, [todosCompletos])

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-24">
      <div className="px-5 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dorfin-muted text-sm mb-4">
          <ChevronLeft size={16} /> Mis rutinas
        </button>

        {loadingRoutine ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <>
            <p className="text-dorfin-muted text-xs tracking-widest uppercase mb-1">Día {routine?.dia}</p>
            <h1 className="font-display text-3xl text-dorfin-text leading-tight">{routine?.nombre}</h1>
            {ejercicios && ejercicios.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">
                  {ejercicios.map(ej => (
                    <div key={ej.id} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                      completados.includes(ej.id) ? 'bg-dorfin-green' : 'bg-dorfin-surface'
                    }`} />
                  ))}
                </div>
                <span className="text-dorfin-faint text-xs">{completados.length}/{ejercicios.length}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-5 space-y-3">
        {loadingEjercicios ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : ejercicios?.length === 0 ? (
          <EmptyState
            icon="🏋️"
            title="No hay ejercicios"
            subtitle="Agrega ejercicios a esta rutina"
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} className="inline mr-2" /> Agregar ejercicio
              </button>
            }
          />
        ) : (
          <>
            {ejercicios?.map((ej, i) => {
              const hecho = completados.includes(ej.id)
              return (
                <motion.div
                  key={ej.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card p-4 flex items-center gap-4 transition-all border-2 ${
                    hecho ? 'border-dorfin-green/50 bg-dorfin-green/5' : 'border-dorfin-purple/30'
                  }`}
                >
                  <button
                    onClick={() => marcarCompletado(ej.id)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      hecho ? 'bg-dorfin-green shadow-glow' : 'bg-dorfin-surface border border-dorfin-border'
                    }`}
                  >
                    {hecho
                      ? <Check size={20} className="text-dorfin-bg" strokeWidth={3} />
                      : <Dumbbell size={20} className="text-dorfin-green/60" />
                    }
                  </button>

                  <button className="flex-1 min-w-0 text-left" onClick={() => handleEjercicioClick(ej)}>
                    <h3 className={`font-semibold text-base leading-tight ${hecho ? 'text-dorfin-green' : 'text-dorfin-text'}`}>
                      {ej.nombre}
                    </h3>
                    <p className="text-dorfin-faint text-xs mt-0.5">
                      {ej.musculo ? `${ej.musculo} · ` : ''}{ej.series ?? 4} series
                    </p>
                  </button>

                  <button onClick={() => deleteMutation.mutate(ej.id)} className="p-2 rounded-lg hover:bg-dorfin-surface transition-colors">
                    <Trash2 size={15} className="text-dorfin-faint" />
                  </button>
                </motion.div>
              )
            })}

            {todosCompletos && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5 text-center border-dorfin-green/40 bg-dorfin-green/5"
              >
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-display text-2xl text-dorfin-green">¡DÍA COMPLETADO!</p>
                <p className="text-dorfin-muted text-sm mt-1">{ejercicios?.length} ejercicios terminados</p>
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="w-full card border-dashed border-dorfin-border p-4 flex items-center justify-center gap-2 text-dorfin-muted hover:text-dorfin-text hover:border-dorfin-purple transition-colors"
            >
              <Plus size={18} /> Agregar ejercicio
            </motion.button>
          </>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-dorfin-text font-semibold">Nuevo ejercicio</h3>
                <button onClick={() => { setShowForm(false); setNombre(''); setMusculo(''); setSeries(1); setDescanso(90); setShowSugerencias(false) }}>
                  <X size={18} className="text-dorfin-muted" />
                </button>
              </div>

              <div className="relative">
                <input
                  placeholder="Nombre del ejercicio (ej: Press banca)"
                  value={nombre}
                  onChange={e => handleNombreChange(e.target.value)}
                  className="input-field"
                  autoFocus
                  onBlur={() => setTimeout(() => setShowSugerencias(false), 150)}
                  onFocus={() => nombre.length >= 2 && sugerencias.length > 0 && setShowSugerencias(true)}
                />
                {showSugerencias && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-dorfin-card border border-dorfin-border rounded-xl overflow-hidden shadow-lg">
                    {sugerencias.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={() => {
                          setNombre(s)
                          setShowSugerencias(false)
                        }}
                        className="w-full px-4 py-3 text-left text-dorfin-text text-sm hover:bg-dorfin-surface border-b border-dorfin-border last:border-0"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                placeholder="Músculo (ej: Pectoral) — opcional"
                value={musculo}
                onChange={e => setMusculo(e.target.value)}
                className="input-field"
              />

              <div>
                <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-2">¿Cuántas series?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeries(s)}
                      className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                        series === s
                          ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green'
                          : 'card border-dorfin-border text-dorfin-muted'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-dorfin-muted text-xs uppercase tracking-widest mb-2">Descanso entre series (segundos)</p>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 90, 120, 180].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDescanso(s)}
                      className={`p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                        descanso === s
                          ? 'bg-dorfin-green/10 border-dorfin-green text-dorfin-green'
                          : 'card border-dorfin-border text-dorfin-muted'
                      }`}
                    >{s}s</button>
                  ))}
                </div>
              </div>

              {/* RIR objetivo por serie */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-dorfin-muted text-xs uppercase tracking-widest">RIR objetivo por serie</p>
                  <span className="text-dorfin-faint text-[10px]">opcional</span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: series }, (_, i) => {
                    const RIR_OPTS = [
                      { value: 0, label: 'RIR 0', color: 'text-red-400', border: 'border-red-400', bg: 'bg-red-400/10' },
                      { value: 1, label: 'RIR 1', color: 'text-orange-400', border: 'border-orange-400', bg: 'bg-orange-400/10' },
                      { value: 2, label: 'RIR 2', color: 'text-dorfin-green', border: 'border-dorfin-green', bg: 'bg-dorfin-green/10' },
                      { value: 4, label: 'RIR 4+', color: 'text-blue-400', border: 'border-blue-400', bg: 'bg-blue-400/10' },
                    ]
                    const current = rirObjetivo[i]
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-dorfin-faint text-xs w-12 shrink-0">Serie {i + 1}</span>
                        <div className="flex gap-1 flex-1">
                          {RIR_OPTS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                const next = [...rirObjetivo]
                                next[i] = opt.value
                                setRirObjetivo(next)
                              }}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                                current === opt.value
                                  ? `${opt.border} ${opt.bg} ${opt.color}`
                                  : 'border-dorfin-border text-dorfin-faint'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !nombre.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {createMutation.isPending
                  ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
                  : <><Check size={18} /> Agregar</>
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}