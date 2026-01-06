#!/usr/bin/env ts-node

/**
 * Blocked Terms Extraction Script - V2 Build Pipeline Requirement
 * 
 * This script extracts forbidden terms from specs and generates
 * /logs/blocked_terms.json for personality enforcement middleware.
 * 
 * Requirements addressed:
 * - Extract forbidden terms from spec files
 * - Generate comprehensive blocked terms list
 * - Support ERR_FORBIDDEN_TERM validation
 * - Enable personality enforcement middleware
 */

import * as fs from 'fs';
import * as path from 'path';

// Use require for modules without types
const glob = require('glob');

interface BlockedTerm {
  term: string;
  category: 'ai_terminology' | 'business_jargon' | 'technical_jargon' | 'inappropriate_content' | 'brand_violation';
  severity: 'error' | 'warning' | 'info';
  replacement?: string;
  context?: string;
  source: string;
  line: number;
}

interface BlockedTermsReport {
  timestamp: string;
  totalTerms: number;
  termsByCategory: { [category: string]: BlockedTerm[] };
  termsBySeverity: { [severity: string]: number };
  sources: {
    specFiles: number;
    termsExtracted: number;
    categoriesFound: string[];
  };
  enforcement: {
    errorTerms: string[];
    warningTerms: string[];
    replacementSuggestions: { [term: string]: string };
  };
  validation: {
    duplicates: string[];
    recommendations: string[];
  };
}

class BlockedTermsExtractor {
  private blockedTerms: BlockedTerm[] = [];
  private specFiles: string[] = [];
  
  // Predefined blocked terms from V2 personality requirements
  private predefinedTerms: Omit<BlockedTerm, 'source' | 'line'>[] = [
    // AI Terminology (forbidden per V2 requirements)
    { term: 'AI', category: 'ai_terminology', severity: 'error', replacement: 'Story Intelligence™' },
    { term: 'AI-powered', category: 'ai_terminology', severity: 'error', replacement: 'SI Powered' },
    { term: 'AI-driven', category: 'ai_terminology', severity: 'error', replacement: 'SI Enhanced' },
    { term: 'AI-led', category: 'ai_terminology', severity: 'error', replacement: 'SI Guided' },
    { term: 'artificial intelligence', category: 'ai_terminology', severity: 'error', replacement: 'Story Intelligence™' },
    { term: 'machine learning', category: 'ai_terminology', severity: 'error', replacement: 'adaptive learning' },
    { term: 'algorithm', category: 'ai_terminology', severity: 'error', replacement: 'story engine' },
    { term: 'GPT', category: 'ai_terminology', severity: 'error', replacement: 'Story Intelligence™' },
    { term: 'LLM', category: 'ai_terminology', severity: 'error', replacement: 'Story Intelligence™' },
    { term: 'large language model', category: 'ai_terminology', severity: 'error', replacement: 'Story Intelligence™' },
    
    // Business Jargon (conflicts with young energetic mentor archetype)
    { term: 'personalized', category: 'business_jargon', severity: 'warning', replacement: 'tailored for you' },
    { term: 'leverage', category: 'business_jargon', severity: 'warning', replacement: 'use' },
    { term: 'synergy', category: 'business_jargon', severity: 'warning', replacement: 'working together' },
    { term: 'optimize', category: 'business_jargon', severity: 'warning', replacement: 'improve' },
    { term: 'utilize', category: 'business_jargon', severity: 'warning', replacement: 'use' },
    { term: 'facilitate', category: 'business_jargon', severity: 'warning', replacement: 'help' },
    { term: 'implement', category: 'business_jargon', severity: 'warning', replacement: 'create' },
    
    // Technical Jargon (conflicts with child-friendly communication)
    { term: 'API', category: 'technical_jargon', severity: 'info', replacement: 'connection' },
    { term: 'database', category: 'technical_jargon', severity: 'info', replacement: 'story library' },
    { term: 'server', category: 'technical_jargon', severity: 'info', replacement: 'story home' },
    { term: 'endpoint', category: 'technical_jargon', severity: 'info', replacement: 'connection point' },
    { term: 'authentication', category: 'technical_jargon', severity: 'info', replacement: 'sign in' },
    
    // Brand Violations (must use correct terminology)
    { term: 'Storyteller', category: 'brand_violation', severity: 'error', replacement: 'Storytailor' },
    { term: 'Story Teller', category: 'brand_violation', severity: 'error', replacement: 'Storytailor' },
    { term: 'AI storytelling', category: 'brand_violation', severity: 'error', replacement: 'Story Intelligence™ storytelling' }
  ];

