/**
 * Lifecycle Enforcement Middleware
 * 
 * Enforces the canonical lifecycle rule from docs/api/OPENAPI_EXTENSIONS.md:
 * "Operations called from invalid states return ERR_6003 INVALID_STATE_TRANSITION.
 *  No silent recovery. Predictability beats forgiveness."
 * 
 * This middleware validates that resource state transitions are valid before
 * allowing the operation to proceed.
 */

import { Request, Response, NextFunction } from 'express'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

interface LifecycleConfig {
  /** Resource type (story, asset, conversation, transfer, subscription, job) */
  resource: string
  /** Parameter name containing the resource ID */
  resourceIdParam: string
  /** Valid states to transition FROM */
  fromStates: string[]
  /** Target state to transition TO */
  toState: string
  /** Database table name (if different from resource) */
  tableName?: string
  /** Column name for state (default: 'status') */
  stateColumn?: string
}

interface LifecycleError {
  success: false
  error: {
    code: 'ERR_6003'
    message: string
    type: 'INVALID_STATE_TRANSITION'
    details: {
      resource: string
      resourceId: string
      currentState: string
      allowedFromStates: string[]
      attemptedTransition: string
    }
    retryable: false
    action: 'Check resource state before calling'
  }
}

// ============================================================================
// State Machine Definitions (from LIFECYCLE_STATE_MACHINES.md)
// ============================================================================

/**
 * Valid state transitions per resource type.
 * These are the canonical state machines from the documentation.
 */
export const STATE_MACHINES: Record<string, Record<string, string[]>> = {
  story: {
    // State: [valid next states]
    draft: ['generating', 'archived'],
    generating: ['ready', 'failed'],
    ready: ['archived', 'generating'], // generating = regenerate
    failed: ['generating', 'archived'],
    archived: ['ready'], // restore
  },
  asset: {
    // Aligned with asset_generation_jobs table
    queued: ['generating'],
    generating: ['ready', 'failed'],
    ready: ['generating'], // regenerate
    failed: ['generating', 'canceled'],
    canceled: [], // terminal
  },
  conversation: {
    initializing: ['active', 'failed'],
    active: ['paused', 'ended', 'failed'],
    paused: ['active', 'ended'],
    ended: [], // terminal
    failed: ['initializing'], // retry
  },
  transfer: {
    pending: ['accepted', 'declined', 'expired', 'cancelled'],
    accepted: [], // terminal
    declined: [], // terminal
    expired: [], // terminal
    cancelled: [], // terminal
  },
  subscription: {
    // Aligned with subscriptions table (uses 'canceled' single L)
    trialing: ['active', 'canceled'],
    active: ['past_due', 'canceled', 'paused'],
    past_due: ['active', 'canceled'],
    paused: ['active', 'canceled'],
    canceled: [], // terminal
  },
  job: {
    // Aligned with asset_generation_jobs table
    queued: ['generating', 'canceled'],
    generating: ['ready', 'failed', 'canceled'],
    ready: [], // terminal
    failed: ['queued'], // retry
    canceled: [], // terminal
  },
}

// ============================================================================
// Resource State Fetchers
// ============================================================================

const TABLE_MAPPINGS: Record<string, { table: string; stateColumn: string }> = {
  story: { table: 'stories', stateColumn: 'status' },
  asset: { table: 'asset_generation_jobs', stateColumn: 'status' }, // Uses job table for assets
  conversation: { table: 'conversations', stateColumn: 'status' },
  transfer: { table: 'story_transfer_requests', stateColumn: 'status' }, // Legacy: story_transfer_requests (older) or story_transfers (newer)
  subscription: { table: 'subscriptions', stateColumn: 'status' },
  job: { table: 'asset_generation_jobs', stateColumn: 'status' },
}

async function getResourceState(
  supabase: SupabaseClient,
  resource: string,
  resourceId: string,
  config?: { tableName?: string; stateColumn?: string }
): Promise<string | null> {
  const mapping = TABLE_MAPPINGS[resource]
  const table = config?.tableName || mapping?.table || `${resource}s`
  const column = config?.stateColumn || mapping?.stateColumn || 'status'

  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('id', resourceId)
      .single()

    if (error || !data) {
      return null
    }

    return data[column] as string
  } catch {
    return null
  }
}

// ============================================================================
// Error Response Builder
// ============================================================================

