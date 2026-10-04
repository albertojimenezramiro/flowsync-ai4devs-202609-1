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

**Modelo:** Sonnet 5.5 high
**Herramienta:** Claude Code

```
Revisa el estado actual del proyecto, FlowSync, atendiendo a endpoints, vistas, backend, frontend. Puedes ayudarte generando un diagrama mermaid de entidad relación con los modelos de datos. Presta especial atención a todo lo que tiene que ver con auth, cuentas y acceso; trabajaremos con esa parte después.
```

**Qué salió:** Salió resumen centrado en auth, con ER, endpoints y rutas frontend, hallazgos por relevancia

## Prompt 2

**Modelo:** Sonnet 5.5 high
**Herramienta:** Claude Code

```
Quiero que te comportes como un experto en definición de producto para escribir en el fichero docs/spec-viva/ajr.md la spec de toda la vertical 
de cuentas y acceso: backend y frontend. Para ello, debes entrar primero en plan mode para no modificar ningún fichero sin mi autorización. 
El formato del fichero debe ser muy concreto, descrito aquí:

  * Arriba, un ## Purpose de una o dos frases: para qué existe esta capability.
  * Debajo, ## Requirements, y colgando de él ### Requirement: en los que el sistema SHALL hacer algo. Las mayúsculas son importantes y se deben usar.
  * Bajo cada requisito, al menos un #### Scenario: de cuatro almohadillas, con dos viñetas: **WHEN** y **THEN**. No hay casilla para el GIVEN: la precondición se mete dentro del WHEN.
  * En castellano, salvo las mayúsculas de la RFC.

Como estamos escribiendo la verdad actual del sistema, el documento no debe contener vocabulario de delta; palabras como ADDED, MODIFIED, REMOVED no deben aparecer.

Solo comportamiento observable desde fuera. Ni un nombre de clase, ni un nombre de archivo, ni una ruta de código. En la API, observable es la petición y la respuesta. En la pantalla, observable es lo que una persona ve y puede hacer.

No se toca código del producto. Solo queremos el mapa del estado actual.
```

**Qué salió:** el contenido generado para el fichero, y el plan que incluye commits y PR porque lo dice CLAUDE.md.

## Prompt 3

**Modelo:** Sonnet 5.5 high
**Herramienta:** Claude Code

```
para aprobar el plan y realizarlo quiero que cambies los pasos, aunque contradigan lo que dice CLAUDE.md. Quiero que escribas el
fichero docs/spec-viva/ajr.md con lo previsto, pero no quiero hacer aún commits con estos cambios, ni push ni subirlo ni hacer PR. Solo quiero escribir
el contenido en el fichero.
```

**Qué salió:** El plan cambiado, pidiendo confirmación de ejecutar plan.

## Prompt 4

**Modelo:** Sonnet 5.5 high
**Herramienta:** Claude Code

```
Viendo lo escrito en el fichero ajr.md, busca y dime cuáles son las incoherencias que han aparecido, y dónde se ven.
```

**Qué salió:** Una tabla con algunas sugerencias de incoherencias.

## Prompt 5

**Modelo:** Sonnet 5.5 high
**Herramienta:** Claude Code

```
Atendiendo a los escenarios documentados en el fichero, dime si hay cosas de las que podríamos dudar si son bugs o contrato.
```

**Qué salió:** Una tabla con posibles bugs y una lista con dudas.

## Prompt 6

**Modelo:** Sonnet 5.5 high
**Herramienta:** Claude Code

```
Sería posible comprobar los requisitos escritos en el fichero para ver si se cumplen realmente?
```

**Qué salió:** Confirmación de que va a ejecutar una serie de tests sobre el backend y las pantallas.
