# Proposal

## Why

FlowSync solo sabe registrar personas e iniciar sesión: todavía no existe ni una tarea. El equipo no tiene dónde anotar en qué anda cada uno ni dónde mirar «quién está en qué». Este change crea el sustrato de las épicas E2 y E3: una lista compartida donde se crean tareas con solo el título y donde se cambia su estado desde la propia fila. Cubre las historias E3-1, E2-1, E2-2, E2-3 y E2-4 del backlog.

## What Changes

- **Nuevo recurso «tarea»** con título, estado y responsable. El estado es uno de tres valores cerrados que viajan por la API como `pending`, `in_progress` y `done`, y en pantalla se muestran como Pendiente, En curso y Hecho. La tarea **no** tiene fecha de vencimiento.
- **API con exactamente tres operaciones autenticadas**: listar todas las tareas, crear una y actualizarla.
  - Al crear, solo se acepta el título: es obligatorio, se recortan los espacios y admite como máximo 120 caracteres. Por encima de ese límite se rechaza, no se recorta.
  - La tarea nace en `pending` y con quien la crea como responsable.
  - Al actualizar se puede cambiar el estado, el responsable o los dos. Las transiciones entre estados son libres.
  - Cualquier valor fuera del conjunto se rechaza con 422.
  - No hay lectura individual, ni borrado, ni endpoints de equipo.
- **El responsable se expone solo con lo que la lista necesita**: su identificador y su nombre. Nunca su email ni otros datos de cuenta.
- **Nueva pantalla de lista en `/tasks`**, que pasa a ser la portada de la aplicación:
  - Login, registro y la ruta comodín llevan a ella. Hay un enlace entre la lista y el perfil, en las dos direcciones.
  - Cada fila muestra el título, el nombre del responsable («Sin nombre» si no tiene) y el estado.
  - El estado se cambia desde la propia fila, sin diálogos.
  - Un formulario de un único campo crea la tarea, que aparece en la lista sin recargar.
  - Con la lista vacía se explica qué es la pantalla y se invita a crear la primera tarea.
- **Fuera de alcance**:
  - Reasignar desde la interfaz: la API lo admite, pero la pantalla solo cambia el estado.
  - Editar el título.
  - Fechas y vencimientos.
  - Filtros, orden y agrupación.
  - Refresco automático cuando otra persona cambia algo (E3-2).
  - Presencia de usuarios.
  - Tests: este change no monta base de pruebas.

## Capabilities

### New Capabilities
- `tasks`: la lista de tareas compartida por todo el equipo. Cubre la creación con solo el título, el estado y el responsable por defecto, el cambio de estado y de responsable, y su presentación en pantalla.

### Modified Capabilities
<!-- Ninguna en la spec. La portada pasa de /profile a /tasks, pero la spec viva `auth` se está introduciendo en paralelo (PR aparte) y todavía no está en esta rama; el ajuste de sus requisitos de navegación se hará cuando ambas convivan. -->

## Impact

- **Backend**:
  - Migración nueva para la tabla de tareas, que regenera el esquema generado.
  - Modelo con su relación al usuario responsable.
  - Validadores de creación y actualización.
  - Controlador con `index`, `store` y `update`.
  - Transformer que expone el responsable reducido.
  - Tres rutas bajo `/api/v1` protegidas por autenticación.
  - Se regenera el código del directorio `.adonisjs/`.
- **Frontend**:
  - Funciones nuevas en el cliente de API.
  - Tipos nuevos.
  - Página de lista y ruta protegida `/tasks`.
  - Cambio de las redirecciones por defecto de `/profile` a `/tasks`.
  - Enlaces de navegación entre lista y perfil.
  - Se reutilizan los componentes de `src/components/ui/` (button, card, input, label, alert). No hay dependencias nuevas.
- **Puntos abiertos (PRD)**:
  - **PA-3, orden de la lista.** No hay regla decidida, así que no se ordena explícitamente: la lista sale en el orden en que la devuelve la base de datos, sin garantía. Queda pendiente decidir orden y agrupación. **Consecuencia aceptada:** E3-1 CA-5 («enumerar en qué trabaja cada miembro sin hacer clic») queda **sin cubrir** en este change; la propia historia advierte que no se sostiene sin orden ni agrupación.
  - **PA-4, «En curso» por persona.** Cuántas tareas puede acumular alguien en curso queda sin decidir; no se limita.
  - **PA-7, transiciones.** Se dejan libres entre los tres estados, incluida la vuelta atrás desde Hecho. Falta confirmar si basta para deshacer errores.
  - **PA-9, longitud del título.** Se fija provisionalmente en 120 caracteres para poder rechazar en vez de recortar. Falta validarlo como decisión de producto.
  - **PA-8.** Qué ve alguien cuando una tarea cambia bajo sus pies. No aplica todavía: no hay vista de detalle ni refresco automático.
