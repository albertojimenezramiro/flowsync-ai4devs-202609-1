# Tasks

## 1. Aviso al cerrar con una fecha descartada (frontend)

- [ ] 1.1 En `frontend/src/components/task-panel.tsx`:
  - Añadir `discardedRef`. Se activa en `commit()` cuando se rechaza por `isWriting()` una fecha completa y válida distinta de la guardada, y se desactiva en `onChange` y al enviar una confirmación.
  - En el cleanup del efecto de montaje, si está activa, llamar a `onError` con «No se guardó la fecha porque había otro cambio guardándose. Ábrela y vuelve a ponerla.».

  Verificar con `npm run build` y `npm run lint`, y en Chrome headless con el `PATCH` de estado retrasado:
  - Escribir una fecha válida, pulsar un estado y pulsar «Cerrar» enseguida muestra el aviso en la página, sin `PATCH` de fecha y con la fecha anterior en el servidor.
  - Lo mismo con una fecha a medias: ningún aviso.
  - Cerrar sin conflicto: ningún aviso.
  - Las comprobaciones previas del panel siguen pasando.

## 2. Spec

- [ ] 2.1 Ejecutar `openspec validate notify-discarded-date-on-close --strict` sin errores y comprobar que el escenario «Petición en curso» coincide con `isBusy` en `frontend/src/pages/tasks-page.tsx`.
