#!/usr/bin/env ts-node
import http from 'http'
import { UniversalStorytellerAPI } from '../../packages/universal-agent/src/UniversalStorytellerAPI'
import { RESTAPIGateway } from '../../packages/universal-agent/src/api/RESTAPIGateway'

const PORT = parseInt(process.env.PORT || '8787', 10)
const HEALTH_PATH = process.env.HEALTH_PATH || '/health'

async function main() {
  const logger = {
    info: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
    debug: (...args: unknown[]) => console.debug(...args)
  }

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

