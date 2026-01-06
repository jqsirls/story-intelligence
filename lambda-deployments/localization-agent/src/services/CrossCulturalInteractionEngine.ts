import OpenAI from 'openai';
import { CrossCulturalScenario } from './GlobalStorytellingEngine';

export interface CulturalBridgeScenario {
  scenario: string;
  cultures: string[];
  bridgeElements: string[];
  commonValues: string[];
  learningOutcomes: string[];
  conflictResolution: string[];
}

export interface CulturalExchangeActivity {
  activity: string;
  participatingCultures: string[];
  exchangeElements: string[];
  mutualLearning: string[];
  respectfulPractices: string[];
  ageAdaptations: { [ageGroup: string]: string };
}

export interface CulturalMisunderstandingScenario {
  misunderstanding: string;
  culturalFactors: string[];
  educationalOpportunity: string;
  resolutionSteps: string[];
  preventionStrategies: string[];
  empathyBuilding: string[];
}

export class CrossCulturalInteractionEngine {
  constructor(private openai: OpenAI) {}

  /**
   * Generate cross-cultural friendship scenarios
   */
  async generateFriendshipScenario(
    cultures: string[],
    ageGroup: string,
    setting: string
  ): Promise<CrossCulturalScenario> {
    try {
      const friendshipPrompt = this.buildFriendshipScenarioPrompt(cultures, ageGroup, setting);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating cross-cultural friendship scenarios that promote understanding, empathy, and celebration of diversity among children.'
          },
          {
            role: 'user',
            content: friendshipPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Friendship scenario generation error:', error);
      throw new Error('Failed to generate friendship scenario');
    }
  }

  /**
   * Create cultural bridge scenarios that connect different traditions
   */
  async createCulturalBridgeScenario(
    cultures: string[],
    commonTheme: string,
    storyContext: any
  ): Promise<CulturalBridgeScenario> {
    try {
      const bridgePrompt = this.buildCulturalBridgePrompt(cultures, commonTheme, storyContext);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in finding common ground between different cultures and creating scenarios that highlight shared human values while celebrating unique traditions.'
          },
          {
            role: 'user',
            content: bridgePrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Cultural bridge scenario creation error:', error);
      throw new Error('Failed to create cultural bridge scenario');
    }
  }

  /**
   * Generate cultural exchange activities
   */
  async generateCulturalExchangeActivity(
    cultures: string[],
    activityType: 'food' | 'music' | 'art' | 'games' | 'stories' | 'celebrations',
    ageGroup: string
  ): Promise<CulturalExchangeActivity> {
    try {
      const exchangePrompt = this.buildCulturalExchangePrompt(cultures, activityType, ageGroup);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating cultural exchange activities that allow children to share and learn about different traditions in respectful and engaging ways.'
          },
          {
            role: 'user',
            content: exchangePrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Cultural exchange activity generation error:', error);
      throw new Error('Failed to generate cultural exchange activity');
    }
  }

  /**
   * Create scenarios for handling cultural misunderstandings
   */
  async createMisunderstandingScenario(
    cultures: string[],
    misunderstandingType: 'communication' | 'customs' | 'values' | 'traditions',
    ageGroup: string
  ): Promise<CulturalMisunderstandingScenario> {
    try {
      const misunderstandingPrompt = this.buildMisunderstandingScenarioPrompt(cultures, misunderstandingType, ageGroup);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating educational scenarios that help children understand and resolve cultural misunderstandings with empathy and respect.'
          },
          {
            role: 'user',
            content: misunderstandingPrompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Misunderstanding scenario creation error:', error);
      throw new Error('Failed to create misunderstanding scenario');
    }
  }

  /**
   * Generate collaborative problem-solving scenarios
   */
  async generateCollaborativeScenario(
    cultures: string[],
    problemType: 'community' | 'environmental' | 'social' | 'creative',
    ageGroup: string
  ): Promise<{
    problem: string;
    culturalPerspectives: Array<{
      culture: string;
      perspective: string;
      uniqueContribution: string;
      culturalWisdom: string;
    }>;
    collaborativeSolution: string;
    learningOutcomes: string[];
    valuesDemonstrated: string[];
  }> {
    try {
      const collaborativePrompt = this.buildCollaborativeScenarioPrompt(cultures, problemType, ageGroup);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating collaborative scenarios that show how different cultural perspectives can work together to solve problems and create positive outcomes.'
          },
          {
            role: 'user',
            content: collaborativePrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Collaborative scenario generation error:', error);
      throw new Error('Failed to generate collaborative scenario');
    }
  }

