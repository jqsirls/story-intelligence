import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface VoicePrintProfile {
  userId: string;
  voicePrintHash: string;
  features: {
    pitch: number[];
    formants: number[];
    spectralCentroid: number[];
    mfcc: number[];
  };
  confidence: number;
  createdAt: number;
  lastUpdated: number;
}

export interface VoicePrintValidationResult {
  isValid: boolean;
  confidence: number;
  userId?: string;
  riskScore: number;
  anomalies: string[];
}

export interface BiometricConfig {
  confidenceThreshold: number;
  maxProfiles: number;
  updateThreshold: number;
  anomalyThreshold: number;
}

export class VoicePrintValidator extends EventEmitter {
  private profiles: Map<string, VoicePrintProfile> = new Map();
  private config: BiometricConfig;
  private validationHistory: Map<string, number[]> = new Map();

  constructor(config: BiometricConfig) {
    super();
    this.config = config;
  }

  /**
   * Enrolls a new voice print for a user
   */
  async enrollVoicePrint(
    userId: string,
    audioBuffer: Buffer,
    metadata: Record<string, any> = {}
  ): Promise<VoicePrintProfile> {
    try {
      const features = await this.extractVoiceFeatures(audioBuffer);
      const voicePrintHash = this.generateVoicePrintHash(features);

      const profile: VoicePrintProfile = {
        userId,
        voicePrintHash,
        features,
        confidence: 1.0,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };

      this.profiles.set(userId, profile);

      this.emit('voicePrintEnrolled', {
        userId,
        profile,
        metadata
      });

      return profile;
    } catch (error) {
      this.emit('enrollmentError', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        metadata
      });
      throw new Error(`Voice print enrollment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates a voice sample against enrolled voice prints
   */
  async validateVoicePrint(
    audioBuffer: Buffer,
    claimedUserId?: string,
    metadata: Record<string, any> = {}
  ): Promise<VoicePrintValidationResult> {
    try {
      const features = await this.extractVoiceFeatures(audioBuffer);
      const inputHash = this.generateVoicePrintHash(features);

      let bestMatch: { userId: string; confidence: number } | null = null;
      const anomalies: string[] = [];

      // If user ID is claimed, validate against that specific profile
      if (claimedUserId) {
        const profile = this.profiles.get(claimedUserId);
        if (profile) {
          const confidence = this.calculateSimilarity(features, profile.features);
          bestMatch = { userId: claimedUserId, confidence };

          // Check for anomalies
          const profileAnomalies = this.detectAnomalies(features, profile.features);
          anomalies.push(...profileAnomalies);
        }
      } else {
        // Search all profiles for best match
        for (const [userId, profile] of this.profiles) {
          const confidence = this.calculateSimilarity(features, profile.features);
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { userId, confidence };
          }
        }
      }

      const isValid = bestMatch !== null && 
                     bestMatch.confidence >= this.config.confidenceThreshold &&
                     anomalies.length === 0;

      const riskScore = this.calculateRiskScore(bestMatch?.confidence || 0, anomalies);

      // Update validation history
      if (bestMatch) {
        this.updateValidationHistory(bestMatch.userId, bestMatch.confidence);
      }

      const result: VoicePrintValidationResult = {
        isValid,
        confidence: bestMatch?.confidence || 0,
        userId: bestMatch?.userId,
        riskScore,
        anomalies
      };

      this.emit('voicePrintValidated', {
        result,
        claimedUserId,
        metadata
      });

      return result;
    } catch (error) {
      this.emit('validationError', {
        claimedUserId,
        error: error instanceof Error ? error.message : String(error),
        metadata
      });
      throw new Error(`Voice print validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates an existing voice print with new audio data
   */
  async updateVoicePrint(
    userId: string,
    audioBuffer: Buffer,
    metadata: Record<string, any> = {}
  ): Promise<VoicePrintProfile> {
    try {
      const existingProfile = this.profiles.get(userId);
      if (!existingProfile) {
        throw new Error(`Voice print profile not found for user: ${userId}`);
      }

      const newFeatures = await this.extractVoiceFeatures(audioBuffer);
      const similarity = this.calculateSimilarity(newFeatures, existingProfile.features);

      if (similarity < this.config.updateThreshold) {
        throw new Error(`New voice sample too different from existing profile (similarity: ${similarity})`);
      }

      // Blend new features with existing ones (weighted average)
      const blendWeight = 0.3; // 30% new, 70% existing
      const updatedFeatures = this.blendFeatures(existingProfile.features, newFeatures, blendWeight);

      const updatedProfile: VoicePrintProfile = {
        ...existingProfile,
        features: updatedFeatures,
        voicePrintHash: this.generateVoicePrintHash(updatedFeatures),
        lastUpdated: Date.now()
      };

      this.profiles.set(userId, updatedProfile);

      this.emit('voicePrintUpdated', {
        userId,
        profile: updatedProfile,
        similarity,
        metadata
      });

      return updatedProfile;
    } catch (error) {
      this.emit('updateError', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        metadata
      });
      throw new Error(`Voice print update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Removes a voice print profile
   */
  async removeVoicePrint(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (profile) {
      this.profiles.delete(userId);
      this.validationHistory.delete(userId);

      this.emit('voicePrintRemoved', {
        userId,
        profile
      });
    }
  }

  /**
   * Gets validation statistics for a user
   */
  getValidationStats(userId: string): {
    totalValidations: number;
    averageConfidence: number;
    recentConfidences: number[];
    profile?: VoicePrintProfile;
  } {
    const profile = this.profiles.get(userId);
    const history = this.validationHistory.get(userId) || [];

    return {
      totalValidations: history.length,
      averageConfidence: history.length > 0 ? 
        history.reduce((sum, conf) => sum + conf, 0) / history.length : 0,
      recentConfidences: history.slice(-10), // Last 10 validations
      profile
    };
  }

  /**
   * Extracts voice features from audio buffer
   * This is a simplified implementation - in production, use advanced audio processing
   */
  private async extractVoiceFeatures(audioBuffer: Buffer): Promise<VoicePrintProfile['features']> {
    // Simplified feature extraction - in production, use libraries like librosa or similar
    const hash = crypto.createHash('sha256').update(audioBuffer).digest();
    
    // Mock features based on audio hash (for testing purposes)
    const features = {
      pitch: Array.from({ length: 10 }, (_, i) => hash[i] / 255),
      formants: Array.from({ length: 5 }, (_, i) => hash[i + 10] / 255),
      spectralCentroid: Array.from({ length: 8 }, (_, i) => hash[i + 15] / 255),
      mfcc: Array.from({ length: 13 }, (_, i) => hash[i + 23] / 255)
    };

    return features;
  }

  /**
   * Generates a hash for voice print features
   */
  private generateVoicePrintHash(features: VoicePrintProfile['features']): string {
    const featureString = JSON.stringify(features);
    return crypto.createHash('sha256').update(featureString).digest('hex');
  }

  /**
   * Calculates similarity between two feature sets
   */
  private calculateSimilarity(
    features1: VoicePrintProfile['features'],
    features2: VoicePrintProfile['features']
  ): number {
    let totalSimilarity = 0;
    let featureCount = 0;

    // Compare each feature type
    for (const [featureType, values1] of Object.entries(features1)) {
      const values2 = features2[featureType as keyof VoicePrintProfile['features']];
      if (values2 && values1.length === values2.length) {
        const similarity = this.calculateVectorSimilarity(values1, values2);
        totalSimilarity += similarity;
        featureCount++;
      }
    }

    return featureCount > 0 ? totalSimilarity / featureCount : 0;
  }

  /**
   * Calculates cosine similarity between two vectors
   */
  private calculateVectorSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Detects anomalies in voice features
   */
  private detectAnomalies(
    currentFeatures: VoicePrintProfile['features'],
    profileFeatures: VoicePrintProfile['features']
  ): string[] {
    const anomalies: string[] = [];

    // Check for significant deviations in each feature type
    for (const [featureType, currentValues] of Object.entries(currentFeatures)) {
      const profileValues = profileFeatures[featureType as keyof VoicePrintProfile['features']];
      if (profileValues && currentValues.length === profileValues.length) {
        const deviation = this.calculateDeviation(currentValues, profileValues);
        if (deviation > this.config.anomalyThreshold) {
          anomalies.push(`${featureType}_deviation`);
        }
      }
    }

    return anomalies;
  }

  /**
   * Calculates standard deviation between two feature vectors
   */
  private calculateDeviation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length) return 1;

    const differences = values1.map((v1, i) => Math.abs(v1 - values2[i]));
    const meanDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    
    return meanDifference;
  }

  /**
   * Blends two feature sets with a given weight
   */
  private blendFeatures(
    existingFeatures: VoicePrintProfile['features'],
    newFeatures: VoicePrintProfile['features'],
    newWeight: number
  ): VoicePrintProfile['features'] {
    const existingWeight = 1 - newWeight;
    const blendedFeatures: VoicePrintProfile['features'] = {
      pitch: [],
      formants: [],
      spectralCentroid: [],
      mfcc: []
    };

    for (const [featureType, existingValues] of Object.entries(existingFeatures)) {
      const newValues = newFeatures[featureType as keyof VoicePrintProfile['features']];
      if (newValues && existingValues.length === newValues.length) {
        blendedFeatures[featureType as keyof VoicePrintProfile['features']] = 
          existingValues.map((existingVal, i) => 
            existingVal * existingWeight + newValues[i] * newWeight
          );
      } else {
        blendedFeatures[featureType as keyof VoicePrintProfile['features']] = [...existingValues];
      }
    }

    return blendedFeatures;
  }

  /**
   * Calculates risk score based on confidence and anomalies
   */
  private calculateRiskScore(confidence: number, anomalies: string[]): number {
    let riskScore = 1 - confidence; // Base risk from low confidence
    riskScore += anomalies.length * 0.2; // Add risk for each anomaly
    return Math.min(riskScore, 1); // Cap at 1.0
  }

  /**
   * Updates validation history for a user
   */
  private updateValidationHistory(userId: string, confidence: number): void {
    const history = this.validationHistory.get(userId) || [];
    history.push(confidence);
    
    // Keep only last 100 validations
    if (history.length > 100) {
      history.shift();
    }
    
    this.validationHistory.set(userId, history);
  }

  /**
   * Gets system metrics
   */
  getMetrics(): {
    totalProfiles: number;
    totalValidations: number;
    averageConfidence: number;
    anomalyRate: number;
  } {
    const totalProfiles = this.profiles.size;
    let totalValidations = 0;
    let totalConfidence = 0;
    let totalAnomalies = 0;

    for (const history of this.validationHistory.values()) {
      totalValidations += history.length;
      totalConfidence += history.reduce((sum, conf) => sum + conf, 0);
    }

    return {
      totalProfiles,
      totalValidations,
      averageConfidence: totalValidations > 0 ? totalConfidence / totalValidations : 0,
      anomalyRate: totalValidations > 0 ? totalAnomalies / totalValidations : 0
    };
  }
}