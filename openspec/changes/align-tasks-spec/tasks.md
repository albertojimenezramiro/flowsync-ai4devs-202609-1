# Tasks

## 1. Spec viva

- [ ] 1.1 Editar directamente el `## Purpose` de `openspec/specs/tasks/spec.md` para que mencione, además de crear con solo el título y el estado y el responsable, la fecha de vencimiento y el aviso de las vencidas. Verificar con `openspec validate --specs --strict`.

## 2. Envío único de la fecha (frontend)

- [ ] 2.1 En `frontend/src/components/task-panel.tsx`:
  - Añadir la guarda `inFlight` (`useRef<string | null>`). `commit()` no envía si `draft` coincide con la fecha en vuelo, y `save()` la fija al empezar y la limpia en `finally`.

  Verificar con `npm run build` y `npm run lint`, y en Chrome headless:
  - Escribir una fecha, pulsar Intro y hacer clic fuera mientras la respuesta del `PATCH` está retrasada genera **un solo** `PATCH`.
  - Tras un fallo, volver a confirmar la misma fecha sí la reenvía.
  - Las comprobaciones de pantalla existentes del panel siguen pasando.

## 3. Comprobación de lo que la spec ahora documenta

- [ ] 3.1 Comprobar con `curl` (solo `GET`, sin escribir en la BD), sin cambiar código:
  - `X-Timezone: europe/madrid` responde `200`, con el mismo veredicto que `Europe/Madrid`.
  - `X-Timezone` formada solo por espacios responde `200`, con el veredicto de UTC.
  - `GET /api/v1/tasks/999999` con `X-Timezone: Marte/Olympus` responde `422`.
- [ ] 3.2 Ejecutar `openspec validate align-tasks-spec --strict` sin errores.
