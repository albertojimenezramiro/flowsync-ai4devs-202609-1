# Spec Delta

## MODIFIED Requirements

### Requirement: Cambiar el estado desde la fila
Cada fila SHALL permitir cambiar el estado de su tarea con un solo gesto, sin abrirla, sin diálogo de confirmación y sin rellenar ningún campo. Los únicos destinos ofrecidos SHALL ser «Pendiente», «En curso» y «Hecho», con el actual marcado. El nuevo estado SHALL reflejarse de inmediato. Si el servidor rechaza el cambio, la fila SHALL volver a su estado anterior y mostrarse un aviso que empiece por «No se pudo guardar el cambio de estado.» seguido del motivo. Si lo acepta, la tarea SHALL quedar como la devuelve el servidor, incluido su veredicto de vencimiento. Mientras haya una petición en curso sobre una tarea (cambio de estado, apertura o cambio de fecha), los botones de estado de su fila SHALL estar deshabilitados, para que no se crucen respuestas.

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

### Requirement: Mirar la lista no cambia nada
Abrir y recorrer la lista SHALL NOT cambiar el estado, el responsable ni la fecha de vencimiento de ninguna tarea.

#### Scenario: Solo mirar
- **WHEN** una persona abre la lista y la recorre sin pulsar nada
- **THEN** todas las tareas conservan su estado, su responsable y su fecha de vencimiento

### Requirement: Abrir una tarea desde su fila
Cada fila de la lista SHALL tener un control «Abrir» que despliega bajo ella el panel de esa tarea, y que pasa a «Cerrar» para plegarlo. El control SHALL ser operable con teclado y anunciar si el panel está abierto. Al abrirlo, el panel SHALL pedir la tarea al servidor y, hasta recibirla, SHALL mostrar «Cargando…» sin fecha ni veredicto. Si la petición falla, SHALL mostrar «No se pudo abrir la tarea.» seguido del motivo, sin fecha ni veredicto. Abrir y cerrar SHALL NOT modificar la tarea por sí mismos; si al cerrar hay una fecha a medio editar en el campo, cerrar la confirma (ver «Poner, cambiar y quitar la fecha en el panel»).

#### Scenario: Abrir y cerrar
- **WHEN** la persona pulsa «Abrir» en una fila y después «Cerrar»
- **THEN** se despliega el panel de esa tarea y luego se pliega, y la fila vuelve a mostrar solo título, responsable y estado

#### Scenario: Abrir y cerrar sin tocar nada
- **WHEN** la persona abre una tarea y la cierra sin editar el campo de fecha
- **THEN** no se envía ninguna modificación y la tarea queda igual

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
El panel SHALL ofrecer un campo «Fecha de vencimiento» que, sin botón de guardar, guarda la fecha cuando la persona confirma el campo: al salir de él (incluido al cerrar la tarea) o al pulsar Intro. Mientras escribe no SHALL enviarse nada, y una misma confirmación SHALL enviarse una sola vez aunque después se salga del campo antes de que responda el servidor. Si la tarea tiene fecha, SHALL ofrecer un botón «Quitar fecha» que la quita sin confirmación. El resultado SHALL verse en el panel en cuanto el servidor lo confirma, sin recargar ni volver a abrir. Al confirmar una fecha incompleta, inválida o con año de más de cuatro cifras, SHALL mostrar «Introduce una fecha completa y válida.» junto al campo, no SHALL enviarse nada y el campo SHALL volver a la fecha guardada. Vaciar el campo no quita la fecha. Si el servidor rechaza el cambio, SHALL mostrarse junto al campo «No se pudo guardar la fecha.» seguido del motivo y SHALL conservarse la fecha anterior.

#### Scenario: Poner una fecha
- **WHEN** la persona abre una tarea sin fecha y elige el 20 de octubre de 2026
- **THEN** al salir del campo la fecha queda guardada y el panel la muestra sin pulsar nada más

#### Scenario: Quitar la fecha
- **WHEN** la persona pulsa «Quitar fecha» en una tarea con fecha
- **THEN** la fecha desaparece en cuanto el servidor lo confirma, sin diálogo de confirmación, y deja de mostrarse «Vencida» si se mostraba

#### Scenario: Intro y luego salir del campo
- **WHEN** la persona escribe una fecha, pulsa Intro y sale del campo antes de que responda el servidor
- **THEN** se envía un único guardado con esa fecha

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