  async run(): Promise<void> {
    console.log('🚫 Starting Blocked Terms Extraction...');
    
    try {
      // Step 1: Add predefined terms
      this.addPredefinedTerms();
      
      // Step 2: Find spec files
      await this.findSpecFiles();
      
      // Step 3: Extract terms from specs
      await this.extractTermsFromSpecs();
      
      // Step 4: Validate and deduplicate
      this.validateTerms();
      
      // Step 5: Generate report
      await this.generateReport();
      
      console.log(`✅ Extracted ${this.blockedTerms.length} blocked terms from ${this.specFiles.length} sources`);
      
    } catch (error) {
      console.error('❌ Blocked terms extraction failed:', error);
      process.exit(1);
    }
  }

  private addPredefinedTerms(): void {
    console.log('📋 Adding predefined blocked terms...');
    
    for (const term of this.predefinedTerms) {
      this.blockedTerms.push({
        ...term,
        source: 'predefined_v2_requirements',
        line: 0
      });
    }
  }

  private async findSpecFiles(): Promise<void> {
    console.log('📁 Finding spec and documentation files...');
    
    const patterns = [
      '.kiro/specs/**/*.md',
      'docs/**/*.md',
      'README*.md',
      'STORYTAILOR_DEVELOPER_DOCUMENTATION/**/*.md',
      'packages/*/README.md'
    ];
    
    for (const pattern of patterns) {
      const files = await new Promise<string[]>((resolve, reject) => {
        glob(pattern, { cwd: process.cwd() }, (err: any, matches: string[]) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      this.specFiles.push(...files);
    }
    
    console.log(`📊 Found ${this.specFiles.length} documentation files`);
  }

  private async extractTermsFromSpecs(): Promise<void> {
    console.log('🔍 Extracting blocked terms from documentation...');
    
    for (const specFile of this.specFiles) {
      await this.parseSpecFile(specFile);
    }
  }

  private async parseSpecFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Look for explicit blocked term definitions
        if (this.isBlockedTermDefinition(lowerLine)) {
          const term = this.extractBlockedTerm(line);
          if (term) {
            this.blockedTerms.push({
              ...term,
              source: filePath,
              line: i + 1
            });
          }
        }
        
        // Look for forbidden language patterns
        const forbiddenPatterns = this.findForbiddenPatterns(line);
        for (const pattern of forbiddenPatterns) {
          this.blockedTerms.push({
            term: pattern.term,
            category: pattern.category,
            severity: pattern.severity,
            replacement: pattern.replacement,
            context: line.trim(),
            source: filePath,
            line: i + 1
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not parse file: ${filePath}`);
    }
  }

  private isBlockedTermDefinition(line: string): boolean {
    const markers = [
      'forbidden',
      'blocked',
      'banned',
      'prohibited',
      'not allowed',
      'avoid using',
      'do not use',
      'err_forbidden_term'
    ];
    
    return markers.some(marker => line.includes(marker));
  }

  private extractBlockedTerm(line: string): Omit<BlockedTerm, 'source' | 'line'> | null {
    // Extract terms from various formats
    const patterns = [
      /"([^"]+)"/,  // Quoted terms
      /'([^']+)'/,  // Single quoted terms
      /`([^`]+)`/,  // Backtick terms
      /\*([^*]+)\*/ // Asterisk terms
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          term: match[1],
          category: this.categorizeFromContext(line),
          severity: this.getSeverityFromContext(line),
          replacement: this.extractReplacement(line)
        };
      }
    }
    
    return null;
  }

  private findForbiddenPatterns(line: string): Array<{
    term: string;
    category: BlockedTerm['category'];
    severity: BlockedTerm['severity'];
    replacement?: string;
  }> {
    const patterns: Array<{
      term: string;
      category: BlockedTerm['category'];
      severity: BlockedTerm['severity'];
      replacement?: string;
    }> = [];
    
    // Check for AI terminology in content
    const aiTerms = ['artificial intelligence', 'machine learning', 'deep learning', 'neural network'];
    for (const term of aiTerms) {
      if (line.toLowerCase().includes(term)) {
        patterns.push({
          term,
          category: 'ai_terminology',
          severity: 'error',
          replacement: 'Story Intelligence™'
        });
      }
    }
    
    // Check for business jargon
    const businessJargon = ['leverage', 'synergy', 'optimize', 'utilize', 'facilitate'];
    for (const term of businessJargon) {
      if (line.toLowerCase().includes(term)) {
        patterns.push({
          term,
          category: 'business_jargon',
          severity: 'warning'
        });
      }
    }
    
    return patterns;
  }

  private categorizeFromContext(line: string): BlockedTerm['category'] {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('ai') || lowerLine.includes('artificial') || lowerLine.includes('machine')) {
      return 'ai_terminology';
    }
    if (lowerLine.includes('business') || lowerLine.includes('corporate')) {
      return 'business_jargon';
    }
    if (lowerLine.includes('technical') || lowerLine.includes('code')) {
      return 'technical_jargon';
    }
    if (lowerLine.includes('brand') || lowerLine.includes('trademark')) {
      return 'brand_violation';
    }
    
    return 'inappropriate_content';
  }

  private getSeverityFromContext(line: string): BlockedTerm['severity'] {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('error') || lowerLine.includes('forbidden') || lowerLine.includes('banned')) {
      return 'error';
    }
    if (lowerLine.includes('warning') || lowerLine.includes('avoid')) {
      return 'warning';
    }
    
    return 'info';
  }

  private extractReplacement(line: string): string | undefined {
    const replacementPatterns = [
      /replace with "([^"]+)"/i,
      /use "([^"]+)" instead/i,
      /instead use "([^"]+)"/i,
      /→ "([^"]+)"/,
      /-> "([^"]+)"/
    ];
    
    for (const pattern of replacementPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }

  private validateTerms(): void {
    console.log('✅ Validating and deduplicating terms...');
    
    // Remove duplicates based on term and category
    const seen = new Set<string>();
    this.blockedTerms = this.blockedTerms.filter(term => {
      const key = `${term.term.toLowerCase()}_${term.category}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    // Sort by severity and term
    this.blockedTerms.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.term.localeCompare(b.term);
    });
  }

  private async generateReport(): Promise<void> {
    console.log('📝 Generating blocked terms report...');
    
    const termsByCategory: { [category: string]: BlockedTerm[] } = {};
    const termsBySeverity: { [severity: string]: number } = { error: 0, warning: 0, info: 0 };
    
    for (const term of this.blockedTerms) {
      if (!termsByCategory[term.category]) {
        termsByCategory[term.category] = [];
      }
      termsByCategory[term.category].push(term);
      termsBySeverity[term.severity]++;
    }
    
    const report: BlockedTermsReport = {
      timestamp: new Date().toISOString(),
      totalTerms: this.blockedTerms.length,
      termsByCategory,
      termsBySeverity,
      sources: {
        specFiles: this.specFiles.length,
        termsExtracted: this.blockedTerms.length,
        categoriesFound: Object.keys(termsByCategory)
      },
      enforcement: {
        errorTerms: this.blockedTerms
          .filter(t => t.severity === 'error')
          .map(t => t.term),
        warningTerms: this.blockedTerms
          .filter(t => t.severity === 'warning')
          .map(t => t.term),
        replacementSuggestions: this.blockedTerms
          .filter(t => t.replacement)
          .reduce((acc, t) => {
            acc[t.term] = t.replacement!;
            return acc;
          }, {} as { [term: string]: string })
      },
      validation: {
        duplicates: this.findDuplicates(),
        recommendations: this.generateRecommendations()
      }
    };
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write JSON report
    const reportPath = path.join(logsDir, 'blocked_terms.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Blocked terms report written to: ${reportPath}`);
    
    // Also write a simple list for middleware
    const simpleListPath = path.join(logsDir, 'forbidden_terms_list.txt');
    const simpleList = this.blockedTerms
      .filter(t => t.severity === 'error')
      .map(t => t.term)
      .join('\n');
    fs.writeFileSync(simpleListPath, simpleList);
    
    console.log(`📄 Simple forbidden terms list written to: ${simpleListPath}`);
  }

  private findDuplicates(): string[] {
    const termCounts: { [term: string]: number } = {};
    
    for (const blockedTerm of this.blockedTerms) {
      const key = blockedTerm.term.toLowerCase();
      termCounts[key] = (termCounts[key] || 0) + 1;
    }
    
    return Object.keys(termCounts).filter(term => termCounts[term] > 1);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const errorTerms = this.blockedTerms.filter(t => t.severity === 'error').length;
    if (errorTerms > 0) {
      recommendations.push(`Implement ERR_FORBIDDEN_TERM middleware to block ${errorTerms} error-level terms`);
    }
    
    const termsWithoutReplacements = this.blockedTerms.filter(t => !t.replacement).length;
    if (termsWithoutReplacements > 0) {
      recommendations.push(`Add replacement suggestions for ${termsWithoutReplacements} terms`);
    }
    
    recommendations.push('Integrate blocked terms validation into CI/CD pipeline');
    recommendations.push('Add real-time content filtering using this terms list');
    recommendations.push('Update personality enforcement middleware with latest terms');
    recommendations.push('Train content creators on forbidden terminology');
    
    return recommendations;
  }
}

// Run the extractor
if (require.main === module) {
  const extractor = new BlockedTermsExtractor();
  extractor.run().catch(console.error);
}

export { BlockedTermsExtractor };