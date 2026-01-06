export interface CulturalContext {
  primaryLanguage: string;
  secondaryLanguages?: string[];
  culturalBackground: string[];
  religiousConsiderations?: string[];
  familyStructure: FamilyStructure;
  celebrationsAndHolidays: string[];
  storytellingTraditions: string[];
  tabooTopics?: string[];
  preferredNarrativeStyles: string[];
}

export interface FamilyStructure {
  type: 'nuclear' | 'extended' | 'single_parent' | 'blended' | 'multigenerational' | 'chosen_family' | 'other';
  parentTerms: {
    mother: string[];
    father: string[];
    parent: string[];
  };
  siblingTerms: {
    brother: string[];
    sister: string[];
    sibling: string[];
  };
  extendedFamilyTerms: {
    grandmother: string[];
    grandfather: string[];
    aunt: string[];
    uncle: string[];
    cousin: string[];
  };
}

export interface LanguageProfile {
  code: string; // ISO 639-1 language code
  name: string;
  nativeName: string;
  rtl: boolean; // Right-to-left writing system
  formality: 'formal' | 'informal' | 'mixed';
  dialectVariant?: string;
  proficiencyLevel: 'native' | 'fluent' | 'intermediate' | 'beginner';
}

export interface CulturalCharacterTrait {
  trait: string;
  culturalVariations: {
    [culturalContext: string]: {
      appropriateValues: string[];
      inappropriateValues: string[];
      culturalNotes: string;
    };
  };
}

export interface StorytellingTradition {
  name: string;
  culturalOrigin: string[];
  narrativeStructure: string;
  commonThemes: string[];
  characterArchetypes: string[];
  moralFramework: string;
  adaptationGuidelines: string[];
}

export interface CulturalSensitivityFilter {
  culturalContext: string;
  sensitiveTopics: string[];
  appropriateAlternatives: { [topic: string]: string[] };
  respectfulLanguage: { [context: string]: string[] };
  avoidancePatterns: string[];
}

export interface LocalizationRequest {
  userId: string;
  content: string;
  contentType: 'story' | 'character_description' | 'dialogue' | 'narrative' | 'activity';
  targetLanguage: string;
  culturalContext: CulturalContext;
  preserveOriginalMeaning: boolean;
  adaptForCulture: boolean;
}

export interface LocalizationResponse {
  localizedContent: string;
  culturalAdaptations: string[];
  languageNotes: string[];
  confidenceScore: number;
  alternativeVersions?: string[];
}

export interface DynamicLanguageSwitchRequest {
  userId: string;
  currentLanguage: string;
  targetLanguage: string;
  storyContext: any;
  characterContext: any;
  switchReason: 'user_request' | 'cultural_appropriateness' | 'educational_purpose';
}

export interface CulturalCharacterGenerationRequest {
  userId: string;
  culturalBackground: string[];
  characterTraits: any;
  storyContext: any;
  respectCulturalNorms: boolean;
}

export interface CulturalCharacterGenerationResponse {
  adaptedCharacter: any;
  culturalConsiderations: string[];
  respectfulRepresentation: boolean;
  suggestedModifications: string[];
}

export interface ReligiousSensitivityCheck {
  content: string;
  religiousContext: string[];
  sensitivityLevel: 'high' | 'medium' | 'low';
}

export interface ReligiousSensitivityResult {
  isAppropriate: boolean;
  concerns: string[];
  suggestions: string[];
  alternativeContent?: string;
}

export interface FamilyStructureAdaptation {
  originalContent: string;
  targetFamilyStructure: FamilyStructure;
  culturalContext: string;
}

export interface FamilyStructureAdaptationResult {
  adaptedContent: string;
  changesExplanation: string[];
  culturallyAppropriate: boolean;
}

