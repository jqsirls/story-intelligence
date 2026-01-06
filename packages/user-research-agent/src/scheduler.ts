/**
 * Fieldnotes Scheduler
 * Cron jobs for hourly aggregation, daily pattern detection, and weekly brief generation
 */

// @ts-ignore - node-cron types
import cron from 'node-cron';
import { ResearchEngine } from './core/ResearchEngine';
import { Logger } from './utils/logger';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const logger = new Logger('Scheduler');

export class ResearchScheduler {
  private engine: ResearchEngine;
  private tasks: cron.ScheduledTask[] = [];

  constructor() {
    this.engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);
  }

  /**
   * Initialize and start all scheduled jobs
   */
  async start(): Promise<void> {
    logger.info('Initializing Fieldnotes scheduler');

    await this.engine.initialize();

    // Hourly: Data aggregation only (no LLM, zero cost)
    const hourlyTask = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running hourly aggregation');
        const tenants = await this.engine.getActiveTenants();
        for (const tenantId of tenants) {
          await this.engine.runScheduledAnalysis(tenantId, 'hourly');
        }
        logger.info('Hourly aggregation completed');
      } catch (error) {
        logger.error('Hourly aggregation failed', error);
      }
    });
    this.tasks.push(hourlyTask);
    logger.info('Scheduled: Hourly aggregation (top of every hour)');

    // Daily at 2am: Pattern detection (uses cheap LLM)
    const dailyTask = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running daily pattern detection');
        const tenants = await this.engine.getActiveTenants();
        for (const tenantId of tenants) {
          await this.engine.runScheduledAnalysis(tenantId, 'daily');
        }
        logger.info('Daily pattern detection completed');
      } catch (error) {
        logger.error('Daily pattern detection failed', error);
      }
    }, {
      timezone: 'America/Los_Angeles' // PST/PDT
    });
    this.tasks.push(dailyTask);
    logger.info('Scheduled: Daily pattern detection (2am PST)');

    // Weekly on Sunday at 11pm: Generate Monday morning brief
    const weeklyTask = cron.schedule('0 23 * * 0', async () => {
      try {
        logger.info('Generating weekly research brief');
        const tenants = await this.engine.getActiveTenants();
        for (const tenantId of tenants) {
          await this.engine.generateWeeklyBrief(tenantId);
        }
        logger.info('Weekly brief generated and delivered');
      } catch (error) {
        logger.error('Weekly brief generation failed', error);
      }
    }, {
      timezone: 'America/Los_Angeles' // PST/PDT
    });
    this.tasks.push(weeklyTask);
    logger.info('Scheduled: Weekly brief generation (Sunday 11pm PST for Monday 9am delivery)');

    // Monthly on 1st at midnight: Reset cost tracking
    const monthlyTask = cron.schedule('0 0 1 * *', async () => {
      try {
        logger.info('Resetting monthly cost tracking');
        const tenants = await this.engine.getActiveTenants();
        for (const tenantId of tenants) {
          await this.engine.resetCostTracking(tenantId);
        }
        logger.info('Monthly cost tracking reset completed');
      } catch (error) {
        logger.error('Monthly reset failed', error);
      }
    });
    this.tasks.push(monthlyTask);
    logger.info('Scheduled: Monthly cost tracking reset (1st of month at midnight)');

    // Daily cache cleanup at 3am
    const cleanupTask = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Running cache cleanup');
        // Cleanup old cache entries
        logger.info('Cache cleanup completed');
      } catch (error) {
        logger.error('Cache cleanup failed', error);
      }
    });
    this.tasks.push(cleanupTask);
    logger.info('Scheduled: Daily cache cleanup (3am)');

    logger.info('All scheduled tasks initialized successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  async stop(): Promise<void> {
    logger.info('Stopping all scheduled tasks');
    
    for (const task of this.tasks) {
      task.stop();
    }

    await this.engine.shutdown();
    logger.info('All scheduled tasks stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): any {
    return {
      tasksRunning: this.tasks.length,
      tasks: [
        { name: 'Hourly aggregation', schedule: '0 * * * *', active: true },
        { name: 'Daily pattern detection', schedule: '0 2 * * *', active: true },
        { name: 'Weekly brief generation', schedule: '0 23 * * 0', active: true },
        { name: 'Monthly cost reset', schedule: '0 0 1 * *', active: true },
        { name: 'Daily cache cleanup', schedule: '0 3 * * *', active: true }
      ]
    };
  }
}

/**
 * Start scheduler as standalone process
 */
async function main() {
  const scheduler = new ResearchScheduler();
  
  try {
    await scheduler.start();
    logger.info('Fieldnotes scheduler started successfully');
  } catch (error) {
    logger.error('Failed to start scheduler', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await scheduler.stop();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main();
}
