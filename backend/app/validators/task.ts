import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task'

/**
 * Validator to use when creating a task: the title is the only input.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
})

/**
 * Validator to use when updating a task. At least one of the two fields
 * must be present; anything else in the body is dropped.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional().requiredIfMissing('assigneeId'),
  assigneeId: vine
    .number({ strict: true })
    .withoutDecimals()
    .positive()
    .exists({ table: 'users', column: 'id' })
    .optional()
    .requiredIfMissing('status'),
})
