/**
 * JurisdictionService
 * 
 * Provides jurisdiction-aware age verification and compliance framework evaluation.
 * Supports 50+ countries with versioned policy rules for COPPA, GDPR-K, and UK Children's Code compliance.
 */

export interface JurisdictionThreshold {
  minorThreshold: number; // Age below which user is considered minor
  complianceFramework: 'COPPA' | 'GDPR-K' | 'UK_CHILDRENS_CODE' | 'NONE';
  policyVersion: string; // Format: "YYYY-MM" (e.g., "2025-01")
}

export interface AgeVerificationInput {
  method: 'confirmation' | 'birthYear' | 'ageRange';
  value?: number | string; // birthYear (number) or ageRange (string like "6-8") or confirmation (no value)
}

export interface MinorStatusEvaluation {
  isMinor: boolean;
  minorThreshold: number;
  applicableFramework: string;
  policyVersion: string;
  evaluatedAt: Date;
}

// Jurisdiction thresholds (versioned)
const THRESHOLDS: Record<string, JurisdictionThreshold> = {
  // US - COPPA
  'US': { minorThreshold: 13, complianceFramework: 'COPPA', policyVersion: '2025-01' },
  // EU/EEA - GDPR-K (varies by country, default to 16)
  'AT': { minorThreshold: 14, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Austria
  'BE': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Belgium
  'BG': { minorThreshold: 14, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Bulgaria
  'HR': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Croatia
  'CY': { minorThreshold: 14, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Cyprus
  'CZ': { minorThreshold: 15, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Czech Republic
  'DK': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Denmark
  'EE': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Estonia
  'FI': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Finland
  'FR': { minorThreshold: 15, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // France
  'DE': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Germany
  'GR': { minorThreshold: 15, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Greece
  'HU': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Hungary
  'IE': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Ireland
  'IT': { minorThreshold: 14, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Italy
  'LV': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Latvia
  'LT': { minorThreshold: 14, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Lithuania
  'LU': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Luxembourg
  'MT': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Malta
  'NL': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Netherlands
  'PL': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Poland
  'PT': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Portugal
  'RO': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Romania
  'SK': { minorThreshold: 16, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Slovakia
  'SI': { minorThreshold: 15, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Slovenia
  'ES': { minorThreshold: 14, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Spain
  'SE': { minorThreshold: 13, complianceFramework: 'GDPR-K', policyVersion: '2025-01' }, // Sweden
  // UK - Age Appropriate Design Code
  'GB': { minorThreshold: 13, complianceFramework: 'UK_CHILDRENS_CODE', policyVersion: '2025-01' },
  // Canada
  'CA': { minorThreshold: 13, complianceFramework: 'COPPA', policyVersion: '2025-01' },
  // Australia
  'AU': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // New Zealand
  'NZ': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Japan
  'JP': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // South Korea
  'KR': { minorThreshold: 14, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Brazil
  'BR': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Mexico
  'MX': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Argentina
  'AR': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Chile
  'CL': { minorThreshold: 14, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Colombia
  'CO': { minorThreshold: 14, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Peru
  'PE': { minorThreshold: 14, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // South Africa
  'ZA': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // India
  'IN': { minorThreshold: 18, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // China
  'CN': { minorThreshold: 14, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Singapore
  'SG': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Malaysia
  'MY': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Thailand
  'TH': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Philippines
  'PH': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Indonesia
  'ID': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Vietnam
  'VN': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Turkey
  'TR': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Israel
  'IL': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // UAE
  'AE': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Saudi Arabia
  'SA': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Egypt
  'EG': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Nigeria
  'NG': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Kenya
  'KE': { minorThreshold: 13, complianceFramework: 'NONE', policyVersion: '2025-01' },
  // Default (unknown country) - use safer threshold
  'UNKNOWN': { minorThreshold: 16, complianceFramework: 'NONE', policyVersion: '2025-01' }
};

export class JurisdictionService {
  /**
   * Get minor threshold for a country
   * @param country ISO-3166-1 alpha-2 country code
   * @param policyVersion Policy version to use (default: '2025-01')
   * @returns Age threshold below which user is considered minor
   */
  getMinorThreshold(country: string, policyVersion: string = '2025-01'): number {
    const threshold = THRESHOLDS[country.toUpperCase()] || THRESHOLDS['UNKNOWN'];
    // Verify policy version matches (for future versioning)
    if (threshold.policyVersion !== policyVersion) {
      // Log warning but return current threshold
      console.warn(`Policy version mismatch for ${country}: requested ${policyVersion}, using ${threshold.policyVersion}`);
    }
    return threshold.minorThreshold;
  }

  /**
   * Get compliance framework for a country
   * @param country ISO-3166-1 alpha-2 country code
   * @param policyVersion Policy version to use (default: '2025-01')
   * @returns Compliance framework name (COPPA, GDPR-K, UK_CHILDRENS_CODE, or NONE)
   */
  getComplianceFramework(country: string, policyVersion: string = '2025-01'): string {
    const threshold = THRESHOLDS[country.toUpperCase()] || THRESHOLDS['UNKNOWN'];
    return threshold.complianceFramework;
  }

  /**
   * Evaluate minor status from age verification input
   * @param country ISO-3166-1 alpha-2 country code
   * @param ageVerification Age verification input (method and optional value)
   * @param policyVersion Policy version to use (default: '2025-01')
   * @returns Evaluation result with minor status, threshold, framework, and timestamp
   * @throws Error if verification method is invalid or value is missing when required
   */
  evaluateMinorStatus(
    country: string,
    ageVerification: AgeVerificationInput,
    policyVersion: string = '2025-01'
  ): MinorStatusEvaluation {
    const threshold = this.getMinorThreshold(country, policyVersion);
    const framework = this.getComplianceFramework(country, policyVersion);
    
    let isMinor = false;
    let evaluatedAge: number | null = null;

    switch (ageVerification.method) {
      case 'confirmation':
        // Confirmation means "I confirm I am over the minimum age"
        // This is lowest assurance - treat as adult for registration
        // But store that it was confirmation-based
        isMinor = false;
        evaluatedAge = threshold; // Store threshold as "evaluated age"
        break;
      
      case 'birthYear':
        if (typeof ageVerification.value === 'number') {
          const currentYear = new Date().getFullYear();
          const age = currentYear - ageVerification.value;
          evaluatedAge = age;
          isMinor = age < threshold;
        } else {
          throw new Error('birthYear method requires numeric value');
        }
        break;
      
      case 'ageRange':
        if (typeof ageVerification.value === 'string') {
          // Parse age range like "6-8" or "9-10"
          const parts = ageVerification.value.split('-');
          if (parts.length !== 2) {
            throw new Error('ageRange must be in format "min-max" (e.g., "6-8")');
          }
          const min = parseInt(parts[0], 10);
          const max = parseInt(parts[1], 10);
          
          if (isNaN(min) || isNaN(max) || min < 0 || max < 0 || min > max) {
            throw new Error('ageRange must have valid min and max values where min <= max');
          }
          
          const midpoint = Math.floor((min + max) / 2);
          evaluatedAge = midpoint;
          isMinor = max < threshold; // If max age in range is below threshold, consider minor
        } else {
          throw new Error('ageRange method requires string value');
        }
        break;
      
      default:
        throw new Error(`Unknown age verification method: ${ageVerification.method}`);
    }

    return {
      isMinor,
      minorThreshold: threshold,
      applicableFramework: framework,
      policyVersion,
      evaluatedAt: new Date()
    };
  }

  /**
   * Get all supported countries
   * @returns Array of ISO-3166-1 alpha-2 country codes
   */
  getSupportedCountries(): string[] {
    return Object.keys(THRESHOLDS).filter(key => key !== 'UNKNOWN');
  }

  /**
   * Check if a country is supported
   * @param country ISO-3166-1 alpha-2 country code
   * @returns True if country has specific threshold, false if using UNKNOWN default
   */
  isCountrySupported(country: string): boolean {
    return country.toUpperCase() in THRESHOLDS && country.toUpperCase() !== 'UNKNOWN';
  }
}

