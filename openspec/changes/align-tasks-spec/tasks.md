# Tasks

## 1. Spec viva

- [x] 1.1 Editar directamente el `## Purpose` de `openspec/specs/tasks/spec.md` para que mencione, además de crear con solo el título y el estado y el responsable, la fecha de vencimiento y el aviso de las vencidas. Verificar con `openspec validate --specs --strict`.

## 2. Envío único de la fecha (frontend)

- [x] 2.1 En `frontend/src/components/task-panel.tsx`:
  - Añadir la guarda `savingRef` (`useRef<boolean>`). `commit()` no hace nada mientras esté activa, y `save()` la activa al empezar y la desactiva en `finally`, con un comentario que explique por qué ahí.

  Verificar con `npm run build` y `npm run lint`, y en Chrome headless:
  - Escribir una fecha, pulsar Intro y hacer clic fuera mientras la respuesta del `PATCH` está retrasada genera **un solo** `PATCH`.
  - Con Intro con una fecha A y el `PATCH` retrasado, intentar editar el campo a B y hacer clic fuera no genera un segundo `PATCH`.
  - Tras un fallo, volver a confirmar la fecha sí la reenvía.
  - Con una fecha a medio escribir, pulsar «Cerrar» no envía nada ni muestra avisos, y la tarea conserva su fecha.
  - Las comprobaciones de pantalla existentes del panel siguen pasando.

## 3. Comprobación de lo que la spec ahora documenta

- [x] 3.1 Comprobar sin cambiar código. Se usa el token de un login con una cuenta de prueba ya existente: el login escribe un access token, y eso es aceptable. Las peticiones de tareas son solo `GET`. Se envían con un script de node (`http.request`), porque `curl` descarta las cabeceras formadas solo por espacios.
  - Elegir una tarea existente cuya fecha sea hoy en UTC y no esté en `done`. Si no la hay, preparar una con una escritura previa explícita.
  - `X-Timezone: europe/madrid` responde `200` y da el mismo `isOverdue` que `Europe/Madrid`.
  - `X-Timezone` formada solo por espacios (comprobado en el servidor con un log temporal o con `nc`) responde `200` y da el mismo `isOverdue` que sin cabecera (UTC), distinto del de `Pacific/Kiritimati`.
  - `GET /api/v1/tasks/999999` con `X-Timezone: Marte/Olympus` responde `422`.
- [x] 3.2 Ejecutar `openspec validate align-tasks-spec --strict` sin errores.
