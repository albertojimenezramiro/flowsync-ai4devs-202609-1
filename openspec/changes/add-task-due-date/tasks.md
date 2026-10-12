# Tasks

## 1. Persistencia (backend)

- [ ] 1.1 Crear la migración que añade `due_date` (date, nullable) a `tasks`, con un reverso que la elimina. Ejecutar `node ace migration:run` sobre la BD con tareas existentes y verificar:
  - Las tareas siguen ahí, con `due_date` a `NULL`.
  - `database/schema.ts` regenerado incluye `dueDate`.
  - Anotar el tipo generado.
- [ ] 1.2 Comprobar el tipo generado de `dueDate`. Si es luxon `DateTime`, hacer un ida y vuelta: guardar `DateTime.fromISO('2026-10-20', { zone: 'utc' })`, releer y obtener `toISODate() === '2026-10-20'` en `node ace repl`. Si se desplaza un día, mapear la columna a `string` con `database/schema_rules.ts` y volver a regenerar. Verificar con `npm run typecheck`.

## 2. Regla y día de referencia (backend)

- [ ] 2.1 Añadir a `Task` el método `isOverdueOn(today: string)`, con la regla de las tres condiciones. Verificar con `npm run typecheck` y, en `node ace repl`, los cinco bordes:
  - ayer;
  - hoy;
  - mañana;
  - sin fecha;
  - `done` con la fecha pasada.
- [ ] 2.2 Crear el helper `referenceDate(request)`:
  - Con `X-Timezone` válida, devuelve la fecha de hoy en esa zona.
  - Sin cabecera, devuelve la fecha de hoy en UTC.
  - Con zona inválida, lanza un error de validación `422`.

  Verificar con `npm run typecheck`.

## 3. API (backend)

- [ ] 3.1 Extraer el builder `dueDate()` (cadena `YYYY-MM-DD`, regla `calendarDate`, `.nullable().optional()`) y usarlo en `createTaskValidator` y `updateTaskValidator`. En este último, `requiredIfMissing` cruzado entre los tres campos. Verificar con `npm run typecheck`.
- [ ] 3.2 Cambiar `TaskTransformer` para que reciba `today` y exponga `dueDate` (`YYYY-MM-DD` o `null`) e `isOverdue`. Verificar con `npm run typecheck`.
- [ ] 3.3 Actualizar `TasksController`:
  - Resolver `today` al principio de cada acción, antes de validar o escribir.
  - `store` acepta `dueDate`.
  - `update` aplica `dueDate` cuando viene en el cuerpo, con `null` como quitar.
  - Nueva acción `show` con `findOrFail` y `load('assignee')`.

  Verificar con `npm run typecheck`.
- [ ] 3.4 Registrar `GET /tasks/:id`, extrayendo el matcher canónico a una constante compartida con el `PATCH`. Arrancar `npm run dev` para regenerar `.adonisjs/` y comprobar con `node ace list:routes` que las rutas de tareas son exactamente:
  - `GET /tasks`
  - `POST /tasks`
  - `GET /tasks/:id`
  - `PATCH /tasks/:id`
- [ ] 3.5 Comprobar con `curl` los escenarios de API de `specs/tasks/spec.md`:
  - Todas las respuestas (listar, leer, crear y actualizar) traen `dueDate` e `isOverdue`.
  - Crear sin fecha da `null` y `false`. Crear con fecha pasada da `201` y `true`.
  - Poner, cambiar y quitar la fecha, tanto con `null` como con `""`.
  - Las fechas `2026-02-30`, `2026-10`, `20/10/2026`, `2026-10-20T10:00:00Z` y numéricas dan `422`, y la fecha se conserva.
  - Regla de vencimiento (cada caso con `X-Timezone` y fechas calculadas a partir de hoy):
    - Ayer da `true`; hoy y mañana dan `false`.
    - Sin fecha da `false`.
    - Una tarea en `done` con fecha pasada da `false`.
    - Pasar a `done` conserva la fecha.
    - Volver de `done` da `true`.
    - Aplazar la fecha da `false`.
    - Reasignar no cambia la fecha ni el veredicto.
  - Dos zonas, dos veredictos: una tarea que vence hoy en UTC−12 y ayer en UTC+14 (`Etc/GMT+12` frente a `Pacific/Kiritimati`) da veredictos distintos en la misma petición repetida.
  - Sin cabecera se usa UTC. `X-Timezone: Marte/Olympus` da `422` y no crea ni cambia nada.
  - `isOverdue` enviado se ignora.
  - `GET /tasks/:id` responde `200`, también con tareas ajenas. `999999`, `01` y `abc` dan `404`. Sin token da `401`.
  - `DELETE` da `404`.
