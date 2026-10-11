import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que una tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable identificable, que la tarea no
 * filtre datos de su cuenta, y el responsable que se registró sin nombre.
 *
 * Cada test lo comprueba en las tres respuestas que entregan una tarea: la
 * lista, la tarea suelta y el alta. Las lecturas las hace otra cuenta, que es
 * el caso en el que un dato de más sería una fuga a terceros.
 *
 * En la lista se busca la tarea del test por su id: la suite pega contra el
 * mismo SQLite que el servidor de desarrollo, y las tareas que ya hubiera ahí
 * no son asunto de este test.
 */
test.group('Tareas | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function cuenta(fullName: string | null, email: string) {
    return User.create({ fullName, email, password: 'secreto123' })
  }

  async function token(client: any, email: string) {
    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  /**
   * El `assignee` tal y como llega en cada respuesta que entrega una tarea. Las
   * lecturas las hace `mira`; el alta la hace `crea`, porque una tarea nace a
   * nombre de quien la crea.
   */
  async function responsablesDe(client: any, assert: any, tarea: Task, mira: string, crea: string) {
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${mira}`)
    lista.assertStatus(200)

    const enLaLista = lista.body().data.find((t: { id: number }) => t.id === tarea.id)
    assert.isDefined(enLaLista, 'la tarea no aparece en GET /tasks')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: '2026-10-11' })
      .header('Authorization', `Bearer ${mira}`)
    suelta.assertStatus(200)

    const alta = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${crea}`)
      .json({ title: 'Preparar la demo' })
    alta.assertStatus(201)

    return {
      'GET /tasks': enLaLista.assignee,
      'GET /tasks/:id': suelta.body().data.assignee,
      'POST /tasks': alta.body().data.assignee,
    }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await cuenta('Ada Lovelace', 'ada@example.com')
    await cuenta('Alan Turing', 'alan@example.com')
    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: ada.id,
    })

    const responsables = await responsablesDe(
      client,
      assert,
      tarea,
      await token(client, 'alan@example.com'),
      await token(client, 'ada@example.com')
    )

    for (const [endpoint, assignee] of Object.entries(responsables)) {
      assert.equal(assignee.fullName, 'Ada Lovelace', endpoint)
      assert.equal(assignee.initials, 'AL', endpoint)
    }
  })

  test('el responsable no trae el email ni otros datos de la cuenta', async ({
    client,
    assert,
  }) => {
    const ada = await cuenta('Ada Lovelace', 'ada@example.com')
    await cuenta('Alan Turing', 'alan@example.com')
    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: ada.id,
    })

    const responsables = await responsablesDe(
      client,
      assert,
      tarea,
      await token(client, 'alan@example.com'),
      await token(client, 'ada@example.com')
    )

    // Lista cerrada y no una lista de prohibidos: cualquier dato de la cuenta
    // que se cuele, sea el email o el que se añada mañana, tumba el test.
    for (const [endpoint, assignee] of Object.entries(responsables)) {
      assert.sameMembers(Object.keys(assignee), ['id', 'fullName', 'initials'], endpoint)
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y sus iniciales', async ({
    client,
    assert,
  }) => {
    const sinNombre = await cuenta(null, 'ada@example.com')
    await cuenta('Alan Turing', 'alan@example.com')
    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: sinNombre.id,
    })

    const responsables = await responsablesDe(
      client,
      assert,
      tarea,
      await token(client, 'alan@example.com'),
      await token(client, 'ada@example.com')
    )

    for (const [endpoint, assignee] of Object.entries(responsables)) {
      assert.isNull(assignee.fullName, endpoint)
      assert.equal(assignee.initials, 'AE', endpoint)
    }
  })
})
