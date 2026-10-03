# PRD: FlowSync MVP

- **Estado:** borrador
- **Fecha:** 2026-10-03
- **Base:** [`alcance-mvp.md`](./alcance-mvp.md), el alcance consensuado. Este PRD lo desarrolla y no lo amplía.
- **Convención:** `[SUPUESTO]` marca lo que este documento da por cierto sin que nadie lo haya confirmado. Cada supuesto debe confirmarse o descartarse antes de implementarlo.
- **Nivel:** producto. No hay diseño técnico, modelo de datos ni endpoints.

---

## 1. Problema y contexto

En un equipo remoto pequeño, saber en qué está cada persona cuesta una interrupción ("¿en qué estás?" por chat) o buena parte de la daily de 15 minutos. Nadie ve el estado del equipo sin interrumpir a alguien.

Esa falta de visibilidad produce trabajo duplicado. Episodio de referencia: dos personas tocaron el mismo módulo la misma semana porque una empezó sin que la otra lo supiera, y se perdieron dos días.

Quien paga el coste son los pares: quienes descubren tarde que iban a lo mismo y quien interrumpe a otro para preguntar. No hay reporte hacia arriba y no es un problema de gestión.

**Situación actual del producto.** FlowSync tiene hoy cuentas y acceso (alta, inicio de sesión, perfil y cierre de sesión). Las tareas todavía no existen. El MVP añade la primera capability de dominio sobre esa base.

**Qué reunión desaparece y cuál no.** El MVP elimina la ronda de "¿en qué estás?" de la daily. **No elimina la daily:** la parte de bloqueos sigue y este MVP no la resuelve.

**Naturaleza del caso de referencia.** El primer usuario concreto (un equipo de 6 personas de un producto SaaS, en 3 husos horarios, con un gestor de tareas pesado y una daily de 15 minutos) es un **caso de estudio, no un cliente real**. Lo que se aprenda con él vale como hipótesis, no como evidencia de mercado.

## 2. Usuarios y jobs-to-be-done

**Usuario objetivo.** Equipos remotos de 3 a 10 personas con roles planos: todos ven y editan lo mismo, sin jerarquía de permisos. Quien escribe el estado es quien lo lee.

**No son usuarios.** Managers que quieren reportes y equipos que necesitan sprints, estimaciones o backlog priorizado.

| # | Cuando… | Quiero… | Para… |
|---|---|---|---|
| JTBD-1 | voy a empezar algo | ver si alguien ya lo está tocando | no duplicar trabajo |
| JTBD-2 | termino algo y elijo lo siguiente | ver qué está libre | coger trabajo sin preguntar a nadie |
| JTBD-3 | llego por la mañana o vuelvo de una reunión | ver el estado del equipo de un vistazo | ponerme al día sin interrumpir ni ser interrumpido |
| JTBD-4 | cojo o dejo una tarea | reflejarlo en dos clics sobre la lista que ya tengo abierta | que no me pregunten cómo voy |
| JTBD-5 | planifico mi día | ver qué es mío y qué se ha pasado de plazo | no olvidar nada |

El JTBD-4 es el que sostiene el producto: quien escribe el estado debe cobrar en el momento. La misma lista es su cola de trabajo y deja de recibir interrupciones.

## 3. Propuesta de valor

> Mira la lista, sabes quién está en qué y qué está libre, y no interrumpes a nadie. Mantenerla cuesta dos clics, porque es también tu propia cola de trabajo.

- **Decisión que cambia:** no empezar algo que otra persona ya está tocando, y elegir lo siguiente sabiendo qué está libre. Si la única respuesta fuera "sentirse informado", el tiempo real no valdría lo que cuesta.
- **Frescura, no presencia.** El estado es de la tarea, no de la persona. No hay "quién está conectado" ni indicadores de actividad: es vigilancia y se rechaza a propósito.
- **"Tiempo real"** significa ver los cambios de estado de las tareas sin refrescar ni preguntar. No es chat, ni videollamada, ni edición simultánea de un documento.
- **Sustituye al gestor de tareas, no convive con él.** FlowSync crea las tareas y no las lee de otro sitio, porque convivir exigiría doble actualización.
- **Riesgo principal:** si la información se queda vieja, el producto pierde el sentido. Es la hipótesis #1 a validar, no un detalle.

## 4. Alcance / Fuera de alcance

### Dentro del alcance

Una sola capability, terminada de punta a punta: **la lista compartida del equipo, siempre al día.**

