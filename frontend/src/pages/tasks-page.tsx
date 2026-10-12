import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import {
  STATUS_LABELS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from '@/lib/types'

const MAX_TITLE_LENGTH = 120
const STATUS_ERROR = 'No se pudo guardar el cambio de estado.'

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback

export function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Último aviso de una acción (crear o cambiar estado): cada acción lo
  // sustituye, así nunca queda visible uno obsoleto tapando al nuevo.
  const [notice, setNotice] = useState<string | null>(null)
  // Filas con un cambio de estado en vuelo: sus botones se bloquean.
  const [savingIds, setSavingIds] = useState<ReadonlySet<number>>(new Set())

  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isCreating, setCreating] = useState(false)
  // Guarda síncrona contra el doble envío: el estado no se refleja hasta el
  // siguiente render.
  const creatingRef = useRef(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    api
      .listTasks(token)
      .then((list) => {
        if (!cancelled) setTasks(list)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            errorMessage(error, 'No se pudo cargar la lista de tareas.'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token || creatingRef.current) return

    // Validación local: no se gasta una petición en un despiste evidente y,
    // sobre todo, nunca se recorta el texto en silencio.
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Escribe un título para la tarea.')
      return
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      setTitleError(
        `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`,
      )
      return
    }

    setTitleError(null)
    setNotice(null)
    creatingRef.current = true
    setCreating(true)
    try {
      const task = await api.createTask(token, trimmed)
      // Sin regla de orden (PA-3): se coloca al final de forma provisional.
      setTasks((current) => [...current, task])
      setTitle('')
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.title) {
        setTitleError(error.fieldErrors.title)
      } else {
        setNotice(errorMessage(error, 'Algo ha ido mal. Inténtalo de nuevo.'))
      }
    } finally {
      creatingRef.current = false
      setCreating(false)
    }
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (!token || task.status === status) return

    const previous = task.status
    const setRowStatus = (value: TaskStatus) =>
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status: value } : item,
        ),
      )

    setNotice(null)
    setRowStatus(status)
    setSavingIds((current) => new Set(current).add(task.id))
    try {
      await api.updateTaskStatus(token, task.id, status)
    } catch (error) {
      setRowStatus(previous)
      setNotice(
        error instanceof ApiError
          ? `${STATUS_ERROR} ${error.message}`
          : STATUS_ERROR,
      )
    } finally {
      setSavingIds((current) => {
        const next = new Set(current)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <Card className="w-full max-w-2xl self-start">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Tareas del equipo</CardTitle>
              <CardDescription>
                Una sola lista para todo el equipo: quién lleva cada tarea y en
                qué estado está.
              </CardDescription>
            </div>
            <Link
              to="/profile"
              className="text-foreground shrink-0 text-sm font-medium underline"
            >
              Mi perfil
            </Link>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6">
          <form onSubmit={handleCreate} className="grid gap-2" noValidate>
            <Label htmlFor="title">Nueva tarea</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                name="title"
                placeholder="¿En qué estás trabajando?"
                autoComplete="off"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleError ? 'title-error' : undefined}
              />
              <Button
                type="submit"
                disabled={isCreating || isLoading || Boolean(loadError)}
              >
                {isCreating ? 'Creando…' : 'Crear tarea'}
              </Button>
            </div>
            <FieldError id="title-error" message={titleError ?? undefined} />
          </form>

          {(notice || loadError) && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{loadError ?? notice}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <p
              className="text-muted-foreground text-sm"
              role="status"
              aria-live="polite"
            >
              Cargando tareas…
            </p>
          ) : tasks.length === 0 && !loadError ? (
            <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              <p className="text-foreground font-medium">
                Todavía no hay ninguna tarea.
              </p>
              <p className="mt-1">
                Aquí verás el trabajo de todo el equipo: cada tarea, quién la
                lleva y en qué estado está. Escribe arriba un título para crear
                la primera.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words">{task.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {task.assignee.fullName?.trim() || 'Sin nombre'}
                    </p>
                  </div>
                  <div
                    className="flex gap-1"
                    role="group"
                    aria-label={`Estado de «${task.title}»`}
                  >
                    {TASK_STATUSES.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={task.status === status ? 'default' : 'outline'}
                        aria-pressed={task.status === status}
                        disabled={savingIds.has(task.id)}
                        onClick={() => handleStatusChange(task, status)}
                      >
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
