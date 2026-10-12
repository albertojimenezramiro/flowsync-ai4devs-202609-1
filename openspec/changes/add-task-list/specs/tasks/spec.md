# Spec Delta

## Purpose

Mantener una única lista de tareas compartida por todo el equipo, donde cualquiera crea tareas con solo el título y ve y cambia en qué estado está cada una y quién la lleva.

## ADDED Requirements

### Requirement: Forma pública de una tarea
Toda tarea que devuelva la API SHALL exponer exactamente `id`, `title`, `status` y `assignee`. `assignee` SHALL contener solo el `id` y el `fullName` del responsable, y SHALL NOT incluir su email ni ningún otro dato de su cuenta. Ninguna tarea SHALL tener ni exponer fecha de vencimiento.

#### Scenario: Responsable reducido a su nombre
- **WHEN** se obtiene una tarea cuyo responsable tiene nombre y email
- **THEN** `assignee` trae su `id` y su `fullName`, y el email del responsable no aparece en ninguna parte de la respuesta

#### Scenario: Responsable sin nombre
- **WHEN** se obtiene una tarea cuyo responsable se registró sin nombre
- **THEN** `assignee.fullName` es `null` y sigue sin aparecer su email

#### Scenario: Sin vencimiento
- **WHEN** se obtiene cualquier tarea
- **THEN** la respuesta no contiene ningún campo de fecha de vencimiento

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
Las tres operaciones de tareas SHALL requerir un token de acceso válido. Sin él SHALL responder `401` sin revelar ninguna tarea. Cualquier persona con sesión SHALL poder usarlas sobre cualquier tarea, sin roles ni permisos adicionales.

#### Scenario: Petición sin sesión
- **WHEN** se lista, crea o actualiza una tarea sin token o con un token no válido
- **THEN** la respuesta es `401` y no se lee ni se modifica ninguna tarea

### Requirement: Listado de la lista compartida
El sistema SHALL responder a `GET /api/v1/tasks` con `200` y `{ data: [...] }` con todas las tareas existentes. El contenido SHALL ser el mismo para cualquier persona con sesión: no existen tareas privadas ni listas por persona. Listar SHALL NOT modificar ninguna tarea. El orden de los elementos no está definido.

#### Scenario: Mismo contenido para todos
- **WHEN** dos personas distintas piden la lista sin que nadie cambie nada entre medias
- **THEN** reciben el mismo conjunto de tareas

#### Scenario: Tarea de otra persona
- **WHEN** otra persona crea una tarea, que queda a su nombre, y yo pido la lista
- **THEN** esa tarea aparece en mi respuesta

#### Scenario: Sin tareas
- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** la respuesta es `200` con `data` como lista vacía

### Requirement: Creación con solo el título
El sistema SHALL aceptar `POST /api/v1/tasks` con `title` como único dato y responder `201` con `{ data: task }`. La tarea SHALL nacer con estado `pending` y con la persona autenticada como responsable. Cualquier otro campo del cuerpo (`status`, `assignee`, fechas…) SHALL ignorarse.

#### Scenario: Creación correcta
- **WHEN** una persona con sesión envía `{ "title": "Preparar la demo" }`
- **THEN** la respuesta es `201` con la tarea nueva: ese título, `status` `pending` y como `assignee` la propia persona

#### Scenario: Intento de fijar estado o responsable al crear
- **WHEN** se crea una tarea enviando además `status: "done"` y el id de otra persona como responsable
- **THEN** la tarea se crea igualmente en `pending` y a nombre de quien la crea

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
El sistema SHALL aceptar `PATCH /api/v1/tasks/:id`, con `:id` entero, y con `status`, `assigneeId` (entero positivo, sin conversión desde otros tipos) o ambos, aplicar solo los campos enviados y responder `200` con `{ data: task }` actualizada. Cualquier persona con sesión SHALL poder actualizar cualquier tarea. Las transiciones entre los tres estados SHALL ser libres. Otros campos, incluido `title`, SHALL ignorarse.

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
- **WHEN** se envía `assigneeId` como cadena (`"7"`), booleano, lista o número con decimales
- **THEN** la respuesta es `422` con un error sobre `assigneeId` y la tarea no cambia, aunque exista una cuenta con ese id

