# Spec Delta

## MODIFIED Requirements

### Requirement: Navegación según el estado de sesión
La aplicación web SHALL ofrecer las pantallas de inicio de sesión (`/login`), registro (`/register`), perfil (`/profile`) y lista de tareas (`/tasks`). El perfil y la lista de tareas SHALL ser accesibles solo con sesión iniciada; login y registro, solo sin ella. Cualquier otra dirección SHALL llevar a la lista de tareas.

#### Scenario: Visitante sin sesión entra al perfil
- **WHEN** una persona sin sesión abre `/profile`
- **THEN** se la lleva a la pantalla de inicio de sesión

#### Scenario: Persona con sesión entra a login o registro
- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** se la lleva a la lista de tareas

#### Scenario: Dirección desconocida
- **WHEN** se abre una dirección que no es ninguna de las tres pantallas
- **THEN** se redirige a la lista de tareas, y de ahí al login si no hay sesión

### Requirement: Pantalla de inicio de sesión
La aplicación web SHALL mostrar en el login un formulario con "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" hacia el registro. Al iniciar sesión con éxito SHALL llevar a la persona a la lista de tareas. Mientras se envía, el botón SHALL mostrar "Entrando…" y estar deshabilitado.

#### Scenario: Login correcto
- **WHEN** la persona introduce credenciales válidas y pulsa "Entrar"
- **THEN** llega a la lista de tareas

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
La aplicación web SHALL mostrar en el registro un formulario con "Nombre completo (opcional)", "Email", "Contraseña" (con la ayuda "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" hacia el login. Al registrarse con éxito SHALL dejar la sesión iniciada y llevar a la persona a la lista de tareas. Mientras se envía, el botón SHALL mostrar "Creando cuenta…" y estar deshabilitado.

#### Scenario: Registro correcto
- **WHEN** la persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** llega a la lista de tareas con la sesión ya iniciada

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

### Requirement: Pantalla de perfil
La aplicación web SHALL mostrar en el perfil las iniciales de la cuenta, su nombre completo (o "Sin nombre" si no tiene), su email y "Miembro desde" con la fecha de alta en formato largo en castellano, y SHALL ofrecer un enlace "Tareas del equipo" hacia la lista de tareas.

#### Scenario: Cuenta con nombre
- **WHEN** una persona con nombre "Ada Lovelace" abre su perfil
- **THEN** ve "AL", "Ada Lovelace", su email y la fecha en la que se dio de alta

#### Scenario: Cuenta sin nombre
- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve "Sin nombre" en lugar del nombre

#### Scenario: Enlace a la lista de tareas
- **WHEN** una persona abre su perfil y pulsa "Tareas del equipo"
- **THEN** llega a la lista de tareas