function buildLifecycleError(
  resource: string,
  resourceId: string,
  currentState: string,
  allowedFromStates: string[],
  toState: string
): LifecycleError {
  return {
    success: false,
    error: {
      code: 'ERR_6003',
      message: `Cannot transition ${resource} from '${currentState}' to '${toState}'`,
      type: 'INVALID_STATE_TRANSITION',
      details: {
        resource,
        resourceId,
        currentState,
        allowedFromStates,
        attemptedTransition: `${currentState} → ${toState}`,
      },
      retryable: false,
      action: 'Check resource state before calling',
    },
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Creates middleware that enforces lifecycle state transitions.
 * 
 * @example
 * ```typescript
 * // Only allow asset generation if story is in 'ready' or 'failed' state
 * router.post(
 *   '/stories/:storyId/assets/generate',
 *   enforceLifecycle({
 *     resource: 'story',
 *     resourceIdParam: 'storyId',
 *     fromStates: ['ready', 'failed'],
 *     toState: 'generating',
 *   }),
 *   generateAssetsHandler
 * );
 * ```
 */
export function enforceLifecycle(config: LifecycleConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const resourceId = req.params[config.resourceIdParam]

    if (!resourceId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ERR_1001',
          message: `Missing required parameter: ${config.resourceIdParam}`,
          type: 'VALIDATION_ERROR',
        },
      })
      return
    }

    // Get Supabase client from request context or create one
    const supabase = (req as any).supabase || createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Fetch current state
    const currentState = await getResourceState(
      supabase,
      config.resource,
      resourceId,
      { tableName: config.tableName, stateColumn: config.stateColumn }
    )

    if (currentState === null) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ERR_2001',
          message: `${config.resource} not found: ${resourceId}`,
          type: 'NOT_FOUND',
        },
      })
      return
    }

    // Validate transition
    if (!config.fromStates.includes(currentState)) {
      const error = buildLifecycleError(
        config.resource,
        resourceId,
        currentState,
        config.fromStates,
        config.toState
      )
      res.status(409).json(error)
      return
    }

    // Store lifecycle context for handlers
    ;(req as any).lifecycleContext = {
      resource: config.resource,
      resourceId,
      fromState: currentState,
      toState: config.toState,
    }

    next()
  }
}

/**
 * Validates a proposed state transition against the canonical state machine.
 * Use this for programmatic validation without HTTP context.
 */
export function isValidTransition(
  resource: string,
  fromState: string,
  toState: string
): boolean {
  const machine = STATE_MACHINES[resource]
  if (!machine) {
    return false // Unknown resource type
  }

  const validNextStates = machine[fromState]
  if (!validNextStates) {
    return false // Unknown current state
  }

  return validNextStates.includes(toState)
}

/**
 * Gets all valid next states for a resource in a given state.
 */
export function getValidNextStates(resource: string, currentState: string): string[] {
  const machine = STATE_MACHINES[resource]
  if (!machine) {
    return []
  }

  return machine[currentState] || []
}

/**
 * Checks if a state is terminal (no valid transitions out).
 */
export function isTerminalState(resource: string, state: string): boolean {
  const nextStates = getValidNextStates(resource, state)
  return nextStates.length === 0
}

// ============================================================================
// Convenience Factories for Common Operations
// ============================================================================

/**
 * Middleware for story generation (draft/ready/failed → generating)
 */
export const enforceStoryGeneration = enforceLifecycle({
  resource: 'story',
  resourceIdParam: 'storyId',
  fromStates: ['draft', 'ready', 'failed'],
  toState: 'generating',
})

/**
 * Middleware for story archival (ready/failed → archived)
 */
export const enforceStoryArchival = enforceLifecycle({
  resource: 'story',
  resourceIdParam: 'storyId',
  fromStates: ['ready', 'failed', 'draft'],
  toState: 'archived',
})

/**
 * Middleware for story restoration (archived → ready)
 */
export const enforceStoryRestoration = enforceLifecycle({
  resource: 'story',
  resourceIdParam: 'storyId',
  fromStates: ['archived'],
  toState: 'ready',
})

/**
 * Middleware for asset regeneration (ready/failed → generating)
 */
export const enforceAssetRegeneration = enforceLifecycle({
  resource: 'asset',
  resourceIdParam: 'assetId',
  fromStates: ['ready', 'failed'],
  toState: 'generating',
})

/**
 * Middleware for transfer acceptance (pending → accepted)
 */
export const enforceTransferAcceptance = enforceLifecycle({
  resource: 'transfer',
  resourceIdParam: 'transferId',
  fromStates: ['pending'],
  toState: 'accepted',
})

/**
 * Middleware for transfer cancellation (pending → cancelled)
 */
export const enforceTransferCancellation = enforceLifecycle({
  resource: 'transfer',
  resourceIdParam: 'transferId',
  fromStates: ['pending'],
  toState: 'cancelled',
})

/**
 * Middleware for job cancellation (queued/generating → canceled)
 */
export const enforceJobCancellation = enforceLifecycle({
  resource: 'job',
  resourceIdParam: 'jobId',
  fromStates: ['queued', 'generating'],
  toState: 'canceled',
})

/**
 * Middleware for job retry (failed → queued)
 */
export const enforceJobRetry = enforceLifecycle({
  resource: 'job',
  resourceIdParam: 'jobId',
  fromStates: ['failed'],
  toState: 'queued',
})

