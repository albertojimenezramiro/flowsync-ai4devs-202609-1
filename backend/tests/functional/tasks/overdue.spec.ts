import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Cuándo una tarea está vencida. Cubre los scenarios «Una tarea hecha con la
 * fecha pasada» y «Darla por hecha la deja de vencer» del requisito «Cuándo
 * una tarea está vencida» de `openspec/specs/tasks/spec.md`: la regla exige
 * tres condiciones a la vez, y la tercera es que la tarea no esté en `done`.
 *
 * Se recorre por la API y no llamando a `Task.isOverdueOn()`: lo que la spec
 * promete es lo que llega en `isOverdue`, no lo que devuelva un método.
 */
test.group('Tasks | vencimiento', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('una tarea vencida deja de estarlo al darla por hecha, y conserva su fecha', async ({
    client,
    assert,
  }) => {
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const task = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: ada.id,
      dueDate: '2026-10-01',
    })
    const today = '2026-10-18'

    // Punto de partida: pendiente y con la fecha pasada, está vencida. Si esto
    // no se cumpliera, lo de abajo no probaría nada.
    const antes = await client.get(`/api/v1/tasks/${task.id}`).qs({ today }).loginAs(ada)
    antes.assertStatus(200)
    assert.isTrue(antes.body().data.isOverdue, 'pendiente y con fecha pasada')

    const hecha = await client
      .patch(`/api/v1/tasks/${task.id}/status`)
      .json({ status: 'done' })
      .loginAs(ada)
    hecha.assertStatus(200)

    const despues = await client.get(`/api/v1/tasks/${task.id}`).qs({ today }).loginAs(ada)
    despues.assertStatus(200)
    assert.equal(despues.body().data.status, 'done')
    assert.equal(despues.body().data.dueDate, '2026-10-01', 'la fecha no cambia')
    assert.isFalse(despues.body().data.isOverdue, 'hecha y con la fecha pasada')
  })
})
