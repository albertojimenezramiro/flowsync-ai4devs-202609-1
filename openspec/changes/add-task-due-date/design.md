# Design

## Context

La base es la capability `tasks` tal y como quedó tras `add-task-list`.

**Backend**
- Tabla `tasks` con `title`, `status` y `assignee_id`.
- `TaskTransformer` construye `{ id, title, status, assignee }`.
- `TasksController` tiene `index`, `store` y `update`.
- `PATCH /tasks/:id` usa un matcher de `:id` canónico (`^[1-9]\d*$`).
- Las respuestas pasan por `serialize()`.
- El bodyparser convierte `""` en `null`.
- `update` rechaza con `422` un `null` explícito en `status` o `assigneeId`.

**Frontend**
- `tasks-page.tsx` pinta filas con tres botones de estado y cambio optimista.
- `lib/api.ts` es el único punto de contacto con la API.

**Dependencias disponibles**
- `luxon` ya está en el backend (lo usa Lucid), con soporte de zonas IANA a través de `Intl`.
- No hay componente de fecha en `components/ui`.

Para la motivación y el alcance, ver proposal.md. Para el contrato, ver `specs/tasks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Una única implementación de la regla de vencimiento, en el backend, evaluada en cada respuesta con el día de quien mira.
- La fecha como fecha de calendario de extremo a extremo, sin que una zona horaria pueda desplazarla un día.
- La superficie mínima para «abrir la tarea» sin construir la pantalla de detalle.

**Non-Goals:**
- Pantalla o ruta de detalle (PA-6).
- Ordenar o filtrar por fecha, notificaciones, recordatorios y recurrencia.
- Control de concurrencia: gana la última escritura (PA-8).
- Tests.

## Decisions

### Persistencia
- Migración nueva `alter table tasks add due_date date null`. El reverso hace `dropColumn('due_date')`.
- Las tareas existentes quedan con `NULL`, que significa sin fecha, así que siguen siendo válidas.
- **`isOverdue` no tiene columna.** Persistirlo obligaría a recalcularlo con un job al cambiar el día, y además no puede depender de la zona de quien mira.
- **Tipo en el modelo.** Si el generador de esquema produce `@column.date() dueDate: DateTime | null`, se mantiene luxon.
  - La fecha se construye siempre con `DateTime.fromISO(value, { zone: 'utc' })` y se formatea con `toISODate()`. Así, parseo y formateo usan la misma zona y no puede correrse un día.
  - Si al implementarlo se observara algún desplazamiento, la alternativa es una regla en `database/schema_rules.ts` que mapee la columna a `string`. Esto se comprueba en la tarea de migración y no cambia la spec.

### Regla de vencimiento
- Vive en el modelo como un método `isOverdueOn(today: string): boolean`.
  - Devuelve `false` si `dueDate` es `null` o si `status === 'done'`.
  - Si no, devuelve `dueDate.toISODate()! < today`.
- La comparación es lexicográfica entre cadenas `YYYY-MM-DD`, que es correcta para fechas ISO y evita aritmética de horas.
- **Alternativa descartada**: calcularla en el frontend. La restricción del change exige que el veredicto lo dé la API.

### Día de referencia
- Un helper `referenceDate(request)` en `app/helpers/` (o en el controlador, si queda en pocas líneas) hace lo siguiente:
  - Lee `request.header('x-timezone')`.
  - Sin cabecera, devuelve `DateTime.utc().toISODate()`.
  - Con cabecera, valida con `IANAZone.isValidZone(tz)`. Si no es válida, lanza `errors.E_VALIDATION_ERROR([{ field: 'X-Timezone', rule: 'timezone', message: 'The X-Timezone header must be a valid IANA time zone' }])`, que da un `422` con la forma habitual `{ errors }`.
  - Si es válida, devuelve `DateTime.now().setZone(tz).toISODate()`.
- **Se resuelve al principio de cada acción**, antes de validar el cuerpo o tocar la BD. Así, una zona inválida en `store` o `update` no aplica ningún cambio, como exige la spec.
- **CORS**: `config/cors.ts` tiene `headers: true` y refleja las cabeceras pedidas, así que `X-Timezone` pasa el preflight sin cambios.
- **Alternativa descartada**: que el cliente envíe directamente su fecha (`X-Client-Date`). Se eligió la zona: el servidor sigue calculando «hoy» a partir del reloj, y el cliente solo dice dónde está.

### API
- **Transformer**: el constructor pasa a ser `constructor(resource: Task, private today: string)` y se usa como `TaskTransformer.transform(task, today)`. `BaseTransformer.transform` admite argumentos adicionales para el constructor.
  - Añade `dueDate: this.resource.dueDate?.toISODate() ?? null`.
  - Añade `isOverdue: this.resource.isOverdueOn(this.today)`.
  - Las cuatro acciones resuelven `today` y lo pasan al transformer.
- **`show`**:
  - Nueva ruta `GET /tasks/:id` con el mismo matcher canónico que el `PATCH`. El matcher se extrae a una constante en `routes.ts` para no duplicar la expresión regular.
  - Hace `Task.findOrFail`, `load('assignee')` y responde con `serialize`.
  - El `DELETE` sigue sin ruta y da `404`.
- **Validación de `dueDate`**: se comparte un builder `dueDate()` entre los validadores de creación y actualización, siguiendo el patrón de `email()` y `password()` en `validators/user.ts`.
  - El builder es `vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)` más una regla custom `calendarDate`, que comprueba `DateTime.fromISO(value, { zone: 'utc' }).isValid` y rechaza `2026-02-30`.
  - Se descarta `vine.date()` porque devuelve un `Date` con hora y zona, que es justo lo que hay que evitar.
  - Un número u otro tipo falla en `vine.string()` con `422`.
- **Quitar la fecha**:
  - `dueDate` se declara `.nullable().optional()`. Como el bodyparser convierte `""` en `null`, las dos formas de quitarla llegan como `null`.
  - En `update`, la comprobación previa de `null` explícito sigue aplicándose solo a `status` y `assigneeId`. Para `dueDate`, `null` significa quitar.
  - Para saber si `dueDate` vino en el cuerpo, se mira `'dueDate' in request.body()`. VineJS no distingue entre ausente y `null` una vez validado.
- **Al menos un campo** en `update`: cada uno de los tres campos lleva `requiredIfMissing` con los otros dos. `isOverdue` no se declara en ningún validador, así que VineJS lo descarta.
- **`store`** acepta `dueDate` opcional, y sin él la tarea nace sin fecha.

### Frontend
- **Tipos**: `Task` gana `dueDate: string | null` e `isOverdue: boolean`.
- **`lib/api.ts`**:
  - `request()` añade siempre `X-Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - Funciones nuevas: `getTask(token, id)` y `updateTaskDueDate(token, id, dueDate: string | null)`.
  - `FIELD_LABELS` gana `dueDate: 'la fecha de vencimiento'`.
