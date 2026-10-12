# Design

## Context

En `frontend/src/components/task-panel.tsx`, `commit()` corre en el blur y en Intro. Si hay una escritura en curso sobre la tarea (`isWriting()`) y lo escrito difiere de lo guardado:
- no envía nada;
- muestra «Hay otro cambio guardándose…» en el propio panel;
- devuelve el campo a la fecha guardada.

Al pulsar «Cerrar» o «Abrir» en otra fila, el blur ocurre en el `mousedown` y el panel se desmonta en el `click`. El aviso del panel desaparece con él y nadie se entera. El panel ya tiene `onError`, que la página pinta como aviso. Hoy se usa para los guardados que fallan con la tarea cerrada.

**Cuándo ocurre de verdad** (comprobado en el apply): con un clic real en un botón de estado, el foco sale antes del campo, así que la fecha se guarda primero y el cambio de estado es el que queda bloqueado. El descarte solo se da si un cambio de estado empieza mientras el foco sigue en el campo, y luego se cierra la tarea. La interfaz no ofrece hoy un camino de teclado para eso, así que se probó con un `click()` programático. Es un caso raro, pero el aviso evita que se pierda en silencio.

## Goals / Non-Goals

**Goals:**
- Que una fecha válida no guardada al cerrar no se pierda en silencio.

**Non-Goals:**
- Guardarla más tarde: el usuario eligió avisar.
- Avisar en la página de fechas incompletas al cerrar: la spec las descarta en silencio.

## Decisions

- **Marcar el descarte y avisar al desmontar.**
  - Un `useRef<boolean>` (`discardedRef`) se activa cuando `commit()` rechaza por `isWriting()` una fecha completa y válida (no `badInput`, con formato `YYYY-MM-DD`) distinta de la guardada.
  - Se desactiva cuando la persona vuelve a editar el campo (`onChange`) y cuando una confirmación posterior se envía.
  - En el cleanup del efecto de montaje, si sigue activo, se llama a `onError` con «No se guardó la fecha porque había otro cambio guardándose. Ábrela y vuelve a ponerla.».
  - Alternativa descartada: detectar el cierre con un `setTimeout` tras el blur. El `click` que desmonta llega después del `mouseup`, a un tiempo que depende de la persona, así que no hay un plazo fiable.
- **Si el panel sigue abierto, solo se ve el aviso del panel**, como hoy. Si después la persona cierra sin volver a tocar el campo, también aparece el aviso de página: la fecha que escribió no se guardó, así que el aviso sigue siendo cierto.
- **Las fechas incompletas no activan la marca**, para respetar «se descarta y no queda ningún aviso tras cerrarse».

### Ajustes tras la revisión adversarial
- `discardedRef` se limpia también al empezar cualquier guardado, incluido «Quitar fecha», y cuando termina la escritura que causó el descarte (efecto sobre `writing`). Así solo se avisa si el conflicto sigue vivo al cerrar.
- El aviso va a un estado propio de la página (`dateNotice`), separado de `notice`, para que el error de un cambio de estado posterior no lo pise. Se borra al volver a abrir una tarea. El aviso de «No se pudo guardar la fecha.» con la tarea cerrada usa el mismo canal.

## Risks / Trade-offs

- [Aviso de página tras haber visto ya el del panel] → Es redundante pero cierto. Se acepta por simplicidad.
- [StrictMode monta, desmonta y vuelve a montar en desarrollo] → En el primer desmontaje la marca aún no puede estar activa, porque no ha habido interacción, así que no hay avisos falsos.
