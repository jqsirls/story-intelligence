import { DifferentialPrivacyConfig } from '../types';
import { EventEmitter } from 'events';

export interface PrivacyBudgetAllocation {
  queryId: string;
  epsilon: number;
  delta: number;
  timestamp: number;
  queryType: string;
  sensitivity: number;
}

export interface EpsilonDeltaGuarantee {
  epsilon: number;
  delta: number;
  isValid: boolean;
  explanation: string;
}

export class DifferentialPrivacyService extends EventEmitter {
  private config: DifferentialPrivacyConfig;
  private privacyBudgetUsed: number = 0;
  private deltaUsed: number = 0;
  private budgetAllocations: PrivacyBudgetAllocation[] = [];
  private queryCount: number = 0;

  constructor(config: DifferentialPrivacyConfig) {
    super();
    this.config = config;
  }

  /**
   * Adds Laplace noise to numerical data for differential privacy
   */
  addLaplaceNoise(value: number, sensitivity: number = this.config.sensitivity): number {
    const scale = sensitivity / this.config.epsilon;
    const noise = this.sampleLaplace(scale);
    this.privacyBudgetUsed += this.config.epsilon;
    return value + noise;
  }

  /**
   * Adds Gaussian noise to numerical data for differential privacy
   */
  addGaussianNoise(value: number, sensitivity: number = this.config.sensitivity): number {
    const sigma = Math.sqrt(2 * Math.log(1.25 / this.config.delta)) * sensitivity / this.config.epsilon;
    const noise = this.sampleGaussian(0, sigma);
    this.privacyBudgetUsed += this.config.epsilon;
    return value + noise;
  }

