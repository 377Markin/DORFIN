import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLogin, useRegister } from '@/lib/hooks'
import { authApi } from '@/lib/api/auth'
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from '@/lib/validators'

type Step = 'email' | 'login' | 'register' | 'reset'

const METAS = ['Hipertrofia', 'Bajar de peso', 'Powerlifting', 'Definicion', 'Volumen']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

function ResetStepAuth({ email, onBack }: { email: string; onBack: () => void }) {
  const [fase, setFase] = useState<'solicitar' | 'codigo' | 'nueva'>('solicitar')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSolicitar = async () => {
    setLoading(true)
    try {
      await authApi.solicitarReset(email)
      setFase('codigo')
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
      toast.success('Contraseña actualizada — inicia sesión')
      onBack()
    } catch {
      toast.error('Código inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  if (fase === 'solicitar') {
    return (
      <button onClick={handleSolicitar} disabled={loading}
        className="btn-primary w-full flex items-center justify-center">
        {loading
          ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
          : 'Enviar código de verificación'}
      </button>
    )
  }

  if (fase === 'codigo') {
    return (
      <div className="space-y-4">
        <p className="text-dorfin-faint text-xs">Ingresa el código de 6 dígitos enviado a tu correo</p>
        <input placeholder="000000" value={codigo} onChange={e => setCodigo(e.target.value)}
          maxLength={6} autoFocus
          className="input-field text-center text-2xl tracking-widest font-display" />
        <button onClick={() => setFase('nueva')} disabled={codigo.length !== 6} className="btn-primary w-full">
          Verificar código
        </button>
        <button onClick={handleSolicitar} disabled={loading}
          className="w-full text-center text-dorfin-muted text-sm hover:text-dorfin-text transition-colors">
          Reenviar código
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-dorfin-faint text-xs">Ingresa tu nueva contraseña</p>
      <div className="relative">
        <input type={showPass ? 'text' : 'password'} placeholder="Nueva contraseña"
          value={nueva} onChange={e => setNueva(e.target.value)} className="input-field pr-12" />
        <button type="button" onClick={() => setShowPass(!showPass)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-dorfin-faint">
          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <input type="password" placeholder="Confirmar contraseña" value={confirmar}
        onChange={e => setConfirmar(e.target.value)} className="input-field" />
      <button onClick={handleConfirmar} disabled={loading || !nueva || !confirmar}
        className="btn-primary w-full flex items-center justify-center">
        {loading
          ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
          : 'Guardar nueva contraseña'}
      </button>
    </div>
  )
}

export default function AuthPage() {
  const [step, setStep] = useState<Step>('email')
  const [emailValue, setEmailValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [direction, setDirection] = useState(1)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const loginMutation = useLogin()
  const registerMutation = useRegister()

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const goTo = (newStep: Step, dir = 1) => {
    setDirection(dir)
    setStep(newStep)
  }

  const handleEmailContinue = async () => {
    if (!emailValue || !emailValue.includes('@')) {
      toast.error('Ingresa un email válido')
      return
    }
    setCheckingEmail(true)
    try {
      const { exists } = await authApi.checkEmail(emailValue)
      if (exists) {
        loginForm.setValue('email', emailValue)
        goTo('login')
      } else {
        registerForm.setValue('email', emailValue)
        goTo('register')
      }
    } finally {
      setCheckingEmail(false)
    }
  }

  const onLogin = (data: LoginFormData) => loginMutation.mutate(data)
  const onRegister = (data: RegisterFormData) => {
    const { confirmar, ...rest } = data
    registerMutation.mutate(rest)
  }

  return (
    <div className="min-h-dvh bg-dorfin-bg flex flex-col">
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="relative mb-6">
          <img src="/dorfin-mascot.png" alt="Dorfin" className="w-40 h-40 object-contain drop-shadow-lg" />
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }} className="font-display text-6xl text-dorfin-text tracking-widest">
          DORFIN
        </motion.h1>
        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }} className="text-dorfin-muted text-sm mt-1 text-center">
          Tu compañero de entrenamiento inteligente
        </motion.p>
      </div>

      <div className="flex-1 px-6 pb-10 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>

          {step === 'email' && (
            <motion.div key="email" custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }} className="space-y-4">
              <p className="text-dorfin-muted text-sm text-center mb-6">Introduce tu correo para continuar</p>
              <input type="email" autoFocus placeholder="email@dominio.com" value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailContinue()}
                className="input-field" />
              <button onClick={handleEmailContinue} disabled={checkingEmail}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {checkingEmail
                  ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
                  : 'Continuar'}
              </button>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-dorfin-border" />
                <span className="text-dorfin-faint text-xs">o</span>
                <div className="flex-1 h-px bg-dorfin-border" />
              </div>
              <button className="btn-secondary w-full flex items-center justify-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>
              <button className="btn-secondary w-full flex items-center justify-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.24 1.31-2.22 3.91.03 3.1 2.72 4.13 2.75 4.14l-.08.57zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continuar con Apple
              </button>
              <p className="text-dorfin-faint text-xs text-center mt-4 leading-relaxed">
                Al continuar, aceptas nuestros{' '}
                <span className="text-dorfin-muted underline cursor-pointer">Términos de Servicio</span>{' '}
                y{' '}
                <span className="text-dorfin-muted underline cursor-pointer">Política de Privacidad</span>
              </p>
            </motion.div>
          )}

          {step === 'login' && (
            <motion.div key="login" custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}>
              <button onClick={() => goTo('email', -1)}
                className="flex items-center gap-2 text-dorfin-muted text-sm mb-6 -ml-1">
                <ChevronLeft size={16} /> Volver
              </button>
              <h2 className="font-display text-3xl text-dorfin-text mb-1">Bienvenido</h2>
              <p className="text-dorfin-muted text-sm mb-6">{emailValue}</p>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <input type="hidden" {...loginForm.register('email')} />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} autoFocus
                    placeholder="Contraseña" className="input-field pr-12"
                    {...loginForm.register('contrasena')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dorfin-faint">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {loginForm.formState.errors.contrasena && (
                  <p className="text-red-400 text-xs">{loginForm.formState.errors.contrasena.message}</p>
                )}
                <button type="submit" disabled={loginMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center">
                  {loginMutation.isPending
                    ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
                    : 'Entrar'}
                </button>
              </form>
              <button type="button" onClick={() => goTo('reset', 1)}
                className="w-full text-center text-dorfin-muted text-sm mt-4 hover:text-dorfin-text transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div key="register" custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-y-auto">
              <button onClick={() => goTo('email', -1)}
                className="flex items-center gap-2 text-dorfin-muted text-sm mb-4 -ml-1">
                <ChevronLeft size={16} /> Volver
              </button>
              <h2 className="font-display text-3xl text-dorfin-text mb-1">Crear cuenta</h2>
              <p className="text-dorfin-muted text-sm mb-5">Cuéntanos sobre ti</p>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3">
                <input type="hidden" {...registerForm.register('email')} />
                <div>
                  <p className="text-dorfin-muted text-xs mb-2">Sexo biológico</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ val: 'hombre', label: '♂ Hombre' }, { val: 'mujer', label: '♀ Mujer' }].map(op => (
                      <label key={op.val} className="cursor-pointer">
                        <input type="radio" value={op.val} className="sr-only" {...registerForm.register('sexo')} />
                        <div className={`card p-3 text-sm text-center transition-all border-2 ${
                          registerForm.watch('sexo') === op.val
                            ? 'border-dorfin-green text-dorfin-green bg-dorfin-green/10'
                            : 'border-dorfin-border text-dorfin-muted'
                        }`}>{op.label}</div>
                      </label>
                    ))}
                  </div>
                </div>
                <input placeholder="Nombre" className="input-field" {...registerForm.register('nombre')} />
                {registerForm.formState.errors.nombre && (
                  <p className="text-red-400 text-xs -mt-1">{registerForm.formState.errors.nombre.message}</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Fecha nacimiento" type="date" className="input-field text-center"
                    {...registerForm.register('fecha_nacimiento')} />
                  <input placeholder="Altura cm" type="number" className="input-field text-center"
                    {...registerForm.register('altura', { valueAsNumber: true })} />
                  <input placeholder="Peso kg" type="number" className="input-field text-center"
                    {...registerForm.register('peso', { valueAsNumber: true })} />
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña"
                    className="input-field pr-12" {...registerForm.register('contrasena')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dorfin-faint">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input type="password" placeholder="Confirmar contraseña" className="input-field"
                  {...registerForm.register('confirmar')} />
                {registerForm.formState.errors.confirmar && (
                  <p className="text-red-400 text-xs">{registerForm.formState.errors.confirmar.message}</p>
                )}
                <div>
                  <p className="text-dorfin-muted text-xs mb-2">Tu objetivo:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {METAS.map((meta) => (
                      <label key={meta} className="cursor-pointer">
                        <input type="radio" value={meta} className="sr-only" {...registerForm.register('meta')} />
                        <div className={`card p-3 text-sm text-center transition-all ${registerForm.watch('meta') === meta ? 'border-dorfin-green text-dorfin-green shadow-glow-sm' : 'text-dorfin-muted'}`}>
                          {meta}
                        </div>
                      </label>
                    ))}
                  </div>
                  {registerForm.formState.errors.meta && (
                    <p className="text-red-400 text-xs mt-1">{registerForm.formState.errors.meta.message}</p>
                  )}
                </div>
                <button type="submit" disabled={registerMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center mt-2">
                  {registerMutation.isPending
                    ? <span className="w-5 h-5 border-2 border-dorfin-bg/40 border-t-dorfin-bg rounded-full animate-spin" />
                    : 'Crear cuenta 🔥'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'reset' && (
            <motion.div key="reset" custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }} className="space-y-4">
              <button onClick={() => goTo('login', -1)}
                className="flex items-center gap-2 text-dorfin-muted text-sm mb-4 -ml-1">
                <ChevronLeft size={16} /> Volver
              </button>
              <h2 className="font-display text-3xl text-dorfin-text mb-1">Recuperar cuenta</h2>
              <p className="text-dorfin-muted text-sm mb-4">
                Enviaremos un código a <span className="text-dorfin-text">{emailValue}</span>
              </p>
              <ResetStepAuth email={emailValue} onBack={() => goTo('login', -1)} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}