- [ ] 3.6 Ejecutar `npm run lint` y `npm run typecheck` en `backend/` sin errores, y commitear el diff regenerado de `.adonisjs/` y `database/schema.ts`.

## 4. Cliente de API y tipos (frontend)

- [ ] 4.1 Añadir `dueDate` e `isOverdue` a `Task` en `lib/types.ts`. Verificar con `npm run build`.
- [ ] 4.2 En `lib/api.ts`:
  - Enviar `X-Timezone` (la zona de `Intl`) en todas las peticiones.
  - Añadir `getTask` y `updateTaskDueDate`.
  - Añadir la etiqueta `dueDate` a `FIELD_LABELS`.

  Verificar con `npm run build` y `npm run lint`, y en la pestaña Red del navegador que toda petición lleva `X-Timezone`.

## 5. Panel de la tarea (frontend)

- [ ] 5.1 Añadir a cada fila el botón «Abrir» / «Cerrar» con `aria-expanded` y `aria-controls`, y el estado `openIds`. Con la fila cerrada no se pinta nada de fecha. Verificar en el navegador:
  - Abre y cierra con ratón y con teclado (Tab más Intro o espacio).
  - Con todas las filas cerradas no aparece ninguna fecha ni «Vencida», aunque haya tareas vencidas.
- [ ] 5.2 Crear el panel. Al abrirse llama a `getTask` y actualiza la tarea. Muestra:
  - `Label` «Fecha de vencimiento» con un `Input type="date"`.
  - «Quitar fecha», solo si la tarea tiene fecha.
  - «Vencida» como texto con icono, solo si `isOverdue`.

  Verificar en el navegador que una tarea vencida muestra «Vencida», que una que vence hoy no lo muestra, y que una sin fecha muestra el campo vacío sin ningún aviso.
- [ ] 5.3 Guardado sin botón:
  - Una fecha completa se envía con `updateTaskDueDate` y se pinta la respuesta.
  - Una fecha incompleta o borrada muestra «Introduce una fecha completa y válida.» sin enviar nada.
  - «Quitar fecha» envía `null`, sin confirmación.
  - Si el servidor falla, el campo vuelve a la fecha guardada y se muestra el motivo junto al campo.
  - Controles deshabilitados mientras se envía.

  Verificar en el navegador:
  - Poner una fecha la muestra al instante y se conserva al recargar y volver a abrir.
  - Una fecha pasada muestra «Vencida» al instante.
  - Quitar la fecha borra «Vencida» sin diálogo.
  - Con una fecha a medio escribir aparece el aviso y no hay petición.
  - Con el backend parado, la fecha guardada se conserva y aparece el motivo.
- [ ] 5.4 Hacer que el cambio de estado desde la fila, al recibir la respuesta del `PATCH`, reemplace la tarea con la del servidor. Verificar en el navegador que, con el panel de una tarea vencida abierto, pasarla a «Hecho» quita «Vencida» y conserva la fecha, y que volver a «Pendiente» la muestra vencida otra vez.
- [ ] 5.5 Ejecutar `npm run build` y `npm run lint` en `frontend/` sin errores.

## 6. Integración

- [ ] 6.1 Recorrido en el navegador:
  - El formulario de creación sigue sin ofrecer fecha.
  - Una tarea creada en la UI nace sin fecha.
  - Otra persona abre la tarea de A, le pone fecha y la ve vencida o no según su zona.
  - Con el navegador forzado a otra zona (puppeteer `emulateTimezone`), el veredicto cambia según el día de esa zona.
- [ ] 6.2 Ejecutar `openspec validate add-task-due-date --strict` sin errores.
