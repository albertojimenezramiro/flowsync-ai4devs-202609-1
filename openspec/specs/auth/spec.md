# auth Specification

## Purpose
Permitir que una persona cree una cuenta en FlowSync, inicie y cierre sesión con un token de acceso, y consulte su perfil, tanto a través de la API HTTP como desde las pantallas de la aplicación web.

## Requirements

### Requirement: Registro de cuenta por API
El sistema SHALL aceptar `POST /api/v1/auth/signup` con `fullName`, `email`, `password` y `passwordConfirmation`, crear la cuenta y responder `200` con `{ data: { user, token } }`, donde `token` es un token de acceso ya válido para las rutas protegidas. La sesión SHALL quedar iniciada sin necesidad de un login posterior.

#### Scenario: Registro correcto
- **WHEN** se envía un email no registrado, una contraseña de 8 a 32 caracteres, la misma contraseña en `passwordConfirmation` y `fullName` con un texto o `null`
- **THEN** la respuesta es `200` con `data.user` (la cuenta recién creada) y `data.token` (una cadena que autoriza las peticiones protegidas)

#### Scenario: Registro sin nombre
- **WHEN** se envía `fullName: null` o `fullName: ""` junto con el resto de campos válidos
- **THEN** la cuenta se crea y `data.user.fullName` es `null`

### Requirement: Validación del registro
El sistema SHALL rechazar el registro con `422` y un cuerpo `{ errors: [...] }`, con un elemento por fallo que indica `field`, `rule` y `message`, cuando los datos no cumplan las reglas: la clave `fullName` debe estar presente (aunque valga `null`); `email` debe ser una dirección válida de 254 caracteres como máximo y no estar ya registrada; `password` debe tener entre 8 y 32 caracteres; `passwordConfirmation` debe tener entre 8 y 32 caracteres y coincidir con `password`. Una cadena vacía en cualquier campo SHALL tratarse como ausente. No se SHALL crear ninguna cuenta cuando la validación falle.

#### Scenario: Email ya registrado
- **WHEN** se intenta registrar un email que ya pertenece a otra cuenta
- **THEN** la respuesta es `422` con un error sobre `email` con regla `database.unique`

#### Scenario: Campo obligatorio vacío
- **WHEN** `email` o `password` llegan como cadena vacía
- **THEN** la respuesta es `422` con un error sobre ese campo con regla `required`

#### Scenario: Contraseña demasiado corta
- **WHEN** `password` tiene entre 1 y 7 caracteres
- **THEN** la respuesta es `422` con un error sobre `password` con regla `minLength`

#### Scenario: Contraseña demasiado larga
- **WHEN** `password` tiene más de 32 caracteres
- **THEN** la respuesta es `422` con un error sobre `password` con regla `maxLength`

#### Scenario: Confirmación distinta
- **WHEN** `passwordConfirmation` no coincide con `password`
- **THEN** la respuesta es `422` con un error sobre `passwordConfirmation` con regla `sameAs`

#### Scenario: Email con formato inválido
- **WHEN** `email` no es una dirección de correo válida
- **THEN** la respuesta es `422` con un error sobre `email` con regla `email`

#### Scenario: Falta la clave del nombre
- **WHEN** el cuerpo no incluye la clave `fullName`
- **THEN** la respuesta es `422` con un error sobre `fullName` con regla `required`

### Requirement: Inicio de sesión por API
El sistema SHALL aceptar `POST /api/v1/auth/login` con `email` y `password` y, si las credenciales son correctas, responder `200` con `{ data: { user, token } }`. Cada inicio de sesión correcto SHALL emitir un token nuevo sin invalidar los emitidos anteriormente, de modo que una misma cuenta puede tener varias sesiones abiertas a la vez. Los tokens no caducan por tiempo.

#### Scenario: Credenciales correctas
- **WHEN** se envían el email y la contraseña de una cuenta existente
- **THEN** la respuesta es `200` con `data.user` de esa cuenta y un `data.token` nuevo

