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
  - Al escribir, la fecha se construye con `DateTime.fromISO(value, { zone: 'utc' })`. Lucid la guarda con `toISODate()` en esa misma zona, y al leerla la reconstruye con `DateTime.fromSQL` en la zona local del servidor. Como cada objeto formatea su fecha en su propia zona con `toISODate()`, ni la escritura ni la lectura cruzan medianoche y la fecha no se desplaza.
  - Si al implementarlo se observara algún desplazamiento, la alternativa es una regla en `database/schema_rules.ts` que mapee la columna a `string`. Esto se comprueba en la tarea de migración y no cambia la spec.

### Regla de vencimiento
- Vive en el modelo como un método `isOverdueOn(today: string): boolean`.
  - Devuelve `false` si `dueDate` es `null` o si `status === 'done'`.
  - Si no, devuelve `dueDate.toISODate()! < today`.
- La comparación es lexicográfica entre cadenas `YYYY-MM-DD`, que es correcta para fechas ISO y evita aritmética de horas.
- **Alternativa descartada**: calcularla en el frontend. La restricción del change exige que el veredicto lo dé la API.

### Día de referencia
- Un helper `referenceDate(request)` en `app/helpers/reference_date.ts` hace lo siguiente:
  - Lee `request.header('x-timezone')` y le quita los espacios.
  - Si falta o está vacía, devuelve `DateTime.utc().toISODate()`.
  - Si no, exige un nombre IANA. Para eso tiene que pasar dos filtros:
    - la forma `^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$`, que acepta `UTC`, `Europe/Madrid`, `Etc/GMT+12` y `America/Argentina/Buenos_Aires`, y rechaza `+02:00` o `UTC+3`;
    - `IANAZone.isValidZone(tz)`, porque luxon por sí solo aceptaría desfases como `+02:00`.
  - Si no pasa, lanza `errors.E_VALIDATION_ERROR([{ field: 'X-Timezone', rule: 'timezone', message: 'The X-Timezone header must be a valid IANA time zone name' }])`, que da `422` con la forma habitual `{ errors }`.
  - Si es válida, devuelve `DateTime.now().setZone(tz).toISODate()`.
  - Si llegan varias cabeceras, Node las une con comas y el resultado no pasa la forma, así que también da `422`.
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
  - El builder es `vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)` más una regla custom `calendarDate` (`vine.createRule`), que comprueba `DateTime.fromISO(value, { zone: 'utc' }).isValid` y rechaza `2026-02-30` o `2027-02-29`. La expresión regular ya rechaza los años de cinco cifras.
  - Se descarta `vine.date()` porque devuelve un `Date` con hora y zona, que es justo lo que hay que evitar.
  - Un número u otro tipo falla en `vine.string()` con `422`.
- **Quitar la fecha y «al menos un campo»** (corregido tras la revisión):
  - **No se usa `requiredIfMissing`**: VineJS trata `null` como ausente, así que `{ dueDate: null }` fallaría por «falta status/assigneeId/dueDate», justo el caso de quitar la fecha. Lo comprobó el revisor con el VineJS del proyecto.
  - Los tres campos son `optional()`. `dueDate` es además `nullable()`, y VineJS conserva `null` y descarta `undefined`. Como el bodyparser convierte `""` en `null`, las dos formas de quitar la fecha llegan como `null`.
  - En el controlador:
    1. Primero, la comprobación ya existente de `null` explícito en `status` y `assigneeId`.
    2. Después, validar.
    3. Por último, si `status`, `assigneeId` y `dueDate` son todos `undefined`, lanzar `E_VALIDATION_ERROR` con un error `required` para cada uno (`422`).
  - `dueDate !== undefined` indica que vino en el cuerpo: si es `null` se quita la fecha, y si es una cadena se pone.
  - `isOverdue` no se declara en ningún validador, así que VineJS lo descarta. Un cuerpo que solo trae `isOverdue` queda sin campos y da `422`.
- **`store`** acepta `dueDate` opcional, y sin él la tarea nace sin fecha.