  /**
   * Create cultural celebration integration scenarios
   */
  async createCelebrationIntegrationScenario(
    primaryCelebration: string,
    primaryCulture: string,
    participatingCultures: string[],
    ageGroup: string
  ): Promise<{
    scenario: string;
    integrationApproaches: string[];
    respectfulParticipation: string[];
    learningOpportunities: string[];
    inclusiveElements: string[];
    culturalSensitivities: string[];
  }> {
    try {
      const celebrationPrompt = this.buildCelebrationIntegrationPrompt(
        primaryCelebration,
        primaryCulture,
        participatingCultures,
        ageGroup
      );
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating inclusive celebration scenarios that allow people from different cultures to participate respectfully in each other\'s traditions.'
          },
          {
            role: 'user',
            content: celebrationPrompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Celebration integration scenario creation error:', error);
      throw new Error('Failed to create celebration integration scenario');
    }
  }

  /**
   * Generate empathy-building exercises
   */
  async generateEmpathyBuildingExercise(
    cultures: string[],
    focusArea: 'perspective-taking' | 'emotional-understanding' | 'cultural-appreciation' | 'bias-awareness',
    ageGroup: string
  ): Promise<{
    exercise: string;
    culturalPerspectives: string[];
    empathyPrompts: string[];
    reflectionQuestions: string[];
    actionSteps: string[];
    successIndicators: string[];
  }> {
    try {
      const empathyPrompt = this.buildEmpathyBuildingPrompt(cultures, focusArea, ageGroup);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating empathy-building exercises that help children understand and appreciate different cultural perspectives while developing emotional intelligence.'
          },
          {
            role: 'user',
            content: empathyPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Empathy building exercise generation error:', error);
      throw new Error('Failed to generate empathy building exercise');
    }
  }

  private buildFriendshipScenarioPrompt(cultures: string[], ageGroup: string, setting: string): string {
    return `
Create a cross-cultural friendship scenario:

Cultures: ${cultures.join(', ')}
Age Group: ${ageGroup}
Setting: ${setting}

Requirements:
1. Show authentic friendship development between children from different cultures
2. Include natural cultural sharing and learning
3. Address potential challenges with positive resolution
4. Demonstrate universal friendship values
5. Include age-appropriate cultural education
6. Show respectful curiosity and appreciation

Please respond with a JSON object containing:
{
  "scenario": "detailed friendship scenario",
  "cultures": ${JSON.stringify(cultures)},
  "interactionType": "friendship",
  "learningObjectives": ["what children learn about friendship across cultures"],
  "respectfulApproaches": ["how to approach cultural differences in friendship"],
  "potentialChallenges": ["friendship challenges that might arise"],
  "resolutionStrategies": ["positive ways to strengthen cross-cultural friendships"]
}
    `;
  }

  private buildCulturalBridgePrompt(cultures: string[], commonTheme: string, storyContext: any): string {
    return `
Create a cultural bridge scenario that connects different traditions:

Cultures: ${cultures.join(', ')}
Common Theme: ${commonTheme}
Story Context: ${JSON.stringify(storyContext, null, 2)}

Requirements:
1. Find authentic connections between the cultures
2. Highlight shared values and common human experiences
3. Celebrate unique cultural contributions
4. Create meaningful interactions and exchanges
5. Show how differences can complement each other
6. Build understanding and appreciation

Please respond with a JSON object containing:
{
  "scenario": "cultural bridge scenario description",
  "cultures": ${JSON.stringify(cultures)},
  "bridgeElements": ["elements that connect the cultures"],
  "commonValues": ["shared values across cultures"],
  "learningOutcomes": ["what children learn from this bridge"],
  "conflictResolution": ["how cultural differences are resolved positively"]
}
    `;
  }

  private buildCulturalExchangePrompt(cultures: string[], activityType: string, ageGroup: string): string {
    return `
Create a cultural exchange activity:

Cultures: ${cultures.join(', ')}
Activity Type: ${activityType}
Age Group: ${ageGroup}

Requirements:
1. Create authentic cultural sharing opportunities
2. Ensure mutual learning and respect
3. Include hands-on, engaging elements
4. Make it age-appropriate and safe
5. Highlight cultural significance
6. Promote appreciation and understanding

Please respond with a JSON object containing:
{
  "activity": "cultural exchange activity description",
  "participatingCultures": ${JSON.stringify(cultures)},
  "exchangeElements": ["what each culture shares"],
  "mutualLearning": ["what participants learn from each other"],
  "respectfulPractices": ["how to participate respectfully"],
  "ageAdaptations": {
    "3-5": "adaptation for younger children",
    "6-8": "adaptation for middle children",
    "9-12": "adaptation for older children"
  }
}
    `;
  }

