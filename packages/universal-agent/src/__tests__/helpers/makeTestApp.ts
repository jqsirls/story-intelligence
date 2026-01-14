/* Test-only helper to spin up RESTAPIGateway with strict, offline stubs. */
import type { Express } from 'express'
import winston from 'winston'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseFixtures = Record<string, any>

type MakeTestAppOptions = {
  authedUser?: {
    id: string
    email: string
    role?: string
  } | null
  supabaseFixtures?: SupabaseFixtures
  stripeMock?: Partial<StripeMockState>
  commerceAgentStub?: {
    handleWebhook?: (payload: string, signature: string) => Promise<any>
    createIndividualCheckout?: (userId: string, planId: string, discountCode?: string) => Promise<any>
    createOrganizationCheckout?: (userId: string, organizationName: string, seatCount: number, planId: string, interval: string) => Promise<any>
    getSubscriptionStatus?: (userId: string) => Promise<any>
    cancelSubscription?: (userId: string, immediate: boolean) => Promise<any>
    changePlan?: (userId: string, newPlanId: string) => Promise<any>
    getStoryPackInventory?: (userId: string) => Promise<any>
    redeemGiftCard?: (userId: string, code: string) => Promise<any>
  }
}

export const defaultAuthedUser = {
  id: 'user_123',
  email: 'test@storytailor.dev',
  role: 'user'
}

let currentFixtures: SupabaseFixtures = {}
let currentAuthedUser: MakeTestAppOptions['authedUser'] = defaultAuthedUser
let lastSupabaseClient: SupabaseClient | null = null

type StripeMockState = {
  lastCheckoutSessionCreateParams: any | null
  checkoutSessionCreateResult: any
  lastWebhookConstructArgs: { payload: string; signature: string; secret: string } | null
  webhookEvent: any
  lastSubscriptionUpdateArgs: any | null
  subscriptionUpdateResult: any
  lastSubscriptionCancelArgs: any | null
  subscriptionCancelResult: any
  subscriptionRetrieveResult: any
}

let stripeMockState: StripeMockState = {
  lastCheckoutSessionCreateParams: null,
  checkoutSessionCreateResult: {
    id: 'cs_test_123',
    url: 'https://checkout.example.test/session/cs_test_123',
    expires_at: 1700000000
  },
  lastWebhookConstructArgs: null,
  webhookEvent: {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_123', metadata: { userId: defaultAuthedUser.id, planId: 'pro_individual', accountType: 'individual' } } }
  },
  lastSubscriptionUpdateArgs: null,
  subscriptionUpdateResult: { id: 'sub_test_123', status: 'active', current_period_start: 1700000000, current_period_end: 1700003600, metadata: { userId: defaultAuthedUser.id, planId: 'pro_individual' } },
  lastSubscriptionCancelArgs: null,
  subscriptionCancelResult: { id: 'sub_test_123', status: 'canceled' },
  subscriptionRetrieveResult: { items: { data: [{ id: 'si_test_123' }] } }
}

let currentCommerceAgentStub: MakeTestAppOptions['commerceAgentStub'] | null = null

export const getStripeMockState = () => stripeMockState
export const resetStripeMockState = () => {
  stripeMockState = {
    ...stripeMockState,
    lastCheckoutSessionCreateParams: null,
    lastWebhookConstructArgs: null,
    lastSubscriptionUpdateArgs: null,
    lastSubscriptionCancelArgs: null
  }
}

type QueryState = {
  table: string
  filters: Array<{ op: string; column: string; value: any }>
  range?: [number, number]
  order?: { column: string; options?: any }
  selectOptions?: any
  selectColumns?: string
  mainOp?: 'select' | 'insert' | 'update' | 'delete' | 'rpc'
  payload?: any
  single?: boolean
  maybeSingle?: boolean
  rpcName?: string
  rpcArgs?: any
}

