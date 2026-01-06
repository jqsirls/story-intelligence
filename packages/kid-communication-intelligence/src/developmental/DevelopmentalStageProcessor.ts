import { Logger } from 'winston';
import { KidCommunicationConfig, ChildProfile } from '../types';

export class DevelopmentalStageProcessor {
  private isInitialized = false;
  constructor(private config: KidCommunicationConfig, private logger: Logger) {}
  async initialize(): Promise<void> { this.isInitialized = true; this.logger.info('DevelopmentalStageProcessor initialized'); }
  async process(text: string, childProfile: ChildProfile): Promise<{ stage: string; ageRange: string; adaptations: string[] }> {
    if (!this.isInitialized) return { stage: 'unknown', ageRange: 'unknown', adaptations: [] };
    try {
      const age = childProfile.age;
      const stage = this.detectPiagetianStage(age);
      const ageRange = this.getAgeRange(age);
      const adaptations = this.getAdaptations(stage, age);
      return { stage, ageRange, adaptations };
    } catch (error: any) {
      this.logger.warn('Developmental stage processing failed', { error: error.message });
      return { stage: 'unknown', ageRange: 'unknown', adaptations: [] };
    }
  }
  private detectPiagetianStage(age: number): string {
    if (age < 2) return 'sensorimotor';
    else if (age < 7) return 'preoperational';
    else if (age < 12) return 'concrete-operational';
    else return 'formal-operational';
  }
  private getAgeRange(age: number): string {
    if (age < 5) return '3-4';
    else if (age < 8) return '5-7';
    else if (age < 11) return '8-10';
    else return '11-12';
  }
  private getAdaptations(stage: string, age: number): string[] {
    const adaptations: string[] = [];
    if (stage === 'preoperational') adaptations.push('simplified_language', 'concrete_examples', 'visual_aids');
    if (age < 7) adaptations.push('shorter_sentences', 'repetition', 'gesture_support');
    return adaptations;
  }
}
