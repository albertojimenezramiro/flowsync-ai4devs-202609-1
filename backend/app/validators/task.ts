import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { TASK_STATUSES } from '#models/task'

/**
 * Rejects well-formed strings that are not real calendar days, such as
 * 2026-02-30 or 2027-02-29.
 */
const calendarDate = vine.createRule(
  (value, _options, field) => {
    if (typeof value !== 'string') return
    if (!DateTime.fromISO(value, { zone: 'utc' }).isValid) {
      field.report('The {{ field }} field must be a valid calendar date', 'calendarDate', field)
    }
  },
  { name: 'calendarDate' }
)

/**
 * Due date shared by create and update: a calendar date (YYYY-MM-DD, 4-digit
 * year, no time). `null` (and "" turned into null by the bodyparser) clears it.
 */
const dueDate = () =>
  vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .use(calendarDate())
    .nullable()
    .optional()

/**
 * Validator to use when creating a task: the title plus an optional due date.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
  dueDate: dueDate(),
})

/**
 * Validator to use when updating a task. Every field is optional; the
 * controller enforces that at least one is present. `requiredIfMissing` is not
 * used because it treats null as missing, which would reject clearing the due
 * date on its own. Anything else in the body (title, isOverdue...) is dropped.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  assigneeId: vine
    .number({ strict: true })
    .withoutDecimals()
    .positive()
    .exists({ table: 'users', column: 'id' })
    .optional(),
  dueDate: dueDate(),
})
