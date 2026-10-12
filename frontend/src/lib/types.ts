/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/** Valores tal como viajan por la API. Nunca se usan los textos en castellano como identificador. */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export const TASK_STATUSES: readonly TaskStatus[] = [
  'pending',
  'in_progress',
  'done',
]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/**
 * Espejo de `TaskTransformer` del backend: el responsable llega reducido a su
 * id y su nombre, sin email.
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  assignee: { id: number; fullName: string | null }
}