// Enhanced Cultural Intelligence Types
export interface CulturalSymbol {
  symbol: string;
  culturalOrigin: string[];
  meaning: string;
  appropriateContexts: string[];
  inappropriateContexts: string[];
  respectfulUsage: string[];
  modernAdaptations: string[];
}

export interface CulturalArchetype {
  name: string;
  culturalOrigin: string[];
  characteristics: string[];
  modernInterpretations: string[];
  respectfulPortrayal: string[];
  avoidStereotypes: string[];
  positiveTraits: string[];
  culturalSignificance: string;
}

export interface StoryElementAnalysis {
  element: string;
  culturalAppropriateness: {
    [culture: string]: {
      appropriate: boolean;
      concerns: string[];
      suggestions: string[];
      alternatives: string[];
    };
  };
  universalThemes: string[];
  culturalSpecificAdaptations: {
    [culture: string]: string;
  };
}

export interface CulturalCelebration {
  name: string;
  culturalOrigin: string[];
  date: string | 'variable';
  significance: string;
  traditionalElements: string[];
  modernCelebrations: string[];
  childFriendlyActivities: string[];
  storyThemes: string[];
  respectfulInclusion: string[];
}

export interface CrossCulturalInteraction {
  cultures: string[];
  interactionType: 'friendship' | 'learning' | 'celebration' | 'conflict_resolution' | 'collaboration';
  commonGround: string[];
  culturalDifferences: string[];
  bridgingElements: string[];
  learningOpportunities: string[];
  respectfulExchange: string[];
}

// Multi-Language Support Types
export interface AccentDialectProfile {
  language: string;
  region: string;
  accentName: string;
  characteristics: string[];
  pronunciationNotes: string[];
  culturalContext: string[];
  appropriateUsage: string[];
  childFriendlyFeatures: string[];
}

export interface BilingualStorytellingRequest {
  primaryLanguage: string;
  secondaryLanguage: string;
  storyContent: any;
  switchingStrategy: 'alternating_sentences' | 'alternating_paragraphs' | 'character_based' | 'theme_based' | 'educational_moments';
  educationalGoals: string[];
  targetAge: number;
  culturalContext: CulturalContext;
}

export interface BilingualStorytellingResponse {
  bilingualContent: string;
  languageSwitchPoints: {
    position: number;
    fromLanguage: string;
    toLanguage: string;
    reason: string;
    educationalNote?: string;
  }[];
  vocabularyHighlights: {
    [language: string]: string[];
  };
  culturalBridges: string[];
  learningObjectives: string[];
}

export interface CodeSwitchingRequest {
  familyLanguages: string[];
  dominantLanguage: string;
  storyContext: any;
  switchingTriggers: ('emotional_moments' | 'cultural_references' | 'family_interactions' | 'educational_opportunities')[];
  naturalness: 'high' | 'medium' | 'low';
}

export interface CodeSwitchingResponse {
  codeSwitchedContent: string;
  switchingPatterns: {
    trigger: string;
    languages: string[];
    context: string;
    naturalness: number;
  }[];
  familyLanguageBalance: {
    [language: string]: number; // percentage
  };
  culturalAuthenticity: number;
}

export interface LanguageLearningIntegration {
  targetLanguage: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  interactiveElements: {
    type: 'vocabulary_practice' | 'pronunciation_guide' | 'grammar_point' | 'cultural_note';
    content: string;
    position: number;
  }[];
  assessmentOpportunities: {
    type: 'comprehension_check' | 'vocabulary_quiz' | 'pronunciation_practice';
    content: string;
    expectedResponse: string;
  }[];
}

export interface CulturallyAdaptedTranslation {
  originalText: string;
  targetLanguage: string;
  culturalContext: string[];
  translationApproach: 'literal' | 'cultural_adaptation' | 'localization' | 'transcreation';
  adaptedTranslation: string;
  culturalNotes: string[];
  alternativeVersions: {
    approach: string;
    translation: string;
    reasoning: string;
  }[];
}