#### Scenario: Varias sesiones simultáneas
- **WHEN** la misma cuenta inicia sesión dos veces
- **THEN** los dos tokens obtenidos autorizan las rutas protegidas a la vez

#### Scenario: Credenciales incorrectas
- **WHEN** el email no existe o la contraseña no corresponde a esa cuenta
- **THEN** la respuesta es `400` sin indicar cuál de los dos datos ha fallado ni asociar el error a un campo

#### Scenario: Datos de login mal formados
- **WHEN** falta `password` o es una cadena vacía, o `email` falta, no es una dirección válida o supera 254 caracteres
- **THEN** la respuesta es `422` con un error por campo afectado, sin comprobar las credenciales

### Requirement: Representación pública de la cuenta
Siempre que la API devuelva una cuenta, el sistema SHALL exponer exactamente `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`, y SHALL NOT incluir la contraseña ni ningún derivado de ella.

#### Scenario: La contraseña nunca sale en la respuesta
- **WHEN** se obtiene una cuenta por registro, login o perfil
- **THEN** el objeto de usuario contiene solo `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`

### Requirement: Cálculo de iniciales
El sistema SHALL calcular `initials` en mayúsculas así: si hay `fullName`, se parte por cada espacio individual; si no, se parte el email por la `@`. Si los dos primeros trozos son no vacíos, las iniciales son la primera letra de cada uno; en otro caso, son los dos primeros caracteres del primer trozo (que pueden ser ninguno). El nombre no se recorta en el servidor.

#### Scenario: Nombre de dos palabras
- **WHEN** la cuenta tiene `fullName` "Ada Lovelace"
- **THEN** `initials` es "AL"

#### Scenario: Nombre de una palabra
- **WHEN** la cuenta tiene `fullName` "Ada"
- **THEN** `initials` es "AD"

#### Scenario: Más de dos palabras
- **WHEN** la cuenta tiene `fullName` "Ada Lovelace Byron"
- **THEN** `initials` es "AL" (solo cuentan las dos primeras)

#### Scenario: Espacios repetidos o al final
- **WHEN** la cuenta tiene `fullName` "Ada  Lovelace" (dos espacios) o "Ada " (espacio final)
- **THEN** `initials` es "AD"

#### Scenario: Espacio al principio
- **WHEN** la cuenta tiene `fullName` " Ada Lovelace"
- **THEN** `initials` es una cadena vacía

#### Scenario: Sin nombre
- **WHEN** la cuenta tiene `fullName` `null` y email "ada@example.com"
- **THEN** `initials` es "AE" (primera letra antes y después de la `@`)

### Requirement: Acceso autenticado al perfil
El sistema SHALL responder a `GET /api/v1/account/profile` con `200` y `{ data: user }` de la cuenta dueña del token enviado como `Authorization: Bearer <token>`. Sin token válido SHALL responder `401`.

#### Scenario: Token válido
- **WHEN** se pide el perfil con un token emitido por registro o login y no revocado
- **THEN** la respuesta es `200` con los datos de la cuenta dueña del token

#### Scenario: Sin token
- **WHEN** se pide el perfil sin cabecera `Authorization`
- **THEN** la respuesta es `401`

#### Scenario: Token inválido o revocado
- **WHEN** se pide el perfil con un token inventado o ya revocado por logout
- **THEN** la respuesta es `401`

### Requirement: Cierre de sesión por API
El sistema SHALL aceptar `POST /api/v1/account/logout` con un token válido, revocar únicamente ese token y responder `200` con `{ message: "Logged out successfully" }`, sin el envoltorio `data`. Sin token válido SHALL responder `401`.

#### Scenario: Logout correcto
- **WHEN** se hace logout con un token válido
- **THEN** la respuesta es `200` con el mensaje de confirmación y ese token deja de autorizar peticiones

#### Scenario: Las demás sesiones siguen abiertas
- **WHEN** una cuenta con dos tokens hace logout con uno de ellos
- **THEN** el otro token sigue autorizando las rutas protegidas