const resolveQuery = (state: QueryState) => {
  const tableFixture = currentFixtures[state.table] || {}

  const buildSelectData = () => {
    const data =
      typeof tableFixture.select === 'function'
        ? tableFixture.select(state)
        : tableFixture.data ?? []
    const count =
      state.selectOptions && state.selectOptions.count
        ? tableFixture.count ?? (Array.isArray(data) ? data.length : 0)
        : undefined
    if (state.single || state.maybeSingle) {
      const first = Array.isArray(data) ? data[0] ?? null : data ?? null
      return { data: first, count, error: null }
    }
    return { data, count, error: null }
  }

  const buildInsertData = () => {
    const incoming = Array.isArray(state.payload) ? state.payload[0] : state.payload
    const data =
      typeof tableFixture.insert === 'function'
        ? tableFixture.insert({ ...state, payload: incoming })
        : { id: incoming?.id ?? `${state.table}_id`, ...incoming }
    return { data, error: null }
  }

  const buildUpdateData = () => {
    const data =
      typeof tableFixture.update === 'function'
        ? tableFixture.update(state)
        : state.payload ?? {}
    return { data, error: null }
  }

  const buildDeleteData = () => {
    const data =
      typeof tableFixture.delete === 'function'
        ? tableFixture.delete(state)
        : null
    return { data, error: null }
  }

  const buildRpcData = () => {
    const rpcFixtures = currentFixtures.rpc ?? {}
    const handler = rpcFixtures[state.rpcName || '']
    if (typeof handler === 'function') {
      return handler(state)
    }
    return { data: null, error: null }
  }

  switch (state.mainOp) {
    case 'insert':
      return buildInsertData()
    case 'update':
      return buildUpdateData()
    case 'delete':
      return buildDeleteData()
    case 'rpc':
      return buildRpcData()
    default:
      return buildSelectData()
  }
}

const buildSupabaseClient = (): SupabaseClient => {
  const makeBuilder = (table: string) => {
    const state: QueryState = {
      table,
      filters: []
    }

    const builder: any = {
      select(columns = '*', options?: any) {
        state.mainOp = state.mainOp ?? 'select'
        state.selectColumns = columns
        state.selectOptions = options ?? {}
        return builder
      },
      insert(payload: any) {
        state.mainOp = 'insert'
        state.payload = payload
        return builder
      },
      update(payload: any) {
        state.mainOp = 'update'
        state.payload = payload
        return builder
      },
      delete(payload?: any) {
        state.mainOp = 'delete'
        state.payload = payload
        return builder
      },
      eq(column: string, value: any) {
        state.filters.push({ op: 'eq', column, value })
        return builder
      },
      neq(column: string, value: any) {
        state.filters.push({ op: 'neq', column, value })
        return builder
      },
      in(column: string, value: any) {
        state.filters.push({ op: 'in', column, value })
        return builder
      },
      is(column: string, value: any) {
        state.filters.push({ op: 'is', column, value })
        return builder
      },
      ilike(column: string, value: any) {
        state.filters.push({ op: 'ilike', column, value })
        return builder
      },
      gt(column: string, value: any) {
        state.filters.push({ op: 'gt', column, value })
        return builder
      },
      order(column: string, options?: any) {
        state.order = { column, options }
        return builder
      },
      range(from: number, to: number) {
        state.range = [from, to]
        return builder
      },
      limit(value: number) {
        state.range = [0, value - 1]
        return builder
      },
      single() {
        state.single = true
        return builder
      },
      maybeSingle() {
        state.single = true
        state.maybeSingle = true
        return builder
      },
      rpc(name: string, args?: any) {
        state.mainOp = 'rpc'
        state.rpcName = name
        state.rpcArgs = args
        return builder
      },
      then(onFulfilled: any, onRejected: any) {
        return Promise.resolve(resolveQuery(state)).then(onFulfilled, onRejected)
      },
      catch(onRejected: any) {
        return Promise.resolve(resolveQuery(state)).catch(onRejected)
      }
    }

    return builder
  }

  const client: any = {
    from(table: string) {
      return makeBuilder(table)
    },
    auth: {
      signUp: async (params: any) => {
        const authFixtures = currentFixtures.auth || {}
        if (typeof authFixtures.signUp === 'function') {
          return authFixtures.signUp(params)
        }
        return {
          data: {
            user: { id: 'user_new_123', email: params?.email, user_metadata: params?.options?.data || {} },
            session: { access_token: 'access_new', refresh_token: 'refresh_new', expires_in: 3600 }
          },
          error: null
        }
      },
      signInWithPassword: async (params: any) => {
        const authFixtures = currentFixtures.auth || {}
        if (typeof authFixtures.signInWithPassword === 'function') {
          return authFixtures.signInWithPassword(params)
        }
        return {
          data: {
            user: {
              id: currentAuthedUser?.id || defaultAuthedUser.id,
              email: params?.email,
              user_metadata: { first_name: 'Test', last_name: 'User' },
              email_confirmed_at: new Date().toISOString()
            },
            session: { access_token: 'access_123', refresh_token: 'refresh_123', expires_in: 3600 }
          },
          error: null
        }
      }
    },
    rpc(name: string, args?: any) {
      const state: QueryState = {
        table: 'rpc',
        filters: [],
        mainOp: 'rpc',
        rpcName: name,
        rpcArgs: args
      }
      return Promise.resolve(resolveQuery(state))
    }
  }

  return client as SupabaseClient
}

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => {
      lastSupabaseClient = buildSupabaseClient()
      return lastSupabaseClient
    }
  }
})

