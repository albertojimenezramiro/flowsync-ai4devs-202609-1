import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que una tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`.
 *
 * Cada test mira las dos lecturas de una tarea, la lista y la tarea suelta,
 * porque el requisito habla de «cada tarea» y cada una tiene su transformer:
 * que una lo cumpla no dice nada de la otra.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function token(client: any, email: string) {
    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function lecturas(client: any, bearer: string, task: Task) {
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${bearer}`)
    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-10-17' })
      .header('Authorization', `Bearer ${bearer}`)

    lista.assertStatus(200)
    suelta.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === task.id)

    return { lista: enLista.assignee, suelta: suelta.body().data.assignee }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const task = await Task.create({ title: 'Revisar', status: 'pending', assigneeId: ada.id })

    const assignees = await lecturas(client, await token(client, 'ada@example.com'), task)

    for (const assignee of Object.values(assignees)) {
      assert.equal(assignee.fullName, 'Ada Lovelace')
      assert.equal(assignee.initials, 'AL')
    }
  })

  test('el responsable no trae su email ni datos de acceso', async ({ client, assert }) => {
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    await User.create({
      fullName: 'Alan Turing',
      email: 'alan@example.com',
      password: 'secreto123',
    })
    const task = await Task.create({ title: 'Revisar', status: 'pending', assigneeId: ada.id })

    // Quien mira es otra cuenta: la fuga que importa es la del email ajeno.
    const assignees = await lecturas(client, await token(client, 'alan@example.com'), task)

    for (const [lectura, assignee] of Object.entries(assignees)) {
      assert.notProperty(assignee, 'email', `la ${lectura} expone el email`)
      assert.notProperty(assignee, 'password', `la ${lectura} expone la contraseña`)
      assert.notInclude(
        JSON.stringify(assignee),
        'ada@example.com',
        `la ${lectura} filtra el email`
      )
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const anonima = await User.create({
      fullName: null,
      email: 'sin-nombre@example.com',
      password: 'secreto123',
    })
    const task = await Task.create({ title: 'Revisar', status: 'pending', assigneeId: anonima.id })

    const assignees = await lecturas(client, await token(client, 'sin-nombre@example.com'), task)

    for (const assignee of Object.values(assignees)) {
      assert.isNull(assignee.fullName)
      assert.isString(assignee.initials)
      assert.isNotEmpty(assignee.initials)
    }
  })
})