- **Fila con panel** (`tasks-page.tsx`):
  - Cada fila añade un `Button` `variant="ghost"` «Abrir» / «Cerrar», con `aria-expanded` y `aria-controls` apuntando al panel. Es un botón nativo, así que funciona con teclado sin código extra.
  - Puede haber varias filas abiertas a la vez. Se guardan como `openIds: Set<number>`.
  - Con la fila cerrada no se pinta nada de fecha. Los datos de `dueDate` e `isOverdue` llegan en la lista, pero no se renderizan.
  - **El panel es un componente `TaskPanel` en el mismo fichero o en `components/task-panel.tsx`**:
    - Al montarse llama a `getTask` y actualiza la tarea en el estado de la lista con lo que devuelve el servidor.
    - Muestra `Label` «Fecha de vencimiento» con un `Input type="date"` nativo, un `Button` «Quitar fecha» (solo si hay fecha) y, si `task.isOverdue`, un texto «Vencida» con icono y estilo destructivo. El texto se lee aunque no se distinga el color.
  - **Guardado sin botón**:
    - En `onChange` del input, si `event.target.value` es una fecha completa, se llama a `updateTaskDueDate` y se reemplaza la tarea con la respuesta.
    - Si el valor está vacío pero `event.target.validity.badInput` es `true` (fecha a medio escribir), se muestra «Introduce una fecha completa y válida.» y no se envía nada.
    - Un valor vacío sin `badInput` (el usuario borró el campo) también se trata como incompleto. Quitar la fecha se hace **solo** con «Quitar fecha», para que un borrado accidental del teclado no la elimine.
  - **Sin optimismo para la fecha**: se espera la respuesta y se pinta lo que diga el servidor.
    - El veredicto de vencimiento debe venir del servidor, y la respuesta llega en lo que tarda una petición local.
    - Si falla, el input se resetea a la fecha guardada y se muestra el motivo con `FieldError`.
    - Mientras se envía, el input y el botón se deshabilitan.
  - **Cambio de estado desde la fila**: el cambio de estado optimista ya existente pasa a reemplazar la tarea con la respuesta del `PATCH` al terminar. Así, `isOverdue` del panel abierto se actualiza, por ejemplo, al pasar a «Hecho».
- **Formulario de creación**: no cambia. No envía `dueDate`.

## Risks / Trade-offs

- [`X-Timezone` confía en lo que dice el cliente] → El único efecto es qué día cuenta como hoy en su propia respuesta. No cambia datos ni afecta a lo que ven otros, así que una zona falsa solo engaña a quien la envía.
- [Sin cabecera, UTC no es el día de nadie en concreto] → Está documentado. El frontend siempre la envía y UTC solo afecta a clientes como `curl`.
- [Columna `date` con luxon en SQLite: posible desplazamiento de un día] → Parseo y formateo en UTC. Se comprueba al migrar, y la alternativa es mapear la columna a `string` con `schema_rules.ts`.
- [El panel recarga la tarea al abrirse: una petición más por apertura] → Es mínima, y garantiza un veredicto fresco al abrir (CA-20) aunque la lista se cargara ayer.
- [El veredicto de las filas cerradas puede quedarse viejo] → No se muestra, así que no importa. Lo que se muestra siempre viene de una respuesta reciente.
- [Contrato de API ampliado: el `GET /tasks/:id` que antes era `404` ahora responde] → El único cliente es el frontend propio. La spec se actualiza en el mismo change.

## Migration Plan

- Migración aditiva: las tareas existentes quedan sin fecha.
- El rollback (`node ace migration:rollback`) elimina la columna. Las fechas guardadas se pierden, que es aceptable en desarrollo.
- El frontend y el backend se despliegan juntos. Un frontend viejo contra el backend nuevo sigue funcionando, porque ignora los campos nuevos y recibe veredictos en UTC.

## Open Questions

- **PA-6**: qué más debe mostrar la tarea abierta. El panel queda listo para crecer, pero este change no decide nada más.
- **PA-7**: confirmar que volver de «Hecho» con la fecha pasada debe dejar la tarea vencida de nuevo. La spec lo fija así por coherencia con la regla.
