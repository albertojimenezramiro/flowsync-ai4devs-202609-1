# Spec Delta

## MODIFIED Requirements

### Requirement: Forma pública de una tarea
Toda tarea que devuelva la API SHALL exponer exactamente `id`, `title`, `status`, `assignee`, `dueDate` e `isOverdue`. `assignee` SHALL contener solo el `id` y el `fullName` del responsable, y SHALL NOT incluir su email ni ningún otro dato de su cuenta. `dueDate` SHALL ser la fecha de vencimiento como cadena `YYYY-MM-DD`, o `null` si la tarea no tiene. `isOverdue` SHALL ser un booleano calculado por el servidor en esa misma respuesta.

#### Scenario: Responsable reducido a su nombre
- **WHEN** se obtiene una tarea cuyo responsable tiene nombre y email
- **THEN** `assignee` trae su `id` y su `fullName`, y el email del responsable no aparece en ninguna parte de la respuesta

#### Scenario: Responsable sin nombre
- **WHEN** se obtiene una tarea cuyo responsable se registró sin nombre
- **THEN** `assignee.fullName` es `null` y sigue sin aparecer su email

#### Scenario: Sin vencimiento
- **WHEN** se obtiene una tarea a la que nunca se le puso fecha
- **THEN** la respuesta trae `dueDate: null` e `isOverdue: false`

#### Scenario: Tarea con fecha
- **WHEN** se obtiene una tarea con fecha de vencimiento el 20 de octubre de 2026
- **THEN** la respuesta trae `dueDate: "2026-10-20"`, sin hora ni zona, y un `isOverdue` booleano

#### Scenario: Misma forma en todas las operaciones
- **WHEN** se lista, se lee una, se crea o se actualiza una tarea
- **THEN** cada tarea de la respuesta trae `dueDate` e `isOverdue`

### Requirement: Creación con solo el título
El sistema SHALL aceptar `POST /api/v1/tasks` con `title` y, opcionalmente, `dueDate`, y responder `201` con `{ data: task }`. La tarea SHALL nacer con estado `pending` y con la persona autenticada como responsable. Sin `dueDate`, la tarea SHALL nacer sin fecha. Cualquier otro campo del cuerpo (`status`, `assigneeId`, `isOverdue`…) SHALL ignorarse.

#### Scenario: Creación correcta
- **WHEN** una persona con sesión envía `{ "title": "Preparar la demo" }`
- **THEN** la respuesta es `201` con la tarea nueva: ese título, `status` `pending` y como `assignee` la propia persona

#### Scenario: Intento de fijar estado o responsable al crear
- **WHEN** se crea una tarea enviando además `status: "done"` y el id de otra persona como responsable
- **THEN** la tarea se crea igualmente en `pending` y a nombre de quien la crea

#### Scenario: Creación sin fecha
- **WHEN** se crea una tarea enviando solo el título
- **THEN** la tarea nace con `dueDate: null` e `isOverdue: false`

#### Scenario: Creación con fecha ya pasada
- **WHEN** se crea una tarea con un `dueDate` anterior al día de referencia
- **THEN** la respuesta es `201`, la tarea guarda esa fecha y nace con `isOverdue: true`

#### Scenario: Aparece en la lista
- **WHEN** se crea una tarea y después se pide la lista
- **THEN** la tarea nueva forma parte de la lista

### Requirement: Actualización de estado y responsable
El sistema SHALL aceptar `PATCH /api/v1/tasks/:id`, con `:id` entero positivo escrito en forma canónica (sin ceros a la izquierda), y con cualquier combinación de `status`, `assigneeId` (entero positivo, sin conversión desde otros tipos) y `dueDate`, aplicar solo los campos enviados y responder `200` con `{ data: task }` actualizada. Cualquier persona con sesión SHALL poder actualizar cualquier tarea. Las transiciones entre los tres estados SHALL ser libres. Otros campos, incluidos `title` e `isOverdue`, SHALL ignorarse.

#### Scenario: Cambio de estado
- **WHEN** se envía `{ "status": "in_progress" }` sobre una tarea en `pending`
- **THEN** la respuesta es `200` con la tarea en `in_progress` y el mismo responsable

#### Scenario: Tarea de otra persona
- **WHEN** alguien cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica igual que en una tarea propia

#### Scenario: Vuelta atrás desde Hecho
- **WHEN** se envía `{ "status": "pending" }` sobre una tarea en `done`
- **THEN** la tarea vuelve a `pending`

#### Scenario: Reasignación
- **WHEN** se envía `{ "assigneeId": <id de una cuenta existente> }`
- **THEN** la respuesta es `200` con esa cuenta como `assignee` y el estado sin cambios

