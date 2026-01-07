#!/usr/bin/env ts-node
import http from 'http'
import { createLogger, transports, format } from 'winston'
import { UniversalStorytellerAPI } from '../../packages/universal-agent/src/UniversalStorytellerAPI'
import { RESTAPIGateway } from '../../packages/universal-agent/src/api/RESTAPIGateway'

const PORT = parseInt(process.env.PORT || '8787', 10)
const HEALTH_PATH = process.env.HEALTH_PATH || '/health'
const FAKE_COMMERCE = process.env.CI_SMOKE_FAKE_COMMERCE === 'true'

async function main() {
  const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console({ silent: false })]
  })

  const storytellerAPI = new UniversalStorytellerAPI(null as any, null as any, logger)
  const gateway = new RESTAPIGateway(storytellerAPI, logger)
  const app = gateway.app

  if (FAKE_COMMERCE) {
    const supabase = (gateway as any).supabase
    ;(gateway as any).commerceAgent = {
      async createIndividualCheckout(userId: string, planId = 'pro_individual') {
        const now = new Date().toISOString()
        const sessionId = 'sess_smoke_fake'
        const url = 'https://example.com/checkout/fake'
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: 'sub_smoke_fake_checkout',
          plan_id: planId,
          status: 'active',
          current_period_start: now,
          current_period_end: now
        }, { onConflict: 'stripe_subscription_id' })
        return { sessionId, url, expiresAt: now }
      },
      async handleWebhook(payload: string) {
        const parsed = JSON.parse(payload)
        const obj = parsed.data?.object || {}
        const subId = obj.id || 'sub_smoke_missing'
        const userId = obj.metadata?.userId || 'unknown'
        const planId = obj.metadata?.planId || 'unknown'
        const status = obj.status || 'active'
        const cps = obj.current_period_start ? new Date(obj.current_period_start * 1000).toISOString() : new Date().toISOString()
        const cpe = obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : new Date().toISOString()
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: subId,
          plan_id: planId,
          status,
          current_period_start: cps,
          current_period_end: cpe
        }, { onConflict: 'stripe_subscription_id' })
      }
    }
  }

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

