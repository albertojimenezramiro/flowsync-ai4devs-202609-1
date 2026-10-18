# 1. Las delta-specs de OpenSpec como fuente de verdad viva

## Estado

Aceptado. Fecha de este registro: 2026-10-18.

El ADR pone por escrito una práctica que el repositorio sigue desde el 2026-08-13, fecha de los tres changes archivados. No abre una decisión nueva.

## Contexto

FlowSync necesita un sitio donde conste qué debe hacer el sistema, separado de cómo está programado. Las personas que lo construyen, los agentes que escriben código y quien revisa un cambio tienen que poder contrastar contra algo. Las historias de `docs/backlog/` y el PRD de `docs/prd/` describen intención de producto, pero dejan decisiones abiertas (PA-3, PA-7, PA-9…) y no se actualizan cuando el código las concreta.

`openspec/` ya está organizado así (OpenSpec 1.14.0, `schema: spec-driven` en `openspec/config.yaml`, sin reglas propias del proyecto):

- **Specs vivas** en `openspec/specs/<capability>/spec.md`. Hay dos capabilities:
  - `auth`, con 19 requisitos.
  - `tasks`, con 32 requisitos.
  - Cada requisito se redacta con `SHALL` y cuelga de él una lista de scenarios `WHEN`/`THEN`.
- **Changes** en `openspec/changes/`. Cada uno trae `proposal.md`, `design.md`, `tasks.md` y, en `specs/<capability>/spec.md`, una **delta-spec** con secciones `ADDED`, `MODIFIED` y, si hace falta, `REMOVED Requirements`.
- **Al archivar un change**, su delta se aplica sobre la spec viva y la carpeta pasa a `openspec/changes/archive/AAAA-MM-DD-<nombre>/`. Los tres archivados son del 2026-08-13 y reconstruyen la spec de `tasks` entera:
  - `add-task-list` crea la capability con 14 requisitos `ADDED`. Además modifica 3 requisitos de `auth` y le añade 1, porque la lista pasa a ser la pantalla de entrada.
  - `add-task-due-date` añade 11 requisitos y modifica 1.
  - `add-task-status-filter` añade 7 requisitos y modifica 4.
  - Los 14 + 11 + 7 requisitos añadidos son exactamente los 32 que tiene hoy `openspec/specs/tasks/spec.md`.
- La capability `auth` no tiene change de origen archivado. Su spec aparece ya completa en el commit `04940fc`, el mismo que archiva `add-task-list`, que la modifica, así que el historial no deja ver una línea base de `auth` anterior a ese change.

Hay dos episodios que muestran qué pasa cuando el código y la spec se separan.

- **FS-142, el filtro por estado.** Se implementó con la instrucción explícita de no tocar `openspec/`. Durante un tiempo la spec viva afirmaba que la lista devolvía «todas las tareas del espacio» mientras el código ya dejaba fuera las hechas. Se corrigió a posteriori con un change que solo documenta comportamiento existente (`add-task-status-filter`, commit `209df12`): su `proposal.md` dice que «este change no toca código».
- **El rechazo de estados inventados.** El commit `8c15707` relajó `listTasksValidator` a texto libre. Desde entonces `GET /api/v1/tasks?status=archivado` responde `200` con una lista vacía, mientras la spec viva exige un `422` en el requisito *Un estado que no existe se rechaza, no se responde vacío*. Nada lo detectó, porque ningún test cubre ese scenario.

Además, los tres changes archivados declaran en su propuesta, de forma explícita, que no escriben tests. Hoy solo un requisito de `tasks` (*Lo que cada tarea muestra de su responsable*) tiene tests automáticos, en `backend/tests/functional/tasks/assignee.spec.ts`.

## Decisión

La fuente de verdad del comportamiento de FlowSync son las specs vivas de `openspec/specs/`, y la única vía para cambiarlas son las delta-specs de un change de OpenSpec.

