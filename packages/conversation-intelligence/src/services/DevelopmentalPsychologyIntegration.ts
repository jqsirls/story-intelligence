import { Logger } from 'winston';
import OpenAI from 'openai';
import {
  IDevelopmentalPsychologyIntegration,
  CognitiveAssessment,
  CognitiveStage,
  ExecutiveFunctionAssessment,
  ExecutiveFunctionLevel,
  SocialSkillsAssessment,
  SocialSkillsLevel,
  EmotionalAssessment,
  EmotionalDevelopmentStage,
  ZPDAssessment,
  ScaffoldingType,
  MemoryCapacity,
  ProcessingSpeed,
  ConversationIntelligenceConfig,
  ConversationIntelligenceError,
  ConversationIntelligenceErrorCode
} from '../types';

/**
 * Developmental Psychology Integration service implementing Piagetian theory,
 * Zone of Proximal Development, and executive function assessment
 */
export class DevelopmentalPsychologyIntegration implements IDevelopmentalPsychologyIntegration {
  private openai: OpenAI;

  // Piagetian stage definitions
  private readonly cognitiveStages = {
    sensorimotor: {
      ageRange: [0, 2] as [number, number],
      characteristics: ['object_permanence', 'sensory_exploration', 'motor_development'],
      capabilities: ['basic_cause_effect', 'simple_problem_solving'],
      limitations: ['no_symbolic_thought', 'limited_language']
    },
    preoperational: {
      ageRange: [2, 7] as [number, number],
      characteristics: ['symbolic_thought', 'egocentrism', 'animism', 'centration'],
      capabilities: ['language_development', 'pretend_play', 'basic_categorization'],
      limitations: ['conservation_errors', 'irreversible_thinking', 'difficulty_with_logic']
    },
    'concrete-operational': {
      ageRange: [7, 11] as [number, number],
      characteristics: ['logical_thinking', 'conservation', 'classification', 'seriation'],
      capabilities: ['concrete_problem_solving', 'understanding_rules', 'perspective_taking'],
      limitations: ['difficulty_with_abstract_concepts', 'limited_hypothetical_thinking']
    },
    'formal-operational': {
      ageRange: [11, 100] as [number, number],
      characteristics: ['abstract_thinking', 'hypothetical_reasoning', 'systematic_problem_solving'],
      capabilities: ['scientific_reasoning', 'idealistic_thinking', 'metacognition'],
      limitations: ['adolescent_egocentrism', 'idealism_vs_reality']
    }
  };

