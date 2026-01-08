#!/usr/bin/env ts-node
import http from 'http'
import path from 'path'
import Module from 'module'

const PORT = parseInt(process.env.PORT || '8787', 10)
const HEALTH_PATH = process.env.HEALTH_PATH || '/health'
const ROOT = path.join(__dirname, '..', '..')

const aliasMap: Record<string, string> = {
  '@alexa-multi-agent/shared-types': path.join(ROOT, 'packages/shared-types/src/index.ts'),
  '@alexa-multi-agent/router': path.join(ROOT, 'packages/router/src/index.ts'),
  '@alexa-multi-agent/event-system': path.join(ROOT, 'packages/event-system/src/index.ts'),
  '@alexa-multi-agent/auth-agent': path.join(ROOT, 'packages/auth-agent/src/index.ts'),
  '@alexa-multi-agent/content-agent': path.join(ROOT, 'packages/content-agent/src/index.ts'),
  '@alexa-multi-agent/library-agent': path.join(ROOT, 'packages/library-agent/src/index.ts'),
  '@alexa-multi-agent/emotion-agent': path.join(ROOT, 'packages/emotion-agent/src/index.ts'),
  '@alexa-multi-agent/commerce-agent': path.join(ROOT, 'packages/commerce-agent/src/index.ts'),
  '@alexa-multi-agent/insights-agent': path.join(ROOT, 'packages/insights-agent/src/index.ts'),
  '@alexa-multi-agent/smart-home-agent': path.join(ROOT, 'packages/smart-home-agent/src/index.ts'),
  '@alexa-multi-agent/voice-synthesis': path.join(ROOT, 'packages/voice-synthesis/src/index.ts'),
  '@storytailor/api-contract': path.join(ROOT, 'packages/api-contract/src/index.ts'),
  '@alexa-multi-agent/api-contract': path.join(ROOT, 'packages/api-contract/src/index.ts')
}

const originalResolve = Module._resolveFilename
;(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (aliasMap[request]) {
    request = aliasMap[request]
  }
  return (originalResolve as any).call(this, request, parent, isMain, options)
}

async function main() {
  const logger = {
    info: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
    debug: (...args: unknown[]) => console.debug(...args)
  }

  const { UniversalStorytellerAPI } = await import('../../packages/universal-agent/src/UniversalStorytellerAPI')
  const { RESTAPIGateway } = await import('../../packages/universal-agent/src/api/RESTAPIGateway')
  const storytellerAPI = new UniversalStorytellerAPI(null as any, null as any, logger)
  const gateway = new RESTAPIGateway(storytellerAPI, logger)
  const app = gateway.app

  const server = http.createServer(app)

  const startup = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 10_000)
    server.listen(PORT, () => {
      clearTimeout(timer)
      resolve()
    })
  })

  await startup
  process.stdout.write(`server_started ${PORT}${HEALTH_PATH ? ` ${HEALTH_PATH}` : ''}\n`)

  const shutdown = () => {
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(err => {
  console.error('server_start_failed', err?.message || err)
  process.exit(1)
})

