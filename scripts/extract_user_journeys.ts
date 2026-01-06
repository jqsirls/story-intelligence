#!/usr/bin/env ts-node

/**
 * User Journey Extraction Script - V2 Build Pipeline Requirement
 * 
 * This script parses .kiro/specs/ files to extract user journey paths
 * and generates /logs/user_journeys.json for build pipeline validation.
 * 
 * Requirements addressed:
 * - Parse spec files for user journey paths
 * - Group journeys by persona (child, parent, educator, etc.)
 * - Generate comprehensive user journey mapping
 * - Support V2 build pipeline integration
 */

import * as fs from 'fs';
import * as path from 'path';

// Use require for modules without types
const glob = require('glob');

interface UserJourney {
  id: string;
  title: string;
  persona: string;
  steps: string[];
  requirements: string[];
  source: string;
  line: number;
}

interface UserJourneyReport {
  timestamp: string;
  totalJourneys: number;
  journeysByPersona: { [persona: string]: UserJourney[] };
  coverage: {
    specFiles: number;
    journeysFound: number;
    personasIdentified: string[];
  };
  validation: {
    missingJourneys: string[];
    incompleteJourneys: string[];
    recommendations: string[];
  };
}

class UserJourneyExtractor {
  private journeys: UserJourney[] = [];
  private specFiles: string[] = [];

  async run(): Promise<void> {
    console.log('🗺️ Starting User Journey Extraction...');
    
    try {
      // Step 1: Find all spec files
      await this.findSpecFiles();
      
      // Step 2: Extract journeys from spec files
      await this.extractJourneys();
      
      // Step 3: Validate journey completeness
      this.validateJourneys();
      
      // Step 4: Generate journey report
      await this.generateReport();
      
      console.log(`✅ Extracted ${this.journeys.length} user journeys from ${this.specFiles.length} spec files`);
      
    } catch (error) {
      console.error('❌ User journey extraction failed:', error);
      process.exit(1);
    }
  }