  /**
   * Applies exponential mechanism for categorical data
   */
  exponentialMechanism<T>(
    candidates: T[],
    utilityFunction: (candidate: T) => number,
    sensitivity: number = this.config.sensitivity
  ): T {
    const scores = candidates.map(candidate => {
      const utility = utilityFunction(candidate);
      const score = Math.exp((this.config.epsilon * utility) / (2 * sensitivity));
      return { candidate, score };
    });

    const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
    const probabilities = scores.map(item => item.score / totalScore);

    const random = Math.random();
    let cumulativeProbability = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        this.privacyBudgetUsed += this.config.epsilon;
        return scores[i].candidate;
      }
    }

    // Fallback to last candidate
    this.privacyBudgetUsed += this.config.epsilon;
    return candidates[candidates.length - 1];
  }

  /**
   * Applies differential privacy to count queries
   */
  privatizeCount(trueCount: number): number {
    switch (this.config.mechanism) {
      case 'laplace':
        return Math.max(0, Math.round(this.addLaplaceNoise(trueCount, 1)));
      case 'gaussian':
        return Math.max(0, Math.round(this.addGaussianNoise(trueCount, 1)));
      default:
        throw new Error(`Unsupported mechanism: ${this.config.mechanism}`);
    }
  }

  /**
   * Applies differential privacy to histogram data
   */
  privatizeHistogram(histogram: Record<string, number>): Record<string, number> {
    const privatizedHistogram: Record<string, number> = {};
    
    for (const [key, count] of Object.entries(histogram)) {
      privatizedHistogram[key] = this.privatizeCount(count);
    }

    return privatizedHistogram;
  }

  /**
   * Applies differential privacy to average calculations
   */
  privatizeAverage(values: number[], range: [number, number]): number {
    if (values.length === 0) return 0;

    const clampedValues = values.map(v => Math.max(range[0], Math.min(range[1], v)));
    const sum = clampedValues.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    
    const sensitivity = (range[1] - range[0]) / values.length;
    return this.addLaplaceNoise(average, sensitivity);
  }

  /**
   * Checks if privacy budget allows for more queries
   */
  canMakeQuery(requiredEpsilon: number = this.config.epsilon): boolean {
    return this.privacyBudgetUsed + requiredEpsilon <= this.config.epsilon * 10; // Allow 10x budget
  }

  /**
   * Resets privacy budget (should be done periodically)
   */
  resetPrivacyBudget(): void {
    this.privacyBudgetUsed = 0;
  }

  /**
   * Validates epsilon-delta guarantees for a query
   */
  validateEpsilonDeltaGuarantee(
    requestedEpsilon: number,
    requestedDelta: number,
    queryType: string,
    sensitivity: number
  ): EpsilonDeltaGuarantee {
    const wouldExceedEpsilon = this.privacyBudgetUsed + requestedEpsilon > this.config.epsilon;
    const wouldExceedDelta = this.deltaUsed + requestedDelta > this.config.delta;

    let isValid = true;
    let explanation = 'Query satisfies epsilon-delta differential privacy guarantees';

    if (wouldExceedEpsilon) {
      isValid = false;
      explanation = `Query would exceed epsilon budget (${this.privacyBudgetUsed + requestedEpsilon} > ${this.config.epsilon})`;
    } else if (wouldExceedDelta) {
      isValid = false;
      explanation = `Query would exceed delta budget (${this.deltaUsed + requestedDelta} > ${this.config.delta})`;
    } else if (requestedEpsilon <= 0 || requestedDelta < 0) {
      isValid = false;
      explanation = 'Invalid epsilon or delta values (epsilon must be > 0, delta must be >= 0)';
    } else if (sensitivity <= 0) {
      isValid = false;
      explanation = 'Sensitivity must be positive';
    }

    return {
      epsilon: requestedEpsilon,
      delta: requestedDelta,
      isValid,
      explanation
    };
  }

  /**
   * Adds noise with epsilon-delta guarantees
   */
  addNoiseWithGuarantees(
    value: number,
    queryType: string,
    sensitivity: number = this.config.sensitivity,
    requestedEpsilon: number = this.config.epsilon / 10,
    requestedDelta: number = this.config.delta / 10
  ): {
    noisyValue: number;
    guarantee: EpsilonDeltaGuarantee;
    queryId: string;
  } {
    const guarantee = this.validateEpsilonDeltaGuarantee(
      requestedEpsilon,
      requestedDelta,
      queryType,
      sensitivity
    );

    if (!guarantee.isValid) {
      throw new Error(`Privacy guarantee validation failed: ${guarantee.explanation}`);
    }

    const queryId = this.generateQueryId();
    let noisyValue: number;

    // Use Gaussian mechanism for (epsilon, delta)-DP
    if (requestedDelta > 0) {
      const sigma = Math.sqrt(2 * Math.log(1.25 / requestedDelta)) * sensitivity / requestedEpsilon;
      noisyValue = value + this.sampleGaussian(0, sigma);
    } else {
      // Pure epsilon-DP using Laplace mechanism
      const scale = sensitivity / requestedEpsilon;
      noisyValue = value + this.sampleLaplace(scale);
    }

    // Record budget usage
    this.recordBudgetUsage(queryId, requestedEpsilon, requestedDelta, queryType, sensitivity);

    this.emit('queryProcessed', {
      queryId,
      queryType,
      epsilon: requestedEpsilon,
      delta: requestedDelta,
      sensitivity,
      budgetRemaining: this.getPrivacyBudgetUsage()
    });

    return {
      noisyValue,
      guarantee,
      queryId
    };
  }

  /**
   * Applies advanced composition for multiple queries
   */
  composePrivacyBudgets(allocations: PrivacyBudgetAllocation[]): {
    totalEpsilon: number;
    totalDelta: number;
    compositionType: 'basic' | 'advanced' | 'optimal';
    isValid: boolean;
  } {
    const totalEpsilon = allocations.reduce((sum, alloc) => sum + alloc.epsilon, 0);
    const totalDelta = allocations.reduce((sum, alloc) => sum + alloc.delta, 0);

    // Advanced composition theorem
    const k = allocations.length;
    const maxEpsilon = Math.max(...allocations.map(a => a.epsilon));
    
    let composedEpsilon: number;
    let composedDelta: number;
    let compositionType: 'basic' | 'advanced' | 'optimal';

    if (k <= 10) {
      // Basic composition for small number of queries
      composedEpsilon = totalEpsilon;
      composedDelta = totalDelta;
      compositionType = 'basic';
    } else if (maxEpsilon <= 1) {
      // Advanced composition for many small queries
      const advancedEpsilon = Math.sqrt(2 * k * Math.log(1 / this.config.delta)) * maxEpsilon + k * maxEpsilon * (Math.exp(maxEpsilon) - 1);
      composedEpsilon = Math.min(totalEpsilon, advancedEpsilon);
      composedDelta = k * this.config.delta;
      compositionType = 'advanced';
    } else {
      // Optimal composition (simplified)
      composedEpsilon = totalEpsilon;
      composedDelta = totalDelta;
      compositionType = 'optimal';
    }

    const isValid = composedEpsilon <= this.config.epsilon && composedDelta <= this.config.delta;

    return {
      totalEpsilon: composedEpsilon,
      totalDelta: composedDelta,
      compositionType,
      isValid
    };
  }

  /**
   * Implements the sparse vector technique for threshold queries
   */
  sparseVectorTechnique(
    queries: Array<() => number>,
    threshold: number,
    maxAnswers: number = 1,
    epsilon: number = this.config.epsilon / 2
  ): {
    results: Array<{ queryIndex: number; result: 'above' | 'below'; noisyValue?: number }>;
    budgetUsed: number;
  } {
    const results: Array<{ queryIndex: number; result: 'above' | 'below'; noisyValue?: number }> = [];
    const noisyThreshold = threshold + this.sampleLaplace(2 / epsilon);
    let answersGiven = 0;
    let budgetUsed = epsilon / 2; // For threshold noise

    for (let i = 0; i < queries.length && answersGiven < maxAnswers; i++) {
      const queryResult = queries[i]();
      const noisyResult = queryResult + this.sampleLaplace(4 / epsilon);
      budgetUsed += epsilon / (2 * queries.length);

      if (noisyResult >= noisyThreshold) {
        results.push({
          queryIndex: i,
          result: 'above',
          noisyValue: noisyResult
        });
        answersGiven++;
      } else {
        results.push({
          queryIndex: i,
          result: 'below'
        });
      }
    }

    this.privacyBudgetUsed += budgetUsed;
    return { results, budgetUsed };
  }

  /**
   * Implements the exponential mechanism with utility functions
   */
  exponentialMechanismAdvanced<T>(
    candidates: T[],
    utilityFunction: (candidate: T, data: any) => number,
    data: any,
    sensitivity: number = this.config.sensitivity,
    epsilon: number = this.config.epsilon / 10
  ): {
    selectedCandidate: T;
    utility: number;
    probability: number;
    queryId: string;
  } {
    const guarantee = this.validateEpsilonDeltaGuarantee(epsilon, 0, 'exponential_mechanism', sensitivity);
    if (!guarantee.isValid) {
      throw new Error(`Privacy guarantee validation failed: ${guarantee.explanation}`);
    }

    const queryId = this.generateQueryId();
    const utilities = candidates.map(candidate => utilityFunction(candidate, data));
    const maxUtility = Math.max(...utilities);

    // Normalize utilities to prevent overflow
    const normalizedUtilities = utilities.map(u => u - maxUtility);
    
    const scores = normalizedUtilities.map(utility => 
      Math.exp((epsilon * utility) / (2 * sensitivity))
    );

    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const probabilities = scores.map(score => score / totalScore);

    // Sample according to probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedIndex = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        selectedIndex = i;
        break;
      }
    }

    this.recordBudgetUsage(queryId, epsilon, 0, 'exponential_mechanism', sensitivity);

    return {
      selectedCandidate: candidates[selectedIndex],
      utility: utilities[selectedIndex],
      probability: probabilities[selectedIndex],
      queryId
    };
  }

  /**
   * Implements private aggregation with noise calibrated to sensitivity
   */
  privateAggregation(
    values: number[],
    aggregationType: 'sum' | 'mean' | 'count' | 'max' | 'min',
    range?: [number, number],
    epsilon: number = this.config.epsilon / 10
  ): {
    result: number;
    sensitivity: number;
    noiseStdDev: number;
    queryId: string;
  } {
    if (values.length === 0) {
      throw new Error('Cannot aggregate empty array');
    }

    let result: number;
    let sensitivity: number;

    switch (aggregationType) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        sensitivity = range ? range[1] - range[0] : Math.max(...values) - Math.min(...values);
        break;
      
      case 'mean':
        result = values.reduce((a, b) => a + b, 0) / values.length;
        sensitivity = range ? (range[1] - range[0]) / values.length : 
                     (Math.max(...values) - Math.min(...values)) / values.length;
        break;
      
      case 'count':
        result = values.length;
        sensitivity = 1;
        break;
      
      case 'max':
        result = Math.max(...values);
        sensitivity = range ? range[1] - range[0] : Math.max(...values) - Math.min(...values);
        break;
      
      case 'min':
        result = Math.min(...values);
        sensitivity = range ? range[1] - range[0] : Math.max(...values) - Math.min(...values);
        break;
      
      default:
        throw new Error(`Unsupported aggregation type: ${aggregationType}`);
    }

    const guarantee = this.validateEpsilonDeltaGuarantee(epsilon, 0, `private_${aggregationType}`, sensitivity);
    if (!guarantee.isValid) {
      throw new Error(`Privacy guarantee validation failed: ${guarantee.explanation}`);
    }

    const queryId = this.generateQueryId();
    const scale = sensitivity / epsilon;
    const noise = this.sampleLaplace(scale);
    const noisyResult = result + noise;

    this.recordBudgetUsage(queryId, epsilon, 0, `private_${aggregationType}`, sensitivity);

    return {
      result: noisyResult,
      sensitivity,
      noiseStdDev: scale * Math.sqrt(2),
      queryId
    };
  }

  /**
   * Gets current privacy budget usage with detailed breakdown
   */
  getPrivacyBudgetUsage(): { 
    epsilonUsed: number; 
    deltaUsed: number;
    epsilonTotal: number;
    deltaTotal: number;
    epsilonRemaining: number;
    deltaRemaining: number;
    queryCount: number;
    allocations: PrivacyBudgetAllocation[];
  } {
    return {
      epsilonUsed: this.privacyBudgetUsed,
      deltaUsed: this.deltaUsed,
      epsilonTotal: this.config.epsilon,
      deltaTotal: this.config.delta,
      epsilonRemaining: this.config.epsilon - this.privacyBudgetUsed,
      deltaRemaining: this.config.delta - this.deltaUsed,
      queryCount: this.queryCount,
      allocations: [...this.budgetAllocations]
    };
  }

  /**
   * Records budget usage for a query
   */
  private recordBudgetUsage(
    queryId: string,
    epsilon: number,
    delta: number,
    queryType: string,
    sensitivity: number
  ): void {
    this.privacyBudgetUsed += epsilon;
    this.deltaUsed += delta;
    this.queryCount++;

    const allocation: PrivacyBudgetAllocation = {
      queryId,
      epsilon,
      delta,
      timestamp: Date.now(),
      queryType,
      sensitivity
    };

    this.budgetAllocations.push(allocation);

    // Emit budget warning if running low
    const epsilonRatio = this.privacyBudgetUsed / this.config.epsilon;
    const deltaRatio = this.deltaUsed / this.config.delta;

    if (epsilonRatio > 0.8 || deltaRatio > 0.8) {
      this.emit('budgetWarning', {
        epsilonRatio,
        deltaRatio,
        remaining: this.getPrivacyBudgetUsage()
      });
    }

    if (epsilonRatio >= 1.0 || deltaRatio >= 1.0) {
      this.emit('budgetExhausted', {
        epsilonRatio,
        deltaRatio,
        queryId
      });
    }
  }

  /**
   * Generates a unique query ID
   */
  private generateQueryId(): string {
    return `dp_query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Samples from Laplace distribution
   */
  private sampleLaplace(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Samples from Gaussian distribution using Box-Muller transform
   */
  private sampleGaussian(mean: number, stddev: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stddev + mean;
  }
}