- Lista única compartida de tareas, visible y editable por todo el equipo.
- Crear una tarea con solo el título.
- Responsable opcional; una tarea sin responsable está "libre" y cualquiera puede cogérsela en un clic.
- Fecha de vencimiento opcional, con marca visual de vencida.
- Cambio de estado en dos clics desde la propia lista.
- Cambios de otras personas visibles sin refrescar.
- Filtro por estado.
- Corregir (editar título, responsable y fecha) y borrar tareas.
- Cuentas: las existentes (alta, inicio de sesión, perfil y cierre de sesión).

### Fuera de alcance

| Fuera | Motivo breve |
|---|---|
| "Qué se ha movido desde mi última visita" | Es una segunda función; con 3 a 10 personas la lista actual basta. |
| Descripción, comentarios y adjuntos | Convierten la tarea en un documento y el producto en un gestor pesado. |
| Varios responsables por tarea | Complica "¿quién está en esto?". |
| Prioridades, etiquetas y orden manual | Serían un backlog priorizado a escondidas. |
| Búsqueda y filtro por fecha | La lista corta, el filtro por estado y la marca de vencida bastan. |
| Historial y registro de cambios | Se parece a informes y vigilancia. |
| Notificaciones, push y email | Contradicen el modelo "resumen que espera, no aviso que interrumpe". |
| Presencia y "quién está conectado" | Es vigilancia. |
| Estado derivado de Git, CI o calendario, e integraciones | Es otro producto. |
| Varios equipos y personas en más de uno | Introduce la noción de equipo. |
| Roles, permisos e invitaciones | Con un solo equipo de confianza no aportan. |
| Sprints, estimaciones, épicas, backlog priorizado e informes | Quien los necesita no es el usuario. |
| Chat, vídeo y edición simultánea | No es el problema. |
| Recuperación de contraseña y verificación de email | Es pulido de cuentas, no valor. |
| Resolver bloqueos | La daily lo conserva. |

