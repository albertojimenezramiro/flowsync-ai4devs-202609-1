import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'
import { TASK_STATUSES } from '#models/task'

/**
 * Esquemas del documento OpenAPI de tareas. Cada clase se publica una sola vez
 * en `components.schemas` con su nombre y las respuestas la referencian.
 *
 * Describen lo que el código **ya hace**: son el espejo de los transformers y
 * validadores, no una segunda fuente de verdad. Si uno de ellos cambia, esto
 * tiene que cambiar con él. Todos los tipos van explícitos para no depender de
 * los metadatos de reflexión.
 */

/**
 * Espejo de `TaskAssigneeTransformer`: lo justo para identificar al
 * responsable. Sin email, a propósito.
 */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Nulo si la cuenta se registró sin nombre.',
  })
  declare fullName: string | null

  @ApiProperty({ type: 'string', example: 'AL' })
  declare initials: string
}

/**
 * Espejo de `TaskTransformer`: la tarea tal y como sale en la lista, al crearla
 * y al cambiar su estado. No lleva fecha de vencimiento ni condición de
 * vencida: la lista no informa del vencimiento.
 */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare updatedAt: string
}

/**
 * Espejo de `TaskDetailTransformer`: lo mismo que `Task` más el vencimiento,
 * resuelto contra el día de referencia que manda quien pide.
 */
export class TaskDetail extends Task {
  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'Un día del calendario (AAAA-MM-DD), sin hora. Nulo si no tiene fecha.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Tiene fecha, esa fecha es anterior al día de referencia (`today`) y no está hecha.',
  })
  declare isOverdue: boolean
}

/** `{ data: Task }`, el envoltorio del serializer. */
export class TaskResponse {
  @ApiProperty({ type: Task })
  declare data: Task
}

/** `{ data: Task[] }`: la lista entera, sin paginar. */
export class TaskListResponse {
  @ApiProperty({ type: [Task] })
  declare data: Task[]
}

/** `{ data: TaskDetail }`. */
export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  declare data: TaskDetail
}

/** Cuerpo de `POST /api/v1/tasks` (`createTaskValidator`). */
export class CreateTaskBody {
  @ApiProperty({
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description:
      'Se recortan los espacios de los extremos antes de validar. Cualquier otro campo del cuerpo se ignora: la tarea nace pendiente, sin fecha y a nombre de quien la crea.',
  })
  declare title: string
}

/** Cuerpo de `PATCH /api/v1/tasks/:id/status` (`updateTaskStatusValidator`). */
export class UpdateTaskStatusBody {
  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string
}

/** Cuerpo de `PUT /api/v1/tasks/:id/due-date` (`setTaskDueDateValidator`). */
export class SetTaskDueDateBody {
  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'AAAA-MM-DD, o `null` para retirar la fecha.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'string',
    format: 'date',
    description: 'Día de referencia de quien pide (AAAA-MM-DD), para resolver `isOverdue`.',
  })
  declare today: string
}

/** Un error de validación de VineJS. */
export class ValidationErrorItem {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiProperty({ type: 'string', example: 'required' })
  declare rule: string

  @ApiProperty({ type: 'string', example: 'title' })
  declare field: string

  @ApiPropertyOptional({ type: 'object' })
  declare meta?: Record<string, unknown>
}

/** `422`: `{ errors: [...] }`, uno por regla incumplida. */
export class ValidationError {
  @ApiProperty({ type: [ValidationErrorItem] })
  declare errors: ValidationErrorItem[]
}

class UnauthorizedErrorItem {
  @ApiProperty({ type: 'string', example: 'Unauthorized access' })
  declare message: string
}

/** `401` del guard de auth. */
export class UnauthorizedError {
  @ApiProperty({ type: [UnauthorizedErrorItem] })
  declare errors: UnauthorizedErrorItem[]
}

/**
 * `404` de `findOrFail`. Fuera de producción el cuerpo trae además el detalle
 * de depuración del error.
 */
export class NotFoundError {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string
}
