import { StoryType } from '@alexa-multi-agent/shared-types';
import { PromptTemplate, AgeGroup } from '../types';
import { Logger } from 'winston';

export class PromptSelector {
  private logger: Logger;
  private promptTemplates: Map<string, PromptTemplate>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.promptTemplates = new Map();
    this.initializePromptTemplates();
  }

  /**
   * Select appropriate prompt template based on story type and age
   */
  selectPromptTemplate(storyType: StoryType, age: number): PromptTemplate {
    const ageGroup = this.getAgeGroup(age);
    const key = `${storyType}_${ageGroup}`;
    
    const template = this.promptTemplates.get(key);
    if (!template) {
      this.logger.warn('Prompt template not found, using default', { storyType, age, ageGroup });
      return this.getDefaultTemplate(storyType, ageGroup);
    }

    this.logger.info('Prompt template selected', { storyType, age, ageGroup });
    return template;
  }

  /**
   * Get age-appropriate content filtering constraints
   */
  getAgeAppropriateConstraints(age: number): string[] {
    const ageGroup = this.getAgeGroup(age);
    
    const baseConstraints = [
      'Content must be positive and uplifting',
      'No violence or scary content',
      'Use simple, clear language',
      'Include moral lessons appropriate for children'
    ];

    switch (ageGroup) {
      case '3':
      case '4':
        return [
          ...baseConstraints,
          'Use very simple vocabulary (1-2 syllable words)',
          'Keep sentences short (5-8 words)',
          'Focus on basic emotions and concepts',
          'Include repetitive elements for engagement',
          'Avoid complex plot structures'
        ];
      
      case '5':
      case '6':
        return [
          ...baseConstraints,
          'Use elementary vocabulary with some new words',
          'Keep sentences moderate length (8-12 words)',
          'Introduce basic problem-solving concepts',
          'Include simple cause-and-effect relationships'
        ];
      
      case '7':
      case '8':
        return [
          ...baseConstraints,
          'Use age-appropriate vocabulary with explanations for new words',
          'Allow for more complex sentence structures',
          'Include mild challenges and obstacles',
          'Introduce basic emotional complexity'
        ];
      
      case '9+':
        return [
          ...baseConstraints,
          'Use rich vocabulary appropriate for reading level',
          'Allow for complex plot structures and character development',
          'Include meaningful challenges and growth opportunities',
          'Address more nuanced emotional themes'
        ];
      
      default:
        return baseConstraints;
    }
  }

  private getAgeGroup(age: number): AgeGroup {
    if (age <= 3) return '3';
    if (age <= 4) return '4';
    if (age <= 5) return '5';
    if (age <= 6) return '6';
    if (age <= 7) return '7';
    if (age <= 8) return '8';
    return '9+';
  }

  private initializePromptTemplates(): void {
    // Initialize all story type and age combinations
    const storyTypes: StoryType[] = [
      'Adventure', 'Bedtime', 'Birthday', 'Educational', 
      'Financial Literacy', 'Language Learning', 'Medical Bravery',
      'Mental Health', 'Milestones', 'New Chapter Sequel', 'Tech Readiness'
    ];

    const ageGroups: AgeGroup[] = ['3', '4', '5', '6', '7', '8', '9+'];

    storyTypes.forEach(storyType => {
      ageGroups.forEach(ageGroup => {
        const template = this.createPromptTemplate(storyType, ageGroup);
        this.promptTemplates.set(`${storyType}_${ageGroup}`, template);
      });
    });

    this.logger.info('Prompt templates initialized', { 
      totalTemplates: this.promptTemplates.size 
    });
  }

  private createPromptTemplate(storyType: StoryType, ageGroup: AgeGroup): PromptTemplate {
    const baseSystemPrompt = this.getBaseSystemPrompt(ageGroup);
    const storySpecificPrompt = this.getStorySpecificPrompt(storyType);
    const ageConstraints = this.getAgeAppropriateConstraints(parseInt(ageGroup.replace('+', '')));

    return {
      storyType,
      ageGroup,
      systemPrompt: `${baseSystemPrompt}\n\n${storySpecificPrompt}`,
      userPrompt: this.getUserPrompt(storyType, ageGroup),
      constraints: ageConstraints,
      examples: this.getExamples(storyType, ageGroup)
    };
  }

  private getBaseSystemPrompt(ageGroup: AgeGroup): string {
    return `You are a warm, whimsical, and emotionally intelligent storytelling assistant specialized in creating award-winning children's stories. You have high emotional EQ and use slightly nonsensical language that makes children giggle while maintaining story focus.

Your personality traits:
- Warm, friendly, young, and empathetic
- Uses whimsical language that delights children aged 10 and under
- Responds with empathy to children's emotions
- Builds confidence and excitement in hesitant children
- Maintains consistent warmth while never compromising story quality or safety

Age group: ${ageGroup} years old
- Adapt your language complexity and story elements to this age group
- Use age-appropriate vocabulary and sentence structures
- Include developmental considerations for this age range`;
  }

  private getStorySpecificPrompt(storyType: StoryType): string {
    const prompts: Record<StoryType, string> = {
      'Adventure': `Create exciting adventure stories with:
- Brave protagonists on thrilling journeys
- Safe but exciting challenges to overcome
- Exploration of new places and discoveries
- Positive problem-solving and teamwork
- Triumphant endings that celebrate courage`,

      'Bedtime': `Create calming bedtime stories with:
- Peaceful, soothing narratives
- Gentle characters and soft adventures
- Dreamy, magical elements
- Repetitive, rhythmic language
- Endings that promote relaxation and sleep`,

      'Birthday': `Create celebratory birthday stories with:
- Special occasion themes and celebrations
- Gift-giving, parties, and joyful moments
- Age-appropriate milestone recognition
- Friendship and family connections
- Magical birthday wishes coming true`,

      'Educational': `Create learning-focused stories with:
- Clear educational objectives woven into narrative
- Fun ways to explore academic concepts
- Characters who learn and grow through discovery
- Interactive elements that reinforce learning
- Positive attitudes toward knowledge and curiosity`,

      'Financial Literacy': `Create money-smart stories with:
- Age-appropriate financial concepts (saving, spending, sharing)
- Characters making good money decisions
- Simple lessons about needs vs. wants
- The value of work and earning
- Generosity and responsible money management`,

      'Language Learning': `Create language-rich stories with:
- Vocabulary building naturally integrated
- Repetition of new words in context
- Cultural elements from target language
- Interactive language practice opportunities
- Celebration of multilingual abilities`,

      'Medical Bravery': `Create supportive medical stories with:
- Characters facing medical procedures with courage
- Accurate but non-scary medical information
- Coping strategies for medical anxiety
- Healthcare workers as helpful heroes
- Positive outcomes and healing themes`,

      'Mental Health': `Create emotionally supportive stories with:
- Characters processing emotions in healthy ways
- Coping strategies for common childhood challenges
- Validation of feelings and experiences
- Building emotional resilience and self-awareness
- Professional help portrayed positively when needed`,

      'Milestones': `Create achievement celebration stories with:
- Recognition of personal growth and accomplishments
- Characters overcoming challenges to reach goals
- Family and community support for achievements
- Building confidence and self-esteem
- Inspiration for continued growth`,

      'New Chapter Sequel': `Create continuing stories with:
- Seamless continuation from previous story elements
- Character development and growth
- New adventures building on established relationships
- Consistency with previous story themes and tone
- Fresh challenges while maintaining familiar comfort`,

      'Tech Readiness': `Create technology-positive stories with:
- Age-appropriate introduction to digital concepts
- Safe and responsible technology use
- Characters using technology to solve problems
- Balance between digital and real-world activities
- Positive role models for digital citizenship`,

      'Child Loss': `Create therapeutic grief processing stories with:
- Gentle exploration of loss and remembrance
- Honoring the child's unique personality and impact
- Journey through grief toward healing and connection
- Safe emotional processing with grounding techniques
- Validation of complex emotions and experiences
- Symbols of enduring love and memory
- Age-appropriate language for the intended audience
- Professional therapeutic principles integrated naturally`,

      'Inner Child': `Create inner child healing stories with:
- Three-part narrative: inner child, adult self, and protector
- Journey of self-discovery and emotional integration
- Healing of childhood wounds and patterns
- Development of self-compassion and acceptance
- Transformation of protective mechanisms into allies
- Empowerment through understanding and love
- Simple, accessible language that speaks to the subconscious
- Therapeutic resolution with lasting emotional impact`,

      'New Birth': `Create new life celebration stories with:
- Joy and wonder of new beginnings
- Transformation and growth themes
- Support for new parents and families
- Acknowledgment of fears alongside excitement
- Celebration of life's precious moments
- Guidance for embracing change and responsibility
- Hope and optimism for the future
- Grounding in love, protection, and capability`
    };

    return prompts[storyType];
  }

  private getUserPrompt(storyType: StoryType, ageGroup: AgeGroup): string {
    return `Create a ${storyType.toLowerCase()} story appropriate for a ${ageGroup}-year-old child. Follow the hero's journey structure and ensure the story is engaging, age-appropriate, and aligned with the story type requirements.`;
  }

  private getExamples(storyType: StoryType, ageGroup: AgeGroup): string[] {
    // This would typically load from the PDF files in the Prompts directory
    // For now, providing basic examples
    const examples: Record<string, string[]> = {
      [`Adventure_${ageGroup}`]: [
        "Once upon a time, there was a brave little explorer who discovered a magical forest...",
        "In a land far away, a young adventurer set out to find the lost treasure of friendship..."
      ],
      [`Bedtime_${ageGroup}`]: [
        "As the moon rose high in the sky, a sleepy bunny snuggled into bed...",
        "The stars twinkled softly as a gentle breeze carried dreams to sleeping children..."
      ]
    };

    return examples[`${storyType}_${ageGroup}`] || [];
  }

  private getDefaultTemplate(storyType: StoryType, ageGroup: AgeGroup): PromptTemplate {
    this.logger.warn('Using default template', { storyType, ageGroup });
    
    return {
      storyType,
      ageGroup,
      systemPrompt: `You are a children's storytelling assistant. Create a ${storyType.toLowerCase()} story for a ${ageGroup}-year-old child.`,
      userPrompt: `Create an age-appropriate ${storyType.toLowerCase()} story.`,
      constraints: this.getAgeAppropriateConstraints(parseInt(ageGroup.replace('+', ''))),
      examples: []
    };
  }

  /**
   * Get all available story types including therapeutic ones
   */
  getAvailableStoryTypes(): StoryType[] {
    return [
      // Children's story types
      'Adventure', 'Bedtime', 'Birthday', 'Educational', 
      'Financial Literacy', 'Language Learning', 'Medical Bravery',
      'Mental Health', 'Milestones', 'New Chapter Sequel', 'Tech Readiness',
      // Adult therapeutic story types
      'Child Loss', 'Inner Child', 'New Birth'
    ];
  }

  /**
   * Get story type description for user clarification
   */
  getStoryTypeDescription(storyType: StoryType): string {
    const descriptions: Record<StoryType, string> = {
      'Adventure': 'Exciting journeys and brave quests with heroes who explore new places',
      'Bedtime': 'Calm, soothing stories perfect for winding down and going to sleep',
      'Birthday': 'Special celebration stories about parties, gifts, and birthday magic',
      'Educational': 'Fun learning stories that teach new concepts and ideas',
      'Financial Literacy': 'Stories about money, saving, and making smart choices',
      'Language Learning': 'Stories that help learn new words and languages',
      'Medical Bravery': 'Supportive stories about being brave during doctor visits',
      'Mental Health': 'Stories about feelings, emotions, and taking care of our minds',
      'Milestones': 'Celebration stories about growing up and achieving goals',
      'New Chapter Sequel': 'Continuing adventures with characters from previous stories',
      'Tech Readiness': 'Stories about technology, computers, and digital safety',
      'Child Loss': 'Therapeutic stories for processing grief and honoring a child\'s memory',
      'Inner Child': 'Healing stories for connecting with and nurturing your inner child',
      'New Birth': 'Celebratory stories for welcoming new life and embracing change'
    };

    return descriptions[storyType] || 'A wonderful story adventure';
  }
}