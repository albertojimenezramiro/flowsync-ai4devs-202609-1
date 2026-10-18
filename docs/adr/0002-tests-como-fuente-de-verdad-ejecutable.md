# 2. Los tests de integración como única fuente de verdad ejecutable

## Estado

Propuesto. Fecha de este registro: 2026-10-18.

Es un escenario hipotético: dentro de un año se dejan de mantener las specs de OpenSpec. No está aceptado. La decisión vigente sigue siendo el [ADR 0001: Las delta-specs de OpenSpec como fuente de verdad viva](0001-openspec-como-fuente-de-verdad.md). Si este ADR se aceptara, reemplazaría al 0001, y habría que marcarlo así en el estado del 0001.

## Contexto

El [ADR 0001](0001-openspec-como-fuente-de-verdad.md) hizo de las specs vivas de `openspec/specs/` la fuente de verdad del comportamiento de FlowSync, y de las delta-specs de OpenSpec la única vía para cambiarlas. El propio ADR dejó escrito su coste principal: la spec es prosa, no se protege sola, y puede mentir sin que nada falle. En el momento de escribirlo ya había pasado dos veces:

- **FS-142:** el filtro por estado se implementó sin tocar la spec, y hubo que documentarlo a posteriori en el commit `209df12`.
- **Commit `8c15707`:** relajó el validador de la lista y rompió el `422` de estados inventados sin que nada lo detectara.

Aquel ADR condicionaba su éxito a que los scenarios acabaran trazados por tests. Esta decisión parte de que esa condición no se ha cumplido de forma sostenida, y de que mantener dos artefactos por cada cambio de comportamiento (la delta-spec y el test) no compensa:

- **Las specs se dejan de mantener.** Los changes de OpenSpec dejan de abrirse y de archivarse.
- **Lo que de verdad protege es lo que se ejecuta.** Un scenario sin test no protege nada. Un test que falla sí lo hace, aunque nadie haya leído la spec.
- **La base técnica ya existe.** Los tests functional de Japa (`backend/tests/functional/<capability>/`) atacan la API real y tienen las rutas y los payloads tipados gracias al registro generado. Además ya hay un precedente de test escrito como trazado de un requisito: `backend/tests/functional/tasks/assignee.spec.ts`.

Hay restricciones del proyecto que siguen en pie y que condicionan esta decisión:

- **Frontend sin tests:** no tiene runner de tests instalado.
- **Una sola base de datos:** los tests functional comparten base SQLite con el servidor de desarrollo.
- **Sin CI:** el repositorio no tiene integración continua (no hay `.github/` ni otra configuración de CI).

## Decisión

Los tests de integración del backend son la única fuente de verdad ejecutable del comportamiento de FlowSync.

- **Qué es contrato.** Un comportamiento de la API forma parte del contrato si, y solo si, hay un test en `backend/tests/functional/<capability>/` que lo afirma. Lo que no tiene test no está garantizado, diga lo que diga cualquier documento.
- **El test se lee como un requisito.** Cada grupo de tests nombra en su título y en su comentario de cabecera el comportamiento que fija, en castellano, como ya hace `assignee.spec.ts`. Los títulos de los tests describen el comportamiento observable (cuándo y entonces), no la implementación.
- **Todo cambio de comportamiento lleva su test en el mismo cambio.** Si cambia lo que el sistema debe hacer, se modifica el test que lo fija. Un PR que cambia comportamiento sin tocar ningún test no cambia el contrato: lo rompe.
- **`openspec/` se congela, no se borra.** `openspec/specs/` y `openspec/changes/archive/` se quedan como registro histórico de lo que se decidió y por qué. Se dejan de actualizar, y se marcan como congelados para que nadie las lea como contrato vigente.
- **El resto de la documentación remite a los tests.** Por ejemplo, el README de cada capability enlaza los ficheros de test en lugar de la spec. El documento OpenAPI sigue describiendo la forma del contrato técnico, pero no es fuente de verdad: lo que manda es el test.
- **Las revisiones contrastan contra los tests.** El subagente `adversarial-reviewer` contrasta cada cambio contra los tests que lo cubren, no contra `openspec/specs/`.
- **Aislamiento obligatorio.** Todo test que escriba datos se aísla con `testUtils.db().withGlobalTransaction()` (o con truncado), porque la base es la misma que la de desarrollo.

