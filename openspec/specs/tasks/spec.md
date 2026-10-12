# tasks Specification

## Purpose
Mantener una única lista de tareas compartida por todo el equipo, donde cualquiera crea tareas con solo el título, ve quién lleva cada una y en qué estado está y cambia ese estado desde la propia lista, y al abrir una tarea pone, cambia o quita su fecha de vencimiento y ve si está vencida según su propio día.

## Requirements

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

### Requirement: Conjunto cerrado de estados
El estado de una tarea SHALL ser siempre uno de `pending`, `in_progress` o `done`. La API SHALL rechazar con `422` cualquier otro valor, incluidos los nombres en castellano, `null` y la cadena vacía. No SHALL existir forma de añadir, renombrar ni eliminar estados.

#### Scenario: Valor fuera del conjunto
- **WHEN** se intenta poner a una tarea el estado `blocked`
- **THEN** la respuesta es `422` con un error sobre `status` y la tarea conserva su estado anterior

#### Scenario: Estado nulo o vacío junto a otro cambio válido
- **WHEN** se envía `{ "status": null, "assigneeId": <id válido> }` o `{ "status": "", "assigneeId": <id válido> }`
- **THEN** la respuesta es `422` con un error sobre `status` y la tarea no cambia en nada

#### Scenario: Nombre en castellano como valor
- **WHEN** se intenta poner a una tarea el estado `Hecho` o `hecho`
- **THEN** la respuesta es `422` con un error sobre `status`

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

### Requirement: Título obligatorio y acotado
El título SHALL recortarse de espacios al principio y al final antes de validarse y guardarse. Si queda vacío, o falta, la API SHALL responder `422` con un error sobre `title` y no crear nada. Si tras recortarlo supera 120 caracteres (contados como unidades de texto UTF-16, de modo que algunos emojis cuentan como dos), SHALL responder `422` con un error sobre `title`. El título SHALL NOT guardarse nunca recortado por longitud.

#### Scenario: Sin título
- **WHEN** se intenta crear una tarea sin `title` o con `title` vacío
- **THEN** la respuesta es `422` con un error sobre `title` y la lista no cambia

#### Scenario: Título solo con espacios
- **WHEN** se intenta crear una tarea con `title` formado solo por espacios
- **THEN** la respuesta es `422` igual que con el título vacío y no aparece ninguna tarea sin texto

#### Scenario: Espacios alrededor
- **WHEN** se crea una tarea con `title` "  Preparar la demo  "
- **THEN** la tarea se guarda con el título "Preparar la demo"

#### Scenario: Título en el límite
- **WHEN** se crea una tarea con un título de exactamente 120 caracteres
- **THEN** la tarea se crea con el título completo

#### Scenario: Título demasiado largo
- **WHEN** se intenta crear una tarea con un título de 121 caracteres o más
- **THEN** la respuesta es `422` con un error sobre `title` y no se guarda ninguna versión recortada

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

### Requirement: La lista es la portada de la aplicación
La aplicación web SHALL ofrecer la lista de tareas en `/tasks`, solo con sesión iniciada. Tras iniciar sesión o registrarse, y ante cualquier dirección desconocida, SHALL llevar a la lista. La lista y el perfil SHALL enlazarse entre sí. No SHALL existir ninguna otra vista de tareas, como «mis tareas».

#### Scenario: Entrar en la aplicación
- **WHEN** una persona inicia sesión o termina de registrarse
- **THEN** llega a la lista de tareas

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** se la lleva al login sin mostrar ninguna tarea

#### Scenario: Dirección desconocida con sesión
- **WHEN** una persona con sesión abre una dirección que no existe
- **THEN** llega a la lista de tareas

#### Scenario: Navegación entre lista y perfil
- **WHEN** una persona está en la lista o en su perfil
- **THEN** tiene un enlace visible para ir a la otra pantalla

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

### Requirement: Lista vacía con invitación
Cuando no exista ninguna tarea, la pantalla SHALL explicar qué es la lista y SHALL invitar a crear la primera tarea, en lugar de mostrar una lista vacía sin más.

#### Scenario: Primer uso
- **WHEN** una persona abre la lista y no hay ninguna tarea
- **THEN** ve un mensaje que explica que aquí está el trabajo de todo el equipo y la anima a crear la primera, junto al formulario para hacerlo

