import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * Closed set of task statuses. Single source of truth for validators and
 * types; the database does not enforce it (the API is the only writer).
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * Overdue rule: has a due date, the date is before `today` and the task is
   * not done. `today` is a calendar date (YYYY-MM-DD) in the viewer's zone;
   * ISO dates compare correctly as strings. Never persisted: computed on read.
   */
  isOverdueOn(today: string): boolean {
    if (!this.dueDate || this.status === 'done') return false
    return this.dueDate.toISODate()! < today
  }
}