#### Scenario: Logout sin sesión
- **WHEN** se llama a logout sin token o con un token no válido
- **THEN** la respuesta es `401`

### Requirement: Respuestas siempre en JSON
El sistema SHALL responder en JSON a todas las peticiones de autenticación, incluidos los errores, con independencia de la cabecera `Accept` que envíe el cliente.

#### Scenario: Token basura en una ruta pública
- **WHEN** se llama a registro o login con una cabecera `Authorization` inválida
- **THEN** la cabecera se ignora y la petición se procesa como si no la llevara

#### Scenario: Cliente que no pide JSON
- **WHEN** se pide el perfil sin token y con `Accept: text/html`
- **THEN** la respuesta es un `401` con cuerpo JSON

### Requirement: Navegación según el estado de sesión
La aplicación web SHALL ofrecer las pantallas de inicio de sesión (`/login`), registro (`/register`) y perfil (`/profile`). El perfil SHALL ser accesible solo con sesión iniciada; login y registro, solo sin ella. Cualquier otra dirección SHALL llevar al perfil.

#### Scenario: Visitante sin sesión entra al perfil
- **WHEN** una persona sin sesión abre `/profile`
- **THEN** se la lleva a la pantalla de inicio de sesión

#### Scenario: Persona con sesión entra a login o registro
- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** se la lleva a su perfil

#### Scenario: Dirección desconocida
- **WHEN** se abre una dirección que no es ninguna de las tres pantallas
- **THEN** se redirige al perfil, y de ahí al login si no hay sesión

### Requirement: Persistencia y restauración de la sesión en el navegador
La aplicación web SHALL conservar la sesión entre recargas y en las pestañas que se abran después en el mismo navegador; las pestañas ya abiertas no se enteran de un login o logout hecho en otra. La validez de la sesión SHALL comprobarse solo al cargar la aplicación. Al abrirse con una sesión guardada SHALL mostrar un indicador de carga ("Cargando…") hasta confirmar con el servidor que la sesión sigue siendo válida, y solo entonces mostrar la pantalla correspondiente.

#### Scenario: Recarga con sesión válida
- **WHEN** una persona con sesión recarga la página del perfil
- **THEN** ve un indicador de carga y después su perfil, sin pasar por el login

#### Scenario: Sesión rechazada por el servidor
- **WHEN** la aplicación se abre con una sesión guardada que el servidor ya no reconoce
- **THEN** se descarta la sesión guardada y la persona ve el login con el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión."

#### Scenario: Servidor inaccesible al restaurar
- **WHEN** la aplicación se abre con una sesión guardada y el servidor no responde
- **THEN** la persona ve el login con el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado.", y la sesión guardada se conserva para restaurarse al recargar cuando el servidor vuelva

#### Scenario: Error interno al restaurar
- **WHEN** la aplicación se abre con una sesión guardada y el servidor responde con un error inesperado
- **THEN** la persona ve el login con el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento." y la sesión guardada se conserva

### Requirement: Pantalla de inicio de sesión
La aplicación web SHALL mostrar en el login un formulario con "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" hacia el registro. Al iniciar sesión con éxito SHALL llevar a la persona a su perfil. Mientras se envía, el botón SHALL mostrar "Entrando…" y estar deshabilitado.

#### Scenario: Login correcto
- **WHEN** la persona introduce credenciales válidas y pulsa "Entrar"
- **THEN** llega a su perfil

#### Scenario: Credenciales incorrectas
- **WHEN** la persona introduce un email o contraseña que no corresponden a ninguna cuenta
- **THEN** ve un aviso general "El email o la contraseña no son correctos." y sigue en el login

#### Scenario: Campo vacío o email mal escrito
- **WHEN** la persona envía el formulario con la contraseña vacía o un email con formato inválido
- **THEN** ve el error bajo el campo afectado (por ejemplo "Falta rellenar la contraseña." o "Introduce una dirección de email válida.")

