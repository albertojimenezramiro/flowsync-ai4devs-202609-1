# Spec Delta

## MODIFIED Requirements

### Requirement: Abrir una tarea desde su fila
Cada fila de la lista SHALL tener un control «Abrir» que despliega bajo ella el panel de esa tarea, y que pasa a «Cerrar» para plegarlo. El control SHALL ser operable con teclado y anunciar si el panel está abierto. Al abrirlo, el panel SHALL pedir la tarea al servidor y, hasta recibirla, SHALL mostrar «Cargando…» sin fecha ni veredicto. Si hay una escritura en curso sobre la tarea, o la hubo mientras se leía, la lectura SHALL repetirse cuando termine, y el panel SHALL seguir en «Cargando…» hasta tener una respuesta posterior a todas ellas, aunque la escritura falle. Si la petición falla, SHALL mostrar «No se pudo abrir la tarea.» seguido del motivo, sin fecha ni veredicto. Abrir y cerrar SHALL NOT modificar la tarea por sí mismos. Si al cerrarla, o al abrir otra tarea, el campo de fecha tiene una fecha completa y válida distinta de la guardada, ese gesto la confirma (ver «Poner, cambiar y quitar la fecha en el panel»), salvo que haya una escritura en curso sobre la tarea: entonces la fecha no se guarda y la página SHALL avisar «No se guardó la fecha porque había otro cambio guardándose. Ábrela y vuelve a ponerla.»; si tiene una fecha incompleta o inválida, se descarta, no queda ningún aviso tras cerrarse y la tarea conserva su fecha.

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
- **WHEN** hay en curso cualquier petición sobre una tarea (un cambio de estado, la carga de su panel o el guardado de su fecha), esté la tarea abierta o ya cerrada
- **THEN** los botones de estado de su fila están deshabilitados hasta que termina

#### Scenario: El servidor rechaza el cambio
- **WHEN** el cambio de estado falla en el servidor o no hay conexión
- **THEN** la fila vuelve a mostrar el estado que tenía y la persona ve «No se pudo guardar el cambio de estado.» seguido del motivo (por ejemplo, que no se pudo conectar con el servidor)

### Requirement: Mirar la lista no cambia nada
Cargar y recorrer la lista sin pulsar ningún control SHALL NOT cambiar el estado, el responsable ni la fecha de vencimiento de ninguna tarea.

#### Scenario: Solo mirar
- **WHEN** una persona abre la lista y la recorre sin pulsar nada
- **THEN** todas las tareas conservan su estado, su responsable y su fecha de vencimiento
