# Tasks

## 1. Persistencia (backend)

- [x] 1.1 Crear la migración que añade `due_date` (date, nullable) a `tasks`, con un reverso que la elimina. Ejecutar `node ace migration:run` sobre la BD con tareas existentes y verificar:
  - Las tareas siguen ahí, con `due_date` a `NULL`.
  - `database/schema.ts` regenerado incluye `dueDate`.
  - Anotar el tipo generado.
- [x] 1.2 Comprobar el tipo generado de `dueDate`. Si es luxon `DateTime`, hacer un ida y vuelta: guardar `DateTime.fromISO('2026-10-20', { zone: 'utc' })`, releer y obtener `toISODate() === '2026-10-20'` en `node ace repl`. Si se desplaza un día, mapear la columna a `string` con `database/schema_rules.ts` y volver a regenerar. Verificar con `npm run typecheck`.

## 2. Regla y día de referencia (backend)

- [x] 2.1 Añadir a `Task` el método `isOverdueOn(today: string)`, con la regla de las tres condiciones. Verificar con `npm run typecheck` y, en `node ace repl`, los cinco bordes:
  - ayer;
  - hoy;
  - mañana;
  - sin fecha;
  - `done` con la fecha pasada.
- [x] 2.2 Crear el helper `referenceDate(request)` en `app/helpers/reference_date.ts`:
  - Con un nombre IANA válido (forma de nombre más `IANAZone.isValidZone`), devuelve la fecha de hoy en esa zona.
  - Sin cabecera o con la cabecera vacía, devuelve la fecha de hoy en UTC.
  - Con un desfase (`+02:00`), un nombre inexistente o varias cabeceras, lanza un error de validación `422` sobre `X-Timezone`.

  Verificar con `npm run typecheck`.

## 3. API (backend)

- [x] 3.1 Extraer el builder `dueDate()` (cadena `YYYY-MM-DD`, regla `calendarDate`, `.nullable().optional()`) y usarlo en `createTaskValidator` y `updateTaskValidator`. En este último, los tres campos son `optional()` y se **quita `requiredIfMissing`**, porque trata `null` como ausente e impediría quitar la fecha sola. Verificar con `npm run typecheck`.
- [x] 3.2 Cambiar `TaskTransformer` para que reciba `today` y exponga `dueDate` (`YYYY-MM-DD` o `null`) e `isOverdue`. Verificar con `npm run typecheck`.
- [x] 3.3 Actualizar `TasksController`:
  - Resolver `today` al principio de cada acción, antes de validar o escribir.
  - `store` acepta `dueDate`.
  - `update` hace tres cosas, en este orden:
    1. Rechaza un `null` explícito en `status` y `assigneeId`.
    2. Valida.
    3. Si `status`, `assigneeId` y `dueDate` son todos `undefined`, devuelve `422` con un `required` para cada uno.

    Después aplica `dueDate` si no es `undefined`, con `null` como quitar.
  - Nueva acción `show` con `findOrFail` y `load('assignee')`.

  Verificar con `npm run typecheck`.
- [x] 3.4 Registrar `GET /tasks/:id`, extrayendo el matcher canónico a una constante compartida con el `PATCH`. Arrancar `npm run dev` para regenerar `.adonisjs/` y comprobar con `node ace list:routes` que las rutas de tareas son exactamente:
  - `GET /tasks`
  - `POST /tasks`
  - `GET /tasks/:id`
  - `PATCH /tasks/:id`
- [x] 3.5 Comprobar con `curl` los escenarios de API de `specs/tasks/spec.md`:
  - Todas las respuestas (listar, leer, crear y actualizar) traen `dueDate` e `isOverdue`.
  - Crear sin fecha da `null` y `false`. Crear con fecha pasada da `201` y `true`.
  - Poner, cambiar y quitar la fecha, tanto con `null` como con `""`, enviando `dueDate` **como único campo**.
  - `{}` y `{ "isOverdue": true }` dan `422`.
  - Las fechas `2026-02-30`, `2027-02-29`, `2026-10`, `20/10/2026`, `2026-10-20T10:00:00Z`, `12026-10-20` y numéricas dan `422`, y la fecha se conserva. `2028-02-29` se acepta.
  - Regla de vencimiento (cada caso con `X-Timezone` y fechas calculadas a partir de hoy):
    - Ayer da `true`; hoy y mañana dan `false`.
    - Sin fecha da `false`.
    - Una tarea en `done` con fecha pasada da `false`.
    - Pasar a `done` conserva la fecha.
    - Volver de `done` da `true`.
    - Aplazar la fecha da `false`.
    - Reasignar no cambia la fecha ni el veredicto.
  - Dos zonas, dos veredictos: con fecha igual a hoy en `Etc/GMT+12`, la lectura con `Etc/GMT+12` da `false` y la lectura con `Pacific/Kiritimati` da `true`. Esto también cubre «Vence sola al cambiar el día», usando la zona como día de referencia posterior.
  - Sin cabecera, o con la cabecera vacía, se usa UTC.
  - `X-Timezone: Marte/Olympus` y `X-Timezone: +02:00` dan `422`, también en un `POST` con `dueDate` y en un `PATCH`, sin crear ni cambiar nada.
  - `isOverdue` enviado se ignora.
  - `GET /tasks/:id` responde `200`, también con tareas ajenas. `999999`, `01` y `abc` dan `404`. Sin token da `401`.
  - `DELETE` da `404`.
