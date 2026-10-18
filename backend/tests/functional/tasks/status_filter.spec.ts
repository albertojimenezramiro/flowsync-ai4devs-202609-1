import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Acotar la lista por un estado que no existe. Cubre los scenarios «Estado
 * inventado» y «El error no se confunde con la ausencia» del requisito «Un
 * estado que no existe se rechaza, no se responde vacío» de
 * `openspec/specs/tasks/spec.md`: pedir algo que no existe es un `422` sobre
 * `status`, nunca una lista vacía.
 */
test.group('Tasks | filtro por estado', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('un estado inventado se rechaza con 422 sobre status y no con una lista vacía', async ({
    client,
    assert,
  }) => {
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    // Hay tareas en el espacio: una lista vacía no podría pasar por «no hay nada».
    await Task.create({ title: 'Revisar el informe', status: 'pending', assigneeId: ada.id })

    const response = await client.get('/api/v1/tasks').qs({ status: 'archivado' }).loginAs(ada)

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'status' }] })
    assert.notProperty(response.body(), 'data', 'no se devuelve ninguna lista')

    // La otra mitad del contraste: un estado válido sin tareas es un 200 con
    // lista vacía, y las dos respuestas se distinguen sin ambigüedad.
    const vacia = await client.get('/api/v1/tasks').qs({ status: 'in_progress' }).loginAs(ada)

    vacia.assertStatus(200)
    assert.deepEqual(vacia.body(), { data: [] })
  })
})
