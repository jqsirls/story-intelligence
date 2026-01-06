import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface DataSubjectRequest {
  requestId: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  metadata: Record<string, any>;
  completedAt?: number;
  rejectionReason?: string;
}

export interface DataExportResult {
  exportId: string;
  userId: string;
  format: 'json' | 'xml' | 'csv';
  data: any;
  generatedAt: number;
  expiresAt: number;
  downloadUrl?: string;
  checksum: string;
}

export interface DataDeletionResult {
  deletionId: string;
  userId: string;
  deletedDataTypes: string[];
  deletionTimestamp: number;
  verificationHash: string;
  retentionExceptions: Array<{
    dataType: string;
    reason: string;
    legalBasis: string;
    retentionUntil: number;
  }>;
}

export class DataSubjectRightsService extends EventEmitter {
  private pendingRequests: Map<string, DataSubjectRequest> = new Map();
  private completedRequests: Map<string, DataSubjectRequest> = new Map();
  private dataProviders: Map<string, DataProvider> = new Map();

  constructor() {
    super();
    this.setupAutomatedProcessing();
  }

  /**
   * Submits a data subject rights request
   */
  async submitRequest(
    userId: string,
    requestType: DataSubjectRequest['requestType'],
    metadata: Record<string, any> = {}
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      requestId: this.generateRequestId(),
      userId,
      requestType,
      timestamp: Date.now(),
      status: 'pending',
      metadata
    };

    this.pendingRequests.set(request.requestId, request);
    this.emit('requestSubmitted', request);

    // Start automated processing
    setImmediate(() => this.processRequest(request.requestId));

