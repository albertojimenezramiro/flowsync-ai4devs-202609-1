import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * Conjunto cerrado de estados. Es la única fuente: validadores y tipos lo
 * reutilizan, y la BD no lo restringe (la API es el único escritor).
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
