/**
 * Test Orchestrator for Coordinated AI Service Testing
 * Manages parallel test execution with isolation, cleanup, and progress reporting
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface TestCase {
  id: string;
  name: string;
  service: string;
  priority: number;
  timeout: number;
  dependencies: string[];
  testFunction: () => Promise<TestResult>;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TestSuite {
  id: string;
  name: string;
  tests: TestCase[];
  parallel: boolean;
  maxConcurrency: number;
}

export interface OrchestrationConfig {
  maxConcurrentTests: number;
  defaultTimeout: number;
  retryAttempts: number;
  cleanupTimeout: number;
  progressReporting: boolean;
}

export class TestRunner extends EventEmitter {
  private config: OrchestrationConfig;
  private runningTests: Map<string, Promise<TestResult>>;
  private completedTests: Map<string, TestResult>;
  private failedTests: Set<string>;

  constructor(config: OrchestrationConfig) {
    super();
    this.config = config;
    this.runningTests = new Map();
    this.completedTests = new Map();
    this.failedTests = new Set();
  }

  /**
   * Execute a single test with isolation and cleanup
   */
  async executeTest(testCase: TestCase): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      this.emit('testStarted', { testId: testCase.id, name: testCase.name });
      
      // Set up test isolation
      await this.setupTestIsolation(testCase);
      
      // Execute test with timeout
      const result = await Promise.race([
        testCase.testFunction(),
        this.createTimeoutPromise(testCase.timeout || this.config.defaultTimeout)
      ]);
      
      const duration = performance.now() - startTime;
      
      // Cleanup test environment
      await this.cleanupTest(testCase);
      
      const testResult: TestResult = {
        testId: testCase.id,
        passed: result.passed,
        duration,
        error: result.error,
        metadata: result.metadata
      };
      
      this.completedTests.set(testCase.id, testResult);
      this.emit('testCompleted', testResult);
      
      return testResult;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Ensure cleanup even on failure
      await this.cleanupTest(testCase).catch(console.error);
      
      const testResult: TestResult = {
        testId: testCase.id,
        passed: false,
        duration,
        error: error.message
      };
      
      this.failedTests.add(testCase.id);
      this.completedTests.set(testCase.id, testResult);
      this.emit('testFailed', testResult);
      
      return testResult;
    }
  }

  /**
   * Execute tests with dependency resolution
   */
  async executeTestsWithDependencies(tests: TestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const dependencyGraph = this.buildDependencyGraph(tests);
    const executionOrder = this.topologicalSort(dependencyGraph);
    
    for (const testId of executionOrder) {
      const test = tests.find(t => t.id === testId);
      if (!test) continue;
      
      // Wait for dependencies to complete
      await this.waitForDependencies(test.dependencies);
      
      const result = await this.executeTest(test);
      results.push(result);
      
      // If test failed and has dependents, mark them as skipped
      if (!result.passed) {
        this.markDependentsAsSkipped(testId, dependencyGraph, tests);
      }
    }
    
    return results;
  }

  /**
   * Set up test isolation environment
   */
  private async setupTestIsolation(testCase: TestCase): Promise<void> {
    // Create isolated test environment
    const isolationId = `test-${testCase.id}-${Date.now()}`;
    
    // Set environment variables for test isolation
    process.env[`TEST_ISOLATION_ID`] = isolationId;
    process.env[`TEST_SERVICE`] = testCase.service;
    
    // Initialize test-specific resources
    this.emit('isolationSetup', { testId: testCase.id, isolationId });
  }

  /**
   * Clean up test environment
   */
  private async cleanupTest(testCase: TestCase): Promise<void> {
    try {
      // Clean up test-specific resources
      delete process.env[`TEST_ISOLATION_ID`];
      delete process.env[`TEST_SERVICE`];
      
      // Emit cleanup event for external cleanup handlers
      this.emit('testCleanup', { testId: testCase.id });
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Cleanup failed for test ${testCase.id}:`, error);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<TestResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(tests: TestCase[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const test of tests) {
      graph.set(test.id, test.dependencies || []);
    }
    
    return graph;
  }

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    
    const visit = (node: string) => {
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }
      
      if (visited.has(node)) return;
      
      visiting.add(node);
      
      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };
    
    for (const node of graph.keys()) {
      visit(node);
    }
    
    return result;
  }

  /**
   * Wait for test dependencies to complete
   */
  private async waitForDependencies(dependencies: string[]): Promise<void> {
    for (const depId of dependencies) {
      if (this.failedTests.has(depId)) {
        throw new Error(`Dependency ${depId} failed`);
      }
      
      // Wait for dependency to complete
      while (!this.completedTests.has(depId)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Mark dependent tests as skipped
   */
  private markDependentsAsSkipped(failedTestId: string, graph: Map<string, string[]>, tests: TestCase[]): void {
    for (const [testId, dependencies] of graph.entries()) {
      if (dependencies.includes(failedTestId)) {
        const skippedResult: TestResult = {
          testId,
          passed: false,
          duration: 0,
          error: `Skipped due to failed dependency: ${failedTestId}`
        };
        
        this.completedTests.set(testId, skippedResult);
        this.emit('testSkipped', skippedResult);
      }
    }
  }
}

export class ResultsManager {
  private results: Map<string, TestResult[]>;
  private suiteMetadata: Map<string, any>;

  constructor() {
    this.results = new Map();
    this.suiteMetadata = new Map();
  }

  /**
   * Add test results for a suite
   */
  addSuiteResults(suiteId: string, results: TestResult[], metadata?: any): void {
    this.results.set(suiteId, results);
    if (metadata) {
      this.suiteMetadata.set(suiteId, metadata);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): {
    summary: {
      totalSuites: number;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      totalDuration: number;
      successRate: number;
    };
    suiteResults: Array<{
      suiteId: string;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
      tests: TestResult[];
    }>;
    failedTests: TestResult[];
  } {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDuration = 0;
    const allFailedTests: TestResult[] = [];
    const suiteResults: Array<{
      suiteId: string;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
      tests: TestResult[];
    }> = [];

    for (const [suiteId, results] of this.results.entries()) {
      let suitePassed = 0;
      let suiteFailed = 0;
      let suiteSkipped = 0;
      let suiteDuration = 0;

      for (const result of results) {
        totalTests++;
        suiteDuration += result.duration;
        
        if (result.error?.includes('Skipped')) {
          skippedTests++;
          suiteSkipped++;
        } else if (result.passed) {
          passedTests++;
          suitePassed++;
        } else {
          failedTests++;
          suiteFailed++;
          allFailedTests.push(result);
        }
      }

      totalDuration += suiteDuration;
      
      suiteResults.push({
        suiteId,
        passed: suitePassed,
        failed: suiteFailed,
        skipped: suiteSkipped,
        duration: suiteDuration,
        tests: results
      });
    }

    return {
      summary: {
        totalSuites: this.results.size,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        totalDuration,
        successRate: totalTests > 0 ? passedTests / totalTests : 0
      },
      suiteResults,
      failedTests: allFailedTests
    };
  }

  /**
   * Export results to JSON
   */
  exportToJSON(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get results for specific suite
   */
  getSuiteResults(suiteId: string): TestResult[] | undefined {
    return this.results.get(suiteId);
  }
}

export class TestOrchestrator extends EventEmitter {
  private runner: TestRunner;
  private resultsManager: ResultsManager;
  private config: OrchestrationConfig;

  constructor(config: OrchestrationConfig = {
    maxConcurrentTests: 10,
    defaultTimeout: 30000,
    retryAttempts: 3,
    cleanupTimeout: 5000,
    progressReporting: true
  }) {
    super();
    this.config = config;
    this.runner = new TestRunner(config);
    this.resultsManager = new ResultsManager();
    
    this.setupEventHandlers();
  }

  /**
   * Execute test suite with parallel execution support
   */
  async executeSuite(suite: TestSuite): Promise<TestResult[]> {
    this.emit('suiteStarted', { suiteId: suite.id, name: suite.name });
    
    let results: TestResult[];
    
    if (suite.parallel) {
      results = await this.executeParallelTests(suite.tests, suite.maxConcurrency);
    } else {
      results = await this.executeSequentialTests(suite.tests);
    }
    
    this.resultsManager.addSuiteResults(suite.id, results, {
      name: suite.name,
      parallel: suite.parallel,
      maxConcurrency: suite.maxConcurrency
    });
    
    this.emit('suiteCompleted', { suiteId: suite.id, results });
    
    return results;
  }

  /**
   * Execute multiple test suites
   */
  async executeMultipleSuites(suites: TestSuite[]): Promise<Map<string, TestResult[]>> {
    const allResults = new Map<string, TestResult[]>();
    
    for (const suite of suites) {
      const results = await this.executeSuite(suite);
      allResults.set(suite.id, results);
    }
    
    return allResults;
  }

  /**
   * Get comprehensive test report
   */
  getReport(): ReturnType<ResultsManager['generateReport']> {
    return this.resultsManager.generateReport();
  }

  /**
   * Execute tests in parallel with concurrency control
   */
  private async executeParallelTests(tests: TestCase[], maxConcurrency: number): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const executing: Promise<TestResult>[] = [];
    
    for (const test of tests) {
      // Wait if we've reached max concurrency
      if (executing.length >= maxConcurrency) {
        const completed = await Promise.race(executing);
        results.push(completed);
        
        // Remove completed test from executing array
        const index = executing.findIndex(p => p === Promise.resolve(completed));
        if (index > -1) executing.splice(index, 1);
      }
      
      // Start new test
      const testPromise = this.runner.executeTest(test);
      executing.push(testPromise);
    }
    
    // Wait for remaining tests
    const remainingResults = await Promise.all(executing);
    results.push(...remainingResults);
    
    return results;
  }

  /**
   * Execute tests sequentially
   */
  private async executeSequentialTests(tests: TestCase[]): Promise<TestResult[]> {
    return await this.runner.executeTestsWithDependencies(tests);
  }

  /**
   * Set up event handlers for progress reporting
   */
  private setupEventHandlers(): void {
    if (this.config.progressReporting) {
      this.runner.on('testStarted', (data) => {
        console.log(`🧪 Starting test: ${data.name} (${data.testId})`);
      });
      
      this.runner.on('testCompleted', (result) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} Test ${result.testId} completed in ${result.duration.toFixed(2)}ms`);
      });
      
      this.runner.on('testFailed', (result) => {
        console.error(`❌ Test ${result.testId} failed: ${result.error}`);
      });
      
      this.runner.on('testSkipped', (result) => {
        console.log(`⏭️  Test ${result.testId} skipped: ${result.error}`);
      });
    }
  }
}