  constructor(
    private config: ConversationIntelligenceConfig,
    private logger: Logger
  ) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.logger.info('DevelopmentalPsychologyIntegration service initialized');
  }

  /**
   * Assess cognitive stage using Piagetian theory
   */
  async assessCognitiveStage(
    userInput: string,
    conversationHistory: string[],
    userAge?: number
  ): Promise<CognitiveAssessment> {
    try {
      this.logger.debug('Assessing cognitive stage', {
        inputLength: userInput.length,
        historyLength: conversationHistory.length,
        userAge,
      });

      // Analyze language patterns for cognitive indicators
      const cognitiveIndicators = this.extractCognitiveIndicators(userInput, conversationHistory);

      // Use OpenAI for detailed cognitive assessment
      const cognitiveAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in developmental psychology and Piagetian cognitive development theory. Assess the child's cognitive stage based on their communication patterns.

Piaget's Cognitive Stages:
1. Sensorimotor (0-2): Object permanence, sensory exploration
2. Preoperational (2-7): Symbolic thought, egocentrism, animism, centration
3. Concrete Operational (7-11): Logical thinking, conservation, classification
4. Formal Operational (11+): Abstract thinking, hypothetical reasoning

Look for evidence of:
- Logical reasoning patterns
- Abstract vs concrete thinking
- Conservation understanding
- Perspective-taking ability
- Hypothetical reasoning
- Symbolic representation
- Causal understanding

Consider the child's language complexity, reasoning patterns, and problem-solving approaches.`
          },
          {
            role: 'user',
            content: `Child's input: "${userInput}"
Age: ${userAge || 'unknown'}
Recent conversation: ${conversationHistory.slice(-3).join(' | ')}

Cognitive indicators found:
${cognitiveIndicators.map(indicator => `- ${indicator}`).join('\n')}

Assess the cognitive stage and provide evidence. Respond with JSON:
{
  "stage": "sensorimotor|preoperational|concrete-operational|formal-operational",
  "substage": "specific substage if applicable",
  "reasoning": ["reason1", "reason2"],
  "evidence": ["evidence1", "evidence2"],
  "confidence": 0.0-1.0,
  "nextStageIndicators": ["indicator1", "indicator2"]
}`
          }
        ],
        max_tokens: 500,
        temperature: 0.2,
      });

      const analysisContent = cognitiveAnalysis.choices[0]?.message?.content;
      if (!analysisContent) {
        throw new Error('No cognitive analysis content received');
      }

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(analysisContent);
      } catch (parseError) {
        // Fallback assessment based on age
        parsedAnalysis = this.getFallbackCognitiveAssessment(userAge);
      }

      const stageName = parsedAnalysis.stage as keyof typeof this.cognitiveStages;
      const stageDefinition = this.cognitiveStages[stageName] || this.cognitiveStages['preoperational'];

      const cognitiveStage: CognitiveStage = {
        stage: stageName,
        substage: parsedAnalysis.substage,
        characteristics: stageDefinition.characteristics,
        capabilities: stageDefinition.capabilities,
        limitations: stageDefinition.limitations,
        ageRange: stageDefinition.ageRange,
      };

      const assessment: CognitiveAssessment = {
        stage: cognitiveStage,
        reasoning: parsedAnalysis.reasoning || [],
        evidence: parsedAnalysis.evidence || [],
        confidence: Math.max(0, Math.min(1, parsedAnalysis.confidence || 0.7)),
        nextStageIndicators: parsedAnalysis.nextStageIndicators || [],
      };

      this.logger.info('Cognitive stage assessed', {
        stage: assessment.stage.stage,
        confidence: assessment.confidence,
        evidenceCount: assessment.evidence.length,
      });

      return assessment;

    } catch (error) {
      this.logger.error('Failed to assess cognitive stage', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ConversationIntelligenceError(
        'Failed to assess cognitive stage',
        ConversationIntelligenceErrorCode.DEVELOPMENTAL_ASSESSMENT_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Assess executive function levels
   */
  async assessExecutiveFunction(
    behaviorPatterns: any,
    conversationData: any
  ): Promise<ExecutiveFunctionAssessment> {
    try {
      this.logger.debug('Assessing executive function', {
        hasBehaviorPatterns: !!behaviorPatterns,
        hasConversationData: !!conversationData,
      });

      // Analyze conversation patterns for executive function indicators
      const executiveIndicators = this.extractExecutiveFunctionIndicators(
        conversationData.userInput || '',
        conversationData.conversationHistory || [],
        behaviorPatterns
      );

      // Use OpenAI for executive function assessment
      const executiveAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in executive function assessment in children. Evaluate the child's executive function abilities across key domains.

Executive Function Components:
1. Working Memory: Holding and manipulating information
2. Cognitive Flexibility: Switching between tasks/perspectives
3. Inhibitory Control: Suppressing inappropriate responses
4. Planning Ability: Organizing and sequencing actions
5. Attention Regulation: Sustaining and directing attention

Look for evidence in:
- Task persistence and completion
- Ability to follow multi-step instructions
- Flexibility in problem-solving
- Self-regulation and impulse control
- Planning and organization skills
- Attention span and focus

Rate each component from 0.0 (very low) to 1.0 (age-appropriate or above).`
          },
          {
            role: 'user',
            content: `Conversation data: ${JSON.stringify(conversationData, null, 2)}
Behavior patterns: ${JSON.stringify(behaviorPatterns, null, 2)}

Executive function indicators:
${executiveIndicators.map(indicator => `- ${indicator}`).join('\n')}

Assess executive function levels. Respond with JSON:
{
  "workingMemory": 0.0-1.0,
  "cognitiveFlexibility": 0.0-1.0,
  "inhibitoryControl": 0.0-1.0,
  "planningAbility": 0.0-1.0,
  "attentionRegulation": 0.0-1.0,
  "strengths": ["strength1", "strength2"],
  "challenges": ["challenge1", "challenge2"],
  "supportNeeds": ["need1", "need2"],
  "developmentGoals": ["goal1", "goal2"]
}`
          }
        ],
        max_tokens: 600,
        temperature: 0.3,
      });

      const analysisContent = executiveAnalysis.choices[0]?.message?.content;
      if (!analysisContent) {
        throw new Error('No executive function analysis content received');
      }

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(analysisContent);
      } catch (parseError) {
        // Fallback to moderate levels
        parsedAnalysis = {
          workingMemory: 0.6,
          cognitiveFlexibility: 0.6,
          inhibitoryControl: 0.6,
          planningAbility: 0.6,
          attentionRegulation: 0.6,
          strengths: ['communication'],
          challenges: ['assessment_error'],
          supportNeeds: ['structured_guidance'],
          developmentGoals: ['continued_development'],
        };
      }

      const executiveFunctionLevel: ExecutiveFunctionLevel = {
        workingMemory: Math.max(0, Math.min(1, parsedAnalysis.workingMemory || 0.6)),
        cognitiveFlexibility: Math.max(0, Math.min(1, parsedAnalysis.cognitiveFlexibility || 0.6)),
        inhibitoryControl: Math.max(0, Math.min(1, parsedAnalysis.inhibitoryControl || 0.6)),
        planningAbility: Math.max(0, Math.min(1, parsedAnalysis.planningAbility || 0.6)),
        attentionRegulation: Math.max(0, Math.min(1, parsedAnalysis.attentionRegulation || 0.6)),
      };

      const assessment: ExecutiveFunctionAssessment = {
        currentLevel: executiveFunctionLevel,
        strengths: parsedAnalysis.strengths || [],
        challenges: parsedAnalysis.challenges || [],
        supportNeeds: parsedAnalysis.supportNeeds || [],
        developmentGoals: parsedAnalysis.developmentGoals || [],
      };

      this.logger.info('Executive function assessed', {
        workingMemory: assessment.currentLevel.workingMemory,
        cognitiveFlexibility: assessment.currentLevel.cognitiveFlexibility,
        strengthsCount: assessment.strengths.length,
      });

      return assessment;

    } catch (error) {
      this.logger.error('Failed to assess executive function', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ConversationIntelligenceError(
        'Failed to assess executive function',
        ConversationIntelligenceErrorCode.DEVELOPMENTAL_ASSESSMENT_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Assess Zone of Proximal Development (ZPD)
   */
  async assessZPD(
    currentPerformance: any,
    supportedPerformance: any,
    context: any
  ): Promise<ZPDAssessment> {
    try {
      this.logger.debug('Assessing Zone of Proximal Development', {
        hasCurrentPerformance: !!currentPerformance,
        hasSupportedPerformance: !!supportedPerformance,
        hasContext: !!context,
      });

      // Analyze the gap between current and supported performance
      const performanceGap = this.calculatePerformanceGap(currentPerformance, supportedPerformance);

      // Use OpenAI for ZPD assessment
      const zpdAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in Vygotsky's Zone of Proximal Development (ZPD) theory. Assess the child's learning potential and scaffolding needs.

ZPD Concepts:
- Current Level: What the child can do independently
- Potential Level: What the child can do with support
- ZPD: The gap between current and potential levels
- Scaffolding: Support strategies to bridge the gap

Scaffolding Types:
- verbal_prompts: Guiding questions and hints
- visual_cues: Pictures, diagrams, demonstrations
- physical_guidance: Hand-over-hand assistance
- modeling: Showing how to do something
- questioning: Socratic questioning techniques
- feedback: Corrective and encouraging feedback
- encouragement: Emotional support and motivation

Assess the optimal challenge level and support strategies needed.`
          },
          {
            role: 'user',
            content: `Current performance: ${JSON.stringify(currentPerformance, null, 2)}
Supported performance: ${JSON.stringify(supportedPerformance, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Performance gap analysis: ${JSON.stringify(performanceGap, null, 2)}

Assess the ZPD and recommend scaffolding. Respond with JSON:
{
  "currentLevel": 0.0-1.0,
  "potentialLevel": 0.0-1.0,
  "scaffoldingNeeded": ["scaffolding_type1", "scaffolding_type2"],
  "optimalChallengeLevel": 0.0-1.0,
  "supportStrategies": ["strategy1", "strategy2"]
}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const analysisContent = zpdAnalysis.choices[0]?.message?.content;
      if (!analysisContent) {
        throw new Error('No ZPD analysis content received');
      }

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(analysisContent);
      } catch (parseError) {
        // Fallback ZPD assessment
        parsedAnalysis = {
          currentLevel: 0.6,
          potentialLevel: 0.8,
          scaffoldingNeeded: [ScaffoldingType.VERBAL_PROMPTS, ScaffoldingType.ENCOURAGEMENT],
          optimalChallengeLevel: 0.7,
          supportStrategies: ['provide_hints', 'break_down_tasks', 'offer_encouragement'],
        };
      }

      // Map scaffolding types
      const scaffoldingNeeded = (parsedAnalysis.scaffoldingNeeded || []).map((type: string) => {
        return Object.values(ScaffoldingType).includes(type as ScaffoldingType) 
          ? type as ScaffoldingType 
          : ScaffoldingType.VERBAL_PROMPTS;
      });

      const assessment: ZPDAssessment = {
        currentLevel: Math.max(0, Math.min(1, parsedAnalysis.currentLevel || 0.6)),
        potentialLevel: Math.max(0, Math.min(1, parsedAnalysis.potentialLevel || 0.8)),
        scaffoldingNeeded,
        optimalChallengeLevel: Math.max(0, Math.min(1, parsedAnalysis.optimalChallengeLevel || 0.7)),
        supportStrategies: parsedAnalysis.supportStrategies || [],
      };

      this.logger.info('ZPD assessed', {
        currentLevel: assessment.currentLevel,
        potentialLevel: assessment.potentialLevel,
        scaffoldingCount: assessment.scaffoldingNeeded.length,
      });

      return assessment;

    } catch (error) {
      this.logger.error('Failed to assess ZPD', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ConversationIntelligenceError(
        'Failed to assess ZPD',
        ConversationIntelligenceErrorCode.DEVELOPMENTAL_ASSESSMENT_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Adapt content to memory capacity
   */
  async adaptToMemoryCapacity(
    memoryAssessment: MemoryCapacity,
    content: string
  ): Promise<string> {
    try {
      this.logger.debug('Adapting content to memory capacity', {
        shortTermCapacity: memoryAssessment.shortTermCapacity,
        workingMemorySpan: memoryAssessment.workingMemorySpan,
        contentLength: content.length,
      });

      // Use OpenAI to adapt content based on memory capacity
      const adaptationAnalysis = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert in cognitive load theory and memory capacity adaptation for children. Adapt the given content to match the child's memory capacity.

Memory Capacity Considerations:
- Short-term memory: Number of items that can be held (typically 5-9 for adults, fewer for children)
- Working memory: Capacity for processing while holding information
- Chunking: Grouping information into meaningful units
- Cognitive load: Mental effort required to process information

Adaptation Strategies:
- Break complex information into smaller chunks
- Use familiar concepts and vocabulary
- Provide clear structure and organization
- Reduce extraneous cognitive load
- Use repetition and reinforcement
- Connect to prior knowledge`
          },
          {
            role: 'user',
            content: `Memory Assessment:
- Short-term capacity: ${memoryAssessment.shortTermCapacity} items
- Working memory span: ${memoryAssessment.workingMemorySpan}
- Long-term retrieval: ${memoryAssessment.longTermRetrieval}
- Episodic memory: ${memoryAssessment.episodicMemory}

Original content: "${content}"

Adapt this content to match the child's memory capacity. Make it easier to process and remember while maintaining the core message.`
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
      });

      const adaptedContent = adaptationAnalysis.choices[0]?.message?.content;
      if (!adaptedContent) {
        // Fallback: simple chunking
        return this.simpleContentChunking(content, memoryAssessment.shortTermCapacity);
      }

      this.logger.info('Content adapted to memory capacity', {
        originalLength: content.length,
        adaptedLength: adaptedContent.length,
        shortTermCapacity: memoryAssessment.shortTermCapacity,
      });

      return adaptedContent;

    } catch (error) {
      this.logger.error('Failed to adapt content to memory capacity', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback to simple chunking
      return this.simpleContentChunking(content, memoryAssessment.shortTermCapacity);
    }
  }

  /**
   * Adapt interaction to processing speed
   */
  async adaptToProcessingSpeed(
    processingAssessment: ProcessingSpeed,
    interaction: any
  ): Promise<any> {
    try {
      this.logger.debug('Adapting interaction to processing speed', {
        verbalProcessing: processingAssessment.verbalProcessing,
        visualProcessing: processingAssessment.visualProcessing,
        auditoryProcessing: processingAssessment.auditoryProcessing,
      });

      // Calculate overall processing speed
      const overallSpeed = (
        processingAssessment.verbalProcessing +
        processingAssessment.visualProcessing +
        processingAssessment.auditoryProcessing +
        processingAssessment.motorProcessing
      ) / 4;

      // Adapt timing and pacing based on processing speed
      const adaptedInteraction = {
        ...interaction,
        timing: {
          responseDelay: this.calculateResponseDelay(overallSpeed),
          pauseBetweenSentences: this.calculatePauseDuration(overallSpeed),
          maxWaitTime: this.calculateMaxWaitTime(overallSpeed),
        },
        pacing: {
          speechRate: this.calculateSpeechRate(processingAssessment.auditoryProcessing),
          informationDensity: this.calculateInformationDensity(processingAssessment.verbalProcessing),
          visualComplexity: this.calculateVisualComplexity(processingAssessment.visualProcessing),
        },
        support: {
          repetitionAllowed: overallSpeed < 0.6,
          clarificationPrompts: overallSpeed < 0.7,
          processingTimeExtended: overallSpeed < 0.5,
        },
      };

      this.logger.info('Interaction adapted to processing speed', {
        overallSpeed,
        responseDelay: adaptedInteraction.timing.responseDelay,
        speechRate: adaptedInteraction.pacing.speechRate,
      });

      return adaptedInteraction;

    } catch (error) {
      this.logger.error('Failed to adapt interaction to processing speed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return original interaction with basic adaptations
      return {
        ...interaction,
        timing: {
          responseDelay: 1000, // 1 second default
          pauseBetweenSentences: 500,
          maxWaitTime: 10000,
        },
      };
    }
  }

  /**
   * Private helper methods
   */

  private extractCognitiveIndicators(userInput: string, conversationHistory: string[]): string[] {
    const indicators: string[] = [];

    // Logical reasoning indicators
    if (userInput.includes('because') || userInput.includes('so') || userInput.includes('therefore')) {
      indicators.push('causal_reasoning');
    }

    // Abstract thinking indicators
    if (userInput.includes('what if') || userInput.includes('imagine') || userInput.includes('suppose')) {
      indicators.push('hypothetical_thinking');
    }

    // Conservation understanding
    if (userInput.includes('same amount') || userInput.includes('equal') || userInput.includes('more') || userInput.includes('less')) {
      indicators.push('quantity_comparison');
    }

    // Perspective-taking
    if (userInput.includes('they think') || userInput.includes('from their view') || userInput.includes('they feel')) {
      indicators.push('perspective_taking');
    }

    // Classification abilities
    if (userInput.includes('type of') || userInput.includes('kind of') || userInput.includes('category')) {
      indicators.push('classification');
    }

    // Temporal understanding
    if (userInput.includes('before') || userInput.includes('after') || userInput.includes('then') || userInput.includes('next')) {
      indicators.push('temporal_sequencing');
    }

    // Symbolic representation
    if (userInput.includes('like') || userInput.includes('represents') || userInput.includes('stands for')) {
      indicators.push('symbolic_thinking');
    }

    return indicators;
  }

  private extractExecutiveFunctionIndicators(
    userInput: string,
    conversationHistory: string[],
    behaviorPatterns: any
  ): string[] {
    const indicators: string[] = [];

    // Working memory indicators
    if (userInput.includes('remember') || userInput.includes('forgot') || userInput.includes('keep in mind')) {
      indicators.push('working_memory_awareness');
    }

    // Planning indicators
    if (userInput.includes('first') || userInput.includes('then') || userInput.includes('plan') || userInput.includes('steps')) {
      indicators.push('planning_ability');
    }

    // Inhibitory control indicators
    if (userInput.includes('wait') || userInput.includes('stop') || userInput.includes('don\'t') || userInput.includes('control')) {
      indicators.push('inhibitory_control');
    }

    // Cognitive flexibility indicators
    if (userInput.includes('different way') || userInput.includes('another') || userInput.includes('change') || userInput.includes('switch')) {
      indicators.push('cognitive_flexibility');
    }

    // Attention regulation indicators
    if (userInput.includes('focus') || userInput.includes('pay attention') || userInput.includes('concentrate')) {
      indicators.push('attention_regulation');
    }

    // Task persistence indicators
    if (conversationHistory.length > 3 && userInput.includes('continue') || userInput.includes('keep going')) {
      indicators.push('task_persistence');
    }

    return indicators;
  }

  private getFallbackCognitiveAssessment(userAge?: number): any {
    if (!userAge) {
      return {
        stage: 'preoperational',
        confidence: 0.5,
        reasoning: ['age_unknown'],
        evidence: ['fallback_assessment'],
        nextStageIndicators: [],
      };
    }

    if (userAge <= 2) {
      return {
        stage: 'sensorimotor',
        confidence: 0.8,
        reasoning: ['age_based_assessment'],
        evidence: [`age_${userAge}`],
        nextStageIndicators: ['language_development'],
      };
    } else if (userAge <= 7) {
      return {
        stage: 'preoperational',
        confidence: 0.8,
        reasoning: ['age_based_assessment'],
        evidence: [`age_${userAge}`],
        nextStageIndicators: ['logical_thinking'],
      };
    } else if (userAge <= 11) {
      return {
        stage: 'concrete-operational',
        confidence: 0.8,
        reasoning: ['age_based_assessment'],
        evidence: [`age_${userAge}`],
        nextStageIndicators: ['abstract_thinking'],
      };
    } else {
      return {
        stage: 'formal-operational',
        confidence: 0.8,
        reasoning: ['age_based_assessment'],
        evidence: [`age_${userAge}`],
        nextStageIndicators: ['advanced_reasoning'],
      };
    }
  }

  private calculatePerformanceGap(currentPerformance: any, supportedPerformance: any): any {
    // Simple performance gap calculation
    return {
      skillGap: (supportedPerformance?.skillLevel || 0.8) - (currentPerformance?.skillLevel || 0.6),
      confidenceGap: (supportedPerformance?.confidence || 0.9) - (currentPerformance?.confidence || 0.7),
      complexityGap: (supportedPerformance?.complexityHandled || 0.8) - (currentPerformance?.complexityHandled || 0.5),
    };
  }

  private simpleContentChunking(content: string, capacity: number): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    
    for (let i = 0; i < sentences.length; i += Math.max(1, Math.floor(capacity / 2))) {
      const chunk = sentences.slice(i, i + Math.max(1, Math.floor(capacity / 2))).join('. ');
      chunks.push(chunk + (chunk.endsWith('.') ? '' : '.'));
    }
    
    return chunks.join('\n\n');
  }

  private calculateResponseDelay(processingSpeed: number): number {
    // Slower processing speed = longer response delay
    return Math.max(500, Math.min(3000, (1 - processingSpeed) * 2500 + 500));
  }

  private calculatePauseDuration(processingSpeed: number): number {
    // Slower processing speed = longer pauses
    return Math.max(200, Math.min(1000, (1 - processingSpeed) * 800 + 200));
  }

  private calculateMaxWaitTime(processingSpeed: number): number {
    // Slower processing speed = longer wait time
    return Math.max(5000, Math.min(15000, (1 - processingSpeed) * 10000 + 5000));
  }

  private calculateSpeechRate(auditoryProcessing: number): number {
    // Slower auditory processing = slower speech rate
    return Math.max(0.5, Math.min(1.5, auditoryProcessing * 1.0 + 0.5));
  }

  private calculateInformationDensity(verbalProcessing: number): number {
    // Slower verbal processing = lower information density
    return Math.max(0.3, Math.min(1.0, verbalProcessing));
  }

  private calculateVisualComplexity(visualProcessing: number): number {
    // Slower visual processing = lower visual complexity
    return Math.max(0.3, Math.min(1.0, visualProcessing));
  }
}