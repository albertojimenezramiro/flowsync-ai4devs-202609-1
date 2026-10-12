import { useEffect, useState } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task } from '@/lib/types'

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/
const INVALID_DATE = 'Introduce una fecha completa y válida.'

type TaskPanelProps = {
  id: string
  task: Task
  token: string
  /** Sustituye la tarea de la lista por la que devuelve el servidor. */
  onTask: (task: Task) => void
  /**
   * Ejecuta una petición sobre esta tarea con el bloqueo de la fila: como
   * mucho una en vuelo por tarea, para que ninguna respuesta pise a otra.
   */
  withLock: <T>(action: () => Promise<T>) => Promise<T>
}

/**
 * Lo que la lista no enseña de una tarea: su fecha de vencimiento y si está
 * vencida. El veredicto siempre viene del servidor; aquí no se calcula.
 */
export function TaskPanel({
  id,
  task,
  token,
  onTask,
  withLock,
}: TaskPanelProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [openError, setOpenError] = useState<string | null>(null)
  const saved = task.dueDate ?? ''
  // Lo que hay escrito en el campo; solo se envía al confirmar.
  const [draft, setDraft] = useState(saved)
  const [dateError, setDateError] = useState<string | null>(null)
  const [isSaving, setSaving] = useState(false)

  // Al abrir se pide la tarea: el veredicto de la lista puede ser de ayer.
  useEffect(() => {
    let cancelled = false
    withLock(() => api.getTask(token, task.id))
      .then((fresh) => {
        if (cancelled) return
        onTask(fresh)
        setDraft(fresh.dueDate ?? '')
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setOpenError(
          error instanceof ApiError
            ? `No se pudo abrir la tarea. ${error.message}`
            : 'No se pudo abrir la tarea.',
        )
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // Solo al abrir: las respuestas posteriores llegan por `onTask`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (dueDate: string | null) => {
    setDateError(null)
    setSaving(true)
    try {
      const updated = await withLock(() =>
        api.updateTaskDueDate(token, task.id, dueDate),
      )
      onTask(updated)
      setDraft(updated.dueDate ?? '')
    } catch (error) {
      setDraft(saved)
      if (error instanceof ApiError && error.fieldErrors.dueDate) {
        setDateError(INVALID_DATE)
      } else {
        setDateError(
          error instanceof ApiError
            ? `No se pudo guardar la fecha. ${error.message}`
            : 'No se pudo guardar la fecha.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  // Se confirma al salir del campo o con Intro, nunca mientras se escribe:
  // así no se guardan fechas intermedias al teclear el año cifra a cifra.
  const commit = (input: HTMLInputElement) => {
    const incomplete = input.validity.badInput
    if (!incomplete && draft === saved) return

    if (!incomplete && FULL_DATE.test(draft)) {
      void save(draft)
      return
    }

    // Vacío, a medias o con un año de más de cuatro cifras. Vaciar el campo
    // no quita la fecha: para eso está «Quitar fecha».
    setDateError(INVALID_DATE)
    setDraft(saved)
    input.value = saved
  }

  return (
    <div id={id} className="bg-muted/40 mt-3 grid gap-3 rounded-md p-3">
      {status === 'loading' && (
        <p
          className="text-muted-foreground text-sm"
          role="status"
          aria-live="polite"
        >
          Cargando…
        </p>
      )}

      {status === 'error' && (
        <p className="text-destructive text-sm" role="alert">
          {openError}
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-due-date`}>Fecha de vencimiento</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id={`${id}-due-date`}
                type="date"
                className="w-auto"
                value={draft}
                disabled={isSaving}
                onChange={(event) => {
                  setDateError(null)
                  setDraft(event.target.value)
                }}
                onBlur={(event) => commit(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commit(event.currentTarget)
                  }
                }}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? `${id}-error` : undefined}
              />
              {task.dueDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => save(null)}
                >
                  Quitar fecha
                </Button>
              )}
            </div>
            <FieldError id={`${id}-error`} message={dateError ?? undefined} />
          </div>

          {task.isOverdue && (
            <p className="text-destructive flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              Vencida
            </p>
          )}
        </>
      )}
    </div>
  )
}