### Requirement: Crear tarea desde la lista con solo el título
La pantalla de lista SHALL ofrecer un formulario con un único campo de título y un botón para crear. No SHALL pedir ni sugerir responsable, estado, fecha ni ningún otro dato. Al crearse, la tarea SHALL aparecer en la lista sin recargar ni navegar, y el campo SHALL vaciarse. Mientras se envía, mientras la lista aún se está cargando y si la carga de la lista ha fallado, el botón SHALL estar deshabilitado. Un segundo envío mientras el primero está en curso SHALL ignorarse.

#### Scenario: Crear con un título
- **WHEN** la persona escribe un título y pulsa el botón de crear
- **THEN** la tarea aparece en la lista, a su nombre y en «Pendiente», sin recargar la página, y el campo queda vacío

#### Scenario: Fallo al cargar la lista
- **WHEN** la lista no se puede cargar (servidor caído o error)
- **THEN** la persona ve un aviso con el motivo, no se muestra la invitación de lista vacía y el botón de crear queda deshabilitado hasta recargar la página

#### Scenario: Doble envío
- **WHEN** la persona envía el formulario dos veces seguidas antes de que responda el servidor
- **THEN** se crea una sola tarea

#### Scenario: El formulario no ofrece nada más
- **WHEN** la persona mira el formulario de creación
- **THEN** solo hay un campo de título y el botón de crear

### Requirement: Errores del título en pantalla
La pantalla SHALL explicar en lenguaje corriente, junto al campo, por qué no se crea una tarea. Un título vacío o solo con espacios SHALL mostrar «Escribe un título para la tarea.». Un título de más de 120 caracteres SHALL mostrar «El título no puede superar los 120 caracteres.». En ambos casos SHALL hacerlo sin enviar nada al servidor y sin recortar el texto escrito.

#### Scenario: Título vacío
- **WHEN** la persona pulsa crear con el campo vacío o solo con espacios
- **THEN** ve «Escribe un título para la tarea.» junto al campo y no aparece ninguna fila nueva

#### Scenario: Título demasiado largo
- **WHEN** la persona pulsa crear con un título de más de 120 caracteres
- **THEN** ve «El título no puede superar los 120 caracteres.» junto al campo, su texto sigue íntegro en el campo y no se crea nada

### Requirement: Cambiar el estado desde la fila
Cada fila SHALL permitir cambiar el estado de su tarea con un solo gesto, sin abrirla, sin diálogo de confirmación y sin rellenar ningún campo. Los únicos destinos ofrecidos SHALL ser «Pendiente», «En curso» y «Hecho», con el actual marcado. El nuevo estado SHALL reflejarse de inmediato. Si el servidor rechaza el cambio, la fila SHALL volver a su estado anterior y mostrarse un aviso que empiece por «No se pudo guardar el cambio de estado.» seguido del motivo. Si lo acepta, la tarea SHALL quedar como la devuelve el servidor, incluido su veredicto de vencimiento. Mientras haya una petición en curso sobre una tarea (cambio de estado, apertura o cambio de fecha), aunque su panel ya esté cerrado, los botones de estado de su fila SHALL estar deshabilitados, para que no se crucen respuestas.

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
- **WHEN** hay en curso cualquier petición sobre una tarea (un cambio de estado, la carga de su panel o el guardado de su fecha), esté la tarea abierta o ya cerrada
- **THEN** los botones de estado de su fila están deshabilitados hasta que termina

#### Scenario: El servidor rechaza el cambio
- **WHEN** el cambio de estado falla en el servidor o no hay conexión
- **THEN** la fila vuelve a mostrar el estado que tenía y la persona ve «No se pudo guardar el cambio de estado.» seguido del motivo (por ejemplo, que no se pudo conectar con el servidor)

### Requirement: Mirar la lista no cambia nada
Cargar y recorrer la lista sin pulsar ningún control SHALL NOT cambiar el estado, el responsable ni la fecha de vencimiento de ninguna tarea.

#### Scenario: Solo mirar
- **WHEN** una persona carga la lista y la recorre sin pulsar ningún control
- **THEN** todas las tareas conservan su estado, su responsable y su fecha de vencimiento

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
El servidor SHALL tomar como día de referencia la fecha actual en la zona horaria IANA (un nombre como `Europe/Madrid` o `UTC`, no un desfase como `+02:00`) que el cliente envía en la cabecera `X-Timezone`, en cualquier operación que devuelva tareas. El nombre de zona SHALL aceptarse sin distinguir mayúsculas de minúsculas. Sin cabecera, o con la cabecera vacía o formada solo por espacios, SHALL usar la fecha actual en UTC. Una zona que no exista o no sea un nombre IANA SHALL rechazarse con `422`, sin aplicar ningún cambio, y ese `422` SHALL tener prioridad sobre un `404` de la misma petición.

