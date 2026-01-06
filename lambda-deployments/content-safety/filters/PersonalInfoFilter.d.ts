import { Logger } from 'winston';
import { ContentSafetyRequest, PreGenerationFilter, PreGenerationFilterResult } from '../types';
export declare class PersonalInfoFilter implements PreGenerationFilter {
    name: string;
    priority: number;
    enabled: boolean;
    private logger;
    constructor(logger: Logger);
    filter(request: ContentSafetyRequest): Promise<PreGenerationFilterResult>;
    private detectPhoneNumbers;
    private detectEmails;
    private detectSSNs;
    private detectCreditCards;
    private detectAddresses;
    private detectPotentialNames;
    private detectBirthDates;
    private detectSuspiciousUrls;
    private detectFinancialInfo;
    private sanitizePhoneNumbers;
    private sanitizeEmails;
    private sanitizeSSNs;
    private sanitizeCreditCards;
    private sanitizeAddresses;
    private sanitizeBirthDates;
    private sanitizeSuspiciousUrls;
    private sanitizeFinancialInfo;
    private isValidCreditCard;
}
//# sourceMappingURL=PersonalInfoFilter.d.ts.map