# Proposal

## Why

Hoy una tarea no puede llevar fecha, así que nadie puede comprometerse con un plazo ni enterarse de que se le ha pasado sin hacer cuentas. FS-118 pide poder poner, cambiar y quitar una fecha de vencimiento al abrir una tarea, y que el sistema diga por sí mismo si está vencida, según el día de quien mira. Sigue sin aparecer en la lista principal (RF-13, RF-14 y RF-15).

## What Changes

- **Fecha de vencimiento opcional** en la tarea.
  - Es de calendario, sin hora, y viaja como `dueDate` en formato `YYYY-MM-DD`, o `null` si no hay.
  - Se puede poner al crear y al actualizar, y una fecha anterior a hoy se acepta.
  - Para quitarla se envía explícitamente vacía (`null` o `""`).
  - Una fecha inexistente o mal formada se rechaza con `422` y la tarea conserva la que tenía.
- **Veredicto `isOverdue`**, que el backend calcula en cada lectura y la API expone en toda representación de una tarea. Es `true` solo si se cumplen las tres condiciones: la tarea tiene fecha, la fecha es anterior a hoy y el estado no es `done`. Además:
  - No se guarda en ninguna columna.
  - No hay procesos programados que lo recalculen.
  - Si el cliente lo envía, se ignora.
- **«Hoy» es el día de quien mira**:
  - El cliente envía su zona IANA en la cabecera `X-Timezone`, y el servidor calcula la fecha de hoy en esa zona.
  - Sin cabecera, el servidor usa UTC.
  - Una zona inválida se rechaza con `422`.
- **BREAKING (contrato de API)**:
  - Se añade la lectura individual `GET /api/v1/tasks/:id`, que antes daba `404`. Es la superficie mínima que necesita «al abrir la tarea».
  - La representación de una tarea gana `dueDate` e `isOverdue`. Antes, la spec prohibía exponer fecha alguna.
  - `POST /api/v1/tasks` deja de ignorar `dueDate`.
- **Interfaz**:
  - Cada fila de la lista puede **abrirse** con un panel desplegable en la propia fila, operable con teclado.
  - El panel muestra el campo de fecha, que se guarda al cambiar sin botón de guardar, un botón «Quitar fecha» sin confirmación y la señal «Vencida» con texto, no solo color.
  - Con la fila **cerrada**, la lista sigue mostrando solo título, responsable y estado: ni fecha ni marca de vencida.
  - El formulario de creación no cambia y no ofrece fecha.
  - El frontend envía `X-Timezone` en todas las peticiones.
- **Fuera de alcance**:
  - Pantalla de detalle completa (PA-6).
  - Notificaciones, recordatorios y recurrencia.
  - Ordenar o filtrar por fecha.
  - Tests de cualquier tipo.

## Capabilities

### New Capabilities
<!-- Ninguna: la fecha y el vencimiento son comportamiento de la lista de tareas existente. -->

### Modified Capabilities
- `tasks`: cambian estos requisitos:
  - La forma pública de una tarea gana `dueDate` e `isOverdue`.
  - La creación acepta `dueDate`.
  - La actualización acepta `dueDate`, incluido quitarla.
  - La superficie de la API gana la lectura individual.
  - La fila de la lista puede abrirse sin mostrar fecha mientras está cerrada.

  Se añaden requisitos nuevos para la regla de vencimiento, el día de referencia por zona, la validación de la fecha y el panel de la tarea abierta.

## Impact

- **Backend**:
  - Migración que añade `due_date` (date, nullable) a `tasks`. Es aditiva y las tareas existentes quedan sin fecha.
  - Se regenera `database/schema.ts`.
  - Regla de vencimiento en el modelo `Task`.
  - Resolución del día de referencia a partir de `X-Timezone`.
  - Validadores de creación y actualización con `dueDate`.
  - `TaskTransformer` con `dueDate` e `isOverdue`.
  - Acción `show` y ruta `GET /api/v1/tasks/:id`.
  - Se regenera el código del directorio `.adonisjs/`.
- **Frontend**:
  - `lib/api.ts`: envía `X-Timezone` y añade las funciones `getTask` y `updateTaskDueDate`.
  - `lib/types.ts`: `Task` gana `dueDate` e `isOverdue`.
  - `tasks-page.tsx`: botón para abrir y cerrar la fila y panel de la tarea.
  - Se reutilizan los componentes de `components/ui`, con un input `type="date"` nativo. No hay dependencias nuevas.
- **Specs**: delta `MODIFIED` y `ADDED` sobre `tasks`. `auth` no cambia.
- **Puntos abiertos**:
  - **PA-6**: qué más debe mostrar la tarea abierta. Este change solo pone la fecha y el vencimiento en un panel, y la lectura individual es la superficie mínima.
  - **PA-7**: volver de «Hecho» con la fecha ya pasada hace que la tarea vuelva a estar vencida. Es consecuencia de la regla y de las transiciones libres, pero queda por confirmar.
  - **PA-8**: dos personas cambiando la fecha a la vez. Gana la última escritura.
  - **PA-1**: el vencimiento no se ve de un vistazo en la lista, por decisión expresa.