#### Scenario: Responsable inexistente
- **WHEN** se envía un `assigneeId` que no corresponde a ninguna cuenta
- **THEN** la respuesta es `422` con un error sobre `assigneeId` y la tarea no cambia

#### Scenario: Responsable con tipo incorrecto
- **WHEN** se envía `assigneeId` como cadena (`"7"`), booleano, lista, cero o número no entero (por ejemplo `1.5`). Un número JSON con valor entero, como `7.0` o `7e0`, es el entero 7 y se acepta
- **THEN** la respuesta es `422` con un error sobre `assigneeId` y la tarea no cambia, aunque exista una cuenta con ese id

#### Scenario: Responsable nulo
- **WHEN** se envía `{ "status": "done", "assigneeId": null }`
- **THEN** la respuesta es `422` con un error sobre `assigneeId` y la tarea no cambia en nada

#### Scenario: Nada que actualizar
- **WHEN** se envía un cuerpo sin `status`, `assigneeId` ni `dueDate`
- **THEN** la respuesta es `422` y la tarea no cambia

#### Scenario: El vencimiento no se puede fijar desde fuera
- **WHEN** se envía `{ "isOverdue": true }` o `{ "status": "pending", "isOverdue": true }`
- **THEN** `isOverdue` se ignora: sin ningún otro campo válido la respuesta es `422`, y si lo hay, el veredicto devuelto es el que calcula el servidor

#### Scenario: Reasignar no toca la fecha
- **WHEN** se envía `{ "assigneeId": <id válido> }` sobre una tarea con fecha
- **THEN** la fecha y el veredicto de vencimiento quedan iguales

#### Scenario: El título no se edita
- **WHEN** se envía `{ "status": "done", "title": "Otro" }`
- **THEN** el estado cambia y el título queda igual

#### Scenario: Tarea inexistente
- **WHEN** se actualiza un `id` que no corresponde a ninguna tarea
- **THEN** la respuesta es `404`

#### Scenario: Identificador no entero
- **WHEN** se actualiza `/api/v1/tasks/1.0`, `/api/v1/tasks/01` o `/api/v1/tasks/abc`
- **THEN** la respuesta es `404` y ninguna tarea cambia, aunque exista la tarea 1

### Requirement: Superficie cerrada de la API de tareas
La API de tareas SHALL ofrecer solo listar, leer una tarea, crear y actualizar. SHALL NOT existir borrado de tareas ni operaciones sobre el equipo o sus miembros.

#### Scenario: Lectura individual o borrado
- **WHEN** se hace `GET` o `DELETE` sobre `/api/v1/tasks/:id` de una tarea existente
- **THEN** el `GET` responde `200` con la tarea sin modificarla, y el `DELETE` responde `404` sin borrar nada

### Requirement: Cada fila dice título, responsable y estado
La lista SHALL mostrar en cada fila el título de la tarea, el nombre de su responsable y su estado como «Pendiente», «En curso» o «Hecho», sin abrir nada. Si el responsable no tiene nombre, o su nombre está formado solo por espacios, SHALL mostrarse «Sin nombre»; nunca su email ni su identificador. Una fila cerrada SHALL NOT mostrar fechas ni marcas de vencida; la fecha y el veredicto de vencimiento solo aparecen al abrir la tarea. La lista SHALL NOT mostrar en ningún caso señales de presencia de otras personas.

#### Scenario: Fila completa
- **WHEN** hay una tarea «Preparar la demo» en `in_progress` a cargo de «Ada Lovelace»
- **THEN** su fila muestra «Preparar la demo», «Ada Lovelace» y «En curso»

#### Scenario: Responsable sin nombre
- **WHEN** el responsable de una tarea se registró sin nombre
- **THEN** su fila muestra «Sin nombre» como responsable, y no su email

#### Scenario: Responsable con nombre en blanco
- **WHEN** el responsable de una tarea tiene como nombre solo espacios
- **THEN** su fila muestra «Sin nombre» como responsable

#### Scenario: Ni fechas ni presencia
- **WHEN** una persona recorre la lista, con todas las filas cerradas, mientras otras usan la aplicación y hay tareas con fecha, algunas vencidas
- **THEN** no ve ninguna fecha, ninguna marca de vencida ni ninguna indicación de quién está conectado

## ADDED Requirements

### Requirement: Fecha de vencimiento de calendario
La fecha de vencimiento SHALL ser una fecha de calendario sin hora, enviada y devuelta como `YYYY-MM-DD`. La API SHALL aceptar cualquier fecha válida, incluidas las anteriores a hoy. Enviar `dueDate` como `null` o cadena vacía SHALL quitar la fecha. Una fecha inexistente, incompleta, con hora o de otro tipo SHALL rechazarse con `422` y un error sobre `dueDate`, sin cambiar la tarea.

