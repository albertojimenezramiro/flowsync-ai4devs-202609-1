## Purpose

Permitir que una persona cree una cuenta, entre y salga de FlowSync y acceda a su perfil, y que todo lo que está detrás de la sesión quede cerrado a quien no la tiene. Cubre la API de cuentas y acceso y las pantallas de registro, inicio de sesión y perfil.

## Requirements

### Requirement: Registro de cuenta por API
El sistema SHALL crear una cuenta cuando recibe `POST /api/v1/auth/signup` con `fullName`, `email`, `password` y `passwordConfirmation` válidos, y SHALL responder 200 con `{ data: { user, token } }`, de modo que la persona queda con sesión iniciada sin ningún paso adicional.

#### Scenario: Registro con nombre
- **WHEN** se envía un registro válido con `fullName` "Ada Lovelace"
- **THEN** la respuesta es 200, `data.user` contiene `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`, y `data.token` es un token de acceso utilizable de inmediato

#### Scenario: Registro sin nombre
- **WHEN** se envía un registro válido con `fullName` igual a `null`
- **THEN** la cuenta se crea con `fullName` `null` y `initials` formadas por las dos primeras letras del email en mayúsculas

### Requirement: Validación del registro
El sistema SHALL rechazar con 422 un registro que incumpla las reglas de los datos, devolviendo `{ errors: [...] }` con un elemento por cada incumplimiento, con `field`, `rule` y `message`, y SHALL NOT crear la cuenta.

#### Scenario: Falta un campo obligatorio
- **WHEN** se envía un registro sin `email`, sin `password` o sin la clave `fullName`
- **THEN** la respuesta es 422 con un error con `rule` `required` para cada campo ausente

#### Scenario: Email con formato inválido o demasiado largo
- **WHEN** se envía un `email` que no es una dirección válida o que supera los 254 caracteres
- **THEN** la respuesta es 422 con un error sobre el campo `email`

#### Scenario: Contraseña fuera de longitud
- **WHEN** se envía una `password` de menos de 8 o de más de 32 caracteres
- **THEN** la respuesta es 422 con un error de longitud (`minLength` o `maxLength`) sobre el campo `password`

#### Scenario: La confirmación no coincide
- **WHEN** `passwordConfirmation` es distinta de `password`
- **THEN** la respuesta es 422 con un error con `rule` `sameAs` sobre el campo `passwordConfirmation`

### Requirement: Unicidad del email
El sistema SHALL permitir como máximo una cuenta por email y SHALL rechazar con 422 un registro cuyo email ya exista exactamente igual.

#### Scenario: Email ya registrado
- **WHEN** se registra un `email` que ya pertenece a una cuenta
- **THEN** la respuesta es 422 con un error con `rule` `database.unique` sobre el campo `email`

#### Scenario: Email con distinta capitalización
- **WHEN** se registra `Ada@example.com` y ya existe una cuenta con `ada@example.com`
- **THEN** el registro se acepta, porque el email se compara respetando mayúsculas y minúsculas

### Requirement: Inicio de sesión por API
El sistema SHALL iniciar sesión cuando recibe `POST /api/v1/auth/login` con `email` y `password` correctos, y SHALL responder 200 con `{ data: { user, token } }`.

#### Scenario: Credenciales correctas
- **WHEN** se envía el email y la contraseña de una cuenta existente
- **THEN** la respuesta es 200 con el usuario y un token nuevo

#### Scenario: Varias sesiones simultáneas
- **WHEN** una persona inicia sesión dos veces con la misma cuenta
- **THEN** recibe dos tokens distintos y ambos permiten acceder hasta que cada uno se cierre

### Requirement: Rechazo de credenciales incorrectas
El sistema SHALL responder 400 cuando el email no corresponde a ninguna cuenta o la contraseña es incorrecta, con la misma respuesta en ambos casos, y SHALL NOT entregar ningún token.

#### Scenario: Contraseña incorrecta
- **WHEN** se envía el email de una cuenta existente con una contraseña equivocada
- **THEN** la respuesta es 400 y no contiene token

#### Scenario: Cuenta inexistente
- **WHEN** se envía un email que no pertenece a ninguna cuenta
- **THEN** la respuesta es 400 e indistinguible de la del escenario anterior

### Requirement: Validación del inicio de sesión
El sistema SHALL rechazar con 422 un inicio de sesión sin `email` con formato válido o sin `password`.

#### Scenario: Datos incompletos
- **WHEN** se envía el login sin `password`, o con un `email` que no es una dirección válida
- **THEN** la respuesta es 422 con un error sobre el campo afectado

### Requirement: La contraseña nunca se expone
El sistema SHALL NOT incluir la contraseña, ni protegida ni en claro, en ninguna respuesta de la API.

#### Scenario: Respuestas con usuario
- **WHEN** se hace registro, login o consulta de perfil
- **THEN** el objeto `user` solo contiene `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`

