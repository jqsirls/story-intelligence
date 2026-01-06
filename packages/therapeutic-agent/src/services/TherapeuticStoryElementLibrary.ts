import { TherapeuticStoryElement, TherapeuticCondition } from '../types';

export class TherapeuticStoryElementLibrary {
  private elements: Map<string, TherapeuticStoryElement> = new Map();

  constructor() {
    this.initializeResearchBasedElements();
  }

  private initializeResearchBasedElements(): void {
    // Anxiety-focused elements
    this.addElement({
      type: 'coping_strategy',
      name: 'worry_time',
      description: 'Designated time for worrying, then letting go',
      therapeuticPurpose: 'Contain anxiety to specific times, reduce rumination',
      ageAdaptations: {
        '4-6': 'Worry monster gets fed once a day, then goes to sleep',
        '7-9': 'Set timer for 10 minutes of worry time, then do fun activity',
        '10-12': 'Schedule specific worry periods, practice thought stopping'
      },
      culturalConsiderations: [
        'Cultural attitudes toward expressing worry',
        'Family communication patterns',
        'Religious or spiritual coping mechanisms'
      ]
    });

    this.addElement({
      type: 'metaphor',
      name: 'worry_clouds',
      description: 'Worries are like clouds that pass through the sky',
      therapeuticPurpose: 'Normalize temporary nature of anxious thoughts',
      ageAdaptations: {
        '4-6': 'Worry clouds float away when we blow them',
        '7-9': 'Storm clouds bring rain but always pass',
        '10-12': 'Weather patterns change, thoughts are temporary'
      },
      culturalConsiderations: [
        'Cultural weather metaphors',
        'Seasonal associations with emotions'
      ]
    });

    this.addElement({
      type: 'character_trait',
      name: 'anxiety_superhero',
      description: 'Character who uses anxiety as a superpower for preparation',
      therapeuticPurpose: 'Reframe anxiety as potentially helpful, build self-efficacy',
      ageAdaptations: {
        '4-6': 'Careful Cat who notices dangers and keeps friends safe',
        '7-9': 'Worry Warrior who prepares for challenges',
        '10-12': 'Anxiety Avenger who channels worry into helpful action'
      },
      culturalConsiderations: [
        'Cultural hero archetypes',
        'Values around caution vs. risk-taking'
      ]
    });

    // Grief-focused elements
    this.addElement({
      type: 'metaphor',
      name: 'memory_garden',
      description: 'Memories of loved ones grow like flowers in a garden',
      therapeuticPurpose: 'Maintain connection to deceased, honor relationship',
      ageAdaptations: {
        '3-5': 'Plant flowers that remind us of special person',
        '6-8': 'Tend garden of memories with stories and pictures',
        '9-12': 'Cultivate legacy garden with values and lessons learned'
      },
      culturalConsiderations: [
        'Cultural mourning rituals',
        'Religious beliefs about afterlife',
        'Family traditions around remembrance'
      ]
    });

    this.addElement({
      type: 'plot_device',
      name: 'grief_waves',
      description: 'Grief comes in waves - sometimes big, sometimes small',
      therapeuticPurpose: 'Normalize fluctuating grief intensity, provide hope',
      ageAdaptations: {
        '3-5': 'Sad feelings come and go like ocean waves',
        '6-8': 'Some days waves are big, some days calm',
        '9-12': 'Learning to surf the waves of grief'
      },
      culturalConsiderations: [
        'Cultural expressions of grief',
        'Acceptable timeframes for mourning'
      ]
    });

    this.addElement({
      type: 'coping_strategy',
      name: 'memory_box',
      description: 'Special container for keeping precious memories safe',
      therapeuticPurpose: 'Provide concrete way to honor and access memories',
      ageAdaptations: {
        '3-5': 'Magic box that keeps happy memories safe',
        '6-8': 'Treasure chest of special moments and objects',
        '9-12': 'Memory archive with photos, letters, and mementos'
      },
      culturalConsiderations: [
        'Cultural objects of significance',
        'Family heirlooms and traditions'
      ]
    });

    // Social skills elements
    this.addElement({
      type: 'plot_device',
      name: 'friendship_recipe',
      description: 'Making friends follows steps like cooking a recipe',
      therapeuticPurpose: 'Provide concrete steps for social interaction',
      ageAdaptations: {
        '4-6': 'Mix kindness, sharing, and smiles to make friends',
        '7-9': 'Recipe includes listening, helping, and playing together',
        '10-12': 'Complex recipe with trust, loyalty, and support'
      },
      culturalConsiderations: [
        'Cultural norms for friendship',
        'Family values around relationships'
      ]
    });

    this.addElement({
      type: 'character_trait',
      name: 'empathy_detective',
      description: 'Character who notices and understands others\' feelings',
      therapeuticPurpose: 'Develop emotional intelligence and perspective-taking',
      ageAdaptations: {
        '4-6': 'Feeling Detective notices happy and sad faces',
        '7-9': 'Emotion Explorer discovers why friends feel different ways',
        '10-12': 'Empathy Expert understands complex social situations'
      },
      culturalConsiderations: [
        'Cultural expressions of emotion',
        'Family communication styles'
      ]
    });

    this.addElement({
      type: 'coping_strategy',
      name: 'social_scripts',
      description: 'Practice phrases for common social situations',
      therapeuticPurpose: 'Reduce social anxiety through preparation',
      ageAdaptations: {
        '4-6': 'Magic words for making friends: "Can I play?"',
        '7-9': 'Conversation starters and polite responses',
        '10-12': 'Scripts for complex social navigation'
      },
      culturalConsiderations: [
        'Cultural politeness norms',
        'Language and communication styles'
      ]
    });

    // Self-esteem elements
    this.addElement({
      type: 'metaphor',
      name: 'inner_light',
      description: 'Everyone has a special light inside that makes them unique',
      therapeuticPurpose: 'Build sense of inherent worth and uniqueness',
      ageAdaptations: {
        '5-7': 'Special sparkle that shines bright when we\'re kind',
        '8-10': 'Inner light grows brighter with each good deed',
        '11-12': 'Unique light contributes to the world\'s brightness'
      },
      culturalConsiderations: [
        'Spiritual or religious concepts of inner worth',
        'Cultural values around individuality vs. community'
      ]
    });

    this.addElement({
      type: 'plot_device',
      name: 'mistake_learning',
      description: 'Mistakes are opportunities to learn and grow',
      therapeuticPurpose: 'Reduce perfectionism, promote growth mindset',
      ageAdaptations: {
        '5-7': 'Oops moments help us learn new things',
        '8-10': 'Mistakes are stepping stones to success',
        '11-12': 'Failure is feedback for improvement'
      },
      culturalConsiderations: [
        'Cultural attitudes toward failure',
        'Family expectations and pressure'
      ]
    });

    this.addElement({
      type: 'character_trait',
      name: 'strength_collector',
      description: 'Character who notices and celebrates their own strengths',
      therapeuticPurpose: 'Build self-awareness and positive self-concept',
      ageAdaptations: {
        '5-7': 'Strength Spotter finds things they\'re good at',
        '8-10': 'Talent Tracker keeps list of abilities and skills',
        '11-12': 'Strength Strategist uses abilities to help others'
      },
      culturalConsiderations: [
        'Cultural values around self-promotion vs. humility',
        'Family recognition patterns'
      ]
    });

    // Trauma-informed elements
    this.addElement({
      type: 'metaphor',
      name: 'safe_harbor',
      description: 'Everyone needs a safe place to rest and feel protected',
      therapeuticPurpose: 'Establish safety as fundamental need and right',
      ageAdaptations: {
        '4-6': 'Cozy nest where little bird feels safe and warm',
        '7-9': 'Secret hideout where character can be themselves',
        '10-12': 'Safe harbor where ships rest during storms'
      },
      culturalConsiderations: [
        'Cultural concepts of safety and protection',
        'Family and community support systems'
      ],
      contraindications: ['Active safety concerns', 'Ongoing trauma exposure']
    });

    this.addElement({
      type: 'coping_strategy',
      name: 'body_signals',
      description: 'Learning to notice and respond to body\'s warning signals',
      therapeuticPurpose: 'Develop interoceptive awareness and self-regulation',
      ageAdaptations: {
        '4-6': 'Body tells us when we need help with special feelings',
        '7-9': 'Heart beats fast when scared, slow when calm',
        '10-12': 'Body compass guides us toward safety and comfort'
      },
      culturalConsiderations: [
        'Cultural attitudes toward body awareness',
        'Traditional healing practices'
      ]
    });

    // ADHD-specific elements
    this.addElement({
      type: 'character_trait',
      name: 'energetic_explorer',
      description: 'Character whose high energy leads to discoveries',
      therapeuticPurpose: 'Reframe hyperactivity as positive trait',
      ageAdaptations: {
        '4-6': 'Bouncy Bunny discovers new places by hopping around',
        '7-9': 'Energy Explorer finds adventures through movement',
        '10-12': 'Dynamic Detective solves mysteries through active investigation'
      },
      culturalConsiderations: [
        'Cultural values around activity levels',
        'Expectations for children\'s behavior'
      ]
    });

    this.addElement({
      type: 'coping_strategy',
      name: 'focus_games',
      description: 'Fun activities that build attention and concentration',
      therapeuticPurpose: 'Strengthen executive function through play',
      ageAdaptations: {
        '4-6': 'Attention games with favorite toys and characters',
        '7-9': 'Focus challenges with timers and rewards',
        '10-12': 'Concentration competitions and mindfulness exercises'
      },
      culturalConsiderations: [
        'Cultural games and activities',
        'Family play traditions'
      ]
    });

    // Autism-specific elements
    this.addElement({
      type: 'character_trait',
      name: 'pattern_master',
      description: 'Character who sees patterns and details others miss',
      therapeuticPurpose: 'Celebrate systematic thinking and attention to detail',
      ageAdaptations: {
        '4-6': 'Pattern Puppy notices shapes and colors everywhere',
        '7-9': 'Detail Detective finds important clues others miss',
        '10-12': 'System Specialist organizes complex information'
      },
      culturalConsiderations: [
        'Cultural values around different thinking styles',
        'Appreciation for unique perspectives'
      ]
    });

    this.addElement({
      type: 'plot_device',
      name: 'special_interests_power',
      description: 'Character\'s special interests become their superpower',
      therapeuticPurpose: 'Validate intense interests as strengths',
      ageAdaptations: {
        '4-6': 'Dinosaur expert helps friends learn about prehistoric times',
        '7-9': 'Train enthusiast uses knowledge to solve transportation problems',
        '10-12': 'Science specialist contributes unique expertise to team'
      },
      culturalConsiderations: [
        'Cultural attitudes toward specialized knowledge',
        'Value of expertise in community'
      ]
    });
  }

