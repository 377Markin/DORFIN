import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmar: z.string(),
  fecha_nacimiento: z.string().min(1, 'Ingresa tu fecha de nacimiento'),
  altura: z.number({ coerce: true }).min(100).max(250),
  peso: z.number({ coerce: true }).min(30).max(300),
  meta: z.string().min(1, 'Selecciona una meta'),
}).refine((d) => d.contrasena === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})

export const trainingLogSchema = z.object({
  ejercicio_id: z.number(),
  series: z.number().min(1).max(20),
  repeticiones: z.string().min(1),
  rir: z.number().min(0).max(4),
  descanso: z.string().default('90s'),
  anotaciones: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type TrainingLogFormData = z.infer<typeof trainingLogSchema>