  private buildMisunderstandingScenarioPrompt(cultures: string[], misunderstandingType: string, ageGroup: string): string {
    return `
Create a cultural misunderstanding scenario for educational purposes:

Cultures: ${cultures.join(', ')}
Misunderstanding Type: ${misunderstandingType}
Age Group: ${ageGroup}

Requirements:
1. Create a realistic but age-appropriate misunderstanding
2. Show how cultural differences can lead to confusion
3. Provide educational context about the cultural factors
4. Demonstrate empathetic resolution steps
5. Include prevention strategies for the future
6. Build understanding and empathy

Please respond with a JSON object containing:
{
  "misunderstanding": "description of the cultural misunderstanding",
  "culturalFactors": ["cultural factors that led to the misunderstanding"],
  "educationalOpportunity": "what this teaches about cultural differences",
  "resolutionSteps": ["steps to resolve the misunderstanding"],
  "preventionStrategies": ["how to prevent similar misunderstandings"],
  "empathyBuilding": ["how this builds empathy and understanding"]
}
    `;
  }

  private buildCollaborativeScenarioPrompt(cultures: string[], problemType: string, ageGroup: string): string {
    return `
Create a collaborative problem-solving scenario:

Cultures: ${cultures.join(', ')}
Problem Type: ${problemType}
Age Group: ${ageGroup}

Requirements:
1. Present a problem that benefits from diverse perspectives
2. Show how each culture contributes unique insights
3. Demonstrate collaborative problem-solving
4. Highlight cultural wisdom and approaches
5. Create a positive, unified solution
6. Show the value of diversity in problem-solving

Please respond with a JSON object containing:
{
  "problem": "description of the problem to solve",
  "culturalPerspectives": [
    {
      "culture": "culture name",
      "perspective": "their unique perspective on the problem",
      "uniqueContribution": "what they uniquely contribute to the solution",
      "culturalWisdom": "cultural wisdom they bring"
    }
  ],
  "collaborativeSolution": "the solution they create together",
  "learningOutcomes": ["what children learn from this collaboration"],
  "valuesDemonstrated": ["values demonstrated through collaboration"]
}
    `;
  }

  private buildCelebrationIntegrationPrompt(
    primaryCelebration: string,
    primaryCulture: string,
    participatingCultures: string[],
    ageGroup: string
  ): string {
    return `
Create a celebration integration scenario:

Primary Celebration: ${primaryCelebration}
Primary Culture: ${primaryCulture}
Participating Cultures: ${participatingCultures.join(', ')}
Age Group: ${ageGroup}

Requirements:
1. Show respectful participation in another culture's celebration
2. Maintain authenticity of the primary celebration
3. Include appropriate ways for others to participate
4. Address cultural sensitivities respectfully
5. Create learning opportunities for all participants
6. Demonstrate inclusive celebration practices

Please respond with a JSON object containing:
{
  "scenario": "celebration integration scenario",
  "integrationApproaches": ["ways to integrate different cultures respectfully"],
  "respectfulParticipation": ["how others can participate respectfully"],
  "learningOpportunities": ["what everyone learns from this integration"],
  "inclusiveElements": ["elements that make the celebration inclusive"],
  "culturalSensitivities": ["important cultural considerations to respect"]
}
    `;
  }

  private buildEmpathyBuildingPrompt(cultures: string[], focusArea: string, ageGroup: string): string {
    return `
Create an empathy-building exercise:

Cultures: ${cultures.join(', ')}
Focus Area: ${focusArea}
Age Group: ${ageGroup}

Requirements:
1. Create age-appropriate empathy-building activities
2. Help children understand different cultural perspectives
3. Build emotional intelligence and cultural awareness
4. Include reflection and action components
5. Make it engaging and meaningful
6. Provide clear success indicators

Please respond with a JSON object containing:
{
  "exercise": "empathy-building exercise description",
  "culturalPerspectives": ["different cultural perspectives to explore"],
  "empathyPrompts": ["prompts to help children understand others' feelings"],
  "reflectionQuestions": ["questions for reflection and discussion"],
  "actionSteps": ["concrete actions children can take"],
  "successIndicators": ["how to know the exercise is working"]
}
    `;
  }
}