jest.mock('@alexa-multi-agent/auth-agent', () => {
  return {
    AuthAgent: class {
      constructor() {}
      async validateToken() {
        return {
          userId: currentAuthedUser?.id || 'user_123',
          email: currentAuthedUser?.email || 'test@storytailor.dev',
          isCoppaProtected: false,
          parentConsentVerified: true,
          isEmailConfirmed: true,
          isMinor: false
        }
      }
      async refreshToken(_refreshToken: string) {
        return { success: true, accessToken: 'access_refreshed', refreshToken: 'refresh_refreshed', expiresIn: 3600 }
      }
      async revokeToken(_refreshToken: string) {
        return
      }
      async initiatePasswordReset(_email: string) {
        return { success: true }
      }
    }
  }
})

jest.mock('@alexa-multi-agent/library-agent', () => ({
  LibraryService: class {
    constructor() {}
  }
}))

// Mock CommerceAgent to allow stubbing handleWebhook and other methods
jest.mock('@alexa-multi-agent/commerce-agent', () => ({
  CommerceAgent: class {
    async handleWebhook(payload: string, signature: string) {
      if (currentCommerceAgentStub?.handleWebhook) {
        return currentCommerceAgentStub.handleWebhook(payload, signature)
      }
      // Default stub behavior: just accept the webhook
      return undefined
    }
    async createIndividualCheckout(userId: string, planId: string, discountCode?: string) {
      if (currentCommerceAgentStub?.createIndividualCheckout) {
        return currentCommerceAgentStub.createIndividualCheckout(userId, planId, discountCode)
      }
      return { sessionId: 'cs_test_123', url: 'https://checkout.stripe.com', expiresAt: new Date().toISOString() }
    }
    async createOrganizationCheckout(userId: string, organizationName: string, seatCount: number, planId: string, interval: string) {
      if (currentCommerceAgentStub?.createOrganizationCheckout) {
        return currentCommerceAgentStub.createOrganizationCheckout(userId, organizationName, seatCount, planId, interval)
      }
      return { sessionId: 'cs_test_org_123', url: 'https://checkout.stripe.com/org', expiresAt: new Date().toISOString() }
    }
    async getSubscriptionStatus(userId: string) {
      if (currentCommerceAgentStub?.getSubscriptionStatus) {
        return currentCommerceAgentStub.getSubscriptionStatus(userId)
      }
      return null
    }
    async cancelSubscription(userId: string, immediate: boolean) {
      if (currentCommerceAgentStub?.cancelSubscription) {
        return currentCommerceAgentStub.cancelSubscription(userId, immediate)
      }
      return { success: true }
    }
    async changePlan(userId: string, newPlanId: string) {
      if (currentCommerceAgentStub?.changePlan) {
        return currentCommerceAgentStub.changePlan(userId, newPlanId)
      }
      return { success: true }
    }
    async getStoryPackInventory(userId: string) {
      if (currentCommerceAgentStub?.getStoryPackInventory) {
        return currentCommerceAgentStub.getStoryPackInventory(userId)
      }
      return { summary: { totalAvailable: 0 }, packs: [] }
    }
    async redeemGiftCard(userId: string, code: string) {
      if (currentCommerceAgentStub?.redeemGiftCard) {
        return currentCommerceAgentStub.redeemGiftCard(userId, code)
      }
      return { success: true }
    }
    constructor(_config: any) {}
  }
}))

