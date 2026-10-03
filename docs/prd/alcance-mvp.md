# Alcance del MVP de FlowSync

Alcance consensuado, base del PRD. Nivel de producto: el modelo de datos, los endpoints, los estados internos y los tiempos de respuesta se deciden más adelante.

## 1. Problema

En un equipo remoto pequeño, saber en qué está cada persona cuesta una interrupción ("¿en qué estás?" por Slack o chat) o la mitad de la daily de 15 minutos. Nadie ve el estado del equipo sin interrumpir a alguien.

Esa falta de visibilidad produce trabajo duplicado. Episodio concreto: dos personas tocaron el mismo módulo la misma semana porque una empezó sin que la otra lo supiera, y se perdieron dos días.

Quien paga el coste son los pares: los devs que descubren tarde que iban a lo mismo y quien interrumpe a otro para preguntar. No hay reporte hacia arriba, y a un manager le daría igual.

## 2. Usuarios

- **Usuario objetivo:** equipos remotos pequeños, de 3 a 10 personas, con roles planos. En el MVP todos ven y editan lo mismo, sin jerarquía de permisos. Quien escribe el estado es quien lo lee.
- **Primer usuario concreto:** un equipo de 6 personas de un producto SaaS, en 3 husos horarios, que hoy usa un gestor de tareas pesado y una daily de 15 minutos por videollamada.
- **Es un caso de estudio, no un cliente real.** Lo que se aprenda con él vale como hipótesis, no como evidencia de mercado.
- **No son usuarios:** managers que quieren reportes ni equipos que necesiten sprints, estimaciones o backlog priorizado.

## 3. Propuesta de valor

> Mira la lista, sabes quién está en qué y qué está libre, y no interrumpes a nadie. Mantenerla cuesta dos clics, porque es también tu propia cola de trabajo.

- **Qué decisión cambia:** no empezar algo que otra persona ya está tocando, y elegir lo siguiente sabiendo qué está libre. Si la única respuesta fuera "sentirse informado", el tiempo real no valdría lo que cuesta.
- **Qué reunión desaparece, sin venderla de más:** la ronda de "¿en qué estás?" de la daily, que hoy se come la mitad de los 15 minutos. **La daily no desaparece entera:** la parte de bloqueos sigue, y este MVP no la resuelve.
- **"Tiempo real":** ver los cambios de estado de las tareas sin refrescar ni preguntar. No es chat, ni videollamada, ni colaboración simultánea sobre el mismo documento.
- **Frescura, no presencia:** el estado es de la tarea, no de la persona. No hay "quién está conectado" ni indicadores de actividad; se rechaza a propósito porque es vigilancia.
- **Por qué se sostiene:** actualizar son dos clics sobre una lista ya abierta, sin campos obligatorios y sin decidir sprint ni estimación. Quien escribe cobra en el momento: la misma lista es su cola de trabajo, la mira para decidir qué coge y deja de recibir interrupciones.
- **Dónde se hace el trabajo:** FlowSync sustituye al gestor de tareas, no convive con él. Crea las tareas, no las lee de otro sitio, porque convivir exigiría doble actualización.

### Cómo sabremos si funciona

- **A una semana de uso real:** el equipo cancela la ronda de "¿en qué estás?" y nadie pide que vuelva. Indicador de seguimiento: cuántas veces alguien corrige en voz alta lo que dice la lista.
- **A las 3 o 4 semanas:** la lista sigue al día y no han reabierto el gestor antiguo para lo mismo.
- **Fracaso:** siguen haciendo la ronda igual.

### Riesgos a validar

1. **La información se queda vieja.** Riesgo principal: si el estado envejece, el producto pierde el sentido y da falsa confianza. La mitigación es que actualizar cueste dos clics, no obligar a nadie.
2. **El detalle se queda en el gestor antiguo.** Con solo título, responsable, estado y fecha, el equipo puede conservar el gestor pesado para el detalle, y eso es doble actualización.
3. **Evitar la colisión exige un hábito.** Hay que crear la tarea antes de empezar y mirar la lista antes de coger otra; FlowSync solo lo hace barato.
4. **Una semana es poco para el riesgo 1.** El estado viejo se nota entre las semanas 2 y 4.

## 4. Alcance (IN)

Una sola capability, terminada de punta a punta: **la lista compartida del equipo, siempre al día.** Prefiere una capability completa a tres a medias.

