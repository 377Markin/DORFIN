import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

import { BottomNav } from '@/components/shared/BottomNav'
import { ProtectedRoute } from '@/components/shared'

import AuthPage from '@/pages/AuthPage'
import HomePage from '@/pages/HomePage'
import RutinasPage from '@/pages/RutinasPage'
import RutinaDetailPage from '@/pages/RutinaDetailPage'
import EjercicioPage from '@/pages/EjercicioPage'
import MesocicloPage from '@/pages/MesocicloPage'
import PerfilPage from '@/pages/PerfilPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
})

function AppLayout() {
  const location = useLocation()
  const isAuth = location.pathname === '/auth'

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/auth" element={<AuthPage />} />

            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/mesociclo" element={<ProtectedRoute><MesocicloPage /></ProtectedRoute>} />
            <Route path="/rutinas" element={<ProtectedRoute><RutinasPage /></ProtectedRoute>} />
            <Route path="/rutinas/:id" element={<ProtectedRoute><RutinaDetailPage /></ProtectedRoute>} />
            <Route path="/ejercicio/:id" element={<ProtectedRoute><EjercicioPage /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><PerfilPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {!isAuth && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="max-w-md mx-auto relative min-h-dvh">
          <AppLayout />
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1530',
              color: '#F0EEF8',
              border: '1px solid #3A3060',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#39FF14', secondary: '#0F0B1E' },
            },
            error: {
              iconTheme: { primary: '#FF4444', secondary: '#0F0B1E' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
