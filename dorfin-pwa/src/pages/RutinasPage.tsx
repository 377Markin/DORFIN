import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Dumbbell, Moon, Trash2, X, Check } from 'lucide-react'
import { useRoutines, useCreateRoutine, useDeleteRoutine } from '@/lib/hooks'
import { useMutation } from '@tanstack/react-query'
import { routinesApi } from '@/lib/api'
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

export default function RutinasPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: routines, isLoading } = useRoutines()
  const qc = useQueryClient()
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
        <PageHeader title="DORFIN" subtitle="Tus rutinas de entrenamiento" />
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
                onClick={() => {
                  if (!isRest) navigate(`/rutinas/${routine.id}`)
                }}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          registrarDescansoMutation.mutate(routine.id)
                        }}
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
                  <input
                    type="number"
                    min={1}
                    value={dia}
                    onChange={(e) => setDia(Number(e.target.value))}
                    className="input-field text-center"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-dorfin-muted text-xs mb-1 block">Grupo muscular</label>
                  <select
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Escribe abajo o selecciona</option>
                    {MUSCLE_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                placeholder="O escribe un nombre personalizado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-field"
              />

              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !nombre.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Check size={18} /> Crear día
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}