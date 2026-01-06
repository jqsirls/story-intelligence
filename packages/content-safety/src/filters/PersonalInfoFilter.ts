import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  PreGenerationFilter,
  PreFilterResult
} from '../types';

export class PersonalInfoFilter implements PreGenerationFilter {
  name = 'personal_info_filter';
  priority = 60;
  enabled = true;

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async filter(request: ContentSafetyRequest): Promise<PreFilterResult> {
    this.logger.debug('Running personal info filter', {
      contentType: request.contentType,
      contentLength: request.content.length
    });

    const warnings: string[] = [];
    const modifications: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let sanitizedContent = request.content;

    try {
      // Check for phone numbers
      const phoneNumbers = this.detectPhoneNumbers(request.content);
      if (phoneNumbers.length > 0) {
        warnings.push(`Phone numbers detected: ${phoneNumbers.length} instances`);
        sanitizedContent = this.sanitizePhoneNumbers(sanitizedContent);
        modifications.push('Removed phone numbers');
        riskLevel = 'high';
      }

      // Check for email addresses
      const emails = this.detectEmails(request.content);
      if (emails.length > 0) {
        warnings.push(`Email addresses detected: ${emails.length} instances`);
        sanitizedContent = this.sanitizeEmails(sanitizedContent);
        modifications.push('Removed email addresses');
        riskLevel = 'high';
      }

      // Check for social security numbers
      const ssns = this.detectSSNs(request.content);
      if (ssns.length > 0) {
        warnings.push(`Social security numbers detected: ${ssns.length} instances`);
        sanitizedContent = this.sanitizeSSNs(sanitizedContent);
        modifications.push('Removed social security numbers');
        riskLevel = 'high';
      }

      // Check for credit card numbers
      const creditCards = this.detectCreditCards(request.content);
      if (creditCards.length > 0) {
        warnings.push(`Credit card numbers detected: ${creditCards.length} instances`);
        sanitizedContent = this.sanitizeCreditCards(sanitizedContent);
        modifications.push('Removed credit card numbers');
        riskLevel = 'high';
      }

      // Check for addresses
      const addresses = this.detectAddresses(request.content);
      if (addresses.length > 0) {
        warnings.push(`Physical addresses detected: ${addresses.length} instances`);
        sanitizedContent = this.sanitizeAddresses(sanitizedContent);
        modifications.push('Removed physical addresses');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Check for names (potential PII)
      const names = this.detectPotentialNames(request.content);
      if (names.length > 0) {
        warnings.push(`Potential personal names detected: ${names.length} instances`);
        // Don't automatically sanitize names as they might be character names
        // Just warn for human review
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Check for dates of birth
      const birthDates = this.detectBirthDates(request.content);
      if (birthDates.length > 0) {
        warnings.push(`Birth dates detected: ${birthDates.length} instances`);
        sanitizedContent = this.sanitizeBirthDates(sanitizedContent);
        modifications.push('Removed birth dates');
        riskLevel = 'high';
      }

      // Check for URLs that might contain personal info
      const suspiciousUrls = this.detectSuspiciousUrls(request.content);
      if (suspiciousUrls.length > 0) {
        warnings.push(`Suspicious URLs detected: ${suspiciousUrls.length} instances`);
        sanitizedContent = this.sanitizeSuspiciousUrls(sanitizedContent);
        modifications.push('Removed suspicious URLs');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Check for financial information
      const financialInfo = this.detectFinancialInfo(request.content);
      if (financialInfo.length > 0) {
        warnings.push(`Financial information detected: ${financialInfo.length} instances`);
        sanitizedContent = this.sanitizeFinancialInfo(sanitizedContent);
        modifications.push('Removed financial information');
        riskLevel = 'high';
      }

      this.logger.debug('Personal info filter completed', {
        riskLevel,
        warningCount: warnings.length,
        modificationCount: modifications.length,
        contentChanged: sanitizedContent !== request.content
      });

      return {
        allowed: riskLevel !== 'high',
        riskLevel,
        sanitizedPrompt: sanitizedContent !== request.content ? sanitizedContent : undefined,
        warnings: [...new Set(warnings)],
        modifications: [...new Set(modifications)]
      };

    } catch (error) {
      this.logger.error('Error in personal info filter', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        allowed: false,
        riskLevel: 'high',
        warnings: ['Personal info filter encountered an error'],
        modifications: []
      };
    }
  }

  private detectPhoneNumbers(content: string): string[] {
    const phonePatterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 1234567890
      /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, // (123) 456-7890, (123)456-7890
      /\b\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // +1-123-456-7890
      /\b1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g // 1-123-456-7890
    ];

    const matches: string[] = [];
    for (const pattern of phonePatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    return matches;
  }

  private detectEmails(content: string): string[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return content.match(emailPattern) || [];
  }

  private detectSSNs(content: string): string[] {
    const ssnPatterns = [
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, // 123-45-6789, 123456789
      /\b\d{3}\s\d{2}\s\d{4}\b/g // 123 45 6789
    ];

    const matches: string[] = [];
    for (const pattern of ssnPatterns) {
      const found = content.match(pattern);
      if (found) {
        // Additional validation to reduce false positives
        const validSSNs = found.filter(ssn => {
          const digits = ssn.replace(/\D/g, '');
          return digits.length === 9 && 
                 digits !== '000000000' && 
                 !digits.startsWith('000') &&
                 !digits.startsWith('666') &&
                 !digits.startsWith('9');
        });
        matches.push(...validSSNs);
      }
    }
    return matches;
  }

  private detectCreditCards(content: string): string[] {
    const ccPatterns = [
      /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Visa
      /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // MasterCard
      /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g, // American Express
      /\b6011[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g // Discover
    ];

    const matches: string[] = [];
    for (const pattern of ccPatterns) {
      const found = content.match(pattern);
      if (found) {
        // Use Luhn algorithm to validate
        const validCCs = found.filter(cc => this.isValidCreditCard(cc));
        matches.push(...validCCs);
      }
    }
    return matches;
  }

  private detectAddresses(content: string): string[] {
    const addressPatterns = [
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
      /\b\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gi // Full address with ZIP
    ];

    const matches: string[] = [];
    for (const pattern of addressPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    return matches;
  }

  private detectPotentialNames(content: string): string[] {
    // Simple heuristic for detecting potential names
    // This is basic and would need refinement in production
    const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
    const potentialNames = content.match(namePattern) || [];
    
    // Filter out common non-name phrases
    const commonPhrases = [
      'Once Upon', 'The End', 'Chapter One', 'Part Two',
      'New York', 'Los Angeles', 'San Francisco', 'Las Vegas'
    ];
    
    return potentialNames.filter(name => 
      !commonPhrases.some(phrase => phrase.toLowerCase() === name.toLowerCase())
    );
  }

  private detectBirthDates(content: string): string[] {
    const birthDatePatterns = [
      /\b(?:born|birth|birthday).*?(\d{1,2}\/\d{1,2}\/\d{4})\b/gi,
      /\b(?:born|birth|birthday).*?(\d{1,2}-\d{1,2}-\d{4})\b/gi,
      /\b(?:DOB|date of birth).*?(\d{1,2}\/\d{1,2}\/\d{4})\b/gi
    ];

    const matches: string[] = [];
    for (const pattern of birthDatePatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    return matches;
  }

  private detectSuspiciousUrls(content: string): string[] {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlPattern) || [];
    
    // Flag URLs that might contain personal info
    const suspiciousPatterns = [
      /facebook\.com\/profile/i,
      /linkedin\.com\/in/i,
      /instagram\.com\/[^\/]+$/i,
      /twitter\.com\/[^\/]+$/i,
      /github\.com\/[^\/]+$/i
    ];

    return urls.filter(url => 
      suspiciousPatterns.some(pattern => pattern.test(url))
    );
  }

  private detectFinancialInfo(content: string): string[] {
    const financialPatterns = [
      /\b(?:account|acct).*?(?:number|#).*?\d{8,}\b/gi,
      /\b(?:routing|aba).*?(?:number|#).*?\d{9}\b/gi,
      /\b(?:iban|swift).*?[A-Z0-9]{8,34}\b/gi,
      /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g // Dollar amounts over $1000
    ];

    const matches: string[] = [];
    for (const pattern of financialPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    return matches;
  }

  // Sanitization methods
  private sanitizePhoneNumbers(content: string): string {
    const phonePatterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g,
      /\b\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      /\b1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g
    ];

    let sanitized = content;
    for (const pattern of phonePatterns) {
      sanitized = sanitized.replace(pattern, '[PHONE_NUMBER_REMOVED]');
    }
    return sanitized;
  }

  private sanitizeEmails(content: string): string {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return content.replace(emailPattern, '[EMAIL_REMOVED]');
  }

  private sanitizeSSNs(content: string): string {
    const ssnPatterns = [
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      /\b\d{3}\s\d{2}\s\d{4}\b/g
    ];

    let sanitized = content;
    for (const pattern of ssnPatterns) {
      sanitized = sanitized.replace(pattern, '[SSN_REMOVED]');
    }
    return sanitized;
  }

  private sanitizeCreditCards(content: string): string {
    const ccPatterns = [
      /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g,
      /\b6011[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
    ];

    let sanitized = content;
    for (const pattern of ccPatterns) {
      sanitized = sanitized.replace(pattern, '[CREDIT_CARD_REMOVED]');
    }
    return sanitized;
  }

  private sanitizeAddresses(content: string): string {
    const addressPatterns = [
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
      /\b\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gi
    ];

    let sanitized = content;
    for (const pattern of addressPatterns) {
      sanitized = sanitized.replace(pattern, '[ADDRESS_REMOVED]');
    }
    return sanitized;
  }

  private sanitizeBirthDates(content: string): string {
    const birthDatePatterns = [
      /\b(?:born|birth|birthday).*?(\d{1,2}\/\d{1,2}\/\d{4})\b/gi,
      /\b(?:born|birth|birthday).*?(\d{1,2}-\d{1,2}-\d{4})\b/gi,
      /\b(?:DOB|date of birth).*?(\d{1,2}\/\d{1,2}\/\d{4})\b/gi
    ];

    let sanitized = content;
    for (const pattern of birthDatePatterns) {
      sanitized = sanitized.replace(pattern, (match) => 
        match.replace(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/g, '[DATE_REMOVED]')
      );
    }
    return sanitized;
  }

  private sanitizeSuspiciousUrls(content: string): string {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return content.replace(urlPattern, (url) => {
      const suspiciousPatterns = [
        /facebook\.com\/profile/i,
        /linkedin\.com\/in/i,
        /instagram\.com\/[^\/]+$/i,
        /twitter\.com\/[^\/]+$/i,
        /github\.com\/[^\/]+$/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(url))) {
        return '[PERSONAL_URL_REMOVED]';
      }
      return url;
    });
  }

  private sanitizeFinancialInfo(content: string): string {
    const financialPatterns = [
      { pattern: /\b(?:account|acct).*?(?:number|#).*?\d{8,}\b/gi, replacement: '[ACCOUNT_NUMBER_REMOVED]' },
      { pattern: /\b(?:routing|aba).*?(?:number|#).*?\d{9}\b/gi, replacement: '[ROUTING_NUMBER_REMOVED]' },
      { pattern: /\b(?:iban|swift).*?[A-Z0-9]{8,34}\b/gi, replacement: '[BANK_CODE_REMOVED]' }
    ];

    let sanitized = content;
    for (const { pattern, replacement } of financialPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  private isValidCreditCard(cc: string): boolean {
    // Luhn algorithm implementation
    const digits = cc.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}