### Frontend
- **Tipos**: `Task` gana `dueDate: string | null` e `isOverdue: boolean`.
- **`lib/api.ts`**:
  - `request()` añade siempre `X-Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - Funciones nuevas: `getTask(token, id)` y `updateTaskDueDate(token, id, dueDate: string | null)`.
  - `FIELD_LABELS` gana `dueDate: 'la fecha de vencimiento'`.
- **Mensajes**: no se toca `translate()`. El panel no usa los mensajes genéricos, sino sus propios textos:
  - Si `ApiError.fieldErrors.dueDate` existe, «Introduce una fecha completa y válida.».
  - En cualquier otro error, «No se pudo guardar la fecha.» seguido de `error.message`.
  - En la apertura, «No se pudo abrir la tarea.» seguido de `error.message`.
- **Fila con panel** (`tasks-page.tsx`):
  - Cada fila añade un `Button` `variant="ghost"` «Abrir» / «Cerrar», con `aria-expanded` y `aria-controls` apuntando al panel. Es un botón nativo, así que funciona con teclado sin código extra.
  - **Una sola tarea abierta a la vez**, guardada como `openId: number | null`. Abrir otra cierra la anterior. Así la lista no acaba mostrando fechas de muchas filas a la vez (espíritu de CA-11).
  - El panel se **desmonta** al cerrarse, así que no queda nada de fecha en el DOM. Con la fila cerrada no se pinta nada de fecha, aunque `dueDate` e `isOverdue` lleguen en la lista.
- **Componente `TaskPanel`** (`components/task-panel.tsx`):
  - **Carga**:
    - Al montarse llama a `getTask`. Mientras tanto muestra «Cargando…», sin campo ni veredicto: nunca enseña el `isOverdue` viejo de la lista.
    - Si falla, muestra «No se pudo abrir la tarea.» con el motivo.
    - Si va bien, actualiza la tarea en el estado de la lista y pinta lo siguiente:
      - `Label` «Fecha de vencimiento» con un `Input type="date"` controlado. Su valor en edición se guarda en un estado local `draft`, separado de la fecha guardada.
      - «Quitar fecha», solo si hay fecha.
      - «Vencida» como texto con icono y estilo destructivo, solo si `isOverdue`.
  - **Guardado al confirmar** (corregido tras la revisión):
    - `onChange` solo actualiza `draft`; no envía nada. Así se evita guardar fechas intermedias al teclear el año (`0002-…`, `0020-…`).
    - Se confirma en `onBlur` y con Intro (`onKeyDown`). Al pulsar «Cerrar», el input pierde el foco antes del clic y se confirma, así que no hace falta un paso de guardado extra (CA-16).
    - Al confirmar:
      - Si `draft` coincide con la fecha guardada, no se hace nada.
      - Si `draft` es una fecha completa (`^\d{4}-\d{2}-\d{2}$`), se envía `updateTaskDueDate` y se pinta la respuesta.
      - En cualquier otro caso (vacío, `validity.badInput` o año de cinco cifras), se muestra «Introduce una fecha completa y válida.» y `draft` vuelve a la fecha guardada. Vaciar el campo no quita la fecha: eso solo se hace con «Quitar fecha».
    - «Quitar fecha» envía `null` sin confirmación.
    - **Sin optimismo para la fecha**: se espera la respuesta, porque el veredicto debe venir del servidor. Si falla, `draft` vuelve a la fecha guardada y se muestra el error.
- **Un único bloqueo por tarea**:
  - El conjunto `savingIds` que ya bloquea los botones de estado durante un `PATCH` se amplía a toda petición sobre esa tarea: la carga del panel, el guardado de la fecha y el cambio de estado.
  - Mientras dure, se deshabilitan los botones de estado de la fila y «Quitar fecha». El input solo se deshabilita mientras se guarda la fecha, nunca mientras se escribe.
  - Al haber como mucho una petición en vuelo por tarea, una respuesta nunca pisa a otra más reciente, y la tarea puede reemplazarse entera con lo que devuelva el servidor.
- **Cambio de estado desde la fila**:
  - Sigue siendo optimista.
  - Al recibir la respuesta del `PATCH`, reemplaza la tarea con la del servidor. Así, el «Vencida» del panel abierto se actualiza al pasar a «Hecho» o al volver.
  - Si falla, revierte como hasta ahora.
- **Formulario de creación**: no cambia. No envía `dueDate`.

## Risks / Trade-offs

- [`X-Timezone` confía en lo que dice el cliente] → El único efecto es qué día cuenta como hoy en su propia respuesta. No cambia datos ni afecta a lo que ven otros, así que una zona falsa solo engaña a quien la envía.
- [Sin cabecera, UTC no es el día de nadie en concreto] → Está documentado. El frontend siempre la envía y UTC solo afecta a clientes como `curl`.
- [Columna `date` con luxon en SQLite: posible desplazamiento de un día] → Cada objeto se formatea en su propia zona con `toISODate()`. Se comprueba al migrar (tarea 1.2), y la alternativa es mapear la columna a `string` con `schema_rules.ts`.
- [El panel recarga la tarea al abrirse: una petición más por apertura] → Es mínima, y garantiza un veredicto fresco al abrir (CA-20) aunque la lista se cargara ayer. Mientras carga no se muestra ningún veredicto.
- [La validez de una zona depende del ICU del servidor: una zona IANA muy reciente que el navegador conozca y el servidor no daría `422` en todas las peticiones de tareas] → Node 24 incluye ICU completo y actualizado. Se acepta el riesgo. Si apareciera, la mitigación sería tratar una zona desconocida como UTC en vez de rechazarla, pero eso cambiaría la spec.
- [El usuario puede escribir una fecha y cerrar la pestaña sin salir del campo] → La fecha no se guarda. Es el comportamiento estándar de los campos que se guardan al confirmar, y es preferible a guardar valores intermedios.
- [El veredicto de las filas cerradas puede quedarse viejo] → No se muestra, así que no importa. Lo que se muestra siempre viene de una respuesta reciente.
- [Contrato de API ampliado: el `GET /tasks/:id` que antes era `404` ahora responde] → El único cliente es el frontend propio. La spec se actualiza en el mismo change.

## Migration Plan

- Migración aditiva: las tareas existentes quedan sin fecha.
- El rollback (`node ace migration:rollback`) elimina la columna. Las fechas guardadas se pierden, que es aceptable en desarrollo.
- El frontend y el backend se despliegan juntos. Un frontend viejo contra el backend nuevo sigue funcionando, porque ignora los campos nuevos y recibe veredictos en UTC.

## Open Questions

- **PA-6**: qué más debe mostrar la tarea abierta. El panel queda listo para crecer, pero este change no decide nada más.
- **PA-7**: confirmar que volver de «Hecho» con la fecha pasada debe dejar la tarea vencida de nuevo. La spec lo fija así por coherencia con la regla.