#### Scenario: Poner una fecha
- **WHEN** se envía `{ "dueDate": "2026-10-20" }` sobre una tarea sin fecha
- **THEN** la respuesta es `200` con `dueDate: "2026-10-20"`

#### Scenario: Cambiar la fecha
- **WHEN** se envía otra fecha válida sobre una tarea que ya tenía una
- **THEN** la tarea queda con la nueva fecha

#### Scenario: Quitar la fecha
- **WHEN** se envía `{ "dueDate": null }` o `{ "dueDate": "" }` sobre una tarea con fecha, vencida o no
- **THEN** la tarea queda con `dueDate: null` e `isOverdue: false`

#### Scenario: Fecha ya pasada
- **WHEN** se envía un `dueDate` anterior al día de referencia sobre una tarea no hecha
- **THEN** se acepta y la respuesta trae `isOverdue: true`

#### Scenario: Fecha imposible o mal formada
- **WHEN** se envía `dueDate` como `"2026-02-30"`, `"2026-10"`, `"20/10/2026"`, `"2026-10-20T10:00:00Z"` o un número
- **THEN** la respuesta es `422` con un error sobre `dueDate` y la tarea conserva la fecha que tuviera

### Requirement: Regla de vencimiento
El sistema SHALL considerar una tarea vencida (`isOverdue: true`) si y solo si se cumplen a la vez tres condiciones: tiene fecha de vencimiento, esa fecha es anterior al día de referencia y su estado no es `done`. El veredicto SHALL calcularse en cada respuesta, sin guardarse, para que una tarea pase a estar vencida por el mero paso del día, sin que nadie la modifique.

#### Scenario: Vence hoy
- **WHEN** una tarea no hecha tiene como fecha el día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Venció ayer
- **WHEN** una tarea no hecha tiene como fecha el día anterior al de referencia
- **THEN** `isOverdue` es `true`

#### Scenario: Fecha futura
- **WHEN** una tarea tiene una fecha posterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Sin fecha
- **WHEN** una tarea sin fecha lleva semanas en `pending`
- **THEN** `isOverdue` es `false`

#### Scenario: Hecha con la fecha pasada
- **WHEN** una tarea en `done` tiene una fecha anterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Darla por hecha
- **WHEN** una tarea vencida pasa a `done`
- **THEN** la respuesta trae `isOverdue: false` y la misma `dueDate` que antes

#### Scenario: Volver atrás desde Hecho
- **WHEN** una tarea en `done` con fecha pasada vuelve a `pending` o `in_progress`
- **THEN** la respuesta trae `isOverdue: true`

#### Scenario: Aplazar la fecha
- **WHEN** a una tarea vencida se le pone una fecha posterior al día de referencia
- **THEN** `isOverdue` pasa a `false`

#### Scenario: Vence sola al cambiar el día
- **WHEN** una tarea no hecha tiene como fecha el día de referencia y se vuelve a leer cuando el día de referencia ya es el siguiente, sin que nadie la haya modificado
- **THEN** `isOverdue` es `true`

### Requirement: El día de referencia es el de quien mira
El servidor SHALL tomar como día de referencia la fecha actual en la zona horaria IANA que el cliente envía en la cabecera `X-Timezone`, en cualquier operación que devuelva tareas. Sin cabecera, SHALL usar la fecha actual en UTC. Una zona que no exista SHALL rechazarse con `422`, sin aplicar ningún cambio.

#### Scenario: Dos zonas, dos veredictos
- **WHEN** una tarea no hecha vence el 12 de octubre y dos personas la leen a la vez a las 23:30 UTC del 12, una con `X-Timezone: Europe/Madrid` (ya 13 de octubre) y otra con `X-Timezone: America/New_York` (aún 12 de octubre)
- **THEN** la primera recibe `isOverdue: true` y la segunda `isOverdue: false`

#### Scenario: Sin zona
- **WHEN** se piden tareas sin cabecera `X-Timezone`
- **THEN** el veredicto se calcula con la fecha actual en UTC

#### Scenario: Zona inválida
- **WHEN** se envía `X-Timezone: Marte/Olympus` al listar, leer, crear o actualizar
- **THEN** la respuesta es `422` y ninguna tarea se crea ni cambia

### Requirement: Lectura individual de una tarea
El sistema SHALL responder a `GET /api/v1/tasks/:id`, con `:id` entero positivo en forma canónica, con `200` y `{ data: task }` en la forma pública de una tarea, para cualquier persona con sesión. Si la tarea no existe o el identificador no es canónico, SHALL responder `404`. Sin sesión, SHALL responder `401`. Leer una tarea SHALL NOT modificarla.

#### Scenario: Leer una tarea
- **WHEN** una persona con sesión pide `GET /api/v1/tasks/<id existente>`
- **THEN** la respuesta es `200` con esa tarea, incluidos `dueDate` e `isOverdue`

#### Scenario: Tarea ajena
- **WHEN** se lee una tarea cuyo responsable es otra persona
- **THEN** la respuesta es `200` igual que con una propia

#### Scenario: Inexistente o identificador no canónico
- **WHEN** se pide `/api/v1/tasks/999999`, `/api/v1/tasks/01` o `/api/v1/tasks/abc`
- **THEN** la respuesta es `404`

#### Scenario: Sin sesión
- **WHEN** se lee una tarea sin token válido
- **THEN** la respuesta es `401`

### Requirement: Abrir una tarea desde su fila
Cada fila de la lista SHALL tener un control «Abrir» que despliega bajo ella el panel de esa tarea, y que pasa a «Cerrar» para plegarlo. El control SHALL ser operable con teclado y anunciar si el panel está abierto. Al abrirlo, el panel SHALL pedir la tarea al servidor para mostrar su fecha y su veredicto actuales. Abrir y cerrar SHALL NOT modificar la tarea.

#### Scenario: Abrir y cerrar
- **WHEN** la persona pulsa «Abrir» en una fila y después «Cerrar»
- **THEN** se despliega el panel de esa tarea y luego se pliega, y la fila vuelve a mostrar solo título, responsable y estado

#### Scenario: Con teclado
- **WHEN** la persona llega al control con el tabulador y lo activa con Intro o espacio
- **THEN** el panel se abre o se cierra igual que con el ratón

### Requirement: Poner, cambiar y quitar la fecha en el panel
El panel SHALL ofrecer un campo «Fecha de vencimiento» que guarda la fecha en cuanto se elige una fecha completa y válida, sin botón de guardar. Si la tarea tiene fecha, SHALL ofrecer un botón «Quitar fecha» que la quita sin confirmación. El cambio SHALL verse en el panel al instante, sin recargar ni volver a abrir. Una fecha incompleta o inválida SHALL mostrar «Introduce una fecha completa y válida.» junto al campo y no SHALL cambiar la fecha guardada. Si el servidor rechaza el cambio, SHALL mostrarse el motivo y SHALL conservarse la fecha anterior.

#### Scenario: Poner una fecha
- **WHEN** la persona abre una tarea sin fecha y elige el 20 de octubre de 2026
- **THEN** la fecha queda guardada y el panel la muestra sin pulsar nada más

#### Scenario: Quitar la fecha
- **WHEN** la persona pulsa «Quitar fecha» en una tarea con fecha
- **THEN** la fecha desaparece al momento, sin diálogo de confirmación, y deja de mostrarse «Vencida» si se mostraba

#### Scenario: Fecha incompleta
- **WHEN** la persona deja el campo a medio escribir, por ejemplo solo el día y el mes
- **THEN** ve «Introduce una fecha completa y válida.» junto al campo y la fecha guardada no cambia

#### Scenario: Cualquier tarea
- **WHEN** la persona cambia la fecha de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica sin avisos ni permisos especiales

### Requirement: Señal de vencida en el panel
El panel de una tarea vencida SHALL mostrar la señal «Vencida» como texto, no solo como color, según el veredicto del servidor. El frontend SHALL NOT calcular el vencimiento por su cuenta. Una tarea sin fecha SHALL NOT mostrar ningún aviso ni indicación de que le falte algo. El veredicto mostrado SHALL actualizarse con cada respuesta del servidor sobre esa tarea, incluido un cambio de estado hecho desde la fila.

#### Scenario: Tarea vencida
- **WHEN** la persona abre una tarea que el servidor da por vencida
- **THEN** ve «Vencida» en el panel sin tener que comparar la fecha con el calendario

#### Scenario: Vence hoy
- **WHEN** la persona abre una tarea no hecha cuya fecha es su día de hoy
- **THEN** no ve «Vencida»

#### Scenario: Sin fecha
- **WHEN** la persona abre una tarea sin fecha
- **THEN** ve el campo vacío y ningún aviso

#### Scenario: Pasarla a Hecho con el panel abierto
- **WHEN** la persona pasa a «Hecho» una tarea vencida con su panel abierto
- **THEN** la señal «Vencida» desaparece cuando el servidor confirma el cambio, y la fecha se conserva

### Requirement: El cliente envía su zona horaria
La aplicación web SHALL enviar en cada petición a la API la cabecera `X-Timezone` con la zona IANA del navegador, para que los veredictos de vencimiento correspondan al día de quien mira.

#### Scenario: Persona en otra zona
- **WHEN** una persona con el navegador en `America/New_York` abre una tarea que vence el día que para ella aún es hoy
- **THEN** no ve «Vencida», aunque en UTC ya sea el día siguiente