// Stripe is used by CommerceAgent and by any UA Stripe wrappers.
// We mock it at the module level to keep tests offline + deterministic.
jest.mock('stripe', () => {
  class StripeMock {
    public webhooks = {
      constructEvent: (payload: string, signature: string, secret: string) => {
        stripeMockState.lastWebhookConstructArgs = { payload, signature, secret }
        return stripeMockState.webhookEvent
      }
    }

    public checkout = {
      sessions: {
        create: async (params: any) => {
          stripeMockState.lastCheckoutSessionCreateParams = params
          return stripeMockState.checkoutSessionCreateResult
        }
      }
    }

    public coupons = {
      create: async (_params: any) => ({ id: 'coupon_test_123' })
    }

    public subscriptions = {
      update: async (...args: any[]) => {
        stripeMockState.lastSubscriptionUpdateArgs = args
        return stripeMockState.subscriptionUpdateResult
      },
      retrieve: async (_id: string) => stripeMockState.subscriptionRetrieveResult,
      cancel: async (...args: any[]) => {
        stripeMockState.lastSubscriptionCancelArgs = args
        return stripeMockState.subscriptionCancelResult
      }
    }

    constructor(_key: string, _opts?: any) {}
  }

  return {
    __esModule: true,
    default: StripeMock
  }
})

jest.mock('../../services/DeletionService', () => ({
  DeletionService: class {
    constructor() {}
  }
}))

jest.mock('../../services/InactivityMonitorService', () => ({
  InactivityMonitorService: class {
    constructor() {}
  }
}))

jest.mock('../../services/EmailService', () => ({
  EmailService: class {
    constructor() {}
  }
}))

jest.mock('../../services/PLGNudgeService', () => ({
  PLGNudgeService: class {
    constructor() {}
    async sendDay0EarningOpportunities() {
      return
    }
  }
}))

jest.mock('../../webhooks/WebhookDeliverySystem', () => ({
  WebhookDeliverySystem: class {
    constructor() {}
  }
}))

jest.mock('../../middleware/AuthMiddleware', () => {
  return {
    AuthMiddleware: class {
      requireAuth = async (req: any, res: any, next: any) => {
        if (!currentAuthedUser) {
          res.status(401).json({
            success: false,
            error: 'Authorization token required',
            code: 'AUTH_TOKEN_MISSING'
          })
          return
        }
        req.user = currentAuthedUser
        next()
      }
      optionalAuth = async (req: any, _res: any, next: any) => {
        if (currentAuthedUser) {
          req.user = currentAuthedUser
        }
        next()
      }
      requireEmailVerification = async (req: any, res: any, next: any) => {
        if (!currentAuthedUser) {
          res.status(401).json({
            success: false,
            error: 'Authorization token required',
            code: 'AUTH_TOKEN_MISSING'
          })
          return
        }
        next()
      }
      requireParentConsent = async (req: any, res: any, next: any) => {
        if (!currentAuthedUser) {
          res.status(401).json({
            success: false,
            error: 'Authorization token required',
            code: 'AUTH_TOKEN_MISSING'
          })
          return
        }
        next()
      }
      requirePermission = (_permission: string) => {
        return async (req: any, res: any, next: any) => {
          if (!currentAuthedUser) {
            res.status(401).json({
              success: false,
              error: 'Authorization token required',
              code: 'AUTH_TOKEN_MISSING'
            })
            return
          }
          req.user = currentAuthedUser
          next()
        }
      }
    }
  }
})

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class {
    constructor() {}
    async send() {
      return {}
    }
  },
  InvokeCommand: class {
    constructor() {}
  }
}))

