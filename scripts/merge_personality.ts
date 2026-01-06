#!/usr/bin/env ts-node

/**
 * Personality Merge Script - V2 Personality Framework Implementation
 * 
 * This script scans all repository files for personality, voice & tone, or brand voice
 * definitions and reconciles them with the V2 personality blueprint.
 * 
 * Requirements addressed:
 * - Scan all files for personality/tone/voice definitions
 * - Generate /logs/personality_merge_report.txt
 * - Validate against V2 personality blueprint
 * - Check for forbidden terms (ERR_FORBIDDEN_TERM)
 * - Enforce 18-word sentence limit and active voice
 */

import * as fs from 'fs';
import * as path from 'path';

// Use require for modules without types
const glob = require('glob');
const yaml = require('js-yaml');

interface PersonalityTrait {
  source: string;
  line: number;
  content: string;
  type: 'personality' | 'voice_tone' | 'brand_voice';
}

interface PersonalityBlueprint {
  coreTraits: {
    archetype: string;
    communication: string;
    relationship: string;
  };
  languageRules: {
    maxSentenceLength: number;
    activeVoiceOnly: boolean;
    forbiddenPhrases: string[];
    humorPalette: string[];
  };
  emotionalIntelligence: {
    empathyLevel: number;
    warmthLevel: number;
    playfulnessLevel: number;
  };
  ageModulation: {
    [key: string]: {
      maxClauseLength?: number;
      soundWords?: string[];
      complexity: string;
      features?: string[];
      tone?: string;
      focus?: string;
    };
  };
}

class PersonalityMerger {
  private foundTraits: PersonalityTrait[] = [];
  private blueprint: PersonalityBlueprint | null = null;
  private conflicts: Array<{ trait: PersonalityTrait; conflict: string }> = [];

  async run(): Promise<void> {
    console.log('🎭 Starting Personality Merge Process...');
    
    try {
      // Step 1: Load existing blueprint if it exists
      await this.loadBlueprint();
      
      // Step 2: Scan repository for personality definitions
      await this.scanRepository();
      
      // Step 3: Analyze conflicts
      this.analyzeConflicts();
      
      // Step 4: Generate merge report
      await this.generateMergeReport();
      
      // Step 5: Check for unresolved conflicts
      if (this.conflicts.length > 0) {
        console.error('❌ Build failed: Unresolved personality conflicts found');
        process.exit(1);
      }
      
      console.log('✅ Personality merge completed successfully');
      
    } catch (error) {
      console.error('❌ Personality merge failed:', error);
      process.exit(1);
    }
  }

  private async loadBlueprint(): Promise<void> {
    const blueprintPath = path.join(process.cwd(), 'personality', 'blueprint.yaml');
    
    if (fs.existsSync(blueprintPath)) {
      const blueprintContent = fs.readFileSync(blueprintPath, 'utf8');
      this.blueprint = yaml.load(blueprintContent) as PersonalityBlueprint;
      console.log('📋 Loaded existing personality blueprint');
    } else {
      console.log('📋 No existing blueprint found, will create default');
      this.blueprint = this.createDefaultBlueprint();
    }
  }

  private createDefaultBlueprint(): PersonalityBlueprint {
    return {
      coreTraits: {
        archetype: "young_energetic_mentor",
        communication: "pixar_director_librarian_mashup",
        relationship: "co_author_never_audience"
      },
      languageRules: {
        maxSentenceLength: 18,
        activeVoiceOnly: true,
        forbiddenPhrases: ["AI", "machine learning", "algorithm", "personalized", "AI-powered", "AI-driven", "AI-led", "GPT", "LLM"],
        humorPalette: ["safe_slapstick", "playful_alliteration"]
      },
      emotionalIntelligence: {
        empathyLevel: 0.9,
        warmthLevel: 0.9,
        playfulnessLevel: 0.7
      },
      ageModulation: {
        "ages_3_5": {
          maxClauseLength: 4,
          soundWords: ["Zoom!", "Boop!", "Whee!"],
          complexity: "simple"
        },
        "ages_6_8": {
          features: ["wordplay", "simple_metaphor"],
          complexity: "intermediate"
        },
        "ages_9_10": {
          features: ["clever_puns", "respectful_challenges"],
          complexity: "advanced"
        },
        "adults": {
          complexity: "sophisticated",
          tone: "direct_confident_lightly_witty",
          focus: "benefits_without_buzzwords"
        }
      }
    };
  }

