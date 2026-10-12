import { DateTime, IANAZone } from 'luxon'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * IANA zone *names* only (UTC, Europe/Madrid, Etc/GMT+12...). Luxon alone
 * would also accept fixed offsets such as "+02:00", which the spec rejects.
 */
const ZONE_NAME = /^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$/

/**
 * The calendar day (YYYY-MM-DD) that counts as "today" for whoever makes the
 * request, taken from the X-Timezone header. Falls back to UTC when the header
 * is missing or empty, and rejects unknown zones with a 422.
 */
export function referenceDate(request: HttpContext['request']): string {
  const zone = request.header('x-timezone')?.trim()
  if (!zone) return DateTime.utc().toISODate()!

  if (!ZONE_NAME.test(zone) || !IANAZone.isValidZone(zone)) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field: 'X-Timezone',
        rule: 'timezone',
        message: 'The X-Timezone header must be a valid IANA time zone name',
      },
    ])
  }

  return DateTime.now().setZone(zone).toISODate()!
}
