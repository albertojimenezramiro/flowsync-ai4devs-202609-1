# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Creación con solo el título`
- TO: `### Requirement: Creación de una tarea`

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

### Requirement: Las tareas exigen sesión
Las cuatro operaciones de tareas (listar, leer una, crear y actualizar) SHALL requerir un token de acceso válido. Sin él SHALL responder `401` sin revelar ninguna tarea. Cualquier persona con sesión SHALL poder usarlas sobre cualquier tarea, sin roles ni permisos adicionales.

#### Scenario: Petición sin sesión
- **WHEN** se lista, se lee, se crea o se actualiza una tarea sin token o con un token no válido
- **THEN** la respuesta es `401` y no se lee ni se modifica ninguna tarea

### Requirement: Listado de la lista compartida
El sistema SHALL responder a `GET /api/v1/tasks` con `200` y `{ data: [...] }` con todas las tareas existentes. El conjunto de tareas y sus datos guardados SHALL ser el mismo para cualquier persona con sesión: no existen tareas privadas ni listas por persona. Solo `isOverdue` puede diferir, porque depende del día de referencia de quien pide la lista. Listar SHALL NOT modificar ninguna tarea. El orden de los elementos no está definido.

#### Scenario: Mismo contenido para todos
- **WHEN** dos personas distintas piden la lista sin que nadie cambie nada entre medias
- **THEN** reciben el mismo conjunto de tareas, con los mismos títulos, estados, responsables y fechas, aunque `isOverdue` pueda diferir si sus zonas están en días distintos

#### Scenario: Tarea de otra persona
- **WHEN** otra persona crea una tarea, que queda a su nombre, y yo pido la lista
- **THEN** esa tarea aparece en mi respuesta

#### Scenario: Sin tareas
- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** la respuesta es `200` con `data` como lista vacía

### Requirement: Creación de una tarea
El sistema SHALL aceptar `POST /api/v1/tasks` con `title` y, opcionalmente, `dueDate`, y responder `201` con `{ data: task }`. La tarea SHALL nacer con estado `pending` y con la persona autenticada como responsable. Sin `dueDate`, la tarea SHALL nacer sin fecha. Cualquier otro campo del cuerpo (`status`, `assigneeId`, `isOverdue`…) SHALL ignorarse. La interfaz sigue pidiendo solo el título (ver «Crear tarea desde la lista con solo el título»).

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
- **WHEN** se envía un cuerpo sin `status`, `assigneeId` ni `dueDate`, o con `isOverdue` como único campo
- **THEN** la respuesta es `422` y la tarea no cambia

#### Scenario: Solo la fecha basta
- **WHEN** se envía un cuerpo cuyo único campo es `dueDate`, sea una fecha, `null` o `""`
- **THEN** la actualización se aplica: `dueDate` cuenta como campo a actualizar igual que `status` o `assigneeId`

#### Scenario: El vencimiento no se puede fijar desde fuera
- **WHEN** se envía `{ "status": "pending", "isOverdue": true }` sobre una tarea sin fecha
- **THEN** el estado cambia y la respuesta trae `isOverdue: false`, el veredicto que calcula el servidor

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
La lista SHALL mostrar en cada fila el título de la tarea, el nombre de su responsable y su estado como «Pendiente», «En curso» o «Hecho», sin abrir nada, junto al control «Abrir» de la tarea. Si el responsable no tiene nombre, o su nombre está formado solo por espacios, SHALL mostrarse «Sin nombre»; nunca su email ni su identificador. La fecha y el veredicto de vencimiento SHALL aparecer solo en el panel de la tarea abierta, y como mucho una tarea SHALL estar abierta a la vez. Con la tarea cerrada, su fila SHALL NOT mostrar ni contener en la página ninguna fecha ni marca de vencida. La lista SHALL NOT mostrar en ningún caso señales de presencia de otras personas.

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
- **WHEN** una persona recorre la lista sin ninguna tarea abierta, mientras otras usan la aplicación y hay tareas con fecha (algunas vencidas) y tareas sin fecha
- **THEN** no ve ninguna fecha, ninguna marca de vencida, ningún aviso sobre tareas sin fecha ni ninguna indicación de quién está conectado

#### Scenario: Cerrar no deja rastro
- **WHEN** la persona abre una tarea vencida y la vuelve a cerrar
- **THEN** ni la fecha ni «Vencida» quedan en la página