La justificación completa de cada exclusión, con su condición de reconsideración, está en [`alcance-mvp.md`](./alcance-mvp.md#5-no-alcance-out).

## 5. Épicas del MVP

- **E1. Cuentas y acceso:** agrupa el alta, el inicio y el cierre de sesión y el perfil.
- **E2. Gestión de tareas:** agrupa crear, asignar, cambiar de estado, poner fecha, corregir y borrar tareas.
- **E3. Actividad del equipo:** agrupa la vista compartida y al día del estado de las tareas: quién está en qué, qué está libre y qué se ha movido, sin refrescar y sin presencia de personas.

"Actividad" se refiere a la actividad del trabajo, es decir, al estado de las tareas, y no a la actividad de las personas.

## 6. Requisitos funcionales

Cada requisito indica su épica. "Existente" significa que ya funciona hoy y el MVP solo debe preservarlo.

### E1. Cuentas y acceso

- **RF-1 (existente).** Una persona puede crear una cuenta con nombre (opcional), email y contraseña con confirmación. El email debe ser único y la contraseña tener al menos 8 caracteres. Tras crearla queda con la sesión iniciada.
- **RF-2 (existente).** Una persona con cuenta puede iniciar sesión con email y contraseña. Con credenciales incorrectas ve un mensaje de error en castellano y no se inicia sesión.
- **RF-3 (existente).** Una persona con sesión iniciada puede ver sus datos de perfil.
- **RF-4 (existente).** Una persona con sesión iniciada puede cerrarla; tras ello deja de ver la lista hasta volver a iniciar sesión.
- **RF-5.** Sin sesión iniciada, no se muestra ninguna tarea: se redirige a iniciar sesión.
- **RF-6 (limitación declarada).** El MVP **no restringe quién puede acceder a la lista.** El alta de cuentas es abierta: cualquier persona que pueda llegar a la aplicación puede registrarse y ver, editar y borrar todas las tareas. Limitar el acceso al equipo exigiría un mecanismo de alta cerrada, invitaciones o permisos, y eso está fuera de alcance (sección 4). Por tanto, el MVP no debe contener nada que no pueda ver cualquiera con acceso a la aplicación. Cómo cerrar el acceso en el futuro queda en la sección 10 (PA-1).

### E2. Gestión de tareas

- **RF-7.** Una persona con sesión puede crear una tarea indicando solo el título. El título no puede estar vacío. Tras crearla, aparece en la lista de todo el equipo.
- **RF-8.** Una tarea puede tener un responsable o ninguno. Una tarea sin responsable se muestra de forma claramente distinguible como **libre**.
- **RF-9.** Cualquier persona puede cogerse una tarea libre en un clic; pasa a ser su responsable.
- **RF-10.** Una tarea tiene como máximo un responsable. **[SUPUESTO]** Si dos personas intentan coger la misma tarea libre a la vez, solo una queda como responsable y a la otra se le muestra el resultado actualizado de la tarea, sin error.
- **RF-11.** Una tarea puede tener una fecha de vencimiento opcional. La lista marca visualmente las tareas cuya fecha ya pasó. **[SUPUESTO]** Las tareas terminadas no se marcan como vencidas. **[SUPUESTO]** La fecha se interpreta en la zona horaria de quien la consulta.
- **RF-12.** Una persona puede cambiar el estado de una tarea con dos clics como máximo, desde la propia lista, sin abrir otra pantalla. El usuario distingue al menos tres situaciones: lo que nadie ha empezado, lo que alguien está haciendo y lo terminado. El nombre exacto de los estados se decide más adelante.
- **RF-13.** Una persona puede editar el título, el responsable y la fecha de una tarea. Reasignar una tarea la cambia a otra persona, o la deja libre.
- **RF-14.** Una persona puede borrar una tarea. **[SUPUESTO]** Se pide confirmación antes de borrar, porque no hay historial ni recuperación.
- **RF-15 [SUPUESTO].** Cogerse una tarea libre solo asigna el responsable; no cambia su estado. Cambiarlo a "en curso" es una acción aparte (RF-12).

### E3. Actividad del equipo

- **RF-16.** Todas las personas con sesión ven la misma lista de tareas del equipo.
- **RF-17.** Cada tarea muestra en la lista su título, su responsable (o "libre"), su estado y su fecha si la tiene, de forma que se vea de un vistazo quién está en qué y qué está libre.
- **RF-18.** Cuando otra persona crea, edita, mueve de estado o borra una tarea, el cambio aparece en la lista de las demás sin que tengan que recargar la página.
- **RF-19.** Una persona puede filtrar la lista por estado para centrarse en lo pendiente. Quitar el filtro vuelve a mostrar todas las tareas.
- **RF-20.** El sistema **no** muestra quién está conectado ni indicadores de actividad de personas, y **no** envía notificaciones push ni emails de aviso.
- **RF-21 [SUPUESTO].** Las tareas terminadas siguen en la lista, pero la vista por defecto prioriza lo pendiente para que la lista siga siendo corta. El criterio exacto de orden se define antes de implementar.

## 7. Requisitos no funcionales

- **RNF-1. Esfuerzo de uso.** Cambiar el estado de una tarea requiere 2 clics o menos. Cogerse una tarea libre requiere 1 clic. Crear una tarea requiere teclear solo el título y confirmar. Es verificable contando interacciones en una prueba manual.
- **RNF-2. Frescura percibida.** Un cambio hecho por una persona es visible para las demás sin recargar. **[SUPUESTO]** Objetivo: en menos de 5 segundos en condiciones normales de red. El umbral se confirma antes de implementar.
- **RNF-3. Tamaño.** El producto debe funcionar con hasta 10 personas y **[SUPUESTO]** hasta 200 tareas simultáneas en la lista sin degradarse de forma apreciable. Las cifras son un supuesto de dimensionado, no un dato de mercado.
- **RNF-4. Seguridad de acceso.** Ninguna tarea es visible sin sesión iniciada. Las contraseñas no se muestran en ninguna pantalla. Las sesiones caducan al cerrar sesión.
- **RNF-5. Privacidad.** No se recoge ni muestra información de presencia o actividad de las personas (RF-20).
- **RNF-6. Idioma.** La interfaz y los mensajes de error están en castellano.
- **RNF-7. Navegadores.** **[SUPUESTO]** Funciona en las dos últimas versiones de los navegadores de escritorio habituales. No se exige uso en móvil en el MVP.
- **RNF-8. Fiabilidad de los datos.** Una tarea creada o modificada no se pierde al recargar la página ni al cerrar sesión.
- **RNF-9. Medición.** **[SUPUESTO]** El MVP no incluye analítica de uso; las métricas de la sección 9 se obtienen por observación y por consulta directa al equipo piloto.

## 8. Restricciones

- **Stack actual:** backend AdonisJS 7 y frontend React 19. El MVP se construye sobre ese stack y no lo cambia.
- **La autenticación ya existe:** alta, inicio de sesión, perfil y cierre de sesión se reutilizan tal cual (E1). Ampliarla (recuperación de contraseña, verificación de email, roles) queda fuera del MVP.
- **No hay tareas todavía:** E2 y E3 son capabilities nuevas.
- **Espacio único:** no existe la noción de equipo. Varios equipos, o personas en más de uno, quedan fuera.
- **Sin integraciones externas:** el estado lo teclea la persona que hace la tarea; no se deriva de Git, CI ni calendario.
- **Alcance de la entrega:** una vertical fina y usable de punta a punta, no el andamiaje amplio de un producto. Mejor una capability terminada que tres a medias.
- **Equipo piloto no real:** el caso de estudio no es un cliente real, así que no hay compromisos de servicio.

## 9. Métricas de éxito

Ninguna cifra procede de datos de mercado; los umbrales marcados como `[SUPUESTO]` son objetivos de trabajo.

| Métrica | Cómo se mide | Éxito | Cuándo |
|---|---|---|---|
| **M1. La ronda se cancela** | Observación de la daily del equipo piloto: ¿se hace la ronda de "¿en qué estás?"? | El equipo la cancela y nadie pide que vuelva | 1 semana de uso real |
| **M2. Correcciones en voz alta** | Conteo manual, por daily, de las veces que alguien corrige lo que dice la lista | **[SUPUESTO]** 1 o menos por daily | 1 semana |
| **M3. Colisiones de trabajo** | Casos declarados por el equipo de dos personas trabajando en lo mismo sin saberlo | 0 casos nuevos | 3 a 4 semanas |
| **M4. Frescura sostenida** | Muestreo semanal: de las tareas "en curso", ¿cuántas refleja el responsable que siguen siendo ciertas? | **[SUPUESTO]** 90% o más | Semanas 2 a 4 |
| **M5. No vuelta al gestor antiguo** | Pregunta directa al equipo: ¿reabrís el gestor antiguo para lo mismo que hace FlowSync? | No | 3 a 4 semanas |
| **M6. Esfuerzo de actualizar** | Prueba manual con el contador de clics de RNF-1 | Se cumple RNF-1 | Antes de la prueba con el equipo |

**Señal de fracaso:** siguen haciendo la ronda de "¿en qué estás?" igual, o la lista queda vieja y se deja de consultar.

**Riesgos que estas métricas vigilan:**

1. La información se queda vieja (M2, M4).
2. El detalle de las tareas se queda en el gestor antiguo, con solo título, responsable, estado y fecha (M5).
3. Evitar la colisión depende de un hábito: crear la tarea antes de empezar y mirar la lista antes de coger otra (M3).
4. Una semana es poco para el riesgo 1: el estado viejo se nota entre las semanas 2 y 4 (M4, M5).

## 10. Puntos abiertos

Cuestiones que este documento no resuelve. Mientras no se decidan, rige lo que dicen las secciones 4 y 5. Salieron de una revisión adversarial del propio PRD.

### A. Decisiones de producto

Cada una lleva el argumento resumido y lo que haría falta para decidirla.

- **PA-1. Cierre del acceso al equipo.**
  - *Argumento:* RF-6 declara que el MVP no lo garantiza. Con alta abierta y edición y borrado para todos, cualquier persona ajena que llegue a la aplicación puede ver y destruir el trabajo del equipo. Cualquier cierre es una función de invitaciones o permisos que hoy están fuera de alcance.
  - *Para decidir:* saber si el piloto estará expuesto a personas ajenas; comparar alta cerrada, código de equipo u otra opción por coste; y decidir si se reconsidera esa exclusión de la sección 4.
- **PA-2. Lentes adicionales de la lista: "mis tareas" y "libres".**
  - *Argumento:* la propuesta de valor y JTBD-4 y JTBD-5 sostienen que la lista es la cola de trabajo de cada persona, pero ningún RF permite ver lo propio ni lo libre salvo leyendo la lista entera. Si quien escribe el estado no cobra en el momento, deja de escribirlo. El filtro por estado (RF-19) no se cuestiona y permanece en el alcance.
  - *Para decidir:* observar en el piloto si la lista basta con el volumen real de tareas, y valorar el coste de una lente por persona frente a reabrir el alcance.
- **PA-3. Tiempo real frente a actualización periódica.**
  - *Argumento:* el tiempo real es lo más caro del MVP. JTBD-3 se satisface al abrir la página, y JTBD-1 al consultar la lista en el momento de empezar. No se ha comparado con una actualización cada cierto tiempo, que validaría la misma hipótesis a menor coste.
  - *Para decidir:* una comparación de coste de construcción frente a lo que se pierde en JTBD-1, y un umbral de frescura aceptable para el equipo piloto (hoy RNF-2 es un [SUPUESTO]).
- **PA-4. Reasignar tareas ajenas y edición concurrente.**
  - *Argumento:* sin permisos, cualquiera puede quitarle a otra persona una tarea en curso (RF-13). RF-10 solo regula coger a la vez una tarea libre; no hay regla cuando dos personas editan o cambian de estado la misma tarea, ni cuando alguien edita una que otra acaba de borrar.
  - *Para decidir:* ver cómo trata el equipo piloto las tareas ajenas, y fijar qué ve y qué gana cada persona en un conflicto.
- **PA-5. Cobertura mínima de la lista.**
  - *Argumento:* si el trabajo real no está en la lista, una tarea "libre" o la ausencia de tarea se lee como "nadie lo toca", y se produce la colisión que el producto pretende evitar. El PRD no fija qué parte del trabajo debe estar en FlowSync para que el producto aporte valor.
  - *Para decidir:* un umbral de cobertura razonable para el equipo y una forma de saber qué trabajo no entra; ambas cosas dependen de un piloto real (PA-9).
- **PA-6. Si el título basta para detectar solapamientos.**
  - *Argumento:* el episodio de referencia es "dos personas en el mismo módulo". Con solo título, sin descripción, etiquetas ni búsqueda, dos tareas con títulos distintos sobre el mismo módulo no se ven como solapadas.
  - *Para decidir:* repasar con el equipo piloto casos pasados de solape y ver si sus títulos los habrían delatado.
- **PA-7. Orden y visibilidad de las tareas terminadas (RF-21).**
  - *Argumento:* el documento supone una lista corta, pero las terminadas se acumulan. El orden por defecto no está definido y cualquier criterio puede acercarse a una prioridad, que está fuera de alcance.
  - *Para decidir:* cuántas terminadas se acumulan tras 4 semanas de uso, y un criterio de orden u ocultación que no funcione como prioridad.
- **PA-8. Detectar información vieja.**
  - *Argumento:* el riesgo #1 solo se mitiga reduciendo el coste de actualizar, no detectando que algo está desactualizado. Si se pierde la conexión, la lista queda vieja sin que nadie lo sepa. Una señal de antigüedad es del estado de la tarea, no de la persona, pero se podría confundir con presencia o historial, que se rechazan.
  - *Para decidir:* si la señal de antigüedad por tarea es compatible con el rechazo a la vigilancia (RF-20) y qué coste tiene.
- **PA-9. Piloto real y medición del éxito.**
  - *Argumento:* la sección 8 dice que el equipo de referencia no es un cliente real, pero M1 a M5 requieren uso real durante semanas. Hasta que exista un equipo así, **esas métricas no pueden medirse.** Además, RNF-9 excluye la analítica de uso, así que no se puede observar con datos objetivos si la lista envejece. M3 no tiene frecuencia de partida, M4 solo mide las tareas que existen y no ve el trabajo que no entra en la lista, y M2 y M5 son autodeclaradas.
  - *Para decidir:* conseguir un equipo real; fijar antes del piloto una referencia (duración actual de la ronda y frecuencia de solapes); decidir si se acepta una analítica mínima, por ejemplo cuántas tareas se actualizan al día; y revisar los umbrales de M2 y M4 tras observar.
- **PA-10. Sustituir el gestor con título, responsable, estado y fecha.**
  - *Argumento:* si el detalle se queda en el gestor antiguo hay doble actualización, y la propuesta de valor dice que FlowSync sustituye, no convive.
  - *Para decidir:* ver en el piloto qué sigue guardando el equipo en el gestor antiguo y si eso obliga a ampliar la tarea.

### B. Precisiones a cerrar durante la construcción

Se resuelven al implementar, convirtiendo cada una en criterio de aceptación. Ninguna cambia el alcance.

- **RF-8 y RF-17:** "claramente distinguible" y "de un vistazo" necesitan un criterio comprobable.
- **RF-11:** si la fecha lleva hora, en qué zona horaria se interpreta y cuándo se considera vencida. La fecha de vencimiento permanece dentro del alcance, en E2.
- **RF-12:** qué cuenta como clic (por ejemplo, abrir un desplegable), si el estado puede retroceder y el nombre de los estados.
- **RF-18 y RNF-2:** qué significa "condiciones normales de red" y qué se muestra si se pierde la conexión.
- **RNF-3 y RNF-7:** "sin degradarse de forma apreciable" y "navegadores habituales" necesitan cifras o una lista concreta.