const buildDefaultFixtures = (
  userId: string,
  overrides?: SupabaseFixtures
): SupabaseFixtures => ({
  notifications: {
    data: [
      { id: 'notif_1', user_id: userId, read: false, created_at: '2024-01-01T00:00:00Z' },
      { id: 'notif_2', user_id: userId, read: true, created_at: '2024-01-02T00:00:00Z' }
    ],
    count: 2,
    unreadCount: 1
  },
  reward_ledger: {
    data: [
      { id: 'reward_1', user_id: userId, amount: 150, status: 'applied', created_at: '2024-01-01T00:00:00Z' },
      { id: 'reward_2', user_id: userId, amount: 250, status: 'pending', created_at: '2024-01-02T00:00:00Z' }
    ],
    count: 2
  },
  libraries: {
    data: [{ id: 'lib_1', owner: userId }]
  },
  library_permissions: {
    data: [{ role: 'Owner', user_id: userId, library_id: 'lib_1' }]
  },
  characters: {
    data: [{ id: 'char_1', library_id: 'lib_1', owner: userId }]
  },
  subscriptions: {
    data: [
      { id: 'sub_1', user_id: userId, plan_id: 'pro', status: 'active', created_at: '2024-01-01T00:00:00Z' }
    ],
    count: 1
  },
  stories: {
    data: [{ id: 'story_1', title: 'My Story', creator_user_id: userId, library_id: 'lib_1', activities: ['act1'] }]
  },
  story_interactions: {
    data: [{ story_id: 'story_1', interaction_type: 'completed' }]
  },
  media_assets: {
    data: [
      { id: 'asset_1', story_id: 'story_1', asset_type: 'audio', url: 'https://cdn.example.com/story_1/audio.mp3' }
    ]
  },
  rpc: {
    get_story_feedback_summary: () => ({ data: { total: 1, averageRating: 4.5, sentimentCounts: { positive: 1, neutral: 0, negative: 0 } }, error: null }),
    get_character_feedback_summary: () => ({ data: { total: 1, averageRating: 4.0, sentimentCounts: { positive: 1, neutral: 0, negative: 0 } }, error: null })
  },
  users: {
    data: [
      {
        id: userId,
        email: currentAuthedUser?.email || defaultAuthedUser.email,
        first_name: 'Test',
        last_name: 'User',
        available_story_credits: 3,
        profile_completed: true,
        smart_home_connected: true,
        lifetime_stories_created: 1,
        test_mode_authorized: false
      }
    ]
  },
  story_packs: {
    data: []
  },
  asset_generation_jobs: {
    data: []
  },
  ...(overrides || {})
})

export const resetSupabaseFixtures = () => {
  currentFixtures = {}
}

export const makeTestApp = async (options: MakeTestAppOptions = {}) => {
  try {
    currentAuthedUser =
      options.authedUser === undefined ? defaultAuthedUser : options.authedUser
    currentFixtures = buildDefaultFixtures(
      currentAuthedUser?.id || defaultAuthedUser.id,
      options.supabaseFixtures
    )

    if (options.stripeMock) {
      stripeMockState = { ...stripeMockState, ...options.stripeMock }
    }

    if (options.commerceAgentStub) {
      currentCommerceAgentStub = options.commerceAgentStub
    } else {
      currentCommerceAgentStub = null
    }

    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_123'
    process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'https://storytailor.example.test'

    const logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    })

    const { RESTAPIGateway } = await import('../../api/RESTAPIGateway')
    const gateway = new RESTAPIGateway(null, logger)

    return {
      app: gateway.app as Express,
      supabaseStub: lastSupabaseClient
    }
  } catch (e) {
    const msg = e instanceof Error ? (e.stack || e.message) : String(e)
    process.stderr.write(`makeTestApp_failed: ${msg}\n`)
    throw e
  }
}

