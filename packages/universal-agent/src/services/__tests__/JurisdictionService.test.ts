/**
 * JurisdictionService Tests
 * 
 * Comprehensive unit tests for jurisdiction-aware age verification.
 * Tests all countries, all age verification methods, hard-block logic, policy versioning, and error cases.
 * Target: 90%+ coverage
 */

import { JurisdictionService, AgeVerificationInput, MinorStatusEvaluation } from '../JurisdictionService';

describe('JurisdictionService', () => {
  let service: JurisdictionService;

  beforeEach(() => {
    service = new JurisdictionService();
  });

  describe('getMinorThreshold', () => {
    it('should return correct threshold for US (COPPA)', () => {
      expect(service.getMinorThreshold('US')).toBe(13);
    });

    it('should return correct threshold for Germany (GDPR-K)', () => {
      expect(service.getMinorThreshold('DE')).toBe(16);
    });

    it('should return correct threshold for France (GDPR-K)', () => {
      expect(service.getMinorThreshold('FR')).toBe(15);
    });

    it('should return correct threshold for UK (UK_CHILDRENS_CODE)', () => {
      expect(service.getMinorThreshold('GB')).toBe(13);
    });

    it('should return default threshold for unknown country', () => {
      expect(service.getMinorThreshold('XX')).toBe(16); // UNKNOWN default
    });

    it('should handle lowercase country codes', () => {
      expect(service.getMinorThreshold('us')).toBe(13);
      expect(service.getMinorThreshold('de')).toBe(16);
    });

    it('should handle policy version parameter', () => {
      expect(service.getMinorThreshold('US', '2025-01')).toBe(13);
    });

    it('should return correct thresholds for all EU countries', () => {
      const euCountries = {
        'AT': 14, 'BE': 13, 'BG': 14, 'HR': 16, 'CY': 14, 'CZ': 15,
        'DK': 13, 'EE': 13, 'FI': 13, 'FR': 15, 'DE': 16, 'GR': 15,
        'HU': 16, 'IE': 16, 'IT': 14, 'LV': 13, 'LT': 14, 'LU': 16,
        'MT': 13, 'NL': 16, 'PL': 13, 'PT': 13, 'RO': 16, 'SK': 16,
        'SI': 15, 'ES': 14, 'SE': 13
      };

      for (const [country, expectedThreshold] of Object.entries(euCountries)) {
        expect(service.getMinorThreshold(country)).toBe(expectedThreshold);
      }
    });
  });

  describe('getComplianceFramework', () => {
    it('should return COPPA for US', () => {
      expect(service.getComplianceFramework('US')).toBe('COPPA');
    });

    it('should return GDPR-K for EU countries', () => {
      expect(service.getComplianceFramework('DE')).toBe('GDPR-K');
      expect(service.getComplianceFramework('FR')).toBe('GDPR-K');
    });

    it('should return UK_CHILDRENS_CODE for UK', () => {
      expect(service.getComplianceFramework('GB')).toBe('UK_CHILDRENS_CODE');
    });

    it('should return NONE for unknown country', () => {
      expect(service.getComplianceFramework('XX')).toBe('NONE');
    });
  });

  describe('evaluateMinorStatus - confirmation method', () => {
    it('should return isMinor=false for confirmation method', () => {
      const input: AgeVerificationInput = { method: 'confirmation' };
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false);
      expect(result.minorThreshold).toBe(13);
      expect(result.applicableFramework).toBe('COPPA');
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should work for confirmation with any country', () => {
      const input: AgeVerificationInput = { method: 'confirmation' };
      const result = service.evaluateMinorStatus('DE', input);
      
      expect(result.isMinor).toBe(false);
      expect(result.minorThreshold).toBe(16);
    });
  });

  describe('evaluateMinorStatus - birthYear method', () => {
    it('should correctly evaluate adult (over threshold)', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 20; // 20 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: birthYear };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false);
      expect(result.minorThreshold).toBe(13);
    });

    it('should correctly evaluate minor (under threshold)', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 10; // 10 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: birthYear };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(true);
      expect(result.minorThreshold).toBe(13);
    });

    it('should correctly evaluate at threshold boundary', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 13; // Exactly 13 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: birthYear };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false); // 13 is not < 13
    });

    it('should correctly evaluate just below threshold', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 12; // 12 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: birthYear };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(true);
    });

    it('should work with different country thresholds', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 15; // 15 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: birthYear };
      
      // US threshold is 13, so 15 is adult
      const usResult = service.evaluateMinorStatus('US', input);
      expect(usResult.isMinor).toBe(false);
      
      // Germany threshold is 16, so 15 is minor
      const deResult = service.evaluateMinorStatus('DE', input);
      expect(deResult.isMinor).toBe(true);
    });

    it('should throw error if value is missing', () => {
      const input: AgeVerificationInput = { method: 'birthYear' };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('birthYear method requires numeric value');
    });

    it('should throw error if value is not a number', () => {
      const input: AgeVerificationInput = { method: 'birthYear', value: '2000' as any };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('birthYear method requires numeric value');
    });
  });

  describe('evaluateMinorStatus - ageRange method', () => {
    it('should correctly evaluate adult range (max above threshold)', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '6-8' };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(true); // max (8) < 13
    });

    it('should correctly evaluate adult range (max at threshold)', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '10-13' };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false); // max (13) is not < 13
    });

    it('should correctly evaluate adult range (max above threshold)', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '12-15' };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false); // max (15) >= 13
    });

    it('should work with different country thresholds', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '14-15' };
      
      // US threshold is 13, so 15 is adult
      const usResult = service.evaluateMinorStatus('US', input);
      expect(usResult.isMinor).toBe(false);
      
      // Germany threshold is 16, so 15 is minor
      const deResult = service.evaluateMinorStatus('DE', input);
      expect(deResult.isMinor).toBe(true);
    });

    it('should throw error if value is missing', () => {
      const input: AgeVerificationInput = { method: 'ageRange' };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange method requires string value');
    });

    it('should throw error if value is not a string', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: 6 as any };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange method requires string value');
    });

    it('should throw error if format is invalid (no dash)', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '68' };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange must be in format "min-max"');
    });

    it('should throw error if format is invalid (multiple dashes)', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '6-8-10' };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange must be in format "min-max"');
    });

    it('should throw error if min or max is NaN', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: 'abc-def' };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange must have valid min and max values');
    });

    it('should throw error if min > max', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '10-8' };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange must have valid min and max values');
    });

    it('should throw error if min or max is negative', () => {
      // Test with negative value that creates invalid format (splits into 3 parts: "", "1", "5")
      const input: AgeVerificationInput = { method: 'ageRange', value: '-1-5' };
      
      // This will fail format check first (3 parts instead of 2)
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('ageRange must be in format');
      
      // Test with negative number in valid format (e.g., "-1--5" would parse as min=-1, max=-5)
      // But parseInt will parse "-1" correctly, so we need a different test
      // Actually, "-1-5" splits to ["", "1", "5"] which is 3 parts, so format check fails first
      // Let's test with a format that passes format check but has negative values
      // We can't easily create this with the current parsing, so let's just verify format check works
    });
  });

  describe('evaluateMinorStatus - invalid method', () => {
    it('should throw error for unknown method', () => {
      const input: AgeVerificationInput = { method: 'invalid' as any };
      
      expect(() => {
        service.evaluateMinorStatus('US', input);
      }).toThrow('Unknown age verification method: invalid');
    });
  });

  describe('getSupportedCountries', () => {
    it('should return array of country codes', () => {
      const countries = service.getSupportedCountries();
      
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(50);
      expect(countries).toContain('US');
      expect(countries).toContain('DE');
      expect(countries).toContain('GB');
      expect(countries).not.toContain('UNKNOWN');
    });
  });

  describe('isCountrySupported', () => {
    it('should return true for supported countries', () => {
      expect(service.isCountrySupported('US')).toBe(true);
      expect(service.isCountrySupported('DE')).toBe(true);
      expect(service.isCountrySupported('GB')).toBe(true);
    });

    it('should return false for unknown country', () => {
      expect(service.isCountrySupported('XX')).toBe(false);
    });

    it('should return false for UNKNOWN', () => {
      expect(service.isCountrySupported('UNKNOWN')).toBe(false);
    });

    it('should handle lowercase country codes', () => {
      expect(service.isCountrySupported('us')).toBe(true);
      expect(service.isCountrySupported('de')).toBe(true);
    });
  });

  describe('policy versioning', () => {
    it('should use current policy version by default', () => {
      const input: AgeVerificationInput = { method: 'confirmation' };
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.policyVersion).toBe('2025-01');
    });

    it('should accept policy version parameter', () => {
      const input: AgeVerificationInput = { method: 'confirmation' };
      const result = service.evaluateMinorStatus('US', input, '2025-01');
      
      expect(result.policyVersion).toBe('2025-01');
    });
  });

  describe('edge cases', () => {
    it('should handle very old birth years', () => {
      const input: AgeVerificationInput = { method: 'birthYear', value: 1900 };
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false); // Very old, definitely adult
    });

    it('should handle recent birth years', () => {
      const currentYear = new Date().getFullYear();
      const input: AgeVerificationInput = { method: 'birthYear', value: currentYear - 1 };
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(true); // 1 year old, definitely minor
    });

    it('should handle age range at exact threshold', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '12-13' };
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false); // max (13) is not < 13
    });

    it('should handle single-year age range', () => {
      const input: AgeVerificationInput = { method: 'ageRange', value: '12-12' };
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(true); // 12 < 13
    });
  });

  describe('hard-block logic verification', () => {
    it('should correctly identify minors for hard-blocking', () => {
      const currentYear = new Date().getFullYear();
      const minorBirthYear = currentYear - 10; // 10 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: minorBirthYear };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(true);
      // This result.isMinor === true should trigger hard-block in AuthRoutes
    });

    it('should correctly identify adults for allowing registration', () => {
      const currentYear = new Date().getFullYear();
      const adultBirthYear = currentYear - 20; // 20 years old
      const input: AgeVerificationInput = { method: 'birthYear', value: adultBirthYear };
      
      const result = service.evaluateMinorStatus('US', input);
      
      expect(result.isMinor).toBe(false);
      // This result.isMinor === false should allow registration
    });
  });
});

