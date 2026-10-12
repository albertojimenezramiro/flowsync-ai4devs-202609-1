/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

// Canonical positive integers only: rejects 1.0, -1 and leading zeros (01).
const canonicalId = { match: /^[1-9]\d*$/, cast: (value: string) => Number(value) }

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // Exactly four operations: list, read one, create and update. No delete.
    router
      .group(() => {
        router.get('/', [controllers.Tasks, 'index'])
        router.post('/', [controllers.Tasks, 'store'])
        router.get(':id', [controllers.Tasks, 'show']).where('id', canonicalId)
        router.patch(':id', [controllers.Tasks, 'update']).where('id', canonicalId)
      })
      .prefix('tasks')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
