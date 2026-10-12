# Tasks

## 1. Modelo de datos (backend)

- [x] 1.1 Crear la migración de `tasks` con estas columnas: `id`; `title` (string 120, no nulo); `status` (string, no nulo, por defecto `'pending'`); `assignee_id` (FK a `users.id`, CASCADE); `created_at` y `updated_at`. Sin columna de vencimiento. Ejecutar `node ace migration:run` y verificar que `database/schema.ts` contiene `TaskSchema` con esas columnas.
- [x] 1.2 Definir la constante `TASK_STATUSES = ['pending', 'in_progress', 'done'] as const` y su tipo. Verificar con `npm run typecheck`.
- [x] 1.3 Crear el modelo `Task`, que extiende `TaskSchema`, con la relación `belongsTo` `assignee` hacia `User` por `assigneeId`. Verificar con `npm run typecheck`, y comprobar que `preload('assignee')` funciona a través de la API (`GET /api/v1/tasks` devuelve cada tarea con su `assignee`) en la tarea 2.5.

## 2. API de tareas (backend)

- [x] 2.1 Crear `createTaskValidator` (`title`: trim, longitud 1–120) y `updateTaskValidator` (`status`: enum de `TASK_STATUSES`; `assigneeId`: existe en `users.id`; cada campo `optional().requiredIfMissing` del otro). Verificar con `npm run typecheck`.
- [x] 2.2 Crear `TaskTransformer`, que expone `id`, `title`, `status` y `assignee: { id, fullName }`, sin email ni fechas. Verificar con `npm run typecheck`.
- [x] 2.3 Crear `TasksController` con tres acciones:
  - `index`: lista con `preload('assignee')`, **sin `orderBy`**, con un comentario que remite a PA-3.
  - `store`: crea con `status: 'pending'` explícito y como responsable a quien está autenticado, hace `load('assignee')` y responde `201`.
  - `update`: usa `findOrFail`, rechaza con `422` un `status` o `assigneeId` presentes con valor `null` (en el cuerpo crudo), aplica solo los campos presentes y hace `load('assignee')`.

  Verificar con `npm run typecheck`.
- [x] 2.4 Registrar en `start/routes.ts`, bajo `/api/v1`, el grupo `tasks` con `middleware.auth()` y exactamente `GET /tasks`, `POST /tasks` y `PATCH /tasks/:id`. Arrancar `npm run dev` para regenerar `.adonisjs/` y comprobar con `node ace list:routes` que solo aparecen esas tres rutas de tareas.
- [x] 2.5 Comprobar a mano con `curl` los escenarios de API de `specs/tasks/spec.md`:
  - `401` sin token.
  - Creación `201` en `pending` y a nombre propio, ignorando `status` y `assigneeId`.
  - Título vacío, de solo espacios y de 121 caracteres → `422`. Título de 120 caracteres → OK. Espacios alrededor recortados.
  - `PATCH` de estado, vuelta atrás desde `done` y reasignación válida.
  - `blocked`, `Hecho`, `assigneeId` inexistente, cuerpo vacío, `{status:null|"", assigneeId:<válido>}` y `{status:"done", assigneeId:null}` → `422`, sin cambiar la tarea.
  - Responsable registrado sin nombre → `assignee.fullName` es `null`.
  - `id` inexistente → `404`.
  - `GET` y `DELETE` sobre `/tasks/:id` → `404`.
  - El email del responsable no aparece en ninguna respuesta.
- [x] 2.6 Ejecutar `npm run lint` y `npm run typecheck` en `backend/` sin errores, y commitear el diff regenerado de `.adonisjs/`.

## 3. Cliente de API y tipos (frontend)

- [x] 3.1 Añadir a `lib/types.ts` `TaskStatus`, `Task` (con `assignee: { id, fullName: string | null }`) y `STATUS_LABELS` (Pendiente / En curso / Hecho). Verificar con `npm run build`.
- [x] 3.2 Añadir a `lib/api.ts`:
  - Soporte de `PATCH` en `request`.
  - Las funciones `listTasks`, `createTask` y `updateTaskStatus`.
  - La etiqueta `title: 'el título'` en `FIELD_LABELS`.

  No cambiar ningún texto existente. Verificar con `npm run build` y `npm run lint`.

## 4. Pantalla de lista (frontend)

- [x] 4.1 Crear `pages/tasks-page.tsx` con estos elementos:
  - Una `Card` con el título «Tareas del equipo» y un enlace «Mi perfil».
  - Carga de la lista con indicador de carga y `Alert` si falla.
  - Filas con título, responsable (`fullName?.trim() || 'Sin nombre'`) y estado según `STATUS_LABELS`.
  - Ninguna fecha.
  - Ningún orden aplicado en el cliente.

  Verificar en el navegador que una tarea creada por `curl` aparece con su responsable y su estado, y que un usuario sin nombre, o con nombre de solo espacios (creado por `curl`), se ve como «Sin nombre».
- [x] 4.2 Añadir el estado vacío: un texto que explica que aquí está el trabajo de todo el equipo y anima a crear la primera tarea. Verificar en el navegador con la tabla `tasks` vacía.
- [x] 4.3 Añadir el formulario de creación, con un único `Input` sin `maxLength` y el botón «Crear tarea» deshabilitado mientras se envía y hasta que termina la carga inicial. Incluye:
  - Validación en cliente con los textos «Escribe un título para la tarea.» y «El título no puede superar los 120 caracteres.», mostrados con `FieldError` sin llamar a la API.
  - Al terminar con éxito, la tarea se añade a la lista y el campo se vacía.

  Verificar en el navegador:
  - Vacío, solo espacios y 121 caracteres muestran su aviso, sin petición en la pestaña Red y con el texto intacto.
  - Un título válido aparece en «Pendiente» a nombre propio sin recargar.
- [x] 4.4 Añadir el cambio de estado por fila con tres `Button` (Pendiente / En curso / Hecho), con el actual en `variant="default"` y `aria-pressed`. El comportamiento:
  - Actualización optimista.
  - Botones de la fila deshabilitados mientras la petición está en vuelo.
  - Si falla, rollback y `Alert` con «No se pudo guardar el cambio de estado.» seguido del motivo.

  Verificar en el navegador:
  - El cambio es inmediato y persiste al recargar.
  - Funciona sobre una tarea de otra persona.
  - Con el backend parado, la fila vuelve a su estado anterior y aparece «No se pudo guardar el cambio de estado. No se pudo conectar con el servidor…».

## 5. Rutas y navegación (frontend)

- [x] 5.1 Registrar `/tasks` dentro de `ProtectedRoute`. Cambiar el comodín y la redirección de `PublicOnlyRoute` a `/tasks`. Añadir en el perfil un enlace «Tareas del equipo». Verificar en el navegador:
  - Login y registro llevan a `/tasks`.
  - Una URL inventada con sesión lleva a `/tasks`.
  - `/tasks` sin sesión lleva a `/login`.
  - Los enlaces lista ↔ perfil funcionan.
- [x] 5.2 Ejecutar `npm run build` y `npm run lint` en `frontend/` sin errores.

## 6. Integración

- [x] 6.1 Recorrido completo con dos cuentas en dos navegadores:
  - A crea una tarea; B, al cargar, la ve a nombre de A.
  - B la pasa a «Hecho» y A, al recargar, lo ve.
  - Ninguno ve emails, fechas ni presencia.
  - No existe ninguna vista «mis tareas».
- [x] 6.2 Ejecutar `openspec validate add-task-list --strict` sin errores.
