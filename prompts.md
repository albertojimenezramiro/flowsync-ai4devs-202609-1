# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 1M xHigh
**Herramienta:** Claude Code

```
Este es el ejemplo. Bórralo.

El prompt va aquí dentro, entero y con sus saltos de línea,
para que se sepa dónde empieza y dónde acaba.
```

**Qué salió:** (opcional, una línea) funcionó a la primera / tuve que insistir / me inventó una ruta que no existe.

## Prompt 1

**Modelo:** Opus 5.5 with high effort
**Herramienta:** Claude Code

```
Quiero que explores el proyecto centrándote en la épica de tareas, para empezar a trabajar en la sesión. Centraremos el trabajo en uno de los requirements de la spec viva de tareas en openspec/specs/tasks/spec.md: "Lo que cada tarea muestra de su responsable" y en los tests existentes para cubrir los scenarios de este requirement.
```

**Qué salió:** funcionó a la primera.

## Prompt 2

**Modelo:** Opus 5.5 with high effort
**Herramienta:** Claude Code

```
Necesito rellenar la matriz de trazabilidad que ya he esbozado en el fichero docs/verificacion/ajr.md, teniendo en cuenta el estado actual de los tests que pudieran existir. Revisa bien a fondo los tests que existan para cubrir los tres escenarios que ya están expuestos en la tabla del fichero. Necesito rellenar la segunda columna con el nombre del test ya existente que cubra su scenario correspondiente, así como la tercera columna con posibles valores "Cubierto", "No cubierto" o "no lo sé". Entra en plan mode para no editar directamente los ficheros y no ejecutar el plan hasta que yo no te confirme.
```

**Qué salió:** funcionó a la primera.

## Prompt 3

**Modelo:** Opus 5.5 with high effort
**Herramienta:** Claude Code

```
Quiero que cambies el plan sobre lo que se escribirá en la matriz de trazabilidad. En primer lugar, no quiero que edites la linea de descripción de cada scenario; quiero mantenerla tal cual la escribí yo. Además, quiero que para los tres scenarios, el estado sea "No cubierto": aunque haya pruebas similares para la api de auth, los scenarios hablan claramente de tareas que se obtienen, en el WHEN. Por tanto, es necesario que valide en el modelo de datos de una tarea devuelto por aquellos endpoints que devuelvan tareas. Debido a estos cambios, la columna con el nombre del test y la de "qué falta" se quedan vacías en todos los scenarios.
```

**Qué salió:** funcionó a la primera.

## Prompt 3

**Modelo:** Opus 5.5 with high effort
**Herramienta:** Claude Code

```
Entra de nuevo en modo plan para preparar la creación de los tests adecuados que utilicen los endpoints de tareas y comprueben específicamente los tres scenarios que hemos planteado en la tabla y que son los mismos que los tres scenarios que hay en la spec viva, para el requisito en el que estamos trabajando. Debes seguir el mismo estilo y convenciones de código los que los tests existentes que ya has explorado para auth. No asumas, pregunta.
```

**Qué salió:** funcionó a la primera.
