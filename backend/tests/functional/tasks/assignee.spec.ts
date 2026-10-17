import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que una tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`.
 *
 * El requisito habla de «cada tarea», así que cada test recorre todas las
 * respuestas que devuelven una: la lista, la tarea suelta, el cambio de
 * estado, el de vencimiento y la creación. Hoy pasan por dos transformers
 * distintos, y que una lo cumpla no dice nada de las demás.
 *
 * Las afirmaciones son sobre el objeto entero y no sobre claves sueltas: el
 * requisito prohíbe «cualquier otro dato de esa cuenta», y una lista negra de
 * claves deja pasar todo lo que no se le ocurrió a quien la escribió. El `id`
 * del responsable se admite: identifica la cuenta, no da acceso a ella.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function token(client: any, email: string) {
    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  /**
   * El `assignee` de cada respuesta que devuelve una tarea de `responsable`.
   *
   * Todas las lecturas las hace otra cuenta, `observador`, para que un fallo
   * que devolviera a quien mira en vez de al responsable no pase inadvertido.
   * La creación es la excepción obligada: quien crea la tarea es su responsable.
   */
  async function assignees(client: any, responsable: User, observador: User) {
    const task = await Task.create({
      title: 'Revisar',
      status: 'pending',
      assigneeId: responsable.id,
    })
    const mira = await token(client, observador.email)
    const auth = (request: any) => request.header('Authorization', `Bearer ${mira}`)

    const lista = await auth(client.get('/api/v1/tasks'))
    const suelta = await auth(client.get(`/api/v1/tasks/${task.id}`).qs({ today: '2026-10-17' }))
    const estado = await auth(
      client.patch(`/api/v1/tasks/${task.id}/status`).json({ status: 'in_progress' })
    )
    const vencimiento = await auth(
      client
        .put(`/api/v1/tasks/${task.id}/due-date`)
        .json({ today: '2026-10-17', dueDate: '2026-10-20' })
    )
    const creacion = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${await token(client, responsable.email)}`)
      .json({ title: 'Otra' })

    const respuestas = { lista, suelta, estado, vencimiento, creacion }
    for (const [nombre, response] of Object.entries(respuestas)) {
      response.assertStatus(nombre === 'creacion' ? 201 : 200)
    }

    const enLista = lista.body().data.find((t: { id: number }) => t.id === task.id)
    if (!enLista) throw new Error('la tarea no aparece en la lista')

    return {
      lista: enLista.assignee,
      suelta: suelta.body().data.assignee,
      estado: estado.body().data.assignee,
      vencimiento: vencimiento.body().data.assignee,
      creacion: creacion.body().data.assignee,
    }
  }

  async function cuenta(fullName: string | null, email: string) {
    return User.create({ fullName, email, password: 'secreto123' })
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await cuenta('Ada Lovelace', 'ada@example.com')
    const alan = await cuenta('Alan Turing', 'alan@example.com')

    for (const [lectura, assignee] of Object.entries(await assignees(client, ada, alan))) {
      assert.deepEqual(
        assignee,
        { id: ada.id, fullName: 'Ada Lovelace', initials: 'AL' },
        `en la ${lectura}`
      )
    }
  })

  test('el responsable no trae su email ni ningún otro dato de la cuenta', async ({
    client,
    assert,
  }) => {
    const ada = await cuenta('Ada Lovelace', 'ada@example.com')
    const alan = await cuenta('Alan Turing', 'alan@example.com')

    for (const [lectura, assignee] of Object.entries(await assignees(client, ada, alan))) {
      assert.sameMembers(Object.keys(assignee), ['id', 'fullName', 'initials'], `en la ${lectura}`)
      // Por si el email entrara dentro de un campo permitido.
      assert.notInclude(JSON.stringify(assignee), 'ada@example', `en la ${lectura}`)
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const anonima = await cuenta(null, 'sin-nombre@example.com')
    const alan = await cuenta('Alan Turing', 'alan@example.com')

    // La spec de tasks no fija el valor, solo que lleguen. «SE» es lo que da la
    // regla de auth para una cuenta sin nombre, que las deriva del email
    // («ada@example.com» → «AE»): fijarlo hace que unas iniciales inventadas
    // no pasen por buenas.
    for (const [lectura, assignee] of Object.entries(await assignees(client, anonima, alan))) {
      assert.deepEqual(
        assignee,
        { id: anonima.id, fullName: null, initials: 'SE' },
        `en la ${lectura}`
      )
    }
  })
})
