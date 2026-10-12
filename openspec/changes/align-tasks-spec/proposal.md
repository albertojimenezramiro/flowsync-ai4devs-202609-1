# Proposal

## Why

La revisión adversarial del archivo de `add-task-due-date` encontró que la spec viva `tasks` dice cosas que el sistema no hace, o que las dice de forma ambigua. También encontró un defecto menor en el panel: la misma fecha se puede enviar dos veces. Si la spec queda así, verificaciones y cambios futuros partirán de una verdad que no es la del código.

## What Changes

- **Purpose de `tasks`**: deja de decir «crea tareas con solo el título» como si fuera todo lo que hace la capability. Pasa a mencionar la fecha de vencimiento y el aviso de las vencidas. Se edita directamente en la spec viva, porque un delta no puede cambiar el Purpose.
- **«Cambiar el estado desde la fila»**: la norma se acota a lo que hace el código. Mientras haya una petición en curso sobre una tarea, se deshabilitan **los botones de estado de su fila**, no «sus controles».
- **«Mirar la lista no cambia nada»**: incluye también la fecha de vencimiento.
- **«Abrir una tarea desde su fila»**: aclara que abrir y cerrar no modifican nada por sí mismos, pero cerrar confirma una fecha que se estuviera editando, como ya dice «Poner, cambiar y quitar la fecha en el panel».
- **«Poner, cambiar y quitar la fecha en el panel»**:
  - «Quitar fecha» desaparece cuando el servidor lo confirma, no «al momento».
  - Mientras haya un guardado de fecha en curso, ninguna otra confirmación se envía. Esto corrige el código: hoy, Intro seguido de salir del campo antes de la respuesta repite el `PATCH`. Tras un fallo se puede reintentar.
- **«Abrir una tarea desde su fila»**, además: cerrar con una fecha a medio escribir la descarta sin aviso, porque el panel se desmonta. Es lo que hace hoy el código.
- **«El día de referencia es el de quien mira»**: deja escrito lo que el servidor ya hace.
  - El nombre de zona no distingue mayúsculas.
  - Una cabecera con solo espacios cuenta como ausente.
  - Una zona inválida da `422` antes que cualquier `404`.
- **Fuera de alcance**: cualquier otro cambio de comportamiento, refactor o tests.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `tasks`:
  - Se reescriben con más precisión cinco requisitos:
    - «Cambiar el estado desde la fila»
    - «Mirar la lista no cambia nada»
    - «Abrir una tarea desde su fila»
    - «Poner, cambiar y quitar la fecha en el panel»
    - «El día de referencia es el de quien mira»
  - Se edita directamente el Purpose.

## Impact

- **Specs**: delta MODIFIED sobre `tasks`, más la edición directa del Purpose en `openspec/specs/tasks/spec.md`.
- **Frontend**: `frontend/src/components/task-panel.tsx` deja de enviar dos veces la misma confirmación de fecha.
- **Backend**: sin cambios, porque los requisitos de zona solo documentan lo que ya hace.
- **Decisión tomada sin preguntar**: los tres puntos de la zona horaria (mayúsculas, espacios y prioridad del 422) se **documentan tal como funcionan hoy**, en vez de endurecer el servidor. Son compatibles con el contrato y no afectan al único cliente, que siempre envía el nombre exacto de `Intl`.
