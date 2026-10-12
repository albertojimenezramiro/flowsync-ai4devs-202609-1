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

- **Documentar en vez de cambiar el comportamiento de la zona horaria.** El servidor ya acepta nombres de zona sin distinguir mayúsculas (luxon), trata como ausente una cabecera formada solo por espacios (`trim()` en `reference_date.ts`) y resuelve la zona antes de buscar la tarea, así que un `422` gana a un `404`. Es compatible con el contrato y no afecta al cliente. Alternativa descartada: rechazar nombres mal capitalizados. Añadiría una regla sin beneficio para ningún cliente real.
- **Acotar el bloqueo a los botones de estado.** Es lo que hace el código y lo único que evita respuestas cruzadas. El campo de fecha ya se protege con `readOnly` durante su propio guardado, y bloquearlo durante un cambio de estado solo añadiría fricción. Alternativa descartada: bloquear todos los controles del panel.
- **Evitar el envío duplicado con una guarda síncrona.** Se guarda en un `useRef` la fecha que está en vuelo (`inFlight`). `commit()` no envía nada si `draft === inFlight.current`, y `save()` limpia la referencia en `finally`. Sigue el mismo patrón que `creatingRef` en `tasks-page.tsx`. Alternativa descartada: depender de `isSaving`. El estado de React no se refleja hasta el siguiente render, así que no protege frente a dos eventos seguidos.
- **El Purpose se edita directamente** en `openspec/specs/tasks/spec.md`, porque un delta no puede cambiarlo. Se hace como tarea del apply, no al proponer.

## Risks / Trade-offs

- [Documentar que el nombre de zona no distingue mayúsculas lo convierte en contrato] → Si algún día se quiere ser estricto, habrá que hacerlo con un change explícito. Es preferible a que la spec calle sobre algo que el sistema hace.
- [La guarda por valor no impide reenviar la misma fecha después de un fallo] → Es lo deseado: tras un error, la referencia se limpia y la persona puede reintentar.
