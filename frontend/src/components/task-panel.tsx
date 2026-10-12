import { useEffect, useRef, useState } from 'react'
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
   * Ejecuta una petición sobre esta tarea marcándola como ocupada: mientras
   * haya alguna en vuelo, los botones de estado de la fila se deshabilitan.
   * `write` indica que la petición modifica la tarea.
   */
  run: <T>(action: () => Promise<T>, write?: boolean) => Promise<T>
  /** Número de escrituras lanzadas sobre la tarea; sirve para descartar lecturas viejas. */
  writeVersion: () => number
  /**
   * Si hay ahora mismo alguna escritura en vuelo sobre la tarea (estado o
   * fecha). Es síncrono y vive en la página: sobrevive a cerrar y reabrir.
   */
  isWriting: () => boolean
  /** Hay alguna petición en curso sobre la tarea: el campo no se edita. */
  busy: boolean
  /** Para errores que llegan con el panel ya cerrado: se avisan en la página. */
  onError: (message: string) => void
}

const saveError = (error: unknown) =>
  error instanceof ApiError
    ? `No se pudo guardar la fecha. ${error.message}`
    : 'No se pudo guardar la fecha.'

/**
 * Lo que la lista no enseña de una tarea: su fecha de vencimiento y si está
 * vencida. El veredicto siempre viene del servidor; aquí no se calcula.
 */
export function TaskPanel({
  id,
  task,
  token,
  onTask,
  run,
  writeVersion,
  isWriting,
  busy,
  onError,
}: TaskPanelProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [openError, setOpenError] = useState<string | null>(null)
  const saved = task.dueDate ?? ''
  // Lo que hay escrito en el campo; solo se envía al confirmar.
  const [draft, setDraft] = useState(saved)
  const [dateError, setDateError] = useState<string | null>(null)
  const [isSaving, setSaving] = useState(false)
  const mounted = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)
  // Última fecha confirmada por el servidor, actualizada en cuanto responde:
  // un blur que llegue antes del siguiente render no debe reenviarla.
  const savedRef = useRef(saved)
  useEffect(() => {
    savedRef.current = saved
  }, [saved])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // El campo sigue a la fecha guardada cada vez que el servidor la confirma.
  useEffect(() => {
    setDraft(task.dueDate ?? '')
  }, [task.dueDate])

  // Al abrir se pide la tarea: el veredicto de la lista puede ser de ayer.
  useEffect(() => {
    let cancelled = false
    const issuedAt = writeVersion()
    // Una lectura emitida con una escritura en vuelo puede llegar con datos de
    // antes de esa escritura: la lista ya recibirá la respuesta de la escritura.
    const writingAtIssue = isWriting()
    run(() => api.getTask(token, task.id))
      .then((fresh) => {
        if (cancelled) return
        // Si mientras tanto se escribió en la tarea, esta lectura es vieja: la
        // lista ya tiene lo que devolvió esa escritura.
        if (!writingAtIssue && writeVersion() === issuedAt) onTask(fresh)
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
    // Dependencias vacías a propósito: solo se lee al abrir, y el panel se
    // monta de nuevo en cada apertura (se desmonta al cerrar). Las respuestas
    // posteriores llegan por `onTask`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (dueDate: string | null) => {
    // Guarda síncrona: con una escritura en vuelo sobre la tarea (fecha o
    // estado) no se lanza otra. Cubre también «Quitar fecha».
    if (isWriting()) return
    setDateError(null)
    setSaving(true)
    try {
      const updated = await run(
        () => api.updateTaskDueDate(token, task.id, dueDate),
        true,
      )
      savedRef.current = updated.dueDate ?? ''
      onTask(updated)
      if (dueDate === null && inputRef.current) {
        // Si quedaba texto a medias en el campo, React no lo reescribe (su
        // valor ya era ''): se limpia a mano para no dejar restos.
        inputRef.current.value = ''
        inputRef.current.focus()
      }
    } catch (error) {
      if (!mounted.current) {
        // Se cerró la tarea antes de la respuesta: que el fallo no se pierda.
        onError(saveError(error))
        return
      }
      setDraft(savedRef.current)
      setDateError(saveError(error))
    } finally {
      // `run` libera la guarda de escritura en su propio finally, tras éxito o
      // fallo (un fallo debe poder reintentarse). Tras un éxito, `savedRef` ya
      // tiene la fecha guardada antes de que pueda llegar otro evento, así que
      // un blur anterior al siguiente render no la reenvía.
      if (mounted.current) setSaving(false)
    }
  }

  // Se confirma al salir del campo o con Intro, nunca mientras se escribe:
  // así no se guardan fechas intermedias al teclear el año cifra a cifra.
  const commit = (input: HTMLInputElement) => {
    // Con un guardado en vuelo se ignora cualquier otra confirmación.
    if (isWriting()) return
    const incomplete = input.validity.badInput
    if (!incomplete && draft === savedRef.current) return

    if (!incomplete && FULL_DATE.test(draft)) {
      void save(draft)
      return
    }

    // Vacío, a medias o con un año de más de cuatro cifras. Vaciar el campo
    // no quita la fecha: para eso está «Quitar fecha».
    setDateError(INVALID_DATE)
    setDraft(savedRef.current)
    input.value = savedRef.current
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
                ref={inputRef}
                id={`${id}-due-date`}
                type="date"
                className="w-auto"
                value={draft}
                // readOnly y no disabled: deshabilitar quitaría el foco.
                readOnly={isSaving || busy}
                aria-busy={isSaving}
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
                  disabled={isSaving || busy}
                  // Sin robar el foco al campo: si no, su blur guardaría el
                  // borrador y este clic llegaría con el botón deshabilitado.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => save(null)}
                >
                  Quitar fecha
                </Button>
              )}
            </div>
            <FieldError id={`${id}-error`} message={dateError ?? undefined} />
          </div>

          {/* Región viva: se anuncia cuando aparece o desaparece «Vencida». */}
          <div aria-live="polite">
            {task.isOverdue && (
              <p className="text-destructive flex items-center gap-1.5 text-sm font-medium">
                <AlertTriangleIcon className="size-4" aria-hidden="true" />
                Vencida
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
