import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

import { Database } from '@alexa-multi-agent/shared-types';
import { AnalyticsConfig, ABTestFramework, ABTestResults } from '../types';

export class ABTestingFramework {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: AnalyticsConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing ABTestingFramework');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ABTestingFramework');
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const { error } = await this.supabase
        .from('ab_tests')
        .select('count')
        .limit(1);

      return error ? 'degraded' : 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Create a new A/B test
   */
  async createTest(testConfig: Omit<ABTestFramework, 'testId'>): Promise<ABTestFramework> {
    try {
      const testId = uuidv4();
      
      // Validate test configuration
      this.validateTestConfig(testConfig);

      const test: ABTestFramework = {
        testId,
        ...testConfig,
        status: 'draft'
      };

      // Store test configuration
      await this.storeTestConfig(test);

      this.logger.info('A/B test created', { testId, testName: test.testName });

      return test;

    } catch (error) {
      this.logger.error('Failed to create A/B test:', error);
      throw error;
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    try {
      const test = await this.getTestConfig(testId);
      
      if (test.status !== 'draft') {
        throw new Error(`Cannot start test in status: ${test.status}`);
      }

      // Update test status
      await this.updateTestStatus(testId, 'running');

      // Initialize test tracking
      await this.initializeTestTracking(testId);

      this.logger.info('A/B test started', { testId });

    } catch (error) {
      this.logger.error('Failed to start A/B test:', error);
      throw error;
    }
  }

  /**
   * Stop an A/B test and analyze results
   */
  async stopTest(testId: string): Promise<ABTestResults> {
    try {
      const test = await this.getTestConfig(testId);
      
      if (test.status !== 'running') {
        throw new Error(`Cannot stop test in status: ${test.status}`);
      }

      // Update test status
      await this.updateTestStatus(testId, 'completed');

      // Analyze results
      const results = await this.analyzeTestResults(testId, test);

      // Store results
      await this.storeTestResults(testId, results);

      this.logger.info('A/B test stopped and analyzed', { testId, winner: results.winner });

      return results;

    } catch (error) {
      this.logger.error('Failed to stop A/B test:', error);
      throw error;
    }
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<ABTestResults> {
    try {
      const { data, error } = await this.supabase
        .from('ab_test_results')
        .select('*')
        .eq('test_id', testId)
        .single();

      if (error || !data) {
        throw new Error(`Test results not found: ${testId}`);
      }

      return data.results;

    } catch (error) {
      this.logger.error('Failed to get test results:', error);
      throw error;
    }
  }

  /**
   * Assign user to test variant
   */
  async assignUserToVariant(userId: string, testId: string): Promise<string> {
    try {
      // Check if user is already assigned
      const existingAssignment = await this.getUserAssignment(userId, testId);
      if (existingAssignment) {
        return existingAssignment;
      }

      const test = await this.getTestConfig(testId);
      
      if (test.status !== 'running') {
        throw new Error(`Test is not running: ${testId}`);
      }

      // Check if user meets segmentation criteria
      const meetsSegmentation = await this.checkSegmentation(userId, test.segmentation);
      if (!meetsSegmentation) {
        throw new Error('User does not meet test segmentation criteria');
      }

      // Assign variant based on allocation
      const variantId = this.assignVariant(userId, test.variants);

      // Store assignment
      await this.storeUserAssignment(userId, testId, variantId);

      // Track assignment event
      await this.trackAssignmentEvent(userId, testId, variantId);

      this.logger.info('User assigned to variant', { userId, testId, variantId });

      return variantId;

    } catch (error) {
      this.logger.error('Failed to assign user to variant:', error);
      throw error;
    }
  }

  /**
   * Track conversion event
   */
  async trackConversion(userId: string, testId: string, metricName: string, value?: number): Promise<void> {
    try {
      const assignment = await this.getUserAssignment(userId, testId);
      if (!assignment) {
        throw new Error('User not assigned to test');
      }

      // Store conversion event
      await this.storeConversionEvent(userId, testId, assignment, metricName, value);

      // Update real-time metrics
      await this.updateRealTimeMetrics(testId, assignment, metricName, value);

      this.logger.info('Conversion tracked', { userId, testId, metricName, value });

    } catch (error) {
      this.logger.error('Failed to track conversion:', error);
      throw error;
    }
  }

  /**
   * Process test results for all running tests
   */
  async processTestResults(): Promise<void> {
    try {
      const { data: runningTests, error } = await this.supabase
        .from('ab_tests')
        .select('*')
        .eq('status', 'running');

      if (error) {
        throw new Error(`Failed to get running tests: ${error.message}`);
      }

      for (const test of runningTests || []) {
        await this.processTestResult(test);
      }

    } catch (error) {
      this.logger.error('Failed to process test results:', error);
      throw error;
    }
  }

  private validateTestConfig(config: Omit<ABTestFramework, 'testId'>): void {
    if (!config.testName || !config.hypothesis) {
      throw new Error('Test name and hypothesis are required');
    }

    if (!config.variants || config.variants.length < 2) {
      throw new Error('At least 2 variants are required');
    }

    const totalAllocation = config.variants.reduce((sum, v) => sum + v.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Variant allocations must sum to 100%');
    }

    if (!config.targetMetrics || config.targetMetrics.length === 0) {
      throw new Error('At least one target metric is required');
    }
  }

  private async storeTestConfig(test: ABTestFramework): Promise<void> {
    const { error } = await this.supabase
      .from('ab_tests')
      .insert({
        test_id: test.testId,
        test_name: test.testName,
        hypothesis: test.hypothesis,
        variants: test.variants,
        target_metrics: test.targetMetrics,
        segmentation: test.segmentation,
        status: test.status,
        start_date: test.startDate,
        end_date: test.endDate,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store test config: ${error.message}`);
    }
  }

  private async getTestConfig(testId: string): Promise<ABTestFramework> {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .select('*')
      .eq('test_id', testId)
      .single();

    if (error || !data) {
      throw new Error(`Test not found: ${testId}`);
    }

    return {
      testId: data.test_id,
      testName: data.test_name,
      hypothesis: data.hypothesis,
      variants: data.variants,
      targetMetrics: data.target_metrics,
      segmentation: data.segmentation,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      results: data.results
    };
  }

  private async updateTestStatus(testId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('ab_tests')
      .update({ 
        status,
        ...(status === 'running' ? { start_date: new Date().toISOString() } : {}),
        ...(status === 'completed' ? { end_date: new Date().toISOString() } : {})
      })
      .eq('test_id', testId);

    if (error) {
      throw new Error(`Failed to update test status: ${error.message}`);
    }
  }

  private async initializeTestTracking(testId: string): Promise<void> {
    // Initialize Redis counters for real-time tracking
    const test = await this.getTestConfig(testId);
    
    for (const variant of test.variants) {
      const key = `${this.config.redis.keyPrefix}:ab_test:${testId}:${variant.variantId}`;
      await this.redis.hSet(key, {
        participants: '0',
        conversions: '0'
      });
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
    }
  }

  private async checkSegmentation(userId: string, segmentation: any[]): Promise<boolean> {
    if (!segmentation || segmentation.length === 0) {
      return true; // No segmentation criteria
    }

    // Get user data
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return false;
    }

    // Check each segmentation criteria
    for (const criteria of segmentation) {
      const userValue = user[criteria.criteria];
      if (!criteria.values.includes(userValue)) {
        return false;
      }
    }

    return true;
  }

  private assignVariant(userId: string, variants: any[]): string {
    // Use consistent hashing for stable assignment
    const hash = this.hashUserId(userId);
    const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
    
    let cumulativeAllocation = 0;
    for (const variant of variants) {
      cumulativeAllocation += variant.allocation / 100;
      if (hashValue <= cumulativeAllocation) {
        return variant.variantId;
      }
    }
    
    // Fallback to last variant
    return variants[variants.length - 1].variantId;
  }

  private hashUserId(userId: string): string {
    return createHash('md5').update(userId).digest('hex');
  }

  private async getUserAssignment(userId: string, testId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('ab_test_assignments')
      .select('variant_id')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .single();

    return error ? null : data?.variant_id || null;
  }

  private async storeUserAssignment(userId: string, testId: string, variantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ab_test_assignments')
      .insert({
        user_id: userId,
        test_id: testId,
        variant_id: variantId,
        assigned_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store user assignment: ${error.message}`);
    }
  }

  private async trackAssignmentEvent(userId: string, testId: string, variantId: string): Promise<void> {
    // Update Redis counter
    const key = `${this.config.redis.keyPrefix}:ab_test:${testId}:${variantId}`;
    await this.redis.hIncrBy(key, 'participants', 1);

    // Store event
    await this.supabase
      .from('ab_test_events')
      .insert({
        user_id: userId,
        test_id: testId,
        variant_id: variantId,
        event_type: 'assignment',
        created_at: new Date().toISOString()
      });
  }

  private async storeConversionEvent(
    userId: string,
    testId: string,
    variantId: string,
    metricName: string,
    value?: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('ab_test_events')
      .insert({
        user_id: userId,
        test_id: testId,
        variant_id: variantId,
        event_type: 'conversion',
        metric_name: metricName,
        metric_value: value,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store conversion event: ${error.message}`);
    }
  }

  private async updateRealTimeMetrics(
    testId: string,
    variantId: string,
    metricName: string,
    value?: number
  ): Promise<void> {
    const key = `${this.config.redis.keyPrefix}:ab_test:${testId}:${variantId}`;
    await this.redis.hIncrBy(key, 'conversions', 1);
    
    if (value !== undefined) {
      await this.redis.hIncrByFloat(key, `${metricName}_sum`, value);
    }
  }

  private async analyzeTestResults(testId: string, test: ABTestFramework): Promise<ABTestResults> {
    // Get test data
    const { data: assignments, error: assignmentError } = await this.supabase
      .from('ab_test_assignments')
      .select('*')
      .eq('test_id', testId);

    if (assignmentError) {
      throw new Error(`Failed to get assignments: ${assignmentError.message}`);
    }

    const { data: events, error: eventError } = await this.supabase
      .from('ab_test_events')
      .select('*')
      .eq('test_id', testId)
      .eq('event_type', 'conversion');

    if (eventError) {
      throw new Error(`Failed to get events: ${eventError.message}`);
    }

    // Analyze each variant
    const variantResults = test.variants.map(variant => {
      const variantAssignments = assignments?.filter(a => a.variant_id === variant.variantId) || [];
      const variantConversions = events?.filter(e => e.variant_id === variant.variantId) || [];

      const participants = variantAssignments.length;
      const conversions = variantConversions.length;
      const conversionRate = participants > 0 ? conversions / participants : 0;

      // Calculate metrics
      const metrics = test.targetMetrics.map(targetMetric => {
        const metricEvents = variantConversions.filter(e => e.metric_name === targetMetric.metric);
        const metricValue = metricEvents.reduce((sum, e) => sum + (e.metric_value || 1), 0);
        
        return {
          metric: targetMetric.metric,
          value: metricValue,
          confidence: this.calculateConfidence(participants, conversions),
          significantDifference: false // Will be calculated later
        };
      });

      return {
        variantId: variant.variantId,
        participants,
        conversions,
        conversionRate,
        metrics
      };
    });

    // Determine winner and statistical significance
    const winner = this.determineWinner(variantResults);
    const confidence = this.calculateOverallConfidence(variantResults);
    const statisticalSignificance = this.checkStatisticalSignificance(variantResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(variantResults, winner, statisticalSignificance);

    return {
      testId,
      variants: variantResults,
      winner,
      confidence,
      statisticalSignificance,
      recommendations,
      analyzedAt: new Date().toISOString()
    };
  }

  private calculateConfidence(participants: number, conversions: number): number {
    if (participants === 0) return 0;
    
    // Simple confidence calculation based on sample size
    const conversionRate = conversions / participants;
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / participants);
    
    // Return confidence as a percentage (simplified)
    return Math.min(95, Math.max(50, 95 - (standardError * 100)));
  }

  private determineWinner(variantResults: any[]): string | undefined {
    if (variantResults.length === 0) return undefined;
    
    // Find variant with highest conversion rate
    const winner = variantResults.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    return winner.variantId;
  }

  private calculateOverallConfidence(variantResults: any[]): number {
    if (variantResults.length === 0) return 0;
    
    const avgConfidence = variantResults.reduce((sum, variant) => {
      const variantConfidence = variant.metrics.reduce((metricSum: number, metric: any) => 
        metricSum + metric.confidence, 0) / variant.metrics.length;
      return sum + variantConfidence;
    }, 0) / variantResults.length;

    return avgConfidence;
  }

  private checkStatisticalSignificance(variantResults: any[]): boolean {
    // Simplified statistical significance check
    // In a real implementation, this would use proper statistical tests
    
    if (variantResults.length < 2) return false;
    
    const totalParticipants = variantResults.reduce((sum, v) => sum + v.participants, 0);
    const minSampleSize = 100; // Minimum sample size for significance
    
    return totalParticipants >= minSampleSize;
  }

  private generateRecommendations(
    variantResults: any[],
    winner: string | undefined,
    significant: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!significant) {
      recommendations.push('Test did not reach statistical significance. Consider running longer or increasing sample size.');
    }

    if (winner && significant) {
      recommendations.push(`Implement variant ${winner} as it showed the best performance.`);
    }

    if (variantResults.some(v => v.participants < 50)) {
      recommendations.push('Some variants had low sample sizes. Consider more balanced traffic allocation.');
    }

    return recommendations;
  }

  private async storeTestResults(testId: string, results: ABTestResults): Promise<void> {
    const { error } = await this.supabase
      .from('ab_test_results')
      .insert({
        test_id: testId,
        results,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store test results: ${error.message}`);
    }

    // Update test record with results
    await this.supabase
      .from('ab_tests')
      .update({ results })
      .eq('test_id', testId);
  }

  private async processTestResult(test: any): Promise<void> {
    try {
      // Check if test should be automatically stopped
      const shouldStop = await this.shouldStopTest(test);
      
      if (shouldStop) {
        await this.stopTest(test.test_id);
      } else {
        // Update interim results
        const interimResults = await this.analyzeTestResults(test.test_id, test);
        await this.updateInterimResults(test.test_id, interimResults);
      }

    } catch (error) {
      this.logger.error(`Failed to process test result for ${test.test_id}:`, error);
    }
  }

  private async shouldStopTest(test: any): Promise<boolean> {
    // Check if test has reached end date
    if (test.end_date && new Date() > new Date(test.end_date)) {
      return true;
    }

    // Check if test has reached statistical significance with sufficient confidence
    const results = await this.analyzeTestResults(test.test_id, test);
    
    return results.statisticalSignificance && results.confidence > 95;
  }

  private async updateInterimResults(testId: string, results: ABTestResults): Promise<void> {
    await this.supabase
      .from('ab_tests')
      .update({ 
        interim_results: results,
        updated_at: new Date().toISOString()
      })
      .eq('test_id', testId);
  }
}