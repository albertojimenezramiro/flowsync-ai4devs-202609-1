import Task from '#models/task'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { referenceDate } from '#helpers/reference_date'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

const toDueDate = (value: string | null) =>
  value === null ? null : DateTime.fromISO(value, { zone: 'utc' })

export default class TasksController {
  async index({ request, serialize }: HttpContext) {
    const today = referenceDate(request)

    // No orderBy on purpose: there is no agreed ordering rule yet (PRD PA-3).
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, today))
  }

  async show({ params, request, serialize }: HttpContext) {
    const today = referenceDate(request)

    const task = await Task.findOrFail(params.id)
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    // Resolved first so an invalid zone rejects the request before any write.
    const today = referenceDate(request)
    const { title, dueDate } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
      dueDate: toDueDate(dueDate ?? null),
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task, today))
  }

  async update({ params, request, serialize }: HttpContext) {
    const today = referenceDate(request)
    const task = await Task.findOrFail(params.id)

    // `optional()` accepts null and drops the field (and the bodyparser turns
    // "" into null), so an explicit null is rejected here instead of ignored.
    // dueDate is the exception: null means "clear the due date".
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

    const { status, assigneeId, dueDate } = await request.validateUsing(updateTaskValidator)

    if (status === undefined && assigneeId === undefined && dueDate === undefined) {
      throw new errors.E_VALIDATION_ERROR(
        (['status', 'assigneeId', 'dueDate'] as const).map((field) => ({
          field,
          rule: 'required',
          message: `The ${field} field must be defined`,
        }))
      )
    }

    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    if (dueDate !== undefined) task.dueDate = toDueDate(dueDate)
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }
}
