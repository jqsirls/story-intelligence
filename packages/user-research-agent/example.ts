/**
 * Fieldnotes Usage Example
 * Shows how to use the research agent programmatically
 */

import { ResearchEngine } from './src/core/ResearchEngine';
import { FieldnotesClient } from './src/sdk';
import { storytailorConfig } from './src/config/tenants/storytailor';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Example 1: Direct engine usage
 */
async function example1_DirectEngine() {
  console.log('\n=== Example 1: Direct Engine Usage ===\n');

  const engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);
  await engine.initialize();

  // On-demand analysis
  const analysis = await engine.analyzeOnDemand({
    tenantId: 'storytailor',
    timeframe: '7 days',
    focus: 'all'
  });

  console.log(`Found ${analysis.insights.length} insights`);
  console.log(`Cost: $${analysis.costUsed.toFixed(2)}`);

  // Generate weekly brief
  const brief = await engine.generateWeeklyBrief('storytailor');
  console.log(`\nBrief generated for week of ${brief.weekOf}`);

  // Pre-launch memo
  const memo = await engine.generatePreLaunchMemo('storytailor', {
    name: 'Quick Story Mode',
    description: 'Fast-path story creation in 3 taps',
    targetAudience: 'parents',
    successMetrics: ['completion_rate', 'time_to_story']
  });

  console.log(`\nPre-launch memo: ${memo.recommendation} (${Math.round(memo.confidence * 100)}% confidence)`);

  // Challenge another agent
  const challenge = await engine.challengeAgent(
    'storytailor',
    'content-agent',
    'Why are princess stories showing low retention?'
  );

  console.log(`\nChallenge synthesis: ${challenge.synthesis.substring(0, 100)}...`);

  await engine.shutdown();
}

/**
 * Example 2: SDK client usage
 */
async function example2_SDKClient() {
  console.log('\n=== Example 2: SDK Client Usage ===\n');

  const client = new FieldnotesClient({
    apiUrl: 'http://localhost:3000',
    apiKey: process.env.FIELDNOTES_API_KEY || 'test-key'
  });

  // Analyze behavior
  const insights = await client.analyze({
    timeframe: 'week',
    focus: 'all'
  });

  console.log(`Insights via SDK: ${insights.insights.length}`);

  // Pre-launch memo
  const memo = await client.preLaunchMemo({
    name: 'Voice Preview',
    description: 'Preview character voices before story creation',
    targetAudience: 'parents',
    successMetrics: ['feature_usage', 'conversion_rate']
  });

  console.log(`Memo recommendation: ${memo.recommendation}`);

  // Get usage statistics
  const usage = await client.getUsage('storytailor');
  console.log(`\nCurrent month cost: $${usage.totalCost}`);
}

/**
 * Example 3: Configuration
 */
function example3_Configuration() {
  console.log('\n=== Example 3: Tenant Configuration ===\n');

  console.log('Storytailor Configuration:');
  console.log(`- Tenant ID: ${storytailorConfig.tenantId}`);
  console.log(`- Buyer Persona: ${storytailorConfig.personas.buyer.name}`);
  console.log(`- User Persona: ${storytailorConfig.personas.endUser.name}`);
  console.log(`- Tracks: ${storytailorConfig.tracks.length}`);
  console.log(`- Cost Limit: $${storytailorConfig.models.costLimit}/month`);
  console.log(`- Delivery: Slack=${storytailorConfig.delivery.slack?.enabled}, Email=${storytailorConfig.delivery.email?.enabled}`);
}

/**
 * Run examples
 */
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || '3';

  try {
    switch (example) {
      case '1':
        await example1_DirectEngine();
        break;
      case '2':
        await example2_SDKClient();
        break;
      case '3':
        example3_Configuration();
        break;
      default:
        console.log('Usage: node example.js [1|2|3]');
        console.log('  1 - Direct engine usage');
        console.log('  2 - SDK client usage (requires API server running)');
        console.log('  3 - Configuration example');
    }
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

main();
