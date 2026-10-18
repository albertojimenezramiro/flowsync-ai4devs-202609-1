import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      version: 'v1',
    },
    components: {
      securitySchemes: {
        // Nombre fijado por `@ApiBearerAuth()`: los access tokens opacos del guard `api`.
        bearer: { type: 'http', scheme: 'bearer' },
      },
    },
  },
})
