# Proposal

## Why

La revisión del archivo de `align-tasks-spec` dejó tres desajustes menores entre la spec viva `tasks` y el código. El más relevante es que una fecha puede perderse sin aviso: si alguien escribe una fecha válida y cierra la tarea (o abre otra) mientras se guarda un cambio de estado, la fecha no se envía y el aviso se queda en un panel que acaba de desmontarse. La spec dice que cerrar «la confirma», sin excepciones.

## What Changes

- **Aviso en la página cuando una fecha no se guarda al cerrar.**
  - Si al cerrar la tarea, o al abrir otra, el campo tiene una fecha completa y válida distinta de la guardada y no se puede enviar porque hay una escritura en curso sobre la tarea, la fecha no se guarda.
  - En ese caso la página muestra «No se guardó la fecha porque había otro cambio guardándose. Ábrela y vuelve a ponerla.».
  - Se eligió avisar en vez de guardar la fecha al terminar la escritura (decisión del usuario).
- **«Abrir una tarea desde su fila»**: recoge esa excepción a «cerrar la confirma».
- **«Cambiar el estado desde la fila»**: el escenario «Petición en curso» deja de limitarse a la tarea abierta. Los botones se deshabilitan con cualquier petición en curso sobre la tarea, esté abierta o no, que es lo que hace el código.
- **«Mirar la lista no cambia nada»**: pasa a decir «cargar y recorrer la lista sin pulsar ningún control». Así no se confunde con cerrar una tarea, que sí puede confirmar una fecha.
- **Fuera de alcance**:
  - Encolar la fecha para guardarla después.
  - Cualquier otro cambio de comportamiento.
  - Tests.
  - El escenario «Vence sola al cambiar el día». La revisión lo señaló como fuera de sitio, pero está bajo «Regla de vencimiento», que es de backend, así que no hay nada que mover.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `tasks`: MODIFIED de «Abrir una tarea desde su fila», «Cambiar el estado desde la fila» y «Mirar la lista no cambia nada».

## Impact

- **Frontend**: en `frontend/src/components/task-panel.tsx`, el panel recuerda que descartó una fecha válida por haber una escritura en curso y, al desmontarse, avisa con `onError`, que la página ya pinta como aviso.
- **Backend y API**: sin cambios.
- **Specs**: delta MODIFIED sobre `tasks`.