// Cultural Storytelling Preservation Types
export interface TraditionalNarrativeStructure {
  name: string;
  culturalOrigin: string[];
  structureType: 'linear' | 'circular' | 'spiral' | 'nested' | 'episodic' | 'call_response';
  phases: {
    name: string;
    purpose: string;
    characteristics: string[];
    modernAdaptation: string;
  }[];
  audienceParticipation: {
    type: 'call_response' | 'repetition' | 'prediction' | 'physical_movement' | 'singing';
    description: string;
    modernImplementation: string;
  }[];
  culturalSignificance: string;
  preservationPriority: 'critical' | 'important' | 'valuable';
}

export interface OralTraditionPattern {
  tradition: string;
  culturalContext: string[];
  oralElements: {
    rhythm: string;
    repetition: string[];
    memorabilityFeatures: string[];
    voiceModulation: string[];
  };
  communityRole: {
    storyteller: string;
    audience: string;
    setting: string;
    purpose: string;
  };
  preservationMethods: {
    traditional: string[];
    modern: string[];
    digital: string[];
  };
  adaptationGuidelines: string[];
}

export interface CulturalMythologyIntegration {
  mythology: string;
  culturalOrigin: string[];
  coreMyths: {
    name: string;
    significance: string;
    keyElements: string[];
    moralLessons: string[];
    modernRelevance: string;
  }[];
  respectfulAdaptation: {
    guidelines: string[];
    taboos: string[];
    appropriateContexts: string[];
    collaborationRequirements: string[];
  };
  educationalValue: string[];
  childFriendlyVersions: {
    ageGroup: string;
    adaptations: string[];
    focusPoints: string[];
  }[];
}

export interface IndigenousStorytellingMethod {
  method: string;
  indigenousGroup: string[];
  traditionalPractices: {
    setting: string;
    timing: string;
    participants: string[];
    ritualElements: string[];
  };
  storytellingTechniques: {
    voiceWork: string[];
    bodyLanguage: string[];
    props: string[];
    environmentalElements: string[];
  };
  culturalProtocols: {
    permissions: string[];
    restrictions: string[];
    respectfulPractices: string[];
    collaborationRequirements: string[];
  };
  modernAdaptation: {
    preservedElements: string[];
    adaptedElements: string[];
    technologyIntegration: string[];
    educationalFramework: string[];
  };
}

export interface CommunityStorytellingTradition {
  community: string;
  geographicOrigin: string[];
  traditionName: string;
  communityRole: {
    storytellers: string[];
    audienceParticipation: string[];
    settingImportance: string;
    seasonalAspects: string[];
  };
  preservationEfforts: {
    currentStatus: 'thriving' | 'declining' | 'endangered' | 'revitalization';
    preservationMethods: string[];
    communityInvolvement: string[];
    documentationNeeds: string[];
  };
  modernRelevance: {
    educationalValue: string[];
    culturalContinuity: string[];
    communityBuilding: string[];
    childDevelopment: string[];
  };
  integrationStrategies: {
    schoolPrograms: string[];
    familyActivities: string[];
    communityEvents: string[];
    digitalPreservation: string[];
  };
}

export interface StorytellingTraditionDocumentation {
  tradition: string;
  culturalContext: string[];
  documentation: {
    oralHistory: {
      interviews: string[];
      recordings: string[];
      transcriptions: string[];
    };
    practicalElements: {
      techniques: string[];
      props: string[];
      settings: string[];
      timing: string[];
    };
    culturalContext: {
      significance: string[];
      taboos: string[];
      protocols: string[];
      permissions: string[];
    };
  };
  preservationPlan: {
    immediateActions: string[];
    longTermGoals: string[];
    communityInvolvement: string[];
    educationalIntegration: string[];
  };
  accessibilityConsiderations: {
    ageAppropriate: { [ageGroup: string]: string[] };
    culturalSensitivity: string[];
    modernAdaptations: string[];
  };
}