  private addElement(element: TherapeuticStoryElement): void {
    this.elements.set(element.name, element);
  }

  getElement(name: string): TherapeuticStoryElement | undefined {
    return this.elements.get(name);
  }

  getElementsByType(type: TherapeuticStoryElement['type']): TherapeuticStoryElement[] {
    return Array.from(this.elements.values()).filter(element => element.type === type);
  }

  getElementsByCondition(condition: TherapeuticCondition): TherapeuticStoryElement[] {
    // This would be enhanced with proper tagging system
    const conditionKeywords: Record<TherapeuticCondition, string[]> = {
      anxiety: ['worry', 'anxiety', 'fear', 'nervous'],
      grief: ['grief', 'loss', 'memory', 'death'],
      social_skills: ['friend', 'social', 'empathy', 'conversation'],
      self_esteem: ['strength', 'confidence', 'worth', 'mistake'],
      trauma: ['safe', 'body', 'protection', 'trust'],
      adhd: ['energy', 'focus', 'attention', 'movement'],
      autism: ['pattern', 'detail', 'interest', 'system'],
      depression: ['mood', 'hope', 'energy', 'joy'],
      anger_management: ['anger', 'calm', 'control', 'emotion'],
      separation_anxiety: ['separation', 'attachment', 'independence'],
      school_refusal: ['school', 'learning', 'courage', 'challenge'],
      bullying: ['bully', 'protect', 'stand up', 'support'],
      family_changes: ['change', 'family', 'adapt', 'stability'],
      medical_procedures: ['medical', 'brave', 'healing', 'comfort'],
      sleep_difficulties: ['sleep', 'rest', 'calm', 'bedtime']
    };

    const keywords = conditionKeywords[condition] || [];
    return Array.from(this.elements.values()).filter(element =>
      keywords.some(keyword =>
        element.name.toLowerCase().includes(keyword) ||
        element.description.toLowerCase().includes(keyword) ||
        element.therapeuticPurpose.toLowerCase().includes(keyword)
      )
    );
  }