- Todo cambio de comportamiento observable entra como change en `openspec/changes/<nombre>/`. Su delta dice qué requisitos se añaden, se modifican o se retiran, y se archiva cuando el cambio está hecho. Archivar es lo que actualiza la spec viva.
- Las specs vivas no se editan a mano fuera de ese flujo. La excepción es una línea base inicial, como la de `auth`.
- Cuando el código hace algo que la spec no dice, o dice lo contrario, la spec sigue mandando hasta que un change la corrija. La corrección es una de dos: un change que cambia el código, o un change que documenta lo que ya hace, como `add-task-status-filter`. Lo que no vale es dejar los dos desalineados.
- El resto de la documentación enlaza la spec en lugar de copiar sus reglas. Por ejemplo, `docs/capabilities/tasks/README.md` y el documento OpenAPI describen el contrato técnico, pero no redefinen reglas.
- Las revisiones contrastan cada cambio contra los scenarios de la spec viva. Es lo que ya pide el subagente `adversarial-reviewer` en `.claude/agents/`.

## Consecuencias

**Lo que ganamos**

- Hay un único sitio que responde «¿qué debe hacer esto?», escrito en comportamiento observable y con ejemplos concretos (los scenarios) contra los que verificar. El README de la capability y el contraste del OpenAPI con la spec ya se apoyan en ella.
- Cada change explica por qué se hizo, qué decidió y qué dejó fuera a propósito: `proposal.md` y `design.md` quedan archivados junto a su delta. Las decisiones abiertas del PRD (por ejemplo, el límite de 200 caracteres de PA-9) quedan cerradas por escrito en un sitio localizable.
- La delta hace visible en la revisión qué requisitos cambian, en lugar de obligar a comparar a ojo dos versiones de una spec de 750 líneas.
- Los agentes tienen un contrato estable contra el que trabajar y revisar, y las skills de OpenSpec de `.claude/skills/` automatizan proponer, aplicar, verificar y archivar.

**Lo que nos cuesta**

- **La spec no se protege sola.** Los requisitos son prosa, no código ejecutable. Si nadie escribe el test, una spec puede mentir sin que nada falle, y ya ha pasado dos veces (FS-142 y el commit `8c15707`). Esta decisión solo funciona si va acompañada de tests que tracen scenarios, y hoy casi no los hay: 1 de 32 requisitos de `tasks`. Hasta que eso cambie, «fuente de verdad» significa «lo que debería pasar», no «lo que pasa».
- **Más trabajo por cada cambio.** Incluso un ajuste pequeño de comportamiento exige un change con propuesta, diseño, tareas y delta, y archivarlo después. Un `MODIFIED` tiene que reproducir el requisito entero, no solo la frase que cambia. Es fácil saltárselo con prisa, y saltárselo es exactamente lo que produce la deriva.
- **Mantener prosa larga.** `openspec/specs/tasks/spec.md` ya tiene 753 líneas en castellano, con requisitos de API y de interfaz mezclados. Leerla entera para contrastar un cambio es lento, y una regla redactada de forma ambigua se puede interpretar de dos maneras con la misma convicción.
- **Corregir la spec a posteriori legitima lo que ya está hecho.** Un change que «solo documenta», como `add-task-status-filter`, alinea el contrato con el código, pero también convierte en requisito lo que se hizo sin pasar por la spec. Además, sus desviaciones (CA-17, o los criterios CA-11, CA-12 y CA-14 sin implementar) quedan en `design.md` y `proposal.md`, no en la spec viva.
- **La historia del archivo es parcial.** Los tres changes comparten fecha y no queda registrado en qué orden se archivaron. `auth` no tiene change de origen. La spec viva no dice qué change introdujo cada requisito. Reconstruir por qué un requisito dice lo que dice exige buscar entre las deltas archivadas.
- **Dependemos de una herramienta.** El flujo descansa en el CLI de OpenSpec (1.14.0) y en sus skills. Un cambio de formato de la herramienta, o alguien que trabaje sin ella, rompe el mecanismo de aplicar las deltas al archivar.
- **Hay que decidir qué hacer cuando chocan.** Mientras el código y la spec discrepen, por ejemplo con el `422` de los estados inventados, alguien tiene que decidir cuál de los dos se corrige. Esta decisión dice que manda la spec, pero no hace la corrección por nadie.
