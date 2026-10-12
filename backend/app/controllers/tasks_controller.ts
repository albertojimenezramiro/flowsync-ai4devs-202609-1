import Task from '#models/task'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

export default class TasksController {
  async index({ serialize }: HttpContext) {
    // Sin orderBy a propósito: no hay regla de orden decidida (PA-3 del PRD).
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)

    // `optional()` acepta null y descarta el campo (y el bodyparser convierte
    // "" en null), así que un null explícito se rechaza aquí para no ignorarlo.
    const body = request.body()
    const nullFields = (['status', 'assigneeId'] as const).filter(
      (field) => field in body && body[field] === null
    )
    if (nullFields.length) {
      throw new errors.E_VALIDATION_ERROR(
        nullFields.map((field) => ({
          field,
          rule: 'required',
          message: `The ${field} field must be defined`,
        }))
      )
    }

    const { status, assigneeId } = await request.validateUsing(updateTaskValidator)

    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
