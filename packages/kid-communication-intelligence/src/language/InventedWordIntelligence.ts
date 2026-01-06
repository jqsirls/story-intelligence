import { Logger } from 'winston';
import { KidCommunicationConfig, InventedWord } from '../types';

export class InventedWordIntelligence {
  private inventedWords: Map<string, InventedWord[]> = new Map();
  private isInitialized = false;
  constructor(private config: KidCommunicationConfig, private logger: Logger) {}
  async initialize(): Promise<void> { this.isInitialized = true; this.logger.info('InventedWordIntelligence initialized'); }
  async detectAndInfer(text: string, context: { conversationHistory?: any[]; storyContext?: any; childId?: string }): Promise<InventedWord[]> {
    if (!this.isInitialized) return [];
    try {
      const words = text.split(/\s+/);
      const inventedWords: InventedWord[] = [];
      for (const word of words) {
        if (this.isLikelyInventedWord(word)) {
          const inferred = await this.inferMeaning(word, context);
          inventedWords.push({ word, inferredMeaning: inferred.meaning, context: inferred.context, phoneticSimilarity: inferred.similarity, storyContext: context.storyContext?.name, remembered: false });
          if (context.childId) this.rememberWord(context.childId, inventedWords[inventedWords.length - 1]);
        }
      }
      return inventedWords;
    } catch (error: any) {
      this.logger.warn('Invented word detection failed', { error: error.message });
      return [];
    }
  }
  private isLikelyInventedWord(word: string): boolean {
    const lowerWord = word.toLowerCase();
    if (lowerWord.includes('-') && lowerWord.split('-').length > 1) return true;
    return false;
  }
  private async inferMeaning(word: string, context: { conversationHistory?: any[]; storyContext?: any }): Promise<{ meaning?: string; context?: string; similarity?: number }> {
    return { meaning: undefined, context: context.storyContext?.name, similarity: 0 };
  }
  private findPhoneticallySimilar(word: string): Array<{ word: string; similarity: number }> { return []; }
  private rememberWord(childId: string, word: InventedWord): void {
    if (!this.inventedWords.has(childId)) this.inventedWords.set(childId, []);
    const words = this.inventedWords.get(childId)!;
    if (!words.find(w => w.word === word.word)) { word.remembered = true; words.push(word); }
  }
  getRememberedWords(childId: string): InventedWord[] { return this.inventedWords.get(childId) || []; }
}
