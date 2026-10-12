import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { TaskPanel } from '@/components/task-panel'
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
  // Avisos de un panel de fecha ya cerrado (fecha no guardada). Van aparte de
  // `notice` para que un cambio de estado posterior no los pise; se borran al
  // volver a abrir una tarea.
  const [dateNotice, setDateNotice] = useState<string | null>(null)
  // Peticiones en vuelo por tarea (estado, apertura o fecha). Es un contador,
  // no un conjunto: una petición que termina no libera la tarea si quedan otras.
  const [pending, setPending] = useState<ReadonlyMap<number, number>>(new Map())
  const isBusy = (id: number) => (pending.get(id) ?? 0) > 0
  // Escrituras lanzadas por tarea: una lectura emitida antes de la última
  // escritura se descarta, para que no pise datos más recientes.
  const writeVersions = useRef(new Map<number, number>())
  // Escrituras en vuelo por tarea, contadas de forma síncrona: la guarda vive
  // aquí y no en el panel, para que cerrar y reabrir una tarea no la pierda.
  const writesInFlight = useRef(new Map<number, number>())
  const isWriting = (id: number) => (writesInFlight.current.get(id) ?? 0) > 0
  // Como mucho una tarea abierta: la lista no debe acabar llena de fechas.
  const [openId, setOpenId] = useState<number | null>(null)

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

  const replaceTask = (task: Task) =>
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? task : item)),
    )

  const bump = (id: number, delta: number) =>
    setPending((current) => {
      const next = new Map(current)
      const count = (next.get(id) ?? 0) + delta
      if (count > 0) next.set(id, count)
      else next.delete(id)
      return next
    })

  const run = async <T,>(
    id: number,
    action: () => Promise<T>,
    write = false,
  ) => {
    const writes = writesInFlight.current
    if (write) {
      writeVersions.current.set(id, (writeVersions.current.get(id) ?? 0) + 1)
      writes.set(id, (writes.get(id) ?? 0) + 1)
    }
    bump(id, 1)
    try {
      return await action()
    } finally {
      if (write) {
        const left = (writes.get(id) ?? 1) - 1
        if (left > 0) writes.set(id, left)
        else writes.delete(id)
      }
      bump(id, -1)
    }
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (
      !token ||
      task.status === status ||
      isBusy(task.id) ||
      isWriting(task.id)
    )
      return

    const previous = task.status
    const setRowStatus = (value: TaskStatus) =>
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status: value } : item,
        ),
      )

    setNotice(null)
    setRowStatus(status)
    try {
      // La respuesta trae el veredicto de vencimiento recalculado.
      replaceTask(
        await run(
          task.id,
          () => api.updateTaskStatus(token, task.id, status),
          true,
        ),
      )
    } catch (error) {
      setRowStatus(previous)
      setNotice(
        error instanceof ApiError
          ? `${STATUS_ERROR} ${error.message}`
          : STATUS_ERROR,
      )
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

          {dateNotice && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{dateNotice}</AlertDescription>
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
                <li key={task.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
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
                          variant={
                            task.status === status ? 'default' : 'outline'
                          }
                          aria-pressed={task.status === status}
                          disabled={isBusy(task.id)}
                          onClick={() => handleStatusChange(task, status)}
                        >
                          {STATUS_LABELS[status]}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`${openId === task.id ? 'Cerrar' : 'Abrir'} «${task.title}»`}
                      aria-expanded={openId === task.id}
                      aria-controls={
                        openId === task.id ? `task-panel-${task.id}` : undefined
                      }
                      onClick={() => {
                        if (openId !== task.id) setDateNotice(null)
                        setOpenId((current) =>
                          current === task.id ? null : task.id,
                        )
                      }}
                    >
                      {openId === task.id ? 'Cerrar' : 'Abrir'}
                    </Button>
                  </div>
                  {/* Se desmonta al cerrar: con la tarea cerrada no queda
                      ninguna fecha ni marca de vencida en la página. */}
                  {openId === task.id && token && (
                    <TaskPanel
                      id={`task-panel-${task.id}`}
                      task={task}
                      token={token}
                      onTask={replaceTask}
                      run={(action, write) => run(task.id, action, write)}
                      writeVersion={() =>
                        writeVersions.current.get(task.id) ?? 0
                      }
                      isWriting={() => isWriting(task.id)}
                      writing={isWriting(task.id)}
                      busy={isBusy(task.id)}
                      onError={setDateNotice}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