### Requirement: Iniciales del usuario
El sistema SHALL calcular `initials` a partir del nombre si existe, o del email si no.

#### Scenario: Nombre de dos palabras
- **WHEN** el nombre es "Ada Lovelace"
- **THEN** `initials` es "AL"

#### Scenario: Nombre de tres palabras
- **WHEN** el nombre es "Ada King Lovelace"
- **THEN** `initials` es "AK", formadas por la primera y la segunda palabra

#### Scenario: Nombre de una palabra
- **WHEN** el nombre es "Ada"
- **THEN** `initials` es "AD"

#### Scenario: Sin nombre
- **WHEN** la cuenta no tiene nombre y el email es `grace@example.com`
- **THEN** `initials` es "GR"

### Requirement: Consulta del perfil propio
El sistema SHALL responder a `GET /api/v1/account/profile` con `{ data: user }` de la persona dueña del token enviado en `Authorization: Bearer <token>`.

#### Scenario: Token válido
- **WHEN** se consulta el perfil con un token vigente
- **THEN** la respuesta es 200 con los datos de esa persona

### Requirement: Acceso restringido a personas con sesión
El sistema SHALL responder 401 a toda petición a `/api/v1/account/*` que no lleve un token válido, y SHALL NOT ejecutar la operación solicitada.

#### Scenario: Sin token
- **WHEN** se llama a `GET /api/v1/account/profile` sin cabecera `Authorization`
- **THEN** la respuesta es 401

#### Scenario: Token inventado o ya cerrado
- **WHEN** se llama con un token que no existe o que ya fue cerrado
- **THEN** la respuesta es 401

### Requirement: Cierre de sesión por API
El sistema SHALL invalidar el token usado cuando recibe `POST /api/v1/account/logout`, y SHALL responder 200 con `{ message: "Logged out successfully" }`.

#### Scenario: Cierre de la sesión actual
- **WHEN** se llama a logout con un token vigente
- **THEN** la respuesta es 200 y ese token deja de dar acceso (el perfil responde 401)

#### Scenario: Otras sesiones intactas
- **WHEN** una cuenta tiene dos tokens y se cierra uno
- **THEN** el otro sigue dando acceso

#### Scenario: Cierre sin sesión
- **WHEN** se llama a logout sin token válido
- **THEN** la respuesta es 401

### Requirement: Duración de la sesión
El sistema SHALL mantener válido un token de acceso hasta que se cierre explícitamente su sesión; los tokens SHALL NOT caducar por el paso del tiempo.

#### Scenario: Token antiguo
- **WHEN** se usa un token emitido hace mucho tiempo y no cerrado
- **THEN** sigue dando acceso

### Requirement: Formato de las respuestas de la API
El sistema SHALL responder siempre en JSON, incluso ante errores o rutas inexistentes, y SHALL envolver los datos de éxito de registro, login y perfil bajo la clave `data`.

#### Scenario: Petición sin cabecera Accept
- **WHEN** se llama a cualquier ruta sin indicar que se espera JSON
- **THEN** la respuesta es JSON

### Requirement: Acceso desde otros orígenes
El sistema SHALL aceptar peticiones de navegador desde cualquier origen cuando se ejecuta en desarrollo, y SHALL NOT aceptar ningún origen cruzado en producción mientras no se configure una lista.

#### Scenario: Frontend en otro puerto en desarrollo
- **WHEN** el navegador pide la API desde `http://localhost:5173` con el backend en desarrollo
- **THEN** la respuesta autoriza ese origen y permite credenciales y la cabecera `Authorization`