#### Scenario: Dos zonas, dos veredictos
- **WHEN** una tarea no hecha vence el día que es hoy en `Etc/GMT+12`, y en el mismo momento se lee con `X-Timezone: Etc/GMT+12` y con `X-Timezone: Pacific/Kiritimati`, donde ya es un día posterior
- **THEN** la primera lectura recibe `isOverdue: false` y la segunda `isOverdue: true`

#### Scenario: Sin zona
- **WHEN** se piden tareas sin cabecera `X-Timezone`
- **THEN** el veredicto se calcula con la fecha actual en UTC

#### Scenario: Mayúsculas y espacios
- **WHEN** se envía `X-Timezone: europe/madrid`, o `X-Timezone` formada solo por espacios
- **THEN** la primera se trata como `Europe/Madrid` y la segunda como si no hubiera cabecera (UTC)

#### Scenario: Zona inválida sobre una tarea inexistente
- **WHEN** se lee o actualiza una tarea que no existe con `X-Timezone: Marte/Olympus`
- **THEN** la respuesta es `422`, no `404`

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
Cada fila de la lista SHALL tener un control «Abrir» que despliega bajo ella el panel de esa tarea, y que pasa a «Cerrar» para plegarlo. El control SHALL ser operable con teclado y anunciar si el panel está abierto. Al abrirlo, el panel SHALL pedir la tarea al servidor y, hasta recibirla, SHALL mostrar «Cargando…» sin fecha ni veredicto. Si hay una escritura en curso sobre la tarea, o la hubo mientras se leía, la lectura SHALL repetirse cuando termine, y el panel SHALL seguir en «Cargando…» hasta tener una respuesta posterior a todas ellas, aunque la escritura falle. Si la petición falla, SHALL mostrar «No se pudo abrir la tarea.» seguido del motivo, sin fecha ni veredicto. Abrir y cerrar SHALL NOT modificar la tarea por sí mismos. Si al cerrarla, o al abrir otra tarea, el campo de fecha tiene una fecha completa y válida distinta de la guardada, ese gesto la confirma (ver «Poner, cambiar y quitar la fecha en el panel»), salvo que en ese momento haya una escritura en curso sobre la tarea: entonces la fecha no se guarda y la página SHALL avisar «No se guardó la fecha porque había otro cambio guardándose. Ábrela y vuelve a ponerla.». Ese aviso, como el de un guardado de fecha que falla con la tarea cerrada, SHALL mantenerse aunque aparezcan otros avisos, hasta que la persona vuelva a abrir una tarea; si tiene una fecha incompleta o inválida, se descarta, no queda ningún aviso tras cerrarse y la tarea conserva su fecha.

#### Scenario: Abrir y cerrar
- **WHEN** la persona pulsa «Abrir» en una fila y después «Cerrar»
- **THEN** se despliega el panel de esa tarea y luego se pliega, y la fila vuelve a mostrar solo título, responsable y estado

#### Scenario: Abrir y cerrar sin tocar nada
- **WHEN** la persona abre una tarea y la cierra sin editar el campo de fecha
- **THEN** no se envía ninguna modificación y la tarea queda igual

#### Scenario: Cerrar con una fecha a medias
- **WHEN** la persona deja el campo de fecha a medio escribir y pulsa «Cerrar» o abre otra tarea
- **THEN** no se envía nada, una vez cerrada no queda ningún aviso en la página y la tarea conserva la fecha que tenía

#### Scenario: Cerrar con una fecha válida durante otra escritura
- **WHEN** la persona escribe una fecha completa y válida y cierra la tarea, o abre otra, mientras se está guardando un cambio de estado de esa tarea
- **THEN** la fecha no se guarda, la tarea conserva la que tenía y la página muestra «No se guardó la fecha porque había otro cambio guardándose. Ábrela y vuelve a ponerla.»

#### Scenario: El aviso de fecha no se pierde
- **WHEN** tras el aviso de fecha no guardada, el cambio de estado que estaba en curso falla
- **THEN** la página muestra los dos avisos, y el de la fecha desaparece cuando la persona vuelve a abrir una tarea

#### Scenario: El conflicto termina antes de cerrar
- **WHEN** se descarta una fecha por una escritura en curso, esa escritura termina y después la persona cierra la tarea
- **THEN** no aparece el aviso de fecha no guardada en la página, porque el panel ya lo explicó mientras estaba abierto