  getElementsForAge(age: number): TherapeuticStoryElement[] {
    return Array.from(this.elements.values()).filter(element => {
      const ageRanges = Object.keys(element.ageAdaptations);
      return ageRanges.some(range => {
        const [min, max] = range.split('-').map(Number);
        return age >= min && age <= max;
      });
    });
  }

  getAllElements(): TherapeuticStoryElement[] {
    return Array.from(this.elements.values());
  }

  addCustomElement(element: TherapeuticStoryElement): void {
    this.elements.set(element.name, element);
  }

  validateElementForChild(
    elementName: string,
    age: number,
    culturalBackground: string[] = [],
    contraindications: string[] = []
  ): { valid: boolean; reasons: string[]; adaptations: string } {
    const element = this.getElement(elementName);
    if (!element) {
      return { valid: false, reasons: ['Element not found'], adaptations: '' };
    }

    const reasons: string[] = [];

    // Check age appropriateness
    const ageRanges = Object.keys(element.ageAdaptations);
    const appropriateRange = ageRanges.find(range => {
      const [min, max] = range.split('-').map(Number);
      return age >= min && age <= max;
    });

    if (!appropriateRange) {
      reasons.push(`No age-appropriate adaptation found for age ${age}`);
    }

    // Check contraindications
    if (element.contraindications) {
      const conflicts = element.contraindications.filter(contra =>
        contraindications.some(child => child.toLowerCase().includes(contra.toLowerCase()))
      );
      if (conflicts.length > 0) {
        reasons.push(`Contraindications present: ${conflicts.join(', ')}`);
      }
    }

    // Get cultural considerations
    const culturalNotes = element.culturalConsiderations.filter(consideration =>
      culturalBackground.some(bg => consideration.toLowerCase().includes(bg.toLowerCase()))
    );

    return {
      valid: reasons.length === 0,
      reasons,
      adaptations: appropriateRange ? element.ageAdaptations[appropriateRange] : ''
    };
  }

  searchElements(query: string): TherapeuticStoryElement[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.elements.values()).filter(element =>
      element.name.toLowerCase().includes(lowercaseQuery) ||
      element.description.toLowerCase().includes(lowercaseQuery) ||
      element.therapeuticPurpose.toLowerCase().includes(lowercaseQuery)
    );
  }
}