### Requirement: Pantalla de registro
El sistema SHALL mostrar en `/register` un formulario titulado "Crea tu cuenta" con los campos "Nombre completo" (opcional), "Email", "Contraseña" (con la ayuda "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a `/login`.

#### Scenario: Registro correcto
- **WHEN** una persona sin sesión rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** el botón muestra "Creando cuenta…" mientras espera, la sesión queda iniciada y la persona llega a `/profile`

#### Scenario: Nombre en blanco
- **WHEN** la persona deja el nombre vacío o con solo espacios
- **THEN** la cuenta se crea sin nombre y el perfil mostrará "Sin nombre"

### Requirement: Errores del formulario de registro
El sistema SHALL mostrar los errores de registro en castellano, junto al campo afectado cuando es posible, y SHALL NOT enviar la petición cuando las dos contraseñas no coinciden.

#### Scenario: Contraseñas distintas
- **WHEN** la persona pulsa "Crear cuenta" con contraseñas que no coinciden
- **THEN** aparece bajo "Repite la contraseña" el texto "Las contraseñas no coinciden." y no se contacta con el servidor

#### Scenario: Email ya registrado
- **WHEN** el servidor rechaza el email por estar ya registrado
- **THEN** bajo "Email" aparece "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: Contraseña fuera de longitud
- **WHEN** el servidor rechaza la contraseña por corta o larga
- **THEN** bajo "Contraseña" aparece que debe tener al menos 8 o no superar 32 caracteres

#### Scenario: Error sin campo visible
- **WHEN** el servidor devuelve un error de validación sobre un campo que el formulario no muestra
- **THEN** el mensaje aparece en un aviso general encima del formulario

### Requirement: Pantalla de inicio de sesión
El sistema SHALL mostrar en `/login` un formulario titulado "Inicia sesión" con los campos "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" que lleva a `/register`.

#### Scenario: Inicio correcto
- **WHEN** una persona sin sesión introduce credenciales correctas y pulsa "Entrar"
- **THEN** el botón muestra "Entrando…" mientras espera y la persona llega a `/profile`

#### Scenario: Credenciales incorrectas
- **WHEN** la persona introduce credenciales incorrectas
- **THEN** aparece un aviso con "El email o la contraseña no son correctos.", permanece en `/login` y puede reintentar

### Requirement: Mensajes ante fallos de conexión y de servidor
El sistema SHALL explicar con un aviso en castellano los fallos de red o de servidor al enviar un formulario de acceso.

#### Scenario: Backend apagado
- **WHEN** la persona envía el formulario y el servidor no responde
- **THEN** aparece "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Error interno
- **WHEN** el servidor responde con un error interno
- **THEN** aparece "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

### Requirement: Persistencia de la sesión en el navegador
El sistema SHALL conservar la sesión tras recargar la página y tras cerrar y reabrir la pestaña, validándola con el servidor al arrancar.

#### Scenario: Recarga con sesión
- **WHEN** una persona con sesión recarga cualquier pantalla
- **THEN** ve un indicador "Cargando…" mientras se valida, y después vuelve a la misma pantalla sin pedirle credenciales

#### Scenario: Sesión rechazada por el servidor
- **WHEN** al arrancar el servidor responde 401 al token guardado
- **THEN** la persona llega a `/login` con el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión." y el navegador olvida ese token

#### Scenario: Servidor no disponible al arrancar
- **WHEN** al arrancar el servidor no responde
- **THEN** la persona llega a `/login` con un aviso que explica el fallo, pero el navegador conserva el token, de modo que recargar con el servidor de vuelta restaura la sesión

### Requirement: Protección de las pantallas privadas
El sistema SHALL redirigir a `/login` a quien no tenga sesión y entre en una pantalla privada, y SHALL redirigir a `/profile` a quien tenga sesión y entre en `/login` o `/register`.

#### Scenario: Perfil sin sesión
- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a `/login` y no ve ningún dato de cuenta

#### Scenario: Login con sesión
- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** es llevada a `/profile`

#### Scenario: Dirección desconocida
- **WHEN** se abre una dirección que no existe, incluida la raíz `/`
- **THEN** la persona es llevada a `/profile` y, si no tiene sesión, de ahí a `/login`

### Requirement: Pantalla de perfil
El sistema SHALL mostrar en `/profile` las iniciales de la persona en un círculo, su nombre (o "Sin nombre"), su email, la fecha "Miembro desde" en formato largo en castellano y un botón "Cerrar sesión".

#### Scenario: Perfil con nombre
- **WHEN** entra una persona con nombre "Ada Lovelace" registrada el 4 de octubre de 2026
- **THEN** ve "AL", "Ada Lovelace", su email y "Miembro desde 4 de octubre de 2026"

### Requirement: Cierre de sesión desde la pantalla
El sistema SHALL cerrar la sesión local de inmediato al pulsar "Cerrar sesión", aunque el servidor no responda, y SHALL llevar a la persona a `/login`.

#### Scenario: Cierre normal
- **WHEN** la persona pulsa "Cerrar sesión"
- **THEN** el botón muestra "Cerrando sesión…", es llevada a `/login`, su token deja de valer en el servidor y volver atrás en el navegador no muestra el perfil

#### Scenario: Servidor caído
- **WHEN** la persona pulsa "Cerrar sesión" y el servidor no responde
- **THEN** la sesión se cierra igualmente en el navegador y llega a `/login` sin ningún aviso de error


## Parte B

### Requisitos
El agente escribió 22 requisitos y 46 escenarios. Comprobé 3 requisitos personalmente sobre el código. Comprobé todos con ayuda del agente.

### Incoherencias
Sin nombre, las iniciales son las dos primeras letras del email. En el código, se parte el email por la @ y se usan las iniciales de ambos trozos.

La spec dice que al recargar con sesión sale un indicador "cargando", pero no hay texto.

### Bug o contrato
Email con distinta capitalización son dos cuentas. No se sabe si el email es una identidad única. Los emails suelen ser únicos case-insensitive.

Tokens que no caducan. El PRD no dice nada.