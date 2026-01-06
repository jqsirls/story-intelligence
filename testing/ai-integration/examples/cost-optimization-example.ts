import { CostOptimizationSystem } from '../CostOptimizationSystem';
import { CostTrackingMiddleware } from '../CostTrackingMiddleware';
import { CostAlertingSystem } from '../CostAlertingSystem';
import { CostAnalyticsDashboard } from '../CostAnalyticsDashboard';

/**
 * Comprehensive example demonstrating the cost optimization and monitoring system
 * for AI integration testing in the Storytailor platform.
 */

// Mock AI service clients for demonstration
class MockOpenAIClient {
  async generateStory(prompt: string, options: { model: string; maxTokens: number }): Promise<{
    story: string;
    usage: { totalTokens: number };
    model: string;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate different costs based on model
    const tokenCount = options.maxTokens * (0.7 + Math.random() * 0.3);
    
    return {
      story: `Generated story with ${Math.floor(tokenCount)} tokens using ${options.model}`,
      usage: { totalTokens: Math.floor(tokenCount) },
      model: options.model
    };
  }
}

class MockElevenLabsClient {
  async synthesizeVoice(text: string, voiceId: string): Promise<{
    audioUrl: string;
    duration: number;
    voiceId: string;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate audio duration based on text length
    const duration = text.length * 0.1; // ~0.1 seconds per character
    
    return {
      audioUrl: `https://api.elevenlabs.io/audio/${Date.now()}.mp3`,
      duration,
      voiceId
    };
  }
}

// Enhanced AI service wrapper with cost optimization
class OptimizedAIService {
  private openaiClient: MockOpenAIClient;
  private elevenLabsClient: MockElevenLabsClient;
  private costMiddleware: CostTrackingMiddleware;

  constructor(costMiddleware: CostTrackingMiddleware) {
    this.openaiClient = new MockOpenAIClient();
    this.elevenLabsClient = new MockElevenLabsClient();
    this.costMiddleware = costMiddleware;
  }

  async generateStory(
    prompt: string,
    qualityRequirement: number = 0.85,
    maxCost?: number
  ): Promise<{ story: string; cost: number; model: string }> {
    // Get optimal model based on quality and cost requirements
    const optimalModel = this.costMiddleware.getOptimalModel('openai', qualityRequirement, maxCost);
    const model = optimalModel || 'gpt-3.5-turbo'; // Fallback to cheaper model

    console.log(`🤖 Generating story with model: ${model} (quality requirement: ${qualityRequirement})`);

    const result = await this.costMiddleware.wrapServiceCall(
      {
        service: 'openai',
        operation: 'story-generation',
        model,
        timestamp: new Date(),
        requestId: `story_${Date.now()}`
      },
      async () => {
        return await this.openaiClient.generateStory(prompt, {
          model,
          maxTokens: 500
        });
      },
      {
        cacheable: true,
        cacheKey: `story_${Buffer.from(prompt).toString('base64').slice(0, 20)}`,
        cacheTTL: 3600 // Cache for 1 hour
      }
    );

    return {
      story: result.data.story,
      cost: result.metrics.cost,
      model: result.data.model
    };
  }

  async synthesizeVoice(
    text: string,
    voiceId: string = 'default'
  ): Promise<{ audioUrl: string; cost: number; duration: number }> {
    console.log(`🎵 Synthesizing voice for ${text.length} characters`);

    const result = await this.costMiddleware.wrapServiceCall(
      {
        service: 'elevenlabs',
        operation: 'voice-synthesis',
        timestamp: new Date(),
        requestId: `voice_${Date.now()}`
      },
      async () => {
        return await this.elevenLabsClient.synthesizeVoice(text, voiceId);
      },
      {
        cacheable: true,
        cacheKey: `voice_${Buffer.from(text + voiceId).toString('base64').slice(0, 20)}`,
        cacheTTL: 7200 // Cache for 2 hours
      }
    );

    return {
      audioUrl: result.data.audioUrl,
      cost: result.metrics.cost,
      duration: result.data.duration
    };
  }

