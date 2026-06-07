import { motion } from 'framer-motion'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Loading Screen ────────────────────────────────────────────
export function LoadingScreen({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-dorfin-bg flex flex-col items-center justify-center z-50">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-5xl mb-4"
      >
        🔥
      </motion.div>
      <p className="text-dorfin-muted font-body text-sm">{message}</p>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-dorfin-surface rounded-xl ${className}`}
    />
  )
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }: {
  icon?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <span className="text-5xl mb-4">{icon}</span>}
      <h3 className="text-dorfin-text font-body font-semibold text-lg mb-2">{title}</h3>
      {subtitle && <p className="text-dorfin-muted text-sm mb-6">{subtitle}</p>}
      {action}
    </div>
  )
}

// ── Error Card ────────────────────────────────────────────────
export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-4 flex items-start gap-3 border-red-500/30">
      <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-red-400 text-sm font-medium">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-dorfin-green text-xs mt-2 underline">
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, showBack = false }: {
  title: string
  subtitle?: string
  showBack?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-3 mb-6">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-dorfin-surface border border-dorfin-border transition-colors active:bg-dorfin-border"
        >
          <ChevronLeft size={20} className="text-dorfin-text" />
        </button>
      )}
      <div>
        <h1 className="font-display text-3xl text-dorfin-text tracking-wide">{title}</h1>
        {subtitle && <p className="text-dorfin-muted text-sm mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Protected Route ───────────────────────────────────────────
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/stores/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return <>{children}</>
}
