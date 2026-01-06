import { Logger } from 'winston';
import { ContentSafetyRequest, ContentSafetyResult, HumanEscalationTrigger } from '../types';
export declare class HumanEscalationManager {
    private webhookUrl?;
    private logger;
    private escalationTriggers;
    constructor(webhookUrl: string | undefined, logger: Logger);
    private initializeEscalationTriggers;
    escalateForReview(result: ContentSafetyResult, request: ContentSafetyRequest): Promise<void>;
    private sendEscalation;
    private getHighestPriority;
    private estimateReviewTime;
    private generateEscalationId;
    getEscalationStats(): Promise<{
        totalEscalations: number;
        escalationsByPriority: Record<string, number>;
        escalationsByTrigger: Record<string, number>;
        averageResponseTime: number;
    }>;
    addCustomEscalationTrigger(trigger: HumanEscalationTrigger): void;
    removeEscalationTrigger(triggerName: string): void;
    getActiveEscalationTriggers(): Array<{
        name: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
    }>;
}
//# sourceMappingURL=HumanEscalationManager.d.ts.map