  async generateCompleteStory(
    prompt: string,
    voiceId?: string
  ): Promise<{
    story: string;
    audioUrl: string;
    totalCost: number;
    breakdown: { textCost: number; voiceCost: number };
  }> {
    console.log(`📚 Generating complete story for prompt: "${prompt.slice(0, 50)}..."`);

    // Generate story text
    const storyResult = await this.generateStory(prompt, 0.85, 0.05);
    
    // Generate voice narration
    const voiceResult = await this.synthesizeVoice(storyResult.story, voiceId);

    const totalCost = storyResult.cost + voiceResult.cost;

    console.log(`✅ Complete story generated - Total cost: $${totalCost.toFixed(4)}`);

    return {
      story: storyResult.story,
      audioUrl: voiceResult.audioUrl,
      totalCost,
      breakdown: {
        textCost: storyResult.cost,
        voiceCost: voiceResult.cost
      }
    };
  }

  async batchGenerateStories(
    prompts: string[],
    qualityRequirement: number = 0.85
  ): Promise<Array<{ story: string; cost: number; model: string }>> {
    console.log(`📦 Batch generating ${prompts.length} stories`);

    const requests = prompts.map(prompt => ({
      service: 'openai' as const,
      operation: 'story-generation' as const,
      timestamp: new Date(),
      requestId: `batch_story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }));

    const results = await this.costMiddleware.batchRequests(
      requests,
      async (batchRequests) => {
        // Simulate batch processing with some delay between requests
        const batchResults = [];
        for (const request of batchRequests) {
          const prompt = prompts[requests.indexOf(request)];
          const result = await this.openaiClient.generateStory(prompt, {
            model: 'gpt-3.5-turbo',
            maxTokens: 500
          });
          batchResults.push(result);
          
          // Small delay between batch items
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return batchResults;
      },
      {
        maxBatchSize: 5,
        batchDelay: 200
      }
    );

    return results.map(result => ({
      story: result.data.story,
      cost: result.metrics.cost,
      model: result.data.model
    }));
  }
}

// Main demonstration function
async function demonstrateCostOptimization(): Promise<void> {
  console.log('🚀 Starting Cost Optimization and Monitoring Demo\n');

  // Initialize the cost optimization system
  const costOptimizer = new CostOptimizationSystem();
  const costMiddleware = new CostTrackingMiddleware(costOptimizer);
  const alertingSystem = new CostAlertingSystem(costOptimizer);
  const dashboard = new CostAnalyticsDashboard(costOptimizer, alertingSystem);

  // Set up custom cost thresholds
  costOptimizer.setCostThreshold({
    service: 'openai',
    operation: 'story-generation',
    dailyLimit: 10.00,
    monthlyLimit: 200.00,
    alertThreshold: 75
  });

  costOptimizer.setCostThreshold({
    service: 'elevenlabs',
    operation: 'voice-synthesis',
    dailyLimit: 5.00,
    monthlyLimit: 100.00,
    alertThreshold: 80
  });

  // Set up alert handlers
  alertingSystem.on('alertTriggered', (alert) => {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.log(`   Service: ${alert.service}${alert.operation ? ` (${alert.operation})` : ''}`);
    console.log(`   Details:`, JSON.stringify(alert.details, null, 2));
  });

  costOptimizer.on('thresholdExceeded', (event) => {
    console.log(`⚠️  Cost threshold exceeded for ${event.service}:`);
    console.log(`   Current: $${event.current.toFixed(4)}, Threshold: $${event.threshold.toFixed(4)}`);
  });

  costOptimizer.on('modelOptimized', (event) => {
    console.log(`🎯 Model optimized for ${event.service}: ${event.selected.model}`);
    console.log(`   Quality: ${event.selected.qualityScore}, Cost: $${event.selected.costPerRequest}`);
  });

  // Initialize the optimized AI service
  const aiService = new OptimizedAIService(costMiddleware);

  console.log('📊 Initial Dashboard Metrics:');
  console.log(JSON.stringify(dashboard.getCurrentMetrics(), null, 2));
  console.log('\n');

  try {
    // Demonstrate single story generation with optimization
    console.log('=== Single Story Generation ===');
    const singleStory = await aiService.generateStory(
      'Tell me a story about a brave little mouse who discovers a magical cheese castle.',
      0.90, // High quality requirement
      0.02  // Max cost constraint
    );
    console.log(`Story generated: ${singleStory.story.slice(0, 100)}...`);
    console.log(`Cost: $${singleStory.cost.toFixed(4)}, Model: ${singleStory.model}\n`);

    // Demonstrate complete story generation (text + voice)
    console.log('=== Complete Story Generation ===');
    const completeStory = await aiService.generateCompleteStory(
      'Create a bedtime story about a sleepy dragon who helps children fall asleep.',
      'child-friendly-voice'
    );
    console.log(`Complete story cost: $${completeStory.totalCost.toFixed(4)}`);
    console.log(`Breakdown - Text: $${completeStory.breakdown.textCost.toFixed(4)}, Voice: $${completeStory.breakdown.voiceCost.toFixed(4)}\n`);

    // Demonstrate batch processing
    console.log('=== Batch Story Generation ===');
    const batchPrompts = [
      'A story about a curious cat exploring a library.',
      'An adventure of a young wizard learning magic.',
      'A tale of friendship between a robot and a bird.',
      'A story about a magical garden that grows dreams.'
    ];

    const batchStories = await aiService.batchGenerateStories(batchPrompts, 0.80);
    const totalBatchCost = batchStories.reduce((sum, story) => sum + story.cost, 0);
    console.log(`Batch generated ${batchStories.length} stories for $${totalBatchCost.toFixed(4)}`);
    console.log(`Average cost per story: $${(totalBatchCost / batchStories.length).toFixed(4)}\n`);

    // Demonstrate caching effectiveness
    console.log('=== Cache Effectiveness Test ===');
    console.log('Generating same story twice to test caching...');
    
    const cacheTestPrompt = 'Tell me about a magical unicorn in an enchanted forest.';
    
    const firstCall = await aiService.generateStory(cacheTestPrompt, 0.85);
    console.log(`First call cost: $${firstCall.cost.toFixed(4)}`);
    
    const secondCall = await aiService.generateStory(cacheTestPrompt, 0.85);
    console.log(`Second call cost: $${secondCall.cost.toFixed(4)} (should be $0.0000 if cached)`);
    
    const cacheSavings = firstCall.cost - secondCall.cost;
    console.log(`Cache savings: $${cacheSavings.toFixed(4)}\n`);

    // Show updated dashboard metrics
    console.log('=== Updated Dashboard Metrics ===');
    const updatedMetrics = dashboard.getCurrentMetrics();
    console.log(`Total cost: $${updatedMetrics.totalCost.toFixed(4)}`);
    console.log(`Cache efficiency: ${updatedMetrics.cacheEfficiency.toFixed(1)}%`);
    console.log(`Cost savings: $${updatedMetrics.costSavings.toFixed(4)}`);
    console.log(`Active alerts: ${updatedMetrics.alertCount}`);
    console.log('\nTop services by cost:');
    updatedMetrics.topServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.service}: $${service.cost.toFixed(4)} (${service.percentage.toFixed(1)}%)`);
    });

    // Generate cost forecasts
    console.log('\n=== Cost Forecasts ===');
    const forecasts = dashboard.generateCostForecasts();
    forecasts.forEach(forecast => {
      console.log(`${forecast.service}:`);
      console.log(`  Current monthly run rate: $${forecast.currentMonthlyRun.toFixed(2)}`);
      console.log(`  Projected monthly cost: $${forecast.projectedMonthlyCost.toFixed(2)}`);
      console.log(`  Trend: ${forecast.trend} (confidence: ${(forecast.confidence * 100).toFixed(1)}%)`);
      console.log(`  Factors: ${forecast.factors.join(', ')}`);
    });

    // Generate optimization recommendations
    console.log('\n=== Optimization Recommendations ===');
    const recommendations = dashboard.generateOptimizationRecommendations();
    recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.description}`);
      console.log(`   Estimated savings: $${rec.estimatedSavings.toFixed(4)}`);
      console.log(`   Effort: ${rec.effort}, Priority: ${rec.priority.toFixed(1)}`);
      console.log(`   Implementation: ${rec.implementation}`);
    });

    // Generate efficiency report
    console.log('\n=== Efficiency Report ===');
    const efficiencyReport = dashboard.generateEfficiencyReport();
    console.log(`Overall efficiency: ${efficiencyReport.overallEfficiency.toFixed(1)}%`);
    console.log('Service efficiency:');
    Object.entries(efficiencyReport.serviceEfficiency).forEach(([service, efficiency]) => {
      console.log(`  ${service}: ${efficiency.toFixed(1)}%`);
    });

    // Show cache statistics
    console.log('\n=== Cache Statistics ===');
    const cacheStats = costMiddleware.getCacheStatistics();
    console.log(`Total cache entries: ${cacheStats.totalEntries}`);
    console.log(`Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Total cost saved: $${cacheStats.costSaved.toFixed(4)}`);

    // Export dashboard data
    console.log('\n=== Exporting Dashboard Data ===');
    const exportedData = dashboard.exportDashboardData('json');
    console.log(`Exported ${exportedData.length} characters of dashboard data`);

    // Demonstrate real-time monitoring (brief example)
    console.log('\n=== Real-time Monitoring Demo ===');
    console.log('Starting 10-second real-time monitoring...');
    
    const unsubscribe = dashboard.subscribeToRealTimeUpdates((metrics) => {
      console.log(`📊 Real-time update - Total cost: $${metrics.totalCost.toFixed(4)}, Alerts: ${metrics.alertCount}`);
    });

    // Generate some activity during monitoring
    setTimeout(async () => {
      await aiService.generateStory('A quick test story for real-time monitoring.', 0.80);
    }, 3000);

    setTimeout(() => {
      unsubscribe();
      console.log('Real-time monitoring stopped.\n');
    }, 10000);

    // Test alert system by exceeding thresholds
    console.log('=== Testing Alert System ===');
    console.log('Generating high-cost operations to trigger alerts...');
    
    // Generate multiple expensive operations to trigger threshold alerts
    for (let i = 0; i < 3; i++) {
      await aiService.generateCompleteStory(
        `Expensive test story ${i + 1} with a very long prompt that will generate more tokens and cost more money to process through the AI systems.`,
        'premium-voice'
      );
    }

    // Wait a moment for alerts to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Show final alert status
    const activeAlerts = alertingSystem.getActiveAlerts();
    console.log(`\n📊 Final Status: ${activeAlerts.length} active alerts`);
    
    const alertStats = alertingSystem.getAlertingStatistics('daily');
    console.log(`Total alerts today: ${alertStats.totalAlerts}`);
    console.log('Alerts by severity:', alertStats.alertsBySeverity);

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  }

  console.log('\n🎉 Cost Optimization and Monitoring Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Real-time cost tracking for AI services');
  console.log('✅ Intelligent caching for cost optimization');
  console.log('✅ Model selection optimization based on cost/quality requirements');
  console.log('✅ Batch request processing for efficiency');
  console.log('✅ Cost threshold monitoring and alerting');
  console.log('✅ Comprehensive analytics and forecasting');
  console.log('✅ Optimization recommendations');
  console.log('✅ Real-time dashboard metrics');
  console.log('✅ Data export capabilities');
}

// Run the demonstration
if (require.main === module) {
  demonstrateCostOptimization().catch(console.error);
}

export {
  OptimizedAIService,
  MockOpenAIClient,
  MockElevenLabsClient,
  demonstrateCostOptimization
};