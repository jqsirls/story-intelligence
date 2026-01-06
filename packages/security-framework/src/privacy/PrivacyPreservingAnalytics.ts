import { DifferentialPrivacyService } from './DifferentialPrivacyService';
import { PIIDetectionService } from './PIIDetectionService';
import * as crypto from 'crypto';

export interface AnalyticsEvent {
  eventId: string;
  userId: string;
  eventType: string;
  timestamp: number;
  properties: Record<string, any>;
  sessionId?: string;
  deviceId?: string;
}

export interface PrivacyPreservingQuery {
  queryId: string;
  queryType: 'count' | 'sum' | 'average' | 'histogram' | 'percentile';
  filters: Record<string, any>;
  groupBy?: string[];
  timeRange?: { start: number; end: number };
  privacyBudget: number;
}

export interface AnalyticsResult {
  queryId: string;
  result: any;
  privacyBudgetUsed: number;
  noiseAdded: boolean;
  confidence: number;
  generatedAt: number;
}

export interface KAnonymityConfig {
  k: number; // Minimum group size
  quasiIdentifiers: string[]; // Fields that could be used for identification
  sensitiveAttributes: string[]; // Fields that need protection
}

export class PrivacyPreservingAnalyticsService {
  private differentialPrivacy: DifferentialPrivacyService;
  private piiDetection: PIIDetectionService;
  private eventStore: Map<string, AnalyticsEvent[]> = new Map();
  private queryCache: Map<string, AnalyticsResult> = new Map();
  private kAnonymityConfig: KAnonymityConfig;

  constructor(
    differentialPrivacyConfig: any,
    kAnonymityConfig: KAnonymityConfig,
    piiHashSalt?: string
  ) {
    this.differentialPrivacy = new DifferentialPrivacyService(differentialPrivacyConfig);
    this.piiDetection = new PIIDetectionService(piiHashSalt);
    this.kAnonymityConfig = kAnonymityConfig;
  }

  /**
   * Ingests analytics events with privacy protection
   */
  async ingestEvent(event: Omit<AnalyticsEvent, 'eventId'>): Promise<void> {
    // Generate event ID
    const eventId = this.generateEventId();
    
    // Sanitize event properties
    const sanitizedProperties = await this.sanitizeProperties(event.properties);
    
    // Apply k-anonymity protection
    const anonymizedEvent: AnalyticsEvent = {
      ...event,
      eventId,
      userId: this.anonymizeUserId(event.userId),
      properties: sanitizedProperties,
      deviceId: event.deviceId ? this.anonymizeDeviceId(event.deviceId) : undefined
    };

    // Store event
    const userEvents = this.eventStore.get(anonymizedEvent.userId) || [];
    userEvents.push(anonymizedEvent);
    this.eventStore.set(anonymizedEvent.userId, userEvents);

    // Apply retention policy
    this.applyRetentionPolicy(anonymizedEvent.userId);
  }

  /**
   * Executes privacy-preserving analytics query
   */
  async executeQuery(query: PrivacyPreservingQuery): Promise<AnalyticsResult> {
    // Check cache first
    const cacheKey = this.generateQueryCacheKey(query);
    const cachedResult = this.queryCache.get(cacheKey);
    if (cachedResult && this.isCacheValid(cachedResult)) {
      return cachedResult;
    }

    // Check privacy budget
    if (!this.differentialPrivacy.canMakeQuery(query.privacyBudget)) {
      throw new Error('Insufficient privacy budget for query');
    }

    // Execute query based on type
    let rawResult: any;
    switch (query.queryType) {
      case 'count':
        rawResult = await this.executeCountQuery(query);
        break;
      case 'sum':
        rawResult = await this.executeSumQuery(query);
        break;
      case 'average':
        rawResult = await this.executeAverageQuery(query);
        break;
      case 'histogram':
        rawResult = await this.executeHistogramQuery(query);
        break;
      case 'percentile':
        rawResult = await this.executePercentileQuery(query);
        break;
      default:
        throw new Error(`Unsupported query type: ${query.queryType}`);
    }

    // Apply differential privacy
    const privatizedResult = this.applyDifferentialPrivacy(rawResult, query);

    // Apply k-anonymity check
    const kAnonymousResult = this.enforceKAnonymity(privatizedResult, query);

    const result: AnalyticsResult = {
      queryId: query.queryId,
      result: kAnonymousResult,
      privacyBudgetUsed: query.privacyBudget,
      noiseAdded: true,
      confidence: this.calculateConfidence(rawResult, kAnonymousResult),
      generatedAt: Date.now()
    };

    // Cache result
    this.queryCache.set(cacheKey, result);

    return result;
  }