  private async findSpecFiles(): Promise<void> {
    console.log('📁 Finding spec files...');
    
    const specPatterns = [
      '.kiro/specs/**/*.md',
      'specs/**/*.md',
      'docs/specs/**/*.md'
    ];
    
    for (const pattern of specPatterns) {
      const files = await new Promise<string[]>((resolve, reject) => {
        glob(pattern, { cwd: process.cwd() }, (err: any, matches: string[]) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      this.specFiles.push(...files);
    }
    
    console.log(`📊 Found ${this.specFiles.length} spec files`);
  }

  private async extractJourneys(): Promise<void> {
    console.log('🔍 Extracting user journeys from spec files...');
    
    for (const specFile of this.specFiles) {
      await this.parseSpecFile(specFile);
    }
  }

  private async parseSpecFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      let currentJourney: Partial<UserJourney> | null = null;
      let inJourneySection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Detect journey section start
        if (this.isJourneyHeader(lowerLine)) {
          if (currentJourney && currentJourney.title) {
            this.finalizeJourney(currentJourney, filePath);
          }
          
          currentJourney = {
            id: this.generateJourneyId(line),
            title: this.extractTitle(line),
            persona: this.extractPersona(line),
            steps: [],
            requirements: [],
            source: filePath,
            line: i + 1
          };
          inJourneySection = true;
        }
        
        // Extract journey steps
        if (inJourneySection && currentJourney) {
          if (this.isStep(line)) {
            currentJourney.steps!.push(this.cleanStep(line));
          }
          
          if (this.isRequirement(line)) {
            currentJourney.requirements!.push(this.cleanRequirement(line));
          }
          
          // End of journey section
          if (line.trim() === '' && currentJourney.steps!.length > 0) {
            inJourneySection = false;
          }
        }
      }
      
      // Finalize last journey
      if (currentJourney && currentJourney.title) {
        this.finalizeJourney(currentJourney, filePath);
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not parse spec file: ${filePath}`);
    }
  }

  private isJourneyHeader(line: string): boolean {
    const journeyMarkers = [
      'user journey',
      'user story',
      'journey:',
      'scenario:',
      'use case',
      'workflow:',
      'as a',
      'given that'
    ];
    
    return journeyMarkers.some(marker => line.includes(marker));
  }

  private isStep(line: string): boolean {
    const stepMarkers = [
      /^\s*\d+\./,  // Numbered steps
      /^\s*-\s/,    // Bullet points
      /^\s*\*\s/,   // Asterisk bullets
      /^\s*step\s*\d+/i,
      /^\s*then\s/i,
      /^\s*when\s/i,
      /^\s*and\s/i
    ];
    
    return stepMarkers.some(pattern => pattern.test(line));
  }

  private isRequirement(line: string): boolean {
    const reqMarkers = [
      /req-\d+/i,
      /requirement\s*\d+/i,
      /^\s*-\s*req/i,
      /must\s/i,
      /should\s/i,
      /shall\s/i
    ];
    
    return reqMarkers.some(pattern => pattern.test(line));
  }

  private extractTitle(line: string): string {
    // Extract title from various header formats
    const cleaned = line.replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim();
    return cleaned.length > 0 ? cleaned : 'Untitled Journey';
  }

  private extractPersona(line: string): string {
    const personaPatterns = [
      /as\s+a\s+(\w+)/i,
      /(\w+)\s+journey/i,
      /(\w+)\s+user/i,
      /(\w+)\s+story/i
    ];
    
    for (const pattern of personaPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }
    
    // Default persona based on file path
    if (line.includes('child') || line.includes('kid')) return 'child';
    if (line.includes('parent') || line.includes('family')) return 'parent';
    if (line.includes('teacher') || line.includes('educator')) return 'educator';
    if (line.includes('admin') || line.includes('administrator')) return 'administrator';
    
    return 'user';
  }

  private generateJourneyId(line: string): string {
    const title = this.extractTitle(line);
    return title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  private cleanStep(line: string): string {
    return line.replace(/^\s*[\d\-\*]+\.?\s*/, '').trim();
  }

  private cleanRequirement(line: string): string {
    return line.replace(/^\s*[\-\*]\s*/, '').trim();
  }

  private finalizeJourney(journey: Partial<UserJourney>, filePath: string): void {
    if (journey.title && journey.steps && journey.steps.length > 0) {
      this.journeys.push(journey as UserJourney);
    }
  }

  private validateJourneys(): void {
    console.log('✅ Validating journey completeness...');
    
    // Check for essential personas
    const requiredPersonas = ['child', 'parent', 'educator', 'administrator'];
    const foundPersonas = [...new Set(this.journeys.map(j => j.persona))];
    
    for (const persona of requiredPersonas) {
      if (!foundPersonas.includes(persona)) {
        console.warn(`⚠️ Missing journeys for persona: ${persona}`);
      }
    }
    
    // Check for incomplete journeys
    const incompleteJourneys = this.journeys.filter(j => 
      j.steps.length < 3 || j.requirements.length === 0
    );
    
    if (incompleteJourneys.length > 0) {
      console.warn(`⚠️ Found ${incompleteJourneys.length} incomplete journeys`);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('📝 Generating user journey report...');
    
    const journeysByPersona: { [persona: string]: UserJourney[] } = {};
    
    for (const journey of this.journeys) {
      if (!journeysByPersona[journey.persona]) {
        journeysByPersona[journey.persona] = [];
      }
      journeysByPersona[journey.persona].push(journey);
    }
    
    const report: UserJourneyReport = {
      timestamp: new Date().toISOString(),
      totalJourneys: this.journeys.length,
      journeysByPersona,
      coverage: {
        specFiles: this.specFiles.length,
        journeysFound: this.journeys.length,
        personasIdentified: Object.keys(journeysByPersona)
      },
      validation: {
        missingJourneys: this.findMissingJourneys(),
        incompleteJourneys: this.findIncompleteJourneys(),
        recommendations: this.generateRecommendations()
      }
    };
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write JSON report
    const reportPath = path.join(logsDir, 'user_journeys.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 User journey report written to: ${reportPath}`);
  }

  private findMissingJourneys(): string[] {
    const requiredJourneys = [
      'child_story_creation',
      'parent_account_setup',
      'educator_classroom_integration',
      'administrator_system_management'
    ];
    
    const existingJourneyIds = this.journeys.map(j => j.id);
    
    return requiredJourneys.filter(required => 
      !existingJourneyIds.some(existing => existing.includes(required.split('_')[1]))
    );
  }

  private findIncompleteJourneys(): string[] {
    return this.journeys
      .filter(j => j.steps.length < 3 || j.requirements.length === 0)
      .map(j => j.id);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.journeys.length < 10) {
      recommendations.push('Consider adding more detailed user journeys for comprehensive coverage');
    }
    
    const personaCount = new Set(this.journeys.map(j => j.persona)).size;
    if (personaCount < 4) {
      recommendations.push('Add journeys for missing personas (child, parent, educator, administrator)');
    }
    
    recommendations.push('Validate journeys against actual user behavior data');
    recommendations.push('Update journeys based on usability testing feedback');
    recommendations.push('Ensure all journeys have corresponding test cases');
    
    return recommendations;
  }
}

// Run the extractor
if (require.main === module) {
  const extractor = new UserJourneyExtractor();
  extractor.run().catch(console.error);
}

export { UserJourneyExtractor };