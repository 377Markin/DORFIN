import { motion } from 'framer-motion'
import { Flame, Calendar } from 'lucide-react'
import { useStreak } from '@/lib/hooks'
import { useAuthStore } from '@/lib/stores/authStore'
import { Skeleton } from '@/components/shared'

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const { data: streak, isLoading } = useStreak()

  return (
    <div className="min-h-dvh bg-dorfin-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <p className="text-dorfin-muted text-sm">Hola,</p>
        <h1 className="font-display text-4xl text-dorfin-text tracking-wide">
          {user?.nombre?.toUpperCase() ?? 'ATLETA'} 👋
        </h1>
      </div>

      {/* Mascot */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="flex justify-center py-2"
      >
        <img src="/dorfin-analitico.png" alt="Dorfin" className="w-44 h-44 object-contain drop-shadow-lg" />
      </motion.div>

      {/* Stats Grid */}
      <div className="px-5 grid grid-cols-2 gap-4 mt-2">
        {/* Racha Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-5 border-dorfin-green/30 animate-pulse-green"
        >
          <p className="text-dorfin-muted text-xs font-medium tracking-widest uppercase mb-3">Racha</p>
          {isLoading ? (
            <Skeleton className="h-14 w-14 rounded-full" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Flame size={44} className="text-dorfin-green" />
                <span className="absolute inset-0 flex items-center justify-center font-display text-lg text-dorfin-bg">
                  {streak?.racha ?? 0}
                </span>
              </div>
              <div>
                <p className="font-display text-4xl text-dorfin-green">{streak?.racha ?? 0}</p>
                <p className="text-dorfin-muted text-xs">días</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Días completados */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="card p-5"
        >
          <p className="text-dorfin-muted text-xs font-medium tracking-widest uppercase mb-3">Esta semana</p>
          {isLoading ? (
            <div className="flex gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5 items-end">
              {(streak?.dias_completados ?? []).map((dia, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring' }}
                    style={{ transformOrigin: 'bottom' }}
                    className={`w-full rounded-md transition-colors ${
                      dia.completado
                        ? 'bg-dorfin-green h-10 shadow-glow-sm'
                        : 'bg-dorfin-surface h-10 border border-dorfin-border'
                    }`}
                  />
                  <span className="text-[9px] text-dorfin-faint font-medium">{dia.dia}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick access — go to routines */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="px-5 mt-6"
      >
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={18} className="text-dorfin-green" />
            <h2 className="text-dorfin-text font-semibold">Acceso rápido</h2>
          </div>
          <a href="/rutinas" className="btn-primary w-full text-center block">
            Ver mis rutinas
          </a>
        </div>
      </motion.div>

      {/* Motivational footer */}
      <div className="px-5 mt-6 text-center">
        <p className="text-dorfin-faint text-xs">
          {(streak?.racha ?? 0) > 0
            ? `🔥 ${streak!.racha} días consecutivos. ¡Sigue así!`
            : '💪 Comienza tu racha hoy'}
        </p>
      </div>
    </div>
  )
}