  private async scanRepository(): Promise<void> {
    console.log('🔍 Scanning repository for personality definitions...');
    
    const patterns = [
      '**/*.ts',
      '**/*.js',
      '**/*.md',
      '**/*.yaml',
      '**/*.yml',
      '**/*.json'
    ];
    
    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      'logs/**'
    ];

    for (const pattern of patterns) {
      const files = await new Promise<string[]>((resolve, reject) => {
        glob(pattern, { 
          ignore: excludePatterns,
          cwd: process.cwd()
        }, (err: any, matches: string[]) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      
      for (const file of files) {
        await this.scanFile(file);
      }
    }
    
    console.log(`📊 Found ${this.foundTraits.length} personality definitions`);
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        
        // Look for personality markers
        if (this.containsPersonalityMarker(line)) {
          const trait: PersonalityTrait = {
            source: filePath,
            line: i + 1,
            content: lines[i].trim(),
            type: this.getPersonalityType(line)
          };
          
          // Capture context (next few lines)
          const context = lines.slice(i, Math.min(i + 5, lines.length))
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .join(' ');
          
          trait.content = context;
          this.foundTraits.push(trait);
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  private containsPersonalityMarker(line: string): boolean {
    const markers = [
      '# personality',
      'voice & tone',
      'brand voice',
      'personality trait',
      'communication style',
      'tone of voice',
      'brand personality',
      'warmth:',
      'empathy:',
      'playfulness:',
      'whimsy:',
      'youthfulness:',
      'supportiveness:'
    ];
    
    return markers.some(marker => line.includes(marker));
  }

  private getPersonalityType(line: string): 'personality' | 'voice_tone' | 'brand_voice' {
    if (line.includes('brand voice') || line.includes('brand personality')) {
      return 'brand_voice';
    } else if (line.includes('voice & tone') || line.includes('tone of voice')) {
      return 'voice_tone';
    } else {
      return 'personality';
    }
  }

  private analyzeConflicts(): void {
    console.log('🔍 Analyzing personality conflicts...');
    
    // Check for forbidden terms in existing definitions
    for (const trait of this.foundTraits) {
      const content = trait.content.toLowerCase();
      
      for (const forbiddenTerm of this.blueprint!.languageRules.forbiddenPhrases) {
        if (content.includes(forbiddenTerm.toLowerCase())) {
          this.conflicts.push({
            trait,
            conflict: `ERR_FORBIDDEN_TERM: Contains forbidden term "${forbiddenTerm}"`
          });
        }
      }
      
      // Check for sentence length violations (18-word limit)
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      for (const sentence of sentences) {
        const wordCount = sentence.trim().split(/\s+/).length;
        if (wordCount > this.blueprint!.languageRules.maxSentenceLength) {
          this.conflicts.push({
            trait,
            conflict: `Sentence exceeds ${this.blueprint!.languageRules.maxSentenceLength} word limit: ${wordCount} words`
          });
        }
      }
      
      // Check for passive voice violations
      if (this.blueprint!.languageRules.activeVoiceOnly && this.containsPassiveVoice(content)) {
        this.conflicts.push({
          trait,
          conflict: 'Contains passive voice - active voice required'
        });
      }
      
      // Check for conflicting personality traits
      if (content.includes('formal') && this.blueprint!.coreTraits.archetype === 'young_energetic_mentor') {
        this.conflicts.push({
          trait,
          conflict: 'Formal tone conflicts with young energetic mentor archetype'
        });
      }
      
      if (content.includes('professional') && this.blueprint!.coreTraits.communication === 'pixar_director_librarian_mashup') {
        this.conflicts.push({
          trait,
          conflict: 'Professional tone conflicts with playful communication style'
        });
      }
    }
  }

  private containsPassiveVoice(text: string): boolean {
    // Simple passive voice detection patterns
    const passivePatterns = [
      /\b(is|are|was|were|being|been)\s+\w+ed\b/i,
      /\b(is|are|was|were|being|been)\s+\w+en\b/i,
      /\bby\s+\w+\s+(is|are|was|were)\b/i
    ];
    
    return passivePatterns.some(pattern => pattern.test(text));
  }

  private async generateMergeReport(): Promise<void> {
    console.log('📝 Generating personality merge report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      blueprint: this.blueprint,
      foundTraits: this.foundTraits.length,
      conflicts: this.conflicts.length,
      details: {
        traitsByType: {
          personality: this.foundTraits.filter(t => t.type === 'personality').length,
          voice_tone: this.foundTraits.filter(t => t.type === 'voice_tone').length,
          brand_voice: this.foundTraits.filter(t => t.type === 'brand_voice').length
        },
        conflictDetails: this.conflicts.map(c => ({
          file: c.trait.source,
          line: c.trait.line,
          content: c.trait.content,
          conflict: c.conflict
        })),
        recommendations: this.generateRecommendations()
      }
    };
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write detailed report
    const reportPath = path.join(logsDir, 'personality_merge_report.txt');
    const reportContent = this.formatReport(report);
    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`📄 Merge report written to: ${reportPath}`);
    
    // Also save blueprint if it doesn't exist
    const blueprintDir = path.join(process.cwd(), 'personality');
    if (!fs.existsSync(blueprintDir)) {
      fs.mkdirSync(blueprintDir, { recursive: true });
    }
    
    const blueprintPath = path.join(blueprintDir, 'blueprint.yaml');
    if (!fs.existsSync(blueprintPath)) {
      fs.writeFileSync(blueprintPath, yaml.dump(this.blueprint));
      console.log(`📋 Created personality blueprint at: ${blueprintPath}`);
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.conflicts.length > 0) {
      recommendations.push('Resolve personality conflicts before deployment');
      recommendations.push('Update conflicting definitions to align with blueprint');
    }
    
    if (this.foundTraits.length === 0) {
      recommendations.push('Consider adding more personality definitions for consistency');
    }
    
    recommendations.push('Implement personality enforcement middleware');
    recommendations.push('Add automated personality validation to CI/CD pipeline');
    
    return recommendations;
  }

  private formatReport(report: any): string {
    return `
# Personality Merge Report
Generated: ${report.timestamp}

## Summary
- Found Traits: ${report.foundTraits}
- Conflicts: ${report.conflicts}
- Blueprint Status: ${this.blueprint ? 'Loaded' : 'Created'}

## Trait Distribution
- Personality: ${report.details.traitsByType.personality}
- Voice & Tone: ${report.details.traitsByType.voice_tone}
- Brand Voice: ${report.details.traitsByType.brand_voice}

## Conflicts Found
${report.details.conflictDetails.map((c: any) => `
- File: ${c.file}:${c.line}
  Content: ${c.content}
  Conflict: ${c.conflict}
`).join('')}

## Current Blueprint
${yaml.dump(report.blueprint)}

## Recommendations
${report.details.recommendations.map((r: string) => `- ${r}`).join('\n')}

## Next Steps
${report.conflicts > 0 ? 
  '❌ RESOLVE CONFLICTS BEFORE PROCEEDING' : 
  '✅ No conflicts found - ready for deployment'
}
`;
  }
}

// Run the merger
if (require.main === module) {
  const merger = new PersonalityMerger();
  merger.run().catch(console.error);
}

export { PersonalityMerger };