#### Scenario: Una sola tarea abierta
- **WHEN** con una tarea abierta, la persona abre otra
- **THEN** la primera se cierra y solo la segunda muestra su panel

### Requirement: Cambiar el estado desde la fila
Cada fila SHALL permitir cambiar el estado de su tarea con un solo gesto, sin abrirla, sin diálogo de confirmación y sin rellenar ningún campo. Los únicos destinos ofrecidos SHALL ser «Pendiente», «En curso» y «Hecho», con el actual marcado. El nuevo estado SHALL reflejarse de inmediato. Si el servidor rechaza el cambio, la fila SHALL volver a su estado anterior y mostrarse un aviso que empiece por «No se pudo guardar el cambio de estado.» seguido del motivo. Si lo acepta, la tarea SHALL quedar como la devuelve el servidor, incluido su veredicto de vencimiento. Mientras haya una petición en curso sobre una tarea (cambio de estado, apertura o cambio de fecha), sus controles SHALL estar deshabilitados, para que no se crucen respuestas.

#### Scenario: Cambio desde la lista
- **WHEN** la persona elige «En curso» en una tarea que está en «Pendiente»
- **THEN** la fila muestra «En curso» al momento, sin diálogos ni navegación

#### Scenario: Tarea de otra persona
- **WHEN** la persona cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica sin pedir permiso ni mostrar advertencias

#### Scenario: Solo tres destinos
- **WHEN** la persona mira las opciones de estado de una fila
- **THEN** ve exactamente «Pendiente», «En curso» y «Hecho», y la tarea queda siempre en uno de ellos

#### Scenario: Petición en curso
- **WHEN** la tarea abierta se está cargando o guardando su fecha
- **THEN** los botones de estado de su fila están deshabilitados hasta que termina

#### Scenario: El servidor rechaza el cambio
- **WHEN** el cambio de estado falla en el servidor o no hay conexión
- **THEN** la fila vuelve a mostrar el estado que tenía y la persona ve «No se pudo guardar el cambio de estado.» seguido del motivo (por ejemplo, que no se pudo conectar con el servidor)

## ADDED Requirements

### Requirement: Fecha de vencimiento de calendario
La fecha de vencimiento SHALL ser una fecha de calendario sin hora, enviada y devuelta como `YYYY-MM-DD`, con año de cuatro cifras. La API SHALL aceptar cualquier fecha válida, incluidas las anteriores a hoy. Enviar `dueDate` como `null` o cadena vacía SHALL quitar la fecha. Una fecha inexistente, incompleta, con hora o de otro tipo SHALL rechazarse con `422` y un error sobre `dueDate`, sin cambiar la tarea.

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
- **WHEN** se envía `dueDate` como `"2026-02-30"`, `"2027-02-29"`, `"2026-10"`, `"20/10/2026"`, `"2026-10-20T10:00:00Z"`, `"12026-10-20"` o un número
- **THEN** la respuesta es `422` con un error sobre `dueDate` y la tarea conserva la fecha que tuviera

#### Scenario: Día bisiesto
- **WHEN** se envía `{ "dueDate": "2028-02-29" }`
- **THEN** se acepta y se devuelve igual

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
- **WHEN** una tarea no hecha tiene como fecha el día de referencia de una lectura, y se vuelve a leer sin que nadie la modifique con un día de referencia posterior (porque ha pasado la medianoche o porque se lee desde una zona que ya está en el día siguiente)
- **THEN** la primera lectura da `isOverdue: false` y la segunda `true`

### Requirement: El día de referencia es el de quien mira
El servidor SHALL tomar como día de referencia la fecha actual en la zona horaria IANA (un nombre como `Europe/Madrid` o `UTC`, no un desfase como `+02:00`) que el cliente envía en la cabecera `X-Timezone`, en cualquier operación que devuelva tareas. Sin cabecera, o con la cabecera vacía, SHALL usar la fecha actual en UTC. Una zona que no exista o no sea un nombre IANA SHALL rechazarse con `422`, sin aplicar ningún cambio.

#### Scenario: Dos zonas, dos veredictos
- **WHEN** una tarea no hecha vence el día que es hoy en `Etc/GMT+12`, y en el mismo momento se lee con `X-Timezone: Etc/GMT+12` y con `X-Timezone: Pacific/Kiritimati`, donde ya es un día posterior
- **THEN** la primera lectura recibe `isOverdue: false` y la segunda `isOverdue: true`

