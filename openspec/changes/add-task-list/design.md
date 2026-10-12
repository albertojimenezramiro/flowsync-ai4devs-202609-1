# Design

## Context

Hoy el sistema solo tiene autenticación. Para entender ese estado de partida conviene repasar algunos puntos.

**Backend**
- Los modelos no declaran columnas: extienden la clase que se genera en `database/schema.ts` a partir de las migraciones.
- Toda respuesta pasa por `serialize()` con un transformer y sale envuelta en `{ data }`.
- Las rutas usan el mapa generado `controllers` y el middleware `auth()` aplicado por grupo.
- El bodyparser convierte las cadenas vacías en `null`.

**Frontend**
- `lib/api.ts` es el único punto de contacto con la API.
- Las páginas siguen el patrón de las de login y perfil: una tarjeta (`Card`) con `Alert` y `FieldError`.
- Las rutas protegidas cuelgan de `ProtectedRoute`.
- Solo hay instalados cinco componentes de shadcn: alert, button, card, input y label. No se pueden añadir dependencias.

Para la motivación y el alcance, ver proposal.md. Para el contrato, ver `specs/tasks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Un modelo de datos mínimo que no deje preparada ninguna fecha de vencimiento ni ningún orden.
- Que el responsable salga de la API reducido a su `id` y su `fullName` por construcción, no por disciplina en cada controlador.
- Que el cambio de estado se vea al instante en la UI sin perder la coherencia con el servidor.

**Non-Goals:**
- Paginación. El PRD contempla unas 200 tareas, así que basta una sola petición.
- Refresco en tiempo real.
- Control de concurrencia: si dos personas tocan la misma tarea, gana la última escritura.
- Un selector de responsable en la UI.

## Decisions

### Modelo de datos
- **Tabla nueva `tasks`** con estas columnas:
  - `id`.
  - `title`: `string(120)`, no nulo.
  - `status`: `string`, no nulo, con valor por defecto `'pending'`.
  - `assignee_id`: entero, no nulo, FK a `users.id` con `onDelete('CASCADE')`.
  - `created_at` y `updated_at`.
- Las marcas de tiempo se mantienen por convención de Lucid, pero no salen por la API ni en pantalla.
- **No** hay columna de vencimiento ni de creador. «Quién la creó» no es requisito: la tarea nace a nombre de quien la crea y luego puede reasignarse.
- **Estado como string validado, no como enum ni CHECK de BD.**
  - SQLite no tiene enum nativo, y el CHECK de knex sobre SQLite complica migraciones futuras.
  - La garantía de «conjunto cerrado» vive en la validación, por la que pasan todas las escrituras.
  - El conjunto se define una sola vez como constante (`TASK_STATUSES = ['pending', 'in_progress', 'done'] as const`) y lo comparten validador y tipos.
  - Alternativa descartada: CHECK en la migración. Aporta defensa en profundidad, pero en SQLite obliga a recrear la tabla para cambiarlo, y la API es el único escritor.
- **Modelo `Task`** que extiende `TaskSchema` y declara `@belongsTo(() => User, { foreignKey: 'assigneeId' }) declare assignee`.

### API
- **Rutas**: un grupo `tasks` bajo `/api/v1` con `.use(middleware.auth())`. Contiene exactamente tres rutas:
  - `GET /tasks` → `TasksController.index`.
  - `POST /tasks` → `TasksController.store`.
  - `PATCH /tasks/:id` → `TasksController.update`.
- No se usa `router.resource`, que generaría `show` y `destroy`. Se declaran las tres rutas a mano para que la superficie cerrada sea explícita.
- **index**: `Task.query().preload('assignee')`, **sin `orderBy`**. Es una decisión consciente por PA-3: el orden queda indefinido, sin inventar un criterio. Se documenta en el propio código con un comentario que remite a PA-3.
- **store**:
  - Valida con `createTaskValidator = vine.create({ title: vine.string().trim().minLength(1).maxLength(120) })`.
  - Hace `Task.create({ title, assigneeId: auth.user.id })` y responde con `response.status(201)` y `serialize(...)`.
  - El estado lo pone el valor por defecto de la columna; se recarga, o se asigna explícitamente `status: 'pending'` para que vuelva en la respuesta.
  - VineJS descarta los campos no declarados, así que `status` o `assigneeId` en el cuerpo se ignoran sin código extra.
- **update**:
  - Hace `Task.findOrFail(params.id)`, que da `404` si no existe.
  - Valida con `updateTaskValidator`, que tiene estos campos:
    - `status: vine.enum(TASK_STATUSES).optional().requiredIfMissing('assigneeId')`.
    - `assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional().requiredIfMissing('status')`.
  - Aplica solo los campos presentes, guarda, hace `load('assignee')` y responde con `serialize`.
  - Si el cuerpo está vacío, los dos `requiredIfMissing` fallan y devuelven `422`.
- **TaskTransformer**:
  - Usa `pick` sobre `id`, `title` y `status`.
  - Añade `assignee` construido a mano como `{ id, fullName }`.
  - No se reutiliza `UserTransformer`, que expone `email` y fechas. Este es el punto delicado que señala la historia E3-1.
- Tras tocar controladores y rutas, se arranca el servidor para regenerar `.adonisjs/` y se commitea el diff.

### Frontend
- **Tipos** en `lib/types.ts`:
  - `TaskStatus = 'pending' | 'in_progress' | 'done'`.
  - `Task = { id, title, status, assignee: { id, fullName: string | null } }`.
  - `STATUS_LABELS: Record<TaskStatus, string>` con «Pendiente», «En curso» y «Hecho». Es el único sitio donde aparecen los textos en castellano; nunca se usan como identificadores.
- **API** en `lib/api.ts`:
  - Funciones nuevas: `listTasks(token)`, `createTask(token, title)` y `updateTaskStatus(token, id, status)`.
  - Se amplía `request` para aceptar `PATCH`.
  - Se añade `title: 'el título'` a `FIELD_LABELS`.
  - No se cambia ningún texto existente de `translate`.
- **Página** `pages/tasks-page.tsx`, dentro de una `Card` con la misma estética que el perfil:
  - Cabecera con el título «Tareas del equipo» y un enlace «Mi perfil».
  - Formulario de una línea: `Input` y `Button` «Crear tarea».
    - Antes de llamar a la API se valida en cliente: título vacío tras `trim` o de más de 120 caracteres. El mensaje se muestra con `FieldError`.
    - El `Input` **no** lleva `maxLength`, porque el navegador truncaría en silencio.
    - Al terminar con éxito se añade la tarea devuelta al estado local y se vacía el campo.
  - Lista como `<ul>`. Cada fila muestra el título, el responsable (`fullName ?? 'Sin nombre'`) y un grupo de tres `Button` de tamaño pequeño:
    - Cada botón es un estado.
    - El actual lleva `variant="default"` y `aria-pressed`; los demás, `variant="outline"`.
    - Se usan botones porque no hay `select` de shadcn instalado y no se añaden dependencias. Un `<select>` nativo rompería la estética, y además los tres botones dejan los destinos visibles y cambian el estado con un solo clic.
  - **Cambio de estado optimista**:
    - Se actualiza la fila en el estado local y se llama a la API.
    - Si falla, se restaura el estado anterior y se muestra un `Alert` con el mensaje de `ApiError`, o «No se pudo guardar el cambio de estado.».
    - Los botones de esa fila se deshabilitan mientras la petición está en vuelo, para evitar carreras dentro de la misma fila.
  - Estados de la página:
    - Cargando: `FullScreenLoader` o un texto equivalente dentro de la tarjeta.
    - Error al cargar: `Alert`.
    - Lista vacía: texto explicativo, más el formulario siempre visible encima.
  - El orden es el que devuelve la API, sin ordenar en el cliente (PA-3). Las tareas recién creadas se añaden al final.
- **Rutas**:
  - Se añade `/tasks` dentro de `ProtectedRoute`.
  - El comodín y `PublicOnlyRoute` redirigen a `/tasks` en vez de `/profile`.
  - El perfil gana un enlace «Tareas del equipo».
- **Sesión expirada**: si una llamada de tareas devuelve `401`, se muestra el aviso, igual que hoy. Interceptar el `401` de forma global queda fuera de este change.

## Risks / Trade-offs

- [Sin orden definido, la lista puede reordenarse entre cargas o entre motores de BD] → Se acepta y se documenta como PA-3. En la práctica, SQLite devuelve el orden de inserción. Nadie debe depender de ello.
- [El estado solo se valida en la API, no en la BD] → La API es el único escritor. El conjunto vive en una constante compartida.
- [Optimismo en el cambio de estado: si el usuario cambia y recarga antes de la respuesta, podría ver el valor viejo] → Ventana mínima. El rollback cubre los errores explícitos.
- [Borrar un usuario borraría sus tareas por el CASCADE] → Hoy no existe borrado de usuarios. Se anota para cuando exista.
- [Gana la última escritura entre dos personas] → Aceptado. El refresco y los conflictos son E3-2 y PA-8.
- [El cambio de portada a `/tasks` contradice la spec viva `auth` (en PR aparte), que dice «comodín → perfil»] → Al integrar ambas, actualizar ese requisito de `auth` con un delta MODIFIED o directamente en la spec viva.

## Migration Plan

- Migración aditiva: crea una tabla nueva y no toca datos existentes.
- El rollback es `node ace migration:rollback`, que borra `tasks`.
- El frontend no requiere migración de datos. El token guardado sigue valiendo.
