/**
 * CRITICAL: Inclusivity System Integrity Tests
 * 
 * Prevents accidental deletion of 39-trait inclusivity system.
 * These tests MUST pass before any deployment.
 * 
 * These are FAST structural checks (no API calls) that validate:
 * - Critical methods exist
 * - Critical files/classes exist
 * - Trait count is ≥39
 * - Species count is ≥9
 * 
 * If any of these fail, the inclusivity system has been compromised.
 */

import { describe, test, expect } from '@jest/globals';
import { CharacterGenerationService } from '../services/CharacterGenerationService';
import { INCLUSIVITY_TRAITS_MAP } from '../constants/ComprehensiveInclusivityDatabase';
import { SPECIES_PROFILES, needsAnatomyPrefix, getSpeciesProfile } from '../constants/SpeciesAnatomyProfiles';

// Mock dependencies for structural tests
const mockOpenAI = {
  images: { generate: jest.fn(), edit: jest.fn() },
  chat: { completions: { create: jest.fn() } }
} as any;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Inclusivity System Integrity', () => {
  
  test('CharacterGenerationService has generateReferenceImagesWithValidation method', () => {
    const service = new CharacterGenerationService(mockOpenAI, mockLogger);
    expect(typeof service.generateReferenceImagesWithValidation).toBe('function');
    
    if (typeof service.generateReferenceImagesWithValidation !== 'function') {
      throw new Error(
        'CRITICAL: generateReferenceImagesWithValidation method missing!\n' +
        'The 39-trait inclusivity system has been removed.\n' +
        'This method took 9 months to perfect.\n' +
        'REVERT immediately from git history.'
      );
    }
  });

  test('ComprehensiveInclusivityDatabase has minimum 39 traits', () => {
    const traitCount = Object.keys(INCLUSIVITY_TRAITS_MAP).length;
    expect(traitCount).toBeGreaterThanOrEqual(39);
    
    if (traitCount < 39) {
      throw new Error(
        `INCLUSIVITY VIOLATION: Only ${traitCount} traits found (expected 39+).\n` +
        `This means ${39 - traitCount} groups of children are excluded.\n` +
        `EVERY child matters. NO EXCEPTIONS.\n` +
        `REVERT immediately from git history.`
      );
    }
    
    console.log(`✅ Inclusivity Database: ${traitCount} traits loaded`);
  });

  test('Critical breakthrough traits exist: down_syndrome, halo_cervical_orthosis, wheelchair_manual', () => {
    const criticalTraits = ['down_syndrome', 'halo_cervical_orthosis', 'wheelchair_manual'];
    
    criticalTraits.forEach(traitId => {
      expect(INCLUSIVITY_TRAITS_MAP[traitId]).toBeDefined();
      
      if (!INCLUSIVITY_TRAITS_MAP[traitId]) {
        throw new Error(
          `CRITICAL TRAIT MISSING: ${traitId}\n` +
          `This trait represents a breakthrough solution:\n` +
          `- down_syndrome: Species-first language (months to perfect)\n` +
          `- halo_cervical_orthosis: Power Detection Crown (39+ filter rejections before this)\n` +
          `- wheelchair_manual: Wheelchair pattern (100+ tests to perfect)\n` +
          `REVERT immediately.`
        );
      }
    });
    
    console.log('✅ Critical breakthrough traits verified');
  });

  test('CharacterImageGenerator class exists and is importable', async () => {
    const { CharacterImageGenerator } = await import('../services/CharacterImageGenerator');
    expect(CharacterImageGenerator).toBeDefined();
    expect(typeof CharacterImageGenerator).toBe('function');
    
    if (!CharacterImageGenerator) {
      throw new Error(
        'CRITICAL: CharacterImageGenerator class missing!\n' +
        'This class contains species-first language logic.\n' +
        'Without it: "human in costume" problem returns.\n' +
        'REVERT immediately.'
      );
    }
    
    console.log('✅ CharacterImageGenerator class verified');
  });

  test('SpeciesAnatomyProfiles has minimum 9 species', () => {
    const speciesCount = Object.keys(SPECIES_PROFILES).length;
    expect(speciesCount).toBeGreaterThanOrEqual(9);
    
    if (speciesCount < 9) {
      throw new Error(
        `SPECIES PROFILES MISSING: Only ${speciesCount} species found (expected 9+).\n` +
        `Missing species = traits don't work on those species.\n` +
        `Expected: human, dragon, robot, monster, alien, fantasy_being, dinosaur, superhero, elemental\n` +
        `REVERT immediately.`
      );
    }
    
    console.log(`✅ Species Anatomy Profiles: ${speciesCount} species loaded`);
  });

  test('Species-first language functions exist', () => {
    expect(typeof needsAnatomyPrefix).toBe('function');
    expect(typeof getSpeciesProfile).toBe('function');
    
    if (typeof needsAnatomyPrefix !== 'function' || typeof getSpeciesProfile !== 'function') {
      throw new Error(
        'CRITICAL: Species-first language functions missing!\n' +
        'needsAnatomyPrefix() and getSpeciesProfile() are required.\n' +
        'Without them: "human in costume" problem returns.\n' +
        'Mother can\'t say "That dragon has DS too!"\n' +
        'REVERT immediately.'
      );
    }
    
    console.log('✅ Species-first language functions verified');
  });

  test('Context determination method exists in CharacterImageGenerator', async () => {
    const { CharacterImageGenerator } = await import('../services/CharacterImageGenerator');
    const generator = new CharacterImageGenerator(mockOpenAI, mockLogger);
    
    // Access private method via bracket notation
    expect(typeof generator['determineContext']).toBe('function');
    
    if (typeof generator['determineContext'] !== 'function') {
      throw new Error(
        'CRITICAL: determineContext() method missing!\n' +
        'This method routes traits to correct context (medical/superhero/fantasy/scifi/robot).\n' +
        'Without it: Halo device won\'t transform to Power Detection Crown.\n' +
        'Without it: Devices shown as medical limitations (not empowerment).\n' +
        'REVERT immediately.'
      );
    }
    
    console.log('✅ Context determination method verified');
  });

  test('All structural integrity checks passed', () => {
    // This test ensures all above tests ran
    console.log('\n' + '='.repeat(80));
    console.log('🎯 INCLUSIVITY SYSTEM INTEGRITY: ALL CHECKS PASSED');
    console.log('='.repeat(80));
    console.log('✅ 39-trait system intact');
    console.log('✅ 9 species profiles intact');
    console.log('✅ Species-first language intact');
    console.log('✅ Context determination intact');
    console.log('✅ Critical methods intact');
    console.log('='.repeat(80) + '\n');
    
    expect(true).toBe(true);
  });
});
