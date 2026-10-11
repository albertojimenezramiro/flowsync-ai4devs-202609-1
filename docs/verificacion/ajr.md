# Parte A

## Matriz de trazabilidad

Scenarios en el requisito: 3 · Cubiertos: 0

| Scenario | Test que lo cubre | Estado | Qué falta |
| :--- | :--- | :--- | :--- |
| Si el responsable de una tarea es "Ada Lovelace", el `assignee` trae su nombre e iniciales | `` | No cubierto |  |
| Una tarea obtenida no trae email ni otros datos de acceso en el `assignee` | `` | No cubierto |  |
| Si el responsable de una tarea se registró sin nombre, el nombre llega nulo pero llegan sus iniciales | `` | No cubierto |  |


# Parte B: Las tres lineas

**Cuantos scenarios creías cubiertos antes de mirar:** 3. **Cuántos lo estaban:** 0.

**El scenario en el que no supiste si faltaba un test o faltaba la regla en la spec:** qué iniciales del responsable deben venir. La spec de auth 
sí habla de las reglas para elegir las iniciales. Pero la spec de tareas no habla de esto. Supongo que hay que asumir que aplican las mismas reglas,
pero no está formalmente escrito.

**Algo que el scenario no determinaba y tuviste que decidir al escribir el test:** Los endpoints a usar para obtener tareas. Usé los dos GET y el POST.