#### Scenario: Aviso de sesión perdida
- **WHEN** la persona llega al login porque su sesión anterior se perdió
- **THEN** ve el motivo en un aviso general, que solo se sustituye si el siguiente intento produce otro aviso general (los errores bajo un campo conviven con él) y que desaparece al iniciar sesión con éxito; el registro no muestra este aviso

### Requirement: Pantalla de registro
La aplicación web SHALL mostrar en el registro un formulario con "Nombre completo (opcional)", "Email", "Contraseña" (con la ayuda "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" hacia el login. Al registrarse con éxito SHALL dejar la sesión iniciada y llevar a la persona a su perfil. Mientras se envía, el botón SHALL mostrar "Creando cuenta…" y estar deshabilitado.

#### Scenario: Registro correcto
- **WHEN** la persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** llega a su perfil con la sesión ya iniciada

#### Scenario: Nombre en blanco
- **WHEN** la persona deja el nombre vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre

#### Scenario: Contraseñas distintas
- **WHEN** la contraseña y su repetición no coinciden, sea cual sea su longitud
- **THEN** ve solo "Las contraseñas no coinciden." bajo "Repite la contraseña" sin que se envíe nada al servidor

#### Scenario: Email ya registrado
- **WHEN** la persona intenta registrarse con un email que ya tiene cuenta
- **THEN** ve bajo el email "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: Contraseña fuera de rango
- **WHEN** la contraseña y su repetición coinciden pero tienen menos de 8 o más de 32 caracteres
- **THEN** ve, en lugar de la ayuda, "la contraseña debe tener al menos 8 caracteres." o "la contraseña no puede superar los 32 caracteres." bajo la contraseña, y el mensaje equivalente sobre "la confirmación de la contraseña" bajo "Repite la contraseña"

### Requirement: Presentación de errores en los formularios de acceso
La aplicación web SHALL mostrar el primer error de validación de cada campo bajo ese campo cuando todos los campos con error estén en pantalla; si alguno no lo está, SHALL mostrar además un aviso general con el primer error. Cualquier respuesta `400` SHALL mostrarse como "El email o la contraseña no son correctos." y cualquier `401` como "Tu sesión ha caducado. Vuelve a iniciar sesión.". Ante fallos de red o cualquier otro error SHALL mostrar un aviso general comprensible.

#### Scenario: Servidor caído al enviar
- **WHEN** la persona envía el login o el registro y el servidor no responde
- **THEN** ve el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Error interno del servidor
- **WHEN** el servidor responde con un error distinto de `400`, `401` y `422`
- **THEN** ve el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

### Requirement: Pantalla de perfil
La aplicación web SHALL mostrar en el perfil las iniciales de la cuenta, su nombre completo (o "Sin nombre" si no tiene), su email y "Miembro desde" con la fecha de alta en formato largo en castellano.

#### Scenario: Cuenta con nombre
- **WHEN** una persona con nombre "Ada Lovelace" abre su perfil
- **THEN** ve "AL", "Ada Lovelace", su email y la fecha en la que se dio de alta

#### Scenario: Cuenta sin nombre
- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve "Sin nombre" en lugar del nombre

### Requirement: Cierre de sesión desde la aplicación
La aplicación web SHALL ofrecer en el perfil un botón "Cerrar sesión" que cierra la sesión en ese navegador y lleva al login sin mostrar ningún aviso. Mientras se cierra, el botón SHALL mostrar "Cerrando sesión…" y estar deshabilitado. La sesión local SHALL cerrarse aunque el servidor no confirme la revocación.

#### Scenario: Cerrar sesión
- **WHEN** la persona pulsa "Cerrar sesión"
- **THEN** llega al login, y al recargar sigue sin sesión

#### Scenario: Cerrar sesión con el servidor caído
- **WHEN** la persona pulsa "Cerrar sesión" y el servidor no responde
- **THEN** igualmente llega al login sin sesión