1. **Lista única compartida de tareas**, en un espacio único, visible y editable por todo el equipo, sin permisos.
2. **Crear una tarea con solo el título.** Es el único campo obligatorio; "menos rollo que Jira" significa crear y cambiar el estado en segundos, sin flujos de configuración.
3. **Responsable opcional.** Una tarea sin responsable significa "libre", y cualquiera puede cogerse una tarea libre en un clic. Un solo responsable por tarea.
4. **Fecha de vencimiento opcional.** La lista marca de un vistazo qué tareas se han pasado de plazo.
5. **Cambiar el estado en dos clics** desde la propia lista. A ojos del usuario se distingue al menos lo que nadie ha empezado, lo que alguien está haciendo y lo terminado; el nombre y el número exactos se deciden después.
6. **Ver los cambios sin refrescar.** Si otra persona mueve una tarea, la lista lo muestra sola.
7. **Filtrar por estado** para centrarse en lo pendiente. La fecha solo marca visualmente lo vencido; no hay filtro por fecha.
8. **Corregir errores:** editar título, responsable y fecha, y borrar una tarea.
9. **Cuentas.** Se reutilizan las que ya existen (alta, inicio de sesión y perfil), sin ampliarlas.

### Supuestos del alcance

- **Un único espacio compartido, sin entidad "equipo".** El espacio es el de un solo equipo y se asume acceso cerrado a ese grupo. Hoy el alta es abierta, así que cómo se garantiza queda como decisión posterior.
- **Varios equipos separados, o personas en más de uno, quedan fuera del MVP.** Se anota como supuesto, no se construye.
- **El estado lo teclea quien hace la tarea.**

## 5. NO-alcance (OUT)

Cada exclusión lleva su justificación y la condición para reconsiderarla.

| Se queda fuera | Por qué | Se reconsidera si… |
|---|---|---|
| "Qué se ha movido desde mi última visita" | Es una segunda función. Con 3 a 10 personas, la lista actualizada ya responde a quién está en qué y qué está libre. | Quien vuelve de una reunión dice que no sabe qué ha cambiado. |
| Descripción, comentarios y adjuntos | Convierten la tarea en un documento y el producto en Jira. El título es el contrato del MVP. | Mantienen el gestor antiguo solo para el detalle. |
| Varios responsables por tarea | Complica la pregunta "¿quién está en esto?", que debe responderse rápido. | Dos personas dicen que trabajan siempre juntas en tareas. |
| Prioridades, etiquetas y orden manual | Son un backlog priorizado a escondidas. | Nunca en el MVP. |
| Búsqueda | Con un equipo pequeño y una lista corta, el filtro por estado basta. | La lista deja de verse de un vistazo. |
| Filtro por fecha | La marca visual de lo vencido cubre el caso de uso. | El equipo lo pide tras uso real. |
| Historial y registro de cambios | Se parece a informes y vigilancia, y no cambia la decisión de coger una tarea. | Se discute de quién fue algo y no se puede reconstruir. |
| Notificaciones, push y email | Contradicen el modelo de "resumen que espera, no aviso que interrumpe". | Nunca: es un principio, no un recorte. |
| Presencia y "quién está conectado" | Es vigilancia, y se rechaza a propósito. | Nunca. |
| Estado derivado de Git, CI o calendario, e integraciones | Es otro producto, con OAuth de terceros, y retrasa saber si la idea funciona. | El estado manual funciona pero cuesta mantenerlo. |
| Varios equipos y personas en más de uno | Introduce la noción de equipo y un cambio grande de producto. | Un segundo equipo real lo pide. |
| Roles, permisos e invitaciones | Con un solo equipo de confianza no aportan. Quién puede darse de alta se resuelve fuera del producto. | Entra alguien que no debería ver la lista. |
| Sprints, estimaciones, épicas, backlog priorizado e informes | Renuncia explícita. Quien los necesite no es el usuario. | Nunca. |
| Chat, vídeo y edición simultánea | No es el problema. | Nunca. |
| Recuperación de contraseña y verificación de email | Es pulido de cuentas, no valor. No bloquea probar la hipótesis con un equipo cerrado. | Se bloquea un usuario real. |
| Resolver bloqueos | La daily lo conserva y es otro problema. | El equipo pide que la herramienta también cubra esto. |

Si hubiera que recortar más, caería primero la fecha de vencimiento y después el filtro por estado.