#### Scenario: Responsable nulo
- **WHEN** se envía `{ "status": "done", "assigneeId": null }`
- **THEN** la respuesta es `422` con un error sobre `assigneeId` y la tarea no cambia en nada

#### Scenario: Nada que actualizar
- **WHEN** se envía un cuerpo sin `status` ni `assigneeId`
- **THEN** la respuesta es `422` y la tarea no cambia

#### Scenario: El título no se edita
- **WHEN** se envía `{ "status": "done", "title": "Otro" }`
- **THEN** el estado cambia y el título queda igual

#### Scenario: Tarea inexistente
- **WHEN** se actualiza un `id` que no corresponde a ninguna tarea
- **THEN** la respuesta es `404`

#### Scenario: Identificador no entero
- **WHEN** se actualiza `/api/v1/tasks/1.0` o `/api/v1/tasks/abc`
- **THEN** la respuesta es `404` y ninguna tarea cambia, aunque exista la tarea 1

### Requirement: Superficie cerrada de la API de tareas
La API de tareas SHALL ofrecer solo listar, crear y actualizar. SHALL NOT existir lectura individual de una tarea, borrado de tareas ni operaciones sobre el equipo o sus miembros.

#### Scenario: Lectura individual o borrado
- **WHEN** se hace `GET` o `DELETE` sobre `/api/v1/tasks/:id`
- **THEN** la respuesta es `404` y ninguna tarea se lee ni se borra

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
La lista SHALL mostrar en cada fila el título de la tarea, el nombre de su responsable y su estado como «Pendiente», «En curso» o «Hecho», sin abrir nada. Si el responsable no tiene nombre, o su nombre está formado solo por espacios, SHALL mostrarse «Sin nombre»; nunca su email ni su identificador. La lista SHALL NOT mostrar fechas, marcas de vencida ni señales de presencia de otras personas.

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
- **WHEN** una persona recorre la lista mientras otras usan la aplicación
- **THEN** no ve ninguna fecha, ninguna marca de vencida ni ninguna indicación de quién está conectado

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
Cada fila SHALL permitir cambiar el estado de su tarea con un solo gesto, sin abrirla, sin diálogo de confirmación y sin rellenar ningún campo. Los únicos destinos ofrecidos SHALL ser «Pendiente», «En curso» y «Hecho», con el actual marcado. El nuevo estado SHALL reflejarse de inmediato. Si el servidor rechaza el cambio, la fila SHALL volver a su estado anterior y mostrarse un aviso que empiece por «No se pudo guardar el cambio de estado.» seguido del motivo.

#### Scenario: Cambio desde la lista
- **WHEN** la persona elige «En curso» en una tarea que está en «Pendiente»
- **THEN** la fila muestra «En curso» al momento, sin diálogos ni navegación

#### Scenario: Tarea de otra persona
- **WHEN** la persona cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica sin pedir permiso ni mostrar advertencias

#### Scenario: Solo tres destinos
- **WHEN** la persona mira las opciones de estado de una fila
- **THEN** ve exactamente «Pendiente», «En curso» y «Hecho», y la tarea queda siempre en uno de ellos

#### Scenario: El servidor rechaza el cambio
- **WHEN** el cambio de estado falla en el servidor o no hay conexión
- **THEN** la fila vuelve a mostrar el estado que tenía y la persona ve «No se pudo guardar el cambio de estado.» seguido del motivo (por ejemplo, que no se pudo conectar con el servidor)

### Requirement: Mirar la lista no cambia nada
Abrir y recorrer la lista SHALL NOT cambiar el estado ni el responsable de ninguna tarea.

#### Scenario: Solo mirar
- **WHEN** una persona abre la lista y la recorre sin pulsar nada
- **THEN** todas las tareas conservan su estado y su responsable
