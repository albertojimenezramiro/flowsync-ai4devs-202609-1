# Design

## Context

La spec viva `tasks` quedó sincronizada al archivar `add-task-due-date`. La revisión de ese archivo encontró cinco requisitos con una redacción más amplia o más ambigua que el código, un Purpose desactualizado y un envío duplicado en el panel de fecha. Para el detalle, ver proposal.md.

Sobre el envío duplicado, en `frontend/src/components/task-panel.tsx`:
- `commit()` se llama en `onKeyDown` (Intro) y en `onBlur`.
- Tras Intro se lanza `save(draft)`, pero `draft` sigue distinto de la fecha guardada hasta que responde el servidor.
- Si el foco sale del campo en ese intervalo, `commit()` vuelve a lanzar `save(draft)`.

## Goals / Non-Goals

**Goals:**
- Que la spec diga exactamente lo que el sistema hace hoy.
- Que una confirmación de fecha produzca un solo `PATCH`.

**Non-Goals:**
- Endurecer la validación de `X-Timezone`, cambiar qué controles se bloquean o tocar el backend.
- Tests.

## Decisions

- **Documentar en vez de cambiar el comportamiento de la zona horaria.** El servidor ya acepta nombres de zona sin distinguir mayúsculas (lo resuelve `Intl`/ICU de Node, que luxon usa por debajo; también pasan `gmt` o `est5edt`), trata como ausente una cabecera formada solo por espacios (`trim()` en `reference_date.ts`) y resuelve la zona antes de buscar la tarea, así que un `422` gana a un `404`. Es compatible con el contrato y no afecta al cliente. Alternativa descartada: rechazar nombres mal capitalizados. Añadiría una regla sin beneficio para ningún cliente real.
- **Acotar el bloqueo a los botones de estado.** Es lo que hace el código y lo único que evita respuestas cruzadas. El campo de fecha ya se protege con `readOnly` durante su propio guardado, y bloquearlo durante un cambio de estado solo añadiría fricción. Alternativa descartada: bloquear todos los controles del panel.
- **Evitar el envío duplicado con una guarda síncrona por tarea, en la página.** La primera versión era un `useRef<boolean>` (`savingRef`) dentro del panel. La revisión de la implementación mostró que moría al cerrar el panel: reabrir con un guardado en vuelo permitía un segundo `PATCH`.
  - La guarda pasa a `TasksPage`, como un contador síncrono de escrituras en vuelo por tarea (`writesInFlight`), que `run()` sube y baja en su `finally`.
  - El panel la consulta con `isWriting()`: `commit()` y `save()`, incluido «Quitar fecha», no hacen nada mientras haya una escritura de la tarea (de fecha o de estado). `handleStatusChange` también la consulta.
  - El campo de fecha y «Quitar fecha» quedan inactivos mientras haya cualquier petición sobre la tarea (`busy`). Así un cambio de estado y uno de fecha no cruzan respuestas.
  - La lectura de apertura se descarta si se emitió con una escritura en vuelo, no solo si hubo una escritura después.
  - Un blur que llegue después de que `run()` libere la guarda pero antes del siguiente render todavía tiene `draft` y `saved` viejos en su cierre. Para que no reenvíe, `commit()` compara con `savedRef`, una referencia a la última fecha confirmada que `save()` actualiza de forma síncrona en cuanto responde el servidor y que se sincroniza con la prop en cada cambio. Esto se añadió durante el apply.
  - Sigue el mismo patrón que `creatingRef` en `tasks-page.tsx`.
  - Alternativa descartada (señalada en la revisión): comparar por valor (`draft === enVuelo`). Si el valor cambiara durante el vuelo, por ejemplo con un selector nativo que ignore `readOnly`, se lanzaría un segundo guardado concurrente.
  - Alternativa descartada: depender de `isSaving`. El estado de React no se refleja hasta el siguiente render, así que no protege frente a dos eventos seguidos.
- **El Purpose se edita directamente** en `openspec/specs/tasks/spec.md`, porque un delta no puede cambiarlo. Se hace como tarea del apply, no al proponer, y antes de archivar.
- **Cerrar con una fecha incompleta la descarta sin aviso.** Al cerrar, el panel se desmonta y no hay dónde mostrar «Introduce una fecha completa y válida.». Es lo que hace el código y ahora lo dice la spec. Una fecha completa sí se confirma al cerrar, y si falla se avisa en la página.

## Risks / Trade-offs

- [Documentar que el nombre de zona no distingue mayúsculas lo convierte en contrato] → Si algún día se quiere ser estricto, habrá que hacerlo con un change explícito. Es preferible a que la spec calle sobre algo que el sistema hace.
- [Tras un fallo se puede reenviar la misma fecha] → Es lo deseado: la guarda de escritura se libera en el `finally` de `run()`, `savedRef` sigue con la última fecha confirmada y la persona puede reintentar.
- [«Cerrar» con una fecha a medias deja ver el aviso un instante, entre el blur y el desmontaje] → Es imperceptible y no se anuncia, porque no es `role="alert"`. La spec dice que, una vez cerrada, no queda ningún aviso.