    return request;
  }

  /**
   * Processes a data subject rights request automatically
   */
  private async processRequest(requestId: string): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) return;

    try {
      request.status = 'processing';
      this.emit('requestProcessing', request);

      switch (request.requestType) {
        case 'access':
          await this.processAccessRequest(request);
          break;
        case 'portability':
          await this.processPortabilityRequest(request);
          break;
        case 'erasure':
          await this.processErasureRequest(request);
          break;
        case 'rectification':
          await this.processRectificationRequest(request);
          break;
        case 'restriction':
          await this.processRestrictionRequest(request);
          break;
        case 'objection':
          await this.processObjectionRequest(request);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.requestType}`);
      }

      request.status = 'completed';
      request.completedAt = Date.now();
      this.completedRequests.set(requestId, request);
      this.pendingRequests.delete(requestId);
      this.emit('requestCompleted', request);

    } catch (error) {
      request.status = 'rejected';
      request.rejectionReason = error instanceof Error ? error.message : String(error);
      request.completedAt = Date.now();
      this.completedRequests.set(requestId, request);
      this.pendingRequests.delete(requestId);
      this.emit('requestRejected', request);
    }
  }

  /**
   * Processes data access request (Article 15 GDPR)
   */
  private async processAccessRequest(request: DataSubjectRequest): Promise<void> {
    const userData = await this.collectUserData(request.userId);
    
    const accessReport = {
      userId: request.userId,
      requestId: request.requestId,
      generatedAt: Date.now(),
      personalData: userData.personalData,
      processingPurposes: userData.processingPurposes,
      dataCategories: userData.dataCategories,
      recipients: userData.recipients,
      retentionPeriods: userData.retentionPeriods,
      dataSource: userData.dataSource,
      automatedDecisionMaking: userData.automatedDecisionMaking,
      thirdCountryTransfers: userData.thirdCountryTransfers
    };

    request.metadata.accessReport = accessReport;
  }

  /**
   * Processes data portability request (Article 20 GDPR)
   */
  private async processPortabilityRequest(request: DataSubjectRequest): Promise<void> {
    const format = request.metadata.format || 'json';
    const exportResult = await this.exportUserData(request.userId, format);
    
    request.metadata.exportResult = exportResult;
  }

  /**
   * Processes data erasure request (Article 17 GDPR)
   */
  private async processErasureRequest(request: DataSubjectRequest): Promise<void> {
    const deletionResult = await this.deleteUserData(request.userId, request.metadata.dataTypes);
    
    request.metadata.deletionResult = deletionResult;
  }

  /**
   * Processes data rectification request (Article 16 GDPR)
   */
  private async processRectificationRequest(request: DataSubjectRequest): Promise<void> {
    const corrections = request.metadata.corrections;
    if (!corrections) {
      throw new Error('No corrections specified for rectification request');
    }

    const rectificationResult = await this.rectifyUserData(request.userId, corrections);
    request.metadata.rectificationResult = rectificationResult;
  }

  /**
   * Processes processing restriction request (Article 18 GDPR)
   */
  private async processRestrictionRequest(request: DataSubjectRequest): Promise<void> {
    const restrictionResult = await this.restrictProcessing(
      request.userId, 
      request.metadata.dataTypes,
      request.metadata.reason
    );
    
    request.metadata.restrictionResult = restrictionResult;
  }

  /**
   * Processes objection to processing request (Article 21 GDPR)
   */
  private async processObjectionRequest(request: DataSubjectRequest): Promise<void> {
    const objectionResult = await this.processObjection(
      request.userId,
      request.metadata.processingPurposes,
      request.metadata.objectionReason
    );
    
    request.metadata.objectionResult = objectionResult;
  }

  /**
   * Exports user data in machine-readable format
   */
  async exportUserData(userId: string, format: 'json' | 'xml' | 'csv' = 'json'): Promise<DataExportResult> {
    const userData = await this.collectUserData(userId);
    
    let exportData: any;
    switch (format) {
      case 'json':
        exportData = JSON.stringify(userData, null, 2);
        break;
      case 'xml':
        exportData = this.convertToXML(userData);
        break;
      case 'csv':
        exportData = this.convertToCSV(userData);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const checksum = crypto.createHash('sha256').update(exportData).digest('hex');
    
    const exportResult: DataExportResult = {
      exportId: this.generateExportId(),
      userId,
      format,
      data: exportData,
      generatedAt: Date.now(),
      expiresAt: Date.now() + (72 * 60 * 60 * 1000), // 72 hours
      checksum
    };

    // In production, this would upload to secure storage and provide download URL
    exportResult.downloadUrl = `https://secure-exports.storytailor.com/${exportResult.exportId}`;

    return exportResult;
  }

  /**
   * Deletes user data with verification
   */
  async deleteUserData(userId: string, dataTypes?: string[]): Promise<DataDeletionResult> {
    const deletedTypes: string[] = [];
    const retentionExceptions: DataDeletionResult['retentionExceptions'] = [];

    // Get all data providers
    for (const [providerName, provider] of this.dataProviders.entries()) {
      try {
        const result = await provider.deleteUserData(userId, dataTypes);
        deletedTypes.push(...result.deletedTypes);
        retentionExceptions.push(...result.retentionExceptions);
      } catch (error) {
        console.error(`Failed to delete data from provider ${providerName}:`, error);
      }
    }

    const deletionRecord = {
      userId,
      deletedTypes,
      timestamp: Date.now()
    };

    const verificationHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(deletionRecord))
      .digest('hex');

    return {
      deletionId: this.generateDeletionId(),
      userId,
      deletedDataTypes: [...new Set(deletedTypes)],
      deletionTimestamp: Date.now(),
      verificationHash,
      retentionExceptions
    };
  }

  /**
   * Collects all user data from registered providers
   */
  private async collectUserData(userId: string): Promise<any> {
    const userData: any = {
      userId,
      personalData: {},
      processingPurposes: [],
      dataCategories: [],
      recipients: [],
      retentionPeriods: {},
      dataSource: 'user_provided',
      automatedDecisionMaking: [],
      thirdCountryTransfers: []
    };

    for (const [providerName, provider] of this.dataProviders.entries()) {
      try {
        const providerData = await provider.getUserData(userId);
        userData.personalData[providerName] = providerData.data;
        userData.processingPurposes.push(...providerData.purposes);
        userData.dataCategories.push(...providerData.categories);
        userData.recipients.push(...providerData.recipients);
        userData.retentionPeriods[providerName] = providerData.retentionPeriod;
        userData.automatedDecisionMaking.push(...providerData.automatedDecisions);
        userData.thirdCountryTransfers.push(...providerData.thirdCountryTransfers);
      } catch (error) {
        console.error(`Failed to collect data from provider ${providerName}:`, error);
      }
    }

    return userData;
  }

  /**
   * Rectifies user data
   */
  private async rectifyUserData(userId: string, corrections: Record<string, any>): Promise<any> {
    const results: any = {};

    for (const [providerName, provider] of this.dataProviders.entries()) {
      try {
        const result = await provider.rectifyUserData(userId, corrections);
        results[providerName] = result;
      } catch (error) {
        console.error(`Failed to rectify data in provider ${providerName}:`, error);
        results[providerName] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return results;
  }

  /**
   * Restricts processing of user data
   */
  private async restrictProcessing(userId: string, dataTypes?: string[], reason?: string): Promise<any> {
    const results: any = {};

    for (const [providerName, provider] of this.dataProviders.entries()) {
      try {
        const result = await provider.restrictProcessing(userId, dataTypes, reason);
        results[providerName] = result;
      } catch (error) {
        console.error(`Failed to restrict processing in provider ${providerName}:`, error);
        results[providerName] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return results;
  }

  /**
   * Processes objection to data processing
   */
  private async processObjection(userId: string, purposes?: string[], reason?: string): Promise<any> {
    const results: any = {};

    for (const [providerName, provider] of this.dataProviders.entries()) {
      try {
        const result = await provider.processObjection(userId, purposes, reason);
        results[providerName] = result;
      } catch (error) {
        console.error(`Failed to process objection in provider ${providerName}:`, error);
        results[providerName] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return results;
  }

  /**
   * Registers a data provider
   */
  registerDataProvider(name: string, provider: DataProvider): void {
    this.dataProviders.set(name, provider);
  }

  /**
   * Gets request status
   */
  getRequestStatus(requestId: string): DataSubjectRequest | undefined {
    return this.pendingRequests.get(requestId) || this.completedRequests.get(requestId);
  }

  /**
   * Gets all requests for a user
   */
  getUserRequests(userId: string): DataSubjectRequest[] {
    const requests: DataSubjectRequest[] = [];
    
    for (const request of this.pendingRequests.values()) {
      if (request.userId === userId) {
        requests.push(request);
      }
    }
    
    for (const request of this.completedRequests.values()) {
      if (request.userId === userId) {
        requests.push(request);
      }
    }
    
    return requests.sort((a, b) => b.timestamp - a.timestamp);
  }

  private cleanupTimer?: NodeJS.Timeout;
  private monitoringTimer?: NodeJS.Timeout;

  /**
   * Sets up automated processing workflows
   */
  private setupAutomatedProcessing(): void {
    // Automated cleanup of expired exports
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredExports();
    }, 60 * 60 * 1000); // Every hour

    // Automated request processing monitoring
    this.monitoringTimer = setInterval(() => {
      this.monitorPendingRequests();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Cleanup method to clear intervals
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
  }

  /**
   * Cleans up expired data exports
   */
  private cleanupExpiredExports(): void {
    // This would clean up expired export files in production
    this.emit('exportsCleanup', { timestamp: Date.now() });
  }

  /**
   * Monitors pending requests for SLA compliance
   */
  private monitorPendingRequests(): void {
    const now = Date.now();
    const slaThreshold = 72 * 60 * 60 * 1000; // 72 hours

    for (const request of this.pendingRequests.values()) {
      if (now - request.timestamp > slaThreshold) {
        this.emit('slaViolation', request);
      }
    }
  }

  /**
   * Converts data to XML format
   */
  private convertToXML(data: any): string {
    // Simple XML conversion - in production would use proper XML library
    return `<?xml version="1.0" encoding="UTF-8"?>
<userData>
  <exportedAt>${new Date().toISOString()}</exportedAt>
  <data>${JSON.stringify(data)}</data>
</userData>`;
  }

  /**
   * Converts data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production would use proper CSV library
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).map(v => JSON.stringify(v)).join(',');
    return `${headers}\n${values}`;
  }

  /**
   * Generates unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generates unique export ID
   */
  private generateExportId(): string {
    return `exp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generates unique deletion ID
   */
  private generateDeletionId(): string {
    return `del_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

/**
 * Interface for data providers to implement
 */
export interface DataProvider {
  getUserData(userId: string): Promise<{
    data: any;
    purposes: string[];
    categories: string[];
    recipients: string[];
    retentionPeriod: number;
    automatedDecisions: string[];
    thirdCountryTransfers: string[];
  }>;

  deleteUserData(userId: string, dataTypes?: string[]): Promise<{
    deletedTypes: string[];
    retentionExceptions: Array<{
      dataType: string;
      reason: string;
      legalBasis: string;
      retentionUntil: number;
    }>;
  }>;

  rectifyUserData(userId: string, corrections: Record<string, any>): Promise<any>;
  restrictProcessing(userId: string, dataTypes?: string[], reason?: string): Promise<any>;
  processObjection(userId: string, purposes?: string[], reason?: string): Promise<any>;
}