#### Scenario: Con teclado
- **WHEN** la persona llega al control con el tabulador y lo activa con Intro o espacio
- **THEN** el panel se abre o se cierra igual que con el ratón

#### Scenario: Veredicto fresco al abrir
- **WHEN** la lista se cargó antes de que una tarea pasara a estar vencida y la persona la abre después
- **THEN** el panel muestra «Cargando…» y luego «Vencida», sin mostrar en ningún momento el veredicto anterior

#### Scenario: Abrir durante un cambio de estado
- **WHEN** la persona abre una tarea mientras su cambio de estado está en curso, y ese cambio falla
- **THEN** el panel muestra «Cargando…» hasta que termina el cambio y después el veredicto que da una lectura nueva, nunca el que tenía la lista

#### Scenario: Fallo al abrir
- **WHEN** la persona abre una tarea y el servidor no responde
- **THEN** el panel muestra «No se pudo abrir la tarea.» con el motivo, sin campo de fecha ni veredicto

### Requirement: Poner, cambiar y quitar la fecha en el panel
El panel SHALL ofrecer un campo «Fecha de vencimiento» que, sin botón de guardar, guarda la fecha cuando la persona confirma el campo: al salir de él (incluido al cerrar la tarea) o al pulsar Intro. Mientras escribe no SHALL enviarse nada. Mientras haya una escritura en curso sobre la tarea (de su fecha o de su estado), ninguna otra confirmación de fecha ni «Quitar fecha» SHALL enviarse, aunque la tarea se haya cerrado y vuelto a abrir, y el campo y «Quitar fecha» SHALL quedar inactivos hasta que termine. Si aun así llega una confirmación con una fecha distinta de la guardada, SHALL mostrarse «Hay otro cambio guardándose. Espera a que termine y vuelve a intentarlo.» y el campo SHALL volver a la fecha guardada. Tras un fallo, volver a confirmar SHALL reenviar la fecha. Si la tarea tiene fecha, SHALL ofrecer un botón «Quitar fecha» que la quita sin confirmación. El resultado SHALL verse en el panel en cuanto el servidor lo confirma, sin recargar ni volver a abrir. Al confirmar una fecha incompleta, inválida o con año de más de cuatro cifras, SHALL mostrar «Introduce una fecha completa y válida.» junto al campo, no SHALL enviarse nada y el campo SHALL volver a la fecha guardada. Vaciar el campo no quita la fecha. Si el servidor rechaza el cambio, SHALL mostrarse junto al campo «No se pudo guardar la fecha.» seguido del motivo y SHALL conservarse la fecha anterior.

#### Scenario: Poner una fecha
- **WHEN** la persona abre una tarea sin fecha y elige el 20 de octubre de 2026
- **THEN** al salir del campo la fecha queda guardada y el panel la muestra sin pulsar nada más

#### Scenario: Quitar la fecha
- **WHEN** la persona pulsa «Quitar fecha» en una tarea con fecha
- **THEN** la fecha desaparece en cuanto el servidor lo confirma, sin diálogo de confirmación, y deja de mostrarse «Vencida» si se mostraba

#### Scenario: Intro y luego salir del campo
- **WHEN** la persona escribe una fecha, pulsa Intro y sale del campo antes de que responda el servidor
- **THEN** se envía un único guardado con esa fecha

#### Scenario: Reabrir con un guardado en curso
- **WHEN** la persona confirma una fecha, cierra la tarea y la vuelve a abrir antes de que responda el servidor
- **THEN** el panel muestra «Cargando…» hasta que termina ese guardado, después la fecha guardada (o, si falló, el aviso en la página y la fecha anterior) y no se envía ningún segundo guardado

#### Scenario: Fecha durante un cambio de estado
- **WHEN** hay en curso un cambio de estado de la tarea abierta
- **THEN** el campo de fecha y «Quitar fecha» están inactivos hasta que termina, para que las respuestas no se crucen

#### Scenario: Reintento tras un fallo
- **WHEN** el guardado de una fecha falla y la persona vuelve a escribirla y confirmarla
- **THEN** se envía de nuevo

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

#### Scenario: Fallo al guardar con la tarea cerrada
- **WHEN** la persona escribe una fecha, pulsa «Cerrar» y el guardado falla en el servidor o por falta de conexión
- **THEN** ve en la página «No se pudo guardar la fecha.» seguido del motivo, aunque el panel ya esté cerrado, y la tarea conserva su fecha anterior

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