#### Scenario: Sin zona
- **WHEN** se piden tareas sin cabecera `X-Timezone`
- **THEN** el veredicto se calcula con la fecha actual en UTC

#### Scenario: Zona inválida
- **WHEN** se envía `X-Timezone: Marte/Olympus` o `X-Timezone: +02:00` al listar, leer, crear o actualizar
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
Cada fila de la lista SHALL tener un control «Abrir» que despliega bajo ella el panel de esa tarea, y que pasa a «Cerrar» para plegarlo. El control SHALL ser operable con teclado y anunciar si el panel está abierto. Al abrirlo, el panel SHALL pedir la tarea al servidor y, hasta recibirla, SHALL mostrar «Cargando…» sin fecha ni veredicto. Si la petición falla, SHALL mostrar «No se pudo abrir la tarea.» seguido del motivo, sin fecha ni veredicto. Abrir y cerrar SHALL NOT modificar la tarea.

#### Scenario: Abrir y cerrar
- **WHEN** la persona pulsa «Abrir» en una fila y después «Cerrar»
- **THEN** se despliega el panel de esa tarea y luego se pliega, y la fila vuelve a mostrar solo título, responsable y estado

#### Scenario: Con teclado
- **WHEN** la persona llega al control con el tabulador y lo activa con Intro o espacio
- **THEN** el panel se abre o se cierra igual que con el ratón

#### Scenario: Veredicto fresco al abrir
- **WHEN** la lista se cargó antes de que una tarea pasara a estar vencida y la persona la abre después
- **THEN** el panel muestra «Cargando…» y luego «Vencida», sin mostrar en ningún momento el veredicto anterior

#### Scenario: Fallo al abrir
- **WHEN** la persona abre una tarea y el servidor no responde
- **THEN** el panel muestra «No se pudo abrir la tarea.» con el motivo, sin campo de fecha ni veredicto

### Requirement: Poner, cambiar y quitar la fecha en el panel
El panel SHALL ofrecer un campo «Fecha de vencimiento» que, sin botón de guardar, guarda la fecha cuando la persona confirma el campo: al salir de él (incluido al cerrar la tarea) o al pulsar Intro. Mientras escribe no SHALL enviarse nada. Si la tarea tiene fecha, SHALL ofrecer un botón «Quitar fecha» que la quita sin confirmación. El resultado SHALL verse en el panel en cuanto el servidor lo confirma, sin recargar ni volver a abrir. Al confirmar una fecha incompleta, inválida o con año de más de cuatro cifras, SHALL mostrar «Introduce una fecha completa y válida.» junto al campo, no SHALL enviarse nada y el campo SHALL volver a la fecha guardada. Vaciar el campo no quita la fecha. Si el servidor rechaza el cambio, SHALL mostrarse junto al campo «No se pudo guardar la fecha.» seguido del motivo y SHALL conservarse la fecha anterior.

#### Scenario: Poner una fecha
- **WHEN** la persona abre una tarea sin fecha y elige el 20 de octubre de 2026
- **THEN** al salir del campo la fecha queda guardada y el panel la muestra sin pulsar nada más

#### Scenario: Quitar la fecha
- **WHEN** la persona pulsa «Quitar fecha» en una tarea con fecha
- **THEN** la fecha desaparece al momento, sin diálogo de confirmación, y deja de mostrarse «Vencida» si se mostraba

#### Scenario: Fecha incompleta
- **WHEN** la persona deja el campo a medio escribir (por ejemplo, solo el día y el mes) o con un año de cinco cifras, y sale de él
- **THEN** ve «Introduce una fecha completa y válida.» junto al campo, no se envía nada y el campo vuelve a la fecha guardada

#### Scenario: Editar el año tecla a tecla
- **WHEN** la persona cambia el año de una fecha guardada escribiéndolo cifra a cifra
- **THEN** no se guarda ninguna fecha intermedia; solo se guarda la del momento en que sale del campo o pulsa Intro

#### Scenario: Cerrar tras poner la fecha
- **WHEN** la persona escribe una fecha y pulsa «Cerrar» sin hacer nada más
- **THEN** la fecha queda guardada, y al volver a abrir la tarea aparece

#### Scenario: Vaciar el campo
- **WHEN** la persona borra el contenido del campo de una tarea con fecha y sale de él
- **THEN** ve «Introduce una fecha completa y válida.», la fecha guardada se conserva y el campo vuelve a mostrarla

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