- [x] 3.6 Ejecutar `npm run lint` y `npm run typecheck` en `backend/` sin errores, y commitear el diff regenerado de `.adonisjs/` y `database/schema.ts`.

## 4. Cliente de API y tipos (frontend)

- [x] 4.1 Añadir `dueDate` e `isOverdue` a `Task` en `lib/types.ts`. Verificar con `npm run build`.
- [x] 4.2 En `lib/api.ts`:
  - Enviar `X-Timezone` (la zona de `Intl`) en todas las peticiones.
  - Añadir `getTask` y `updateTaskDueDate`.
  - Añadir la etiqueta `dueDate` a `FIELD_LABELS`.

  Verificar con `npm run build` y `npm run lint`, y en la pestaña Red del navegador que toda petición lleva `X-Timezone`.

## 5. Panel de la tarea (frontend)

- [x] 5.1 Añadir a cada fila el botón «Abrir» / «Cerrar» con `aria-expanded` y `aria-controls`, y el estado `openId`, con una sola tarea abierta a la vez. El panel se desmonta al cerrarse. Verificar en el navegador:
  - Abre y cierra con ratón y con teclado (Tab más Intro o espacio).
  - Abrir otra tarea cierra la anterior.
  - Con todas cerradas no hay ninguna fecha ni «Vencida» en el DOM, aunque haya tareas vencidas, ni tras abrir y cerrar una.
- [x] 5.2 Crear `components/task-panel.tsx`:
  - Al montarse llama a `getTask`, mostrando «Cargando…» sin veredicto mientras tanto.
  - Si falla, muestra «No se pudo abrir la tarea.» con el motivo.
  - Si va bien, actualiza la tarea en la lista y muestra el `Label` «Fecha de vencimiento» con un `Input type="date"`, «Quitar fecha» (solo si hay fecha) y «Vencida» como texto con icono (solo si `isOverdue`).

  Verificar en el navegador:
  - Una tarea vencida muestra «Vencida».
  - Una que vence hoy no lo muestra.
  - Una sin fecha muestra el campo vacío sin avisos.
  - Con la respuesta de `getTask` retrasada (puppeteer), se ve «Cargando…» y nunca el veredicto viejo.
  - Con `getTask` abortada aparece «No se pudo abrir la tarea.».
- [x] 5.3 Guardado al confirmar:
  - `onChange` solo actualiza `draft`. Se confirma en `onBlur` e Intro.
  - Una fecha completa distinta de la guardada se envía con `updateTaskDueDate` y se pinta la respuesta.
  - Una fecha incompleta, vacía o con año de cinco cifras muestra «Introduce una fecha completa y válida.» sin enviar nada, y `draft` vuelve a la fecha guardada.
  - «Quitar fecha» envía `null` sin confirmación.
  - Si el servidor falla, se muestra «No se pudo guardar la fecha.» con el motivo y se conserva la fecha anterior.
  - El input se deshabilita solo mientras se guarda.

  Verificar en el navegador:
  - Teclear un año cifra a cifra no genera ningún `PATCH` hasta salir del campo, y entonces genera uno.
  - Escribir una fecha y pulsar «Cerrar» la guarda; al reabrir, aparece.
  - Una fecha pasada muestra «Vencida» tras confirmar.
  - Quitar la fecha borra «Vencida» sin diálogo.
  - Vaciar el campo o dejarlo a medias muestra el aviso y conserva la fecha.
  - Con el backend parado, la fecha se conserva y aparece el motivo.
- [x] 5.4 Ampliar `savingIds` a toda petición sobre una tarea (apertura, fecha y estado), deshabilitando los botones de estado y «Quitar fecha» mientras dure. Hacer que el cambio de estado, al recibir la respuesta del `PATCH`, reemplace la tarea con la del servidor. Verificar en el navegador:
  - Durante la carga del panel o el guardado de la fecha, los botones de estado de esa fila están deshabilitados.
  - Con el panel de una tarea vencida abierto, pasarla a «Hecho» quita «Vencida» y conserva la fecha, y volver a «Pendiente» la muestra vencida otra vez.
- [x] 5.5 Ejecutar `npm run build` y `npm run lint` en `frontend/` sin errores.

## 6. Integración

- [x] 6.1 Recorrido en el navegador:
  - El formulario de creación sigue sin ofrecer fecha.
  - Una tarea creada en la UI nace sin fecha.
  - Otra persona abre la tarea de A, le pone fecha y la ve vencida o no según su zona.
  - Con el navegador forzado a otra zona (puppeteer `emulateTimezone`), el veredicto cambia según el día de esa zona.
- [x] 6.2 Ejecutar `openspec validate add-task-due-date --strict` sin errores.