  /**
   * Executes count query
   */
  private async executeCountQuery(query: PrivacyPreservingQuery): Promise<number | Record<string, number>> {
    const events = this.getFilteredEvents(query);
    
    if (query.groupBy && query.groupBy.length > 0) {
      const groups = this.groupEvents(events, query.groupBy);
      const counts: Record<string, number> = {};
      
      for (const [groupKey, groupEvents] of groups.entries()) {
        counts[groupKey] = groupEvents.length;
      }
      
      return counts;
    }
    
    return events.length;
  }

  /**
   * Executes sum query
   */
  private async executeSumQuery(query: PrivacyPreservingQuery): Promise<number | Record<string, number>> {
    const events = this.getFilteredEvents(query);
    const sumField = query.filters.sumField;
    
    if (!sumField) {
      throw new Error('Sum field must be specified for sum queries');
    }

    if (query.groupBy && query.groupBy.length > 0) {
      const groups = this.groupEvents(events, query.groupBy);
      const sums: Record<string, number> = {};
      
      for (const [groupKey, groupEvents] of groups.entries()) {
        sums[groupKey] = groupEvents.reduce((sum, event) => {
          const value = this.getNestedProperty(event.properties, sumField);
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      }
      
      return sums;
    }
    
    return events.reduce((sum, event) => {
      const value = this.getNestedProperty(event.properties, sumField);
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }

  /**
   * Executes average query
   */
  private async executeAverageQuery(query: PrivacyPreservingQuery): Promise<number | Record<string, number>> {
    const sumResult = await this.executeSumQuery(query);
    const countResult = await this.executeCountQuery(query);

    if (typeof sumResult === 'object' && typeof countResult === 'object') {
      const averages: Record<string, number> = {};
      for (const key in sumResult) {
        averages[key] = countResult[key] > 0 ? sumResult[key] / countResult[key] : 0;
      }
      return averages;
    }

    return typeof countResult === 'number' && countResult > 0 
      ? (sumResult as number) / countResult 
      : 0;
  }

  /**
   * Executes histogram query
   */
  private async executeHistogramQuery(query: PrivacyPreservingQuery): Promise<Record<string, number>> {
    const events = this.getFilteredEvents(query);
    const histogramField = query.filters.histogramField;
    
    if (!histogramField) {
      throw new Error('Histogram field must be specified for histogram queries');
    }

    const histogram: Record<string, number> = {};
    
    for (const event of events) {
      const value = this.getNestedProperty(event.properties, histogramField);
      const bucketKey = this.getBucketKey(value, query.filters.bucketSize);
      histogram[bucketKey] = (histogram[bucketKey] || 0) + 1;
    }

    return histogram;
  }

  /**
   * Executes percentile query
   */
  private async executePercentileQuery(query: PrivacyPreservingQuery): Promise<number> {
    const events = this.getFilteredEvents(query);
    const percentileField = query.filters.percentileField;
    const percentile = query.filters.percentile || 50;
    
    if (!percentileField) {
      throw new Error('Percentile field must be specified for percentile queries');
    }

    const values = events
      .map(event => this.getNestedProperty(event.properties, percentileField))
      .filter(value => typeof value === 'number')
      .sort((a, b) => a - b);

    if (values.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Applies differential privacy to query results
   */
  private applyDifferentialPrivacy(result: any, query: PrivacyPreservingQuery): any {
    if (typeof result === 'number') {
      return this.differentialPrivacy.addLaplaceNoise(result);
    }

    if (typeof result === 'object' && result !== null) {
      const privatizedResult: any = {};
      for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'number') {
          privatizedResult[key] = this.differentialPrivacy.addLaplaceNoise(value);
        } else {
          privatizedResult[key] = value;
        }
      }
      return privatizedResult;
    }

    return result;
  }

  /**
   * Enforces k-anonymity on query results
   */
  private enforceKAnonymity(result: any, query: PrivacyPreservingQuery): any {
    if (typeof result === 'object' && result !== null) {
      const filteredResult: any = {};
      
      for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'number' && value >= this.kAnonymityConfig.k) {
          filteredResult[key] = value;
        }
        // Suppress groups smaller than k
      }
      
      return filteredResult;
    }

    // For single values, check if they meet k-anonymity requirements
    if (typeof result === 'number' && result < this.kAnonymityConfig.k) {
      return `<${this.kAnonymityConfig.k}`; // Suppress small counts
    }

    return result;
  }

  /**
   * Sanitizes event properties to remove PII
   */
  private async sanitizeProperties(properties: Record<string, any>): Promise<Record<string, any>> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        const piiResult = await this.piiDetection.detectAndRedactPII(value);
        sanitized[key] = piiResult.redactedText;
      } else if (this.kAnonymityConfig.sensitiveAttributes.includes(key)) {
        // Hash sensitive attributes
        sanitized[key] = this.piiDetection.hashPII(String(value));
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Anonymizes user ID using consistent hashing
   */
  private anonymizeUserId(userId: string): string {
    return this.piiDetection.hashPII(userId);
  }

  /**
   * Anonymizes device ID using consistent hashing
   */
  private anonymizeDeviceId(deviceId: string): string {
    return this.piiDetection.hashPII(deviceId);
  }

  /**
   * Gets filtered events based on query criteria
   */
  private getFilteredEvents(query: PrivacyPreservingQuery): AnalyticsEvent[] {
    let events: AnalyticsEvent[] = [];

    // Collect all events
    for (const userEvents of this.eventStore.values()) {
      events.push(...userEvents);
    }

    // Apply filters
    events = events.filter(event => {
      // Time range filter
      if (query.timeRange) {
        if (event.timestamp < query.timeRange.start || event.timestamp > query.timeRange.end) {
          return false;
        }
      }

      // Property filters
      for (const [filterKey, filterValue] of Object.entries(query.filters)) {
        if (filterKey === 'sumField' || filterKey === 'histogramField' || 
            filterKey === 'percentileField' || filterKey === 'bucketSize' || 
            filterKey === 'percentile') {
          continue; // Skip query-specific filters
        }

        const eventValue = this.getNestedProperty(event, filterKey);
        if (eventValue !== filterValue) {
          return false;
        }
      }

      return true;
    });

    return events;
  }

  /**
   * Groups events by specified fields
   */
  private groupEvents(events: AnalyticsEvent[], groupBy: string[]): Map<string, AnalyticsEvent[]> {
    const groups = new Map<string, AnalyticsEvent[]>();

    for (const event of events) {
      const groupKey = groupBy
        .map(field => this.getNestedProperty(event, field))
        .join('|');

      const groupEvents = groups.get(groupKey) || [];
      groupEvents.push(event);
      groups.set(groupKey, groupEvents);
    }

    return groups;
  }

  /**
   * Gets nested property value from object
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Gets bucket key for histogram
   */
  private getBucketKey(value: any, bucketSize: number = 1): string {
    if (typeof value === 'number') {
      const bucket = Math.floor(value / bucketSize) * bucketSize;
      return `${bucket}-${bucket + bucketSize - 1}`;
    }
    return String(value);
  }

  /**
   * Calculates confidence score for results
   */
  private calculateConfidence(rawResult: any, privatizedResult: any): number {
    // Simple confidence calculation based on noise added
    if (typeof rawResult === 'number' && typeof privatizedResult === 'number') {
      const noiseMagnitude = Math.abs(privatizedResult - rawResult);
      const relativeMagnitude = rawResult > 0 ? noiseMagnitude / rawResult : 1;
      return Math.max(0, 1 - relativeMagnitude);
    }
    return 0.8; // Default confidence for complex results
  }

  /**
   * Applies retention policy to user events
   */
  private applyRetentionPolicy(userId: string): void {
    const userEvents = this.eventStore.get(userId);
    if (!userEvents) return;

    const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoffTime = Date.now() - retentionPeriod;

    const filteredEvents = userEvents.filter(event => event.timestamp > cutoffTime);
    
    if (filteredEvents.length !== userEvents.length) {
      this.eventStore.set(userId, filteredEvents);
    }
  }

  /**
   * Generates query cache key
   */
  private generateQueryCacheKey(query: PrivacyPreservingQuery): string {
    const queryString = JSON.stringify({
      queryType: query.queryType,
      filters: query.filters,
      groupBy: query.groupBy,
      timeRange: query.timeRange
    });
    return crypto.createHash('sha256').update(queryString).digest('hex');
  }

  /**
   * Checks if cached result is still valid
   */
  private isCacheValid(result: AnalyticsResult): boolean {
    const cacheValidityPeriod = 60 * 60 * 1000; // 1 hour
    return Date.now() - result.generatedAt < cacheValidityPeriod;
  }

  /**
   * Generates unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Gets privacy budget usage statistics
   */
  getPrivacyBudgetUsage(): any {
    return this.differentialPrivacy.getPrivacyBudgetUsage();
  }

  /**
   * Resets privacy budget (should be done periodically)
   */
  resetPrivacyBudget(): void {
    this.differentialPrivacy.resetPrivacyBudget();
  }

  /**
   * Gets analytics statistics
   */
  getAnalyticsStats(): {
    totalEvents: number;
    uniqueUsers: number;
    queriesExecuted: number;
    cacheHitRate: number;
  } {
    let totalEvents = 0;
    for (const userEvents of this.eventStore.values()) {
      totalEvents += userEvents.length;
    }

    return {
      totalEvents,
      uniqueUsers: this.eventStore.size,
      queriesExecuted: this.queryCache.size,
      cacheHitRate: 0.85 // Mock cache hit rate
    };
  }
}