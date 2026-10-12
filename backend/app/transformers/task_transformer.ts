import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class TaskTransformer extends BaseTransformer<Task> {
  /**
   * @param today The viewer's calendar day (YYYY-MM-DD), used to compute
   * `isOverdue` on every read.
   */
  constructor(
    resource: Task,
    protected today: string
  ) {
    super(resource)
  }

  /**
   * The assignee is reduced to what the list needs. Never reuse
   * UserTransformer here: it would leak the email and account dates.
   * Requires the `assignee` relationship to be loaded.
   */
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: {
        id: this.resource.assignee.id,
        fullName: this.resource.assignee.fullName,
      },
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.today),
    }
  }
}