## Consecuencias

**Lo que ganamos**

- **Si el contrato se rompe, salta.** Lo que el commit `8c15707` hizo en silencio habría fallado en `npm test` con un test sobre el `422` de estados inventados. El contrato y el código ya no pueden divergir sin que lo note alguien que ejecute la suite.
- **Un artefacto menos por cambio.** Desaparecen la delta-spec, el `proposal.md`, el `design.md` y el `tasks.md` como requisito previo, y con ellos la tentación de saltárselos que producía la deriva.
- **Lo que manda es lo que se ejecuta.** El contrato vigente se averigua corriendo la suite, no interpretando 750 líneas de prosa.
- **Se deja de depender de una herramienta.** Ya no hacen falta el CLI de OpenSpec ni sus skills para mantener el contrato.

**Lo que nos cuesta**

- **La interfaz se queda sin fuente de verdad.** El frontend no tiene runner de tests, así que los requisitos de pantalla, que en `tasks` son casi la mitad, no tienen dónde vivir como test. Ejemplos: el control del filtro, los mensajes de lista vacía, la señal de tarea vencida o la operabilidad con teclado. Mientras no se instale un runner de componentes o de extremo a extremo, ese comportamiento queda sin contrato. Es una pérdida real respecto al ADR 0001, donde al menos estaba escrito.
- **El *porqué* desaparece del contrato.** Un test dice qué pasa, no por qué se decidió así, ni qué quedó fuera a propósito, ni qué alternativa se descartó. Ejemplos: el límite de 200 caracteres de PA-9, o que la lista no muestra el vencimiento por diseño y no por olvido. Hasta ahora eso vivía en las propuestas y diseños de cada change. A partir de aquí solo queda en los comentarios de los tests y en los PR, y es más fácil que se pierda.
- **Un test puede blindar un bug.** Si alguien escribe un test que afirma el comportamiento actual en lugar del deseado, el error pasa a ser contrato con todas las garantías. Por ejemplo, un test que espere `200` con lista vacía para `?status=archivado`. Con una spec había un texto independiente del código contra el que contrastar. Ahora el criterio de qué *debe* pasar recae entero en quien escribe y revisa el test.
- **Los requisitos negativos se prueban mal.** Ejemplos: que no existe vista de «mis tareas», que no se puede crear un estado o que no hay señales de presencia. «Que algo no exista» es difícil de afirmar en un test de integración sin acabar en tests frágiles o vacíos de contenido.
- **Sin CI, «ejecutable» depende de que alguien ejecute.** Mientras no haya integración continua, la garantía es tan buena como la disciplina de lanzar `npm test` antes de integrar. Montar una CI pasa a ser una dependencia de esta decisión, no una mejora opcional.
- **Para leer el contrato hay que leer código.** Producto, diseño o alguien que llega nuevo pierde un documento en lenguaje natural con ejemplos. Ahora tiene que leer ficheros TypeScript o fiarse de los títulos de los tests.
- **Una spec congelada sigue pareciendo vigente.** `openspec/specs/` seguirá en el repositorio con aspecto de contrato. Si se marca mal o se olvida marcarla, alguien, persona o agente, la tomará por vigente y contrastará contra reglas que ya nadie mantiene. Las referencias que la apuntan como fuente de verdad tienen que actualizarse en el mismo cambio que congela la spec:
  - el README de `docs/capabilities/tasks/`;
  - el prompt de `.claude/agents/adversarial-reviewer.md`;
  - el ADR 0001.
- **Hay que pagar la cobertura de partida.** Al cambiar de fuente de verdad, solo el comportamiento que ya tenga test sigue siendo contrato. Cualquier requisito de la spec congelada sin su test equivalente deja de estar garantizado el día que se acepta esta decisión, salvo que antes se escriban esos tests.
