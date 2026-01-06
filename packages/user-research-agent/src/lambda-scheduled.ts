/**
 * Fieldnotes Scheduled Tasks Lambda Handler
 * Handles EventBridge scheduled events for hourly/daily/weekly jobs
 */

import { ResearchEngine } from './core/ResearchEngine';
import { Logger } from './utils/logger';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || '';

const logger = new Logger('ScheduledTasks');

// Initialize research engine
const engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);

/**
 * Lambda handler for scheduled tasks
 */
export const handler = async (event: any): Promise<void> => {
  logger.info('Scheduled task triggered', { event });

  try {
    const taskType = event.taskType || event['detail-type'] || 'hourly';
    const tenantId = event.tenantId || 'storytailor';

    logger.info(`Running ${taskType} task for tenant ${tenantId}`);

    switch (taskType) {
      case 'hourly':
        // Hourly aggregation (SQL only, no LLM)
        await engine.runScheduledAnalysis(tenantId, 'hourly');
        logger.info('Hourly aggregation completed');
        break;

      case 'daily':
        // Daily pattern detection (cheap LLM)
        await engine.runScheduledAnalysis(tenantId, 'daily');
        logger.info('Daily pattern detection completed');
        break;

      case 'weekly':
        // Weekly brief generation (premium LLM)
        await engine.generateWeeklyBrief(tenantId);
        logger.info('Weekly brief generated');
        break;

      case 'monthly':
        // Monthly cost reset
        await engine.resetCostTracking(tenantId);
        logger.info('Monthly cost tracking reset');
        break;

      default:
        logger.warn(`Unknown task type: ${taskType}`);
    }

    logger.info(`Scheduled task ${taskType} completed successfully`);
  } catch (error: any) {
    logger.error('Scheduled task failed', { error: error.message, stack: error.stack });
    throw error;
  }
};
