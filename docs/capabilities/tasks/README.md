# Capability `tasks`

La lista de trabajo del equipo. Hay una sola lista, compartida por todas las cuentas del espacio. Una tarea se crea solo con su título y nace pendiente y a nombre de quien la crea. Cualquiera con sesión puede cambiarle el estado o ponerle y quitarle una fecha de vencimiento. La lista se puede acotar por estado; sin acotar, muestra lo que sigue abierto.

**La fuente de verdad del comportamiento es la spec viva: [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md).** Este README no repite sus reglas. Solo dice dónde están en la spec y dónde viven en el código. Si este documento y la spec se contradicen, manda la spec.

## Endpoints

Todos van bajo `/api/v1`, exigen `Authorization: Bearer <token>` (guard `api`) y responden con el envoltorio `{ data: … }` del serializer. Están definidos en `backend/start/routes.ts`.

| Método | Ruta | Controlador | Qué hace |
|---|---|---|---|
| `GET` | `/tasks` | `TasksController.index` | La lista compartida. Admite `?status=` para acotarla a un estado |
| `POST` | `/tasks` | `TasksController.store` | Crea una tarea a partir de `{ "title": "…" }` |
| `GET` | `/tasks/:id` | `TasksController.show` | Una tarea con su vencimiento. Exige `?today=AAAA-MM-DD` |
| `PATCH` | `/tasks/:id/status` | `TaskStatusesController.update` | Cambia el estado con `{ "status": "…" }` |
| `PUT` | `/tasks/:id/due-date` | `TaskDueDatesController.update` | Fija o retira la fecha con `{ "dueDate": "AAAA-MM-DD" \| null, "today": "AAAA-MM-DD" }` |

El contrato detallado (parámetros, cuerpos, códigos de respuesta y forma de los objetos) está publicado como OpenAPI con el servidor arrancado:

- interfaz: <http://localhost:3333/api>
- documento: <http://localhost:3333/api.json> (también en `.yaml`)

Ese documento se genera desde los decoradores de los controladores y desde los esquemas de `backend/app/openapi/schemas.ts`.

## Reglas de negocio

Las reglas se enumeran aquí solo por su nombre en la spec, con enlace, y con un puntero al sitio del código que las aplica. El *qué* y sus scenarios se leen en la spec.

**Crear**
- [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título): `TasksController.store`.
- [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) y [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo): `createTaskValidator` en `backend/app/validators/task.ts`.

**Lista**
- [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio): `TasksController.index`. La vista por defecto es `DEFAULT_LIST_STATUSES` en `backend/app/models/task.ts`.
- [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima) y [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío): `listTasksValidator` y `TasksController.index`. Esta última regla tiene una desviación conocida, descrita más abajo.
- [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento): la lista usa `TaskTransformer`, que no incluye la fecha. La tarea suelta usa `TaskDetailTransformer`.
- [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable): `TaskAssigneeTransformer`.

**Estados**
- [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos): `TASK_STATUSES` en `backend/app/models/task.ts` y `updateTaskStatusValidator`.
- [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea): `TaskStatusesController.update`.

**Vencimiento**
- [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional) y [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento): `TaskDueDatesController.update` y `setTaskDueDateValidator`.
- [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida): `Task.isOverdueOn()`. Es la única implementación de la regla. El frontend nunca compara fechas.
- [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira): `taskReferenceDayValidator` y `setTaskDueDateValidator`. En el frontend, `localToday()` de `frontend/src/lib/api.ts`.
- [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta): `TasksController.show`.

**Sesión**
- [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión): `.use(middleware.auth())` sobre el grupo `tasks` en `backend/start/routes.ts`.

**Interfaz.** El frontend reúne en `frontend/src/pages/tasks-page.tsx`, `task-page.tsx`, `components/task-item.tsx` y `components/task-filter.tsx` estos requisitos:
- [Pantalla de la lista del equipo](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo)
- [El espacio sin tareas](../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas)
- [Crear una tarea desde la lista](../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista)
- [Aviso al intentar crear sin un título válido](../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido)
- [Cambiar el estado desde la propia fila](../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila)
- [Una sola vista de tareas, sin señales de presencia](../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia)
- [Pantalla de una tarea](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea)
- [Poner y quitar la fecha desde la pantalla de la tarea](../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea)
- [Aviso ante una fecha que no vale](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale)
- [La señal de tarea vencida](../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida)
- [No tener fecha no se penaliza](../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza)
- [El control para acotar la lista](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista)
- [El filtro se pide en la dirección de la lista](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista)
- [Una lista sin filas no significa siempre lo mismo](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo)
- [Lo que sale de la vista no se pierde](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde)

Toda llamada a la API pasa por `frontend/src/lib/api.ts`.

### Desviación conocida

Desde el commit `8c15707`, `listTasksValidator` acepta `status` como texto libre, cuando debería limitarlo a uno de los tres estados. Por eso `GET /api/v1/tasks?status=archivado` responde `200` con `{"data":[]}` en vez del `422` que exige [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío). Cuando se corrija, borra este apartado. Para comprobar si sigue ocurriendo, mira el último ejemplo de [A mano, contra la API](#a-mano-contra-la-api).

## Cómo se prueba en local

### Arrancar

Desde la raíz del repo:

```bash
make setup   # solo la primera vez: dependencias, .env, APP_KEY y migraciones
make start   # backend en http://localhost:3333 y frontend en http://localhost:5173
```

Sin `make`, haz los mismos pasos a mano tal como los describe el `CLAUDE.md` de la raíz.

### Tests automáticos

```bash
cd backend
npm test                                # todas las suites
node ace test --files=tasks/assignee    # solo los tests de tareas
```

Hoy la capability tiene un único fichero de tests, `backend/tests/functional/tasks/assignee.spec.ts`. Cubre solo el requisito *Lo que cada tarea muestra de su responsable*. El resto de requisitos no tiene test automático.

Los tests functional usan la misma base de datos SQLite que el servidor de desarrollo, `backend/tmp/db.sqlite3`. Los de tareas se aíslan con `testUtils.db().withGlobalTransaction()` en `group.each.setup`. Cualquier test nuevo que escriba datos tiene que hacer lo mismo.

### A mano, contra la API

Ojo: el alta escribe una cuenta en la base de datos de desarrollo.

```bash
API=http://localhost:3333/api/v1
TOKEN=$(curl -s -H 'Content-Type: application/json' -X POST $API/auth/signup \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')
AUTH="Authorization: Bearer $TOKEN"

curl -s -H "$AUTH" -H 'Content-Type: application/json' -X POST $API/tasks -d '{"title":"Revisar el informe"}'
curl -s -H "$AUTH" "$API/tasks"
curl -s -H "$AUTH" "$API/tasks/1?today=$(date +%F)"
curl -s -H "$AUTH" -H 'Content-Type: application/json' -X PATCH $API/tasks/1/status -d '{"status":"in_progress"}'
curl -s -H "$AUTH" -H 'Content-Type: application/json' -X PUT $API/tasks/1/due-date -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$(date +%F)\"}"
curl -s -o /dev/null -w '%{http_code}\n' -H "$AUTH" "$API/tasks?status=archivado"   # la spec exige 422
```

También se pueden lanzar las peticiones desde la interfaz OpenAPI en <http://localhost:3333/api>. Desde el navegador, la lista está en <http://localhost:5173/tasks>.
