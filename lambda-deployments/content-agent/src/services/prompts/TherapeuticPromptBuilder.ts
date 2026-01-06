/**
 * Therapeutic Story Type Prompt Builder
 * 
 * Source: V2 Buildship Child-Loss and Inner-Child prompts (~9000 and ~8000 chars)
 * 
 * CRITICAL: These are therapeutic intervention scripts with extensive conditional logic.
 * Do NOT truncate or simplify. Full V2 logic required for clinical quality.
 * 
 * These prompts adapt based on:
 * - Loss type / focus area (10-20+ variations)
 * - Emotional focus (20+ variations)
 * - Relationship context (15+ variations)
 * - Age-appropriate language (3-6, 7-9, 10+, adult)
 * - Safety measures (triggers to avoid)
 */

import { Logger } from 'winston';
import { BaseStoryInputs } from './StandardPromptBuilder';

export type ChildLossType =
  | 'Miscarriage'
  | 'Pregnancy Termination for Medical Reasons'
  | 'Stillbirth'
  | 'Neonatal Loss'
  | 'Infant Loss'
  | 'Child Loss'
  | 'Multiple Losses'
  | 'Unresolved Loss (without closure)'
  | 'Foster Care or Adoption Loss'
  | 'Pre-Adoption Disruption'
  | 'Other/Unique Circumstances';

export type ChildLossFocusArea =
  | 'Honoring and Remembering the Child'
  | 'Finding Peace and Comfort'
  | 'Releasing Guilt or Regret'
  | 'Processing Complex Emotions'
  | 'Supporting Family Members'
  | 'Navigating Milestones and Anniversaries'
  | 'Rebuilding and Moving Forward'
  | 'Exploring Spiritual or Existential Questions'
  | 'Facilitating Connection with Community'
  | 'General Healing';

export type InnerChildFocusArea =
  | 'Abandonment' | 'Betrayal' | 'Fear' | 'Anger' | 'Guilt' | 'Shame'
  | 'Loneliness' | 'Lack of Self-Worth' | 'Perfectionism' | 'Emotional Numbness'
  | 'Overwhelm and Anxiety' | 'Trust Issues' | 'Self-Doubt' | 'Grief/Loss'
  | 'Discover and heal underlying patterns' | 'Feeling unseen, tolerated, or undervalued'
  | 'Rediscovering Magic' | 'Remembering Dreams' | 'Embracing Playfulness' | 'Reclaiming Joy';

export interface ChildLossInputs extends BaseStoryInputs {
  childLossType: ChildLossType;
  childLossFocusArea?: ChildLossFocusArea;
  childLossReaderRelationship?: string;
  childLossReaderAge?: number;
  triggersToAvoid?: string;
  childLossMemories?: string;
  childLossHopes?: string;
}

export interface InnerChildInputs extends BaseStoryInputs {
  innerChildFocusArea: InnerChildFocusArea;
  innerChildRelationshipContext?: string;
  innerChildAdultName: string;
  innerChildAdultAge?: number;
  triggersToAvoid?: string;
}

export class TherapeuticPromptBuilder {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Build complete Child-Loss therapeutic prompt
   * V2 Length: ~9000 characters with full conditional logic
   * Source: User's V2 Buildship code
   */
  buildChildLossPrompt(inputs: ChildLossInputs): { system: string; user: string } {
    this.logger.info('Building Child-Loss therapeutic prompt', {
      lossType: inputs.childLossType,
      focusArea: inputs.childLossFocusArea,
      relationship: inputs.childLossReaderRelationship
    });

    const systemPrompt = this.buildChildLossSystemPrompt(inputs);
    const userPrompt = this.buildChildLossUserPrompt(inputs);

    this.logger.info('Child-Loss prompt built', {
      systemLength: systemPrompt.length,
      userLength: userPrompt.length,
      totalLength: systemPrompt.length + userPrompt.length
    });

    return { system: systemPrompt, user: userPrompt };
  }

  private buildChildLossSystemPrompt(inputs: ChildLossInputs): string {
    let prompt = `You are a master storyteller renowned for creating deeply personal, transformative narratives written in '${inputs.storyLanguage}' that align with evidence-based therapeutic practices. Your stories must immerse the user in an emotionally engaging journey that helps them process the loss of a child. Each story must evoke healing, remembrance, and connection while remaining empathetic, inclusive, and emotionally safe.\n\n`;
    
    prompt += `At the heart of each story is the profile of the child who has been lost and the grieving individual's relationship with them. Your task is to explore their bond, the impact of the loss, and the path toward healing in a way that feels authentic and profound. Key details about the child's personality, legacy, and memories, as well as the user's emotional state, relationship, and desired healing outcomes (${inputs.childLossReaderRelationship || 'No specific relationship'}), are provided in the CharacterProfile: ${JSON.stringify(inputs.characterProfile)}. All details must be naturally woven into the narrative, enriching its emotional depth and relatability.\n\n`;
    
    prompt += `The narrative must:\n`;
    prompt += `- Follow a Journey of Remembrance and Healing: Guide the protagonist through moments of connection, release, and renewal.\n`;
    prompt += `- Balance Grief and Hope: Explore sensitive themes with care, offering solace and emotional catharsis while gently moving toward healing.\n`;
    
    // Adapt based on Type of Loss
    prompt += `- Adapt the Story Based on Type of Loss: ${this.adaptToLossType(inputs.childLossType)}\n`;
    
    // Guide Emotional Focus
    prompt += `- Guide the Emotional Focus: ${this.guideEmotionalFocus(inputs.childLossFocusArea)}\n`;
    
    // Age-appropriate tone
    prompt += `- Adapt the Age-Appropriate Tone for the Audience: ${this.adaptAudienceTone(inputs)}\n`;
    
    prompt += `- Ensure language complexity matches the intended audience, with simpler phrasing for younger readers and nuanced reflections for adults.\n`;
    
    // Setting
    prompt += `- Ground the Story in a Meaningful Setting: ${this.groundInSetting(inputs)}\n`;
    
    // Grounding techniques
    prompt += `- Use Grounding Techniques: Integrate appropriate grounding strategies based on the story's tone and theme. For example, in a dreamlike narrative, use visualization techniques, while in an empowering narrative, demonstrate active self-soothing methods like deep breathing or progressive muscle relaxation.\n`;
    
    // User-specific elements
    prompt += `- Weave in User-Specific Elements: Reflect the tone (${inputs.storyTone || 'Empathetic and empowering'}), theme (${inputs.storyTheme || 'Healing and growth'}), and time period (${inputs.storyTimePeriod || 'Present day'}) provided by the user. Incorporate the preferred story setting (${inputs.storyLocation || 'A neutral or symbolic location'}) for added resonance.\n`;
    
    // Symbolism
    prompt += `- Elevate with Symbolism: Create and integrate a symbol that reflects the story's emotional focus, themes, and character journey. The symbol should naturally emerge from the protagonist's inner world, challenges, or relationships, serving as a metaphor for their growth, healing, or transformation. Weave the symbol meaningfully throughout the narrative, using it to:\n`;
    prompt += `  - Deepen emotional resonance by connecting it to the protagonist's key struggles and breakthroughs.\n`;
    prompt += `  - Enhance the story's imagery and mood, making the symbol an integral part of the setting or character interactions.\n`;
    prompt += `  - Represent pivotal moments of realization, connection, or empowerment for the protagonist.\n`;
    
    // Personalize dialogue
    if (inputs.vocabularyWords) {
      prompt += `- Personalize Dialogue or Details: Seamlessly integrate user-specific phrases or words ("${inputs.vocabularyWords}") to make the story uniquely theirs. Ensure the inclusion feels natural and integral to the narrative.\n`;
    }
    
    // Conclude with empowerment
    prompt += `- Conclude with Empowerment: ${this.buildChildLossConclusionGuidance(inputs)}\n\n`;
    
    // Narrative structure
    prompt += `### Narrative Structure:\n${this.buildChildLossNarrativeStructure(inputs.childLossType)}\n\n`;
    
    // Story requirements
    prompt += `### Story Requirements:\n`;
    prompt += `Ensure the story includes:\n`;
    prompt += `- A compelling opening that sets emotional stakes and draws the reader into the child's memory.\n`;
    prompt += `- Gentle narrative twists that deepen emotional engagement while maintaining safety and sensitivity.\n`;
    prompt += `- Balanced pacing with moments of tension, reflection, and resolution.\n`;
    prompt += `- Vivid sensory descriptions and symbolic imagery to enhance emotional resonance.\n`;
    prompt += `- A climactic moment of emotional catharsis and reconnection.\n`;
    prompt += `- A resolution that demonstrates transformation, hope, and enduring love.\n`;
    prompt += `- Sensitive dialogue or reflections that reveal vulnerabilities and foster understanding.\n`;
    prompt += `- Subconscious connection to the child's memory through simple, heartfelt language.\n`;
    prompt += `- Avoid detached or meta-storytelling styles. Immerse the reader in the narrative using authentic and in-the-moment language.\n`;
    
    if (inputs.childLossReaderRelationship === 'Sibling') {
      prompt += `- Provide moments of reassurance and connection for siblings, ensuring emotional safety.\n`;
    } else {
      prompt += `- Focus on themes of reflection and healing for an adult audience.\n`;
    }
    
    prompt += `- Keep the language simple and accessible for a general audience, avoiding complex and over-educated words, sentence structures and flowery poeticism. This ensures clarity and emotional impact for readers of all ages.\n`;
    prompt += `- The story must be written in third-person omniscient perspective to provide a smooth, immersive reading experience.\n\n`;
    
    // Formatting instructions
    prompt += this.getFormattingInstructions();
    
    return prompt;
  }

  private buildChildLossUserPrompt(inputs: ChildLossInputs): string {
    let prompt = `In '${inputs.storyLanguage}' language', write a therapeutic and deeply personal story that honors the memory of the child while guiding the user through a healing journey. The story must be emotionally safe, uplifting, and inclusive, tailored to the user's relationship with the child and their emotional needs. Base the story on the following inputs:\n\n`;
    
    prompt += `### Story Inputs:\n`;
    prompt += `- Story Plot Summary: Here is the story's plot - '${inputs.storyPlot}'. Ensure the story does not omit or dismiss the plot as it holds the heart of the story's impact and intent.\n`;
    prompt += `- Child Profile: ${JSON.stringify(inputs.characterProfile)}:\n`;
    
    if (inputs.childLossHopes) {
      prompt += `   - Hopes or Dreams: '${inputs.childLossHopes}'.\n`;
    }
    
    prompt += `- User Context: Details about the person creating the story:\n`;
    prompt += `   - Relationship to the Child: '${inputs.childLossReaderRelationship || 'Parent'}'.\n`;
    
    if (inputs.childLossReaderRelationship === 'Sibling' || inputs.childLossReaderRelationship === 'Classmate') {
      if (inputs.childLossReaderAge) {
        prompt += `   - User age: The age of the person making the story is '${inputs.childLossReaderAge}'. We should honor that age and ensure the story is fully written from their point of view and that the language, vocabulary, sentence structure and complexity of words and topics within the story are fit for users ages ${inputs.childLossReaderAge}. No exceptions.\n`;
      }
    }
    
    prompt += `- Type of Loss: '${inputs.childLossType}'.\n`;
    
    if (inputs.triggersToAvoid) {
      prompt += `- Triggers to Avoid: '${inputs.triggersToAvoid}'.\n`;
    } else {
      prompt += `- Default Safety Measures: Exclude distressing imagery or language. Focus on universally comforting themes such as light, nature, and soft metaphors.\n`;
    }
    
    if (inputs.vocabularyWords) {
      prompt += `- Specific Words or Phrases: These words or phrases MUST be included in the story – '${inputs.vocabularyWords}'.\n`;
    }
    
    prompt += `- Theme: ${inputs.storyTheme || 'Healing and growth'}\n`;
    prompt += `- Tone: ${inputs.storyTone || 'Empathetic and empowering'}\n`;
    prompt += `- Time Period: ${inputs.storyTimePeriod || 'Present day'}\n`;
    prompt += `- Story Location: ${inputs.storyLocation || 'A neutral or symbolic setting'}\n`;
    
    // Memories to highlight
    prompt += `- Memories to Highlight: ${this.getMemoriesToHighlight(inputs)}\n`;
    
    prompt += `- Word Count: 1,000 - 1,500 words \n\n`;
    
    prompt += `The final output should be only the story, written in '${inputs.storyLanguage}'.`;
    
    return prompt;
  }

  // ============================================================================
  // CHILD-LOSS CONDITIONAL LOGIC METHODS
  // ============================================================================

  private adaptToLossType(lossType: ChildLossType): string {
    switch (lossType) {
      case 'Miscarriage':
        return "Acknowledge the immense hopes and dreams the family held for the child, delicately balancing grief with the enduring love they carry. Illuminate the quiet yet profound impact of their presence, using soft, nurturing imagery to reflect this unspoken connection.";
      
      case 'Pregnancy Termination for Medical Reasons':
        return "Honor the deeply compassionate and protective reasoning behind the decision, whether for the mother's health or to prevent suffering for the child. Validate the sorrow and complexity of the choice, while celebrating the enduring love and care that continue to define the family's bond.";
      
      case 'Stillbirth':
        return "Recognize the profound heartbreak of meeting a beloved child whose life was too brief. Address the emotional weight of love intertwined with loss, weaving in gentle themes of beginnings and continuity, such as stars, budding leaves, or the warmth of a tender breeze.";
      
      case 'Neonatal Loss':
        return "Center the narrative on the precious shared moments, no matter how fleeting, and the unique connection formed during the child's short time on earth. Employ delicate imagery like butterflies or blooming gardens to subtly reflect transformation and lasting impact, while maintaining a focus on the shared love.";
      
      case 'Infant Loss':
        return "Celebrate the everyday joys and small milestones that defined the child's presence, while directly addressing the deep sorrow of their absence. Incorporate gentle symbols such as keepsakes or glowing candles to honor their memory, ensuring the family's genuine experiences remain at the forefront.";
      
      case 'Child Loss':
        return "Reflect on the child's unique personality, relationships, and lasting impact, intimately exploring their role in the lives of those who loved them. Utilize relatable imagery like constellations or guiding stars as subtle reminders of their ongoing presence, while grounding the narrative in tangible, heartfelt memories.";
      
      case 'Multiple Losses':
        return "Honor the individuality of each child lost, creating space to recognize their unique traits and the layered grief of losing more than one loved one. Weave in themes of interconnectedness, such as intertwined vines or a family of stars, ensuring each child's memory is given its own distinct voice and presence.";
      
      case 'Unresolved Loss (without closure)':
        return "Delve into the unresolved emotions of a loss where closure may not be attainable. Focus on the enduring bond and love for the child, even in their absence, using reflective moments to validate complex feelings. Incorporate symbols like bridges, open doors, or distant stars to subtly enhance the narrative without diminishing the gravity of the experience.";
      
      case 'Foster Care or Adoption Loss':
        return "Acknowledge the deep emotional bond despite physical separation, emphasizing the love and connection that persist beyond time and space. Reflect on shared moments or meaningful gestures, utilizing symbols like rivers or shared skies to gently honor the child's enduring presence in the caregiver's heart.";
      
      case 'Pre-Adoption Disruption':
        return "Acknowledge the hopes, care, and compassion invested before the child's anticipated arrival. Use imagery such as unopened buds or quiet dawns to symbolize the love that flourished despite the plans never coming to fruition, highlighting the enduring compassion that shapes the family's journey forward.";
      
      case 'Other/Unique Circumstances':
        return "Incorporate user-provided details to authentically reflect the unique nature of the loss, ensuring themes of love, memory, and resilience are intricately woven into the narrative without unfounded assumptions. Tailor the storytelling to resonate deeply with the specific circumstances, fostering genuine emotional connection and support.";
      
      default:
        return "Gently explore universal themes of loss, focusing on directly acknowledging emotions while integrating comforting symbols like light, nature, or music to provide solace and connection. Ensure the narrative remains inclusive, empathetic, and emotionally safe for all readers.";
    }
  }

  private guideEmotionalFocus(focusArea?: ChildLossFocusArea): string {
    if (!focusArea) {
      return "Blend universal themes of love, remembrance, comfort, and resilience to create a balanced narrative.";
    }

    switch (focusArea) {
      case 'Honoring and Remembering the Child':
        return "Celebrate the child's legacy through rituals, storytelling, or symbolic acts of remembrance.";
      
      case 'Finding Peace and Comfort':
        return "Provide a soothing journey that reassures and calms the grieving individual.";
      
      case 'Releasing Guilt or Regret':
        return "Gently explore feelings of guilt, guiding the reader toward self-compassion and forgiveness.";
      
      case 'Processing Complex Emotions':
        return "Delve into emotions like anger or confusion, offering moments of reflection and understanding.";
      
      case 'Supporting Family Members':
        return "Highlight mutual support and shared healing among family members.";
      
      case 'Navigating Milestones and Anniversaries':
        return "Focus on how these events can evoke both joy and sorrow, guiding the reader toward balanced reflection.";
      
      case 'Rebuilding and Moving Forward':
        return "Conclude with themes of resilience and purpose, showing how the child's memory inspires growth.";
      
      case 'Exploring Spiritual or Existential Questions':
        return "Incorporate gentle themes of spirituality or existential exploration, providing thoughtful resolution.";
      
      case 'Facilitating Connection with Community':
        return "Highlight the power of shared stories and support within a community setting.";
      
      case 'General Healing':
        return "Blend universal themes of remembrance, comfort, and healing for an uplifting conclusion.";
      
      default:
        return "Craft a resolution that honors the story's emotional focus, ensuring a blend of hope, healing, and enduring connection.";
    }
  }

  private adaptAudienceTone(inputs: ChildLossInputs): string {
    if (inputs.childLossReaderRelationship === 'Sibling' || inputs.childLossReaderRelationship === 'Classmate') {
      if (inputs.childLossReaderAge) {
        if (inputs.childLossReaderAge >= 3 && inputs.childLossReaderAge <= 6) {
          return `Use gentle, simple language with playful yet comforting imagery for children ages ${inputs.childLossReaderAge}. Include moments of reassurance and shared family connections.`;
        } else if (inputs.childLossReaderAge >= 7 && inputs.childLossReaderAge <= 9) {
          return `Balance emotional depth with accessible metaphors, exploring emotions carefully for children ages ${inputs.childLossReaderAge}. Highlight ways the sibling was special to the child.`;
        } else {
          return `Provide sensitive, nuanced narratives that help older siblings process their emotions for children ages ${inputs.childLossReaderAge}. Offer reflective moments that validate feelings of confusion, guilt, or sadness.`;
        }
      }
    }
    return "Focus on reflective and healing narratives that provide emotional clarity and depth for adults.";
  }

  private groundInSetting(inputs: ChildLossInputs): string {
    if (inputs.storyLocation && inputs.storyLocation !== 'A neutral or symbolic location') {
      return `Use the user-provided location: ${inputs.storyLocation}. Ensure the setting enriches the story's emotional tone.`;
    } else {
      return "Contextualize a setting based on the story's summary and inputs, choosing environments like nature, symbolic spaces, or familiar home settings.";
    }
  }

  private getMemoriesToHighlight(inputs: ChildLossInputs): string {
    if (inputs.childLossMemories) {
      return `'${inputs.childLossMemories}'`;
    }

    // Default memories based on loss type
    switch (inputs.childLossType) {
      case 'Miscarriage':
        return "Reflect on the dreams and hopes the family carried for the child, focusing on the love and connection that began even before birth.";
      
      case 'Stillbirth':
        return "Acknowledge the profound emotional bond formed during pregnancy and the shared hope for the child's future, emphasizing the love that surrounded them.";
      
      case 'Neonatal Loss':
        return "Highlight the cherished emotions and the significance of the brief moments the child was held and loved.";
      
      case 'Infant Loss':
        return "Celebrate the universal experience of caring for and loving a child, emphasizing the joy they brought to the family.";
      
      case 'Child Loss':
        return "Reflect on the child's unique personality and impact on their family, focusing on the love and connection that will always endure.";
      
      case 'Multiple Losses':
        return "Honor the shared connection of the children while acknowledging the individuality of each, using universal themes of love and remembrance.";
      
      case 'Unresolved Loss (without closure)':
        return "Focus on the enduring love and the unanswered questions, providing space for reflection on the complex emotions tied to the loss.";
      
      case 'Foster Care or Adoption Loss':
        return "Acknowledge the love and bond that transcends physical separation, focusing on shared emotional connection.";
      
      case 'Other/Unique Circumstances':
        return "Respect the unique nature of the loss by focusing on universal themes of connection, love, and resilience.";
      
      default:
        return "Highlight universal themes of love, hope, and connection, avoiding specific details to ensure emotional safety.";
    }
  }

  private buildChildLossNarrativeStructure(lossType: ChildLossType): string {
    switch (lossType) {
      case 'Miscarriage':
        return `1. Establish a world filled with hopes and dreams that flourished quietly before birth.
2. Inciting Incident: The realization that these hopes cannot become tangible.
3. Rising Challenges: The protagonist grapples with longing for what never came to be, facing silent ache and unrealized moments.
4. Climax: In a moment of deep reflection, they confront the emptiness of unmet dreams, acknowledging the depth of love that existed nonetheless.
5. Resolution & Renewal: They emerge understanding that love endures even without physical presence, carrying a tender legacy forward.`;
      
      case 'Pregnancy Termination for Medical Reasons':
        return `1. Establish a compassionate world where the family nurtured dreams, rooted in care and protective love.
2. Inciting Incident: The decision to end the pregnancy for the mother's health or to prevent the child's suffering becomes the emotional turning point.
3. Rising Challenges: The protagonist wrestles with guilt, sorrow, and the complexity of choosing love through loss, questioning if they did right by their child.
4. Climax: In a poignant scene, they confront their deepest fears and regrets, realizing the decision was an act of profound care and courage.
5. Resolution & Renewal: They find gentle understanding, learning that compassion guided their path, and carry forward that love with quiet, healing hope.`;
      
      case 'Stillbirth':
        return `1. Establish a hopeful world anticipating the child's arrival, brimming with loving preparation.
2. Inciting Incident: The moment of stillbirth shatters these hopes, introducing profound grief.
3. Rising Challenges: The protagonist faces the painful dissonance of having met their beloved child without a shared future, navigating cherished but achingly brief contact.
4. Climax: In a quiet, symbolic moment (a soft star or a gentle breeze), they fully acknowledge the child's precious existence and the depth of their love.
5. Resolution & Renewal: They emerge holding that love tenderly, understanding that the child's presence, though brief, forever shapes their heart.`;
      
      case 'Neonatal Loss':
        return `1. Establish a tender world where the family cherished even the shortest shared moments.
2. Inciting Incident: The child's passing after a brief life reveals the fragile nature of these memories.
3. Rising Challenges: The protagonist relives those delicate instants—tiny breaths, soft warmth—clashing with sorrow and longing.
4. Climax: Confronting their grief, they remember the child's subtle impact, realizing that even a short life can leave lasting meaning.
5. Resolution & Renewal: They embrace a comforting symbol (a butterfly, a blooming flower) as a gentle reminder that love transcends time.`;
      
      case 'Infant Loss':
        return `1. Establish a world colored by everyday joys—smiles, coos, gentle routines.
2. Inciting Incident: The infant's sudden absence disrupts these daily rhythms, leaving silence where laughter once was.
3. Rising Challenges: The protagonist revisits simple memories, grappling with profound sorrow and the ache of unrealized milestones.
4. Climax: Facing the heartache head-on, they confront a cherished memento—a small blanket or a favorite toy—and acknowledge love's permanence.
5. Resolution & Renewal: They carry the infant's memory forward as a soft light in their life, feeling both sadness and enduring connection.`;
      
      case 'Child Loss':
        return `1. Establish a world shaped by the child's unique personality—quirky questions, laughter, and shared discoveries.
2. Inciting Incident: The child's death introduces a void, challenging the meaning behind these treasured memories.
3. Rising Challenges: The protagonist encounters places and objects that recall the child's presence, stirring both warmth and pain, struggling with guilt or confusion.
4. Climax: In a pivotal moment, they confront their grief directly—perhaps guided by a symbolic star or an old drawing—realizing the child's influence endures.
5. Resolution & Renewal: They accept that the child's spirit lives on in their choices, thoughts, and love, forging a path forward with new strength.`;
      
      case 'Multiple Losses':
        return `1. Establish a world where each child's individuality once brought unique joy and connection.
2. Inciting Incident: The loss of multiple children compounds grief, making the protagonist question how to honor each memory distinctly.
3. Rising Challenges: They navigate layered sorrow, trying to hold space for each child's story without losing themselves in overwhelming pain.
4. Climax: Finding a symbol of interconnectedness (intertwined vines, a family of stars), they realize each child's love remains distinct yet unified.
5. Resolution & Renewal: They emerge carrying all their children's legacies forward, finding strength in the collective love that binds them.`;
      
      case 'Unresolved Loss (without closure)':
        return `1. Establish a world marked by love but also lingering questions—an incomplete story.
2. Inciting Incident: The lack of clarity about what happened or why hovers, pushing the protagonist into uncertainty.
3. Rising Challenges: They wrestle with conflicting emotions—anger, confusion, longing—searching for meaning in the unknown.
4. Climax: Confronting the void itself, they come to see that love can persist without all answers, that uncertainty need not invalidate connection.
5. Resolution & Renewal: Though questions remain, they carry love forward, finding a gentle acceptance that presence and care endure beyond clarity.`;
      
      case 'Foster Care or Adoption Loss':
        return `1. Establish a world of nurturing bonds formed across time and space, transcending traditional definitions.
2. Inciting Incident: The separation from the child disrupts this bond, leaving the caregiver to question if love can endure at a distance.
3. Rising Challenges: The protagonist revisits memories of gestures, shared smiles, and meaningful moments, struggling with sadness and longing.
4. Climax: They face their deepest fear—that physical separation erases love—and realize that love persists, carried in the heart.
5. Resolution & Renewal: With renewed faith, they understand that this bond, though altered, remains warm and guiding, encouraging them forward.`;
      
      case 'Pre-Adoption Disruption':
        return `1. Establish a world of anticipatory love and compassion, nurtured for a child not yet met.
2. Inciting Incident: The disruption ends the hoped-for arrival, leaving dreams unfulfilled.
3. Rising Challenges: The protagonist grieves what never materialized, grappling with sadness for a future that never came.
4. Climax: They confront the ache of love invested without fruition, realizing that the care, hope, and kindness they nurtured still hold worth.
5. Resolution & Renewal: They carry forward this compassion, understanding that their capacity to love remains meaningful, even in absence.`;
      
      case 'Other/Unique Circumstances':
        return `1. Begin with universal love and connection, establishing a safe emotional foundation.
2. Inciting Incident: The unique loss scenario introduces a specific sorrow.
3. Rising Challenges: The protagonist navigates personal complexities—cultural factors, unique circumstances—seeking understanding.
4. Climax: Facing the core of their emotions, they find that love and memory transcend specifics, grounding them.
5. Resolution & Renewal: They emerge with a tailored insight, a message that fits their one-of-a-kind experience, blending sorrow and hope.`;
      
      default:
        return `1. Begin with a universal sense of love and stability
2. Introduce the loss as the inciting emotional event
3. Raise the stakes with memories, emotions, and internal conflicts
4. Reach a climax where the protagonist confronts their deepest feelings and finds clarity
5. Resolve with healing, hope, and a reaffirmation of love's enduring presence`;
    }
  }

  private buildChildLossConclusionGuidance(inputs: ChildLossInputs): string {
    const emotionalFocusConclusion = this.getEmotionalFocusConclusion(inputs.childLossFocusArea);
    const typeOfLossConclusion = this.getTypeOfLossConclusion(inputs.childLossType);
    
    return emotionalFocusConclusion + " " + typeOfLossConclusion;
  }

  private getEmotionalFocusConclusion(focusArea?: ChildLossFocusArea): string {
    switch (focusArea) {
      case 'Honoring and Remembering the Child':
        return "Craft a resolution where the child's memory becomes a beacon of enduring love and connection, inspiring meaningful acts of remembrance that keep their spirit alive.";
      
      case 'Finding Peace and Comfort':
        return "Conclude with a serene sense of calm and reassurance, enveloping the reader in a gentle embrace of support and inner peace.";
      
      case 'Releasing Guilt or Regret':
        return "Illustrate a poignant moment of catharsis where feelings of guilt or regret are tenderly transformed into self-forgiveness and profound inner peace.";
      
      case 'Processing Complex Emotions':
        return "Provide thoughtful reflections that guide the reader through the labyrinth of complex emotions—anger, confusion, sorrow—fostering understanding and compassionate acceptance.";
      
      case 'Supporting Family Members':
        return "Highlight the strength found in mutual support and shared healing, emphasizing the unbreakable bonds that unite family members in their journey toward collective healing.";
      
      case 'Navigating Milestones and Anniversaries':
        return "Guide the reader through the delicate balance of honoring significant dates with cherished memories, helping them find harmony between sorrow and treasured remembrance.";
      
      case 'Rebuilding and Moving Forward':
        return "Conclude with a powerful focus on resilience and purpose, illustrating how the child's memory serves as a wellspring of strength and inspiration for future growth.";
      
      case 'Exploring Spiritual or Existential Questions':
        return "Weave in gentle spiritual or existential reflections, offering comforting insights and meaningful resolutions that provide depth and solace amid the pain of loss.";
      
      case 'Facilitating Connection with Community':
        return "End with a heartening sense of shared healing and unity, showcasing the transformative power of community support and collective remembrance in the healing process.";
      
      case 'General Healing':
        return "Blend universal themes of love, remembrance, and personal growth, guiding the protagonist to a place of hope, empowerment, and emotional renewal.";
      
      default:
        return "Craft a resolution that harmonizes universal themes of love, remembrance, and hope, ensuring the story feels inclusive, comforting, and emotionally safe.";
    }
  }

  private getTypeOfLossConclusion(lossType: ChildLossType): string {
    switch (lossType) {
      case 'Miscarriage':
        return "Emphasize the profound love and cherished dreams carried forward by the family, cultivating a sense of nurturing remembrance and enduring hope despite the absence of physical presence.";
      
      case 'Pregnancy Termination for Medical Reasons':
        return "Acknowledge the compassionate intention and protective love that guided the difficult decision, leaving the family with a deep sense of compassion, understanding, and the quiet strength that arises from selfless love.";
      
      case 'Stillbirth':
        return "Focus on the unique and deeply cherished moments of meeting the child, imparting a message of everlasting love and connection that transcends the brevity of life.";
      
      case 'Neonatal Loss':
        return "Highlight the profound impact of the child's brief existence, concluding with a symbolic act of remembrance that brings comfort and solace to the grieving heart.";
      
      case 'Infant Loss':
        return "Celebrate the shared moments and significant milestones, offering a resolution that reassures the family of the enduring love and warmth they carry within their hearts.";
      
      case 'Child Loss':
        return "Conclude by honoring the child's vibrant personality and profound influence, inspiring a legacy of ongoing love, connection, and cherished memories that continue to illuminate the family's life.";
      
      case 'Unresolved Loss (without closure)':
        return "Acknowledge the lingering uncertainty and unanswered questions, offering a gentle sense of hope and the enduring love that persists even in the absence of complete understanding.";
      
      case 'Foster Care or Adoption Loss':
        return "Focus on the transcendent love and unbreakable connection that defy physical separation, leaving the reader with a comforting sense of continuity and belonging that spans time and distance.";
      
      case 'Pre-Adoption Disruption':
        return "Reflect compassionately on the hopes and compassionate intentions nurtured before the child's expected arrival, offering gentle reassurance that the love invested continues to shape the family's path forward with understanding and empathy.";
      
      case 'Other/Unique Circumstances':
        return "Tailor the conclusion to resonate with the user's unique experiences, ensuring it feels deeply authentic, emotionally resonant, and profoundly supportive.";
      
      default:
        return "Provide a universal resolution that seamlessly blends love, remembrance, and hope, ensuring the story feels inclusive, comforting, and emotionally uplifting.";
    }
  }

  // ============================================================================
  // INNER-CHILD PROMPT BUILDER
  // ============================================================================

  /**
   * Build complete Inner-Child therapeutic prompt
   * V2 Length: ~8000 characters with full conditional logic
   * Source: User's V2 Buildship code
   */
  buildInnerChildPrompt(inputs: InnerChildInputs): { system: string; user: string } {
    this.logger.info('Building Inner-Child therapeutic prompt', {
      focusArea: inputs.innerChildFocusArea,
      relationshipContext: inputs.innerChildRelationshipContext
    });

    const systemPrompt = this.buildInnerChildSystemPrompt(inputs);
    const userPrompt = this.buildInnerChildUserPrompt(inputs);

    this.logger.info('Inner-Child prompt built', {
      systemLength: systemPrompt.length,
      userLength: userPrompt.length,
      totalLength: systemPrompt.length + userPrompt.length
    });

    return { system: systemPrompt, user: userPrompt };
  }

  private buildInnerChildSystemPrompt(inputs: InnerChildInputs): string {
    const isWonderFocus = ['Rediscovering Magic', 'Remembering Dreams', 'Embracing Playfulness', 'Reclaiming Joy'].includes(inputs.innerChildFocusArea);

    let prompt = `You are a master storyteller crafting personal, therapeutic narratives written in '${inputs.storyLanguage}' for adults healing their inner child. Your stories must balance emotional depth with the simplicity of a children's story, weaving in details of the protagonist's personality, traits, and emotional challenges. Stories should feel immersive, empowering, and emotionally safe, leaving the reader with a sense of resolution and connection.\n\n`;
    
    prompt += `At the heart of each story are three key aspects of the protagonist: the inner child, the adult self, and the protector. Your task is to explore their relationships, conflicts, and transformations in a way that feels authentic and profound. Key details about the protagonist's personality, inclusivity traits, emotional challenges, and key relational impacts (${inputs.innerChildRelationshipContext || 'No specific relationship'}) are provided in the CharacterProfile ${JSON.stringify(inputs.characterProfile)}. All details of the protagonist's characteristics and profile, including inclusivity traits, must be naturally woven into the narrative, impacting the plot, emotional stakes, environment, and character experiences.\n\n`;
    
    prompt += `The narrative must:\n`;
    prompt += `- **Follow the Hero's Journey**: Guide the user through a transformative arc that includes moments of realization, challenge, and resolution.\n`;
    prompt += `- **Balance Tension and Hope**: Use imagery, symbolic settings, and character actions to reveal themes organically.\n`;
    
    // Protector's Journey (conditional based on focus area)
    prompt += `- **Portray the Protector's Journey**: ${this.buildProtectorJourney(inputs.innerChildFocusArea)}\n`;
    
    // Key Relational Themes
    prompt += `- **Highlight Key Relational Themes**: ${this.buildRelationalThemes(inputs)}\n`;
    
    // Empower the Adult Self
    prompt += `- **Empower the Adult Self**: ${this.buildAdultSelfEmpowerment(isWonderFocus)}\n`;
    
    // Grounding techniques
    prompt += `- **Use Grounding Techniques**: Integrate calming strategies (e.g., breathing, gentle visualization) aligned with the story's tone and theme.\n`;
    
    // User-specific elements
    prompt += `- **Weave in User-Specific Elements**: Reflect the tone (${inputs.storyTone || 'Empathetic and empowering'}), theme (${inputs.storyTheme || 'Healing and growth'}), and time period (${inputs.storyTimePeriod || 'Present day'}). Use the preferred setting (${inputs.storyLocation || 'A neutral or symbolic location'}) naturally.\n`;
    
    // Symbolism
    prompt += `- **Elevate with Symbolism**: Introduce symbols that evolve with the protagonist's journey. Ensure these symbols are revealed naturally through the setting or character actions, allowing themes to emerge without explicit explanation.\n`;
    
    // Personalize dialogue
    if (inputs.vocabularyWords) {
      prompt += `- **Personalize Dialogue or Details**: Include user-specific phrases (${inputs.vocabularyWords}) if given.\n`;
    }
    
    // Relational contexts
    if (inputs.innerChildRelationshipContext) {
      prompt += `- **Explore Key Relational Contexts**: ${this.buildRelationalContext(inputs.innerChildRelationshipContext)}\n`;
    }
    
    // Conclude with empowerment
    prompt += `- **Conclude with Empowerment**: ${this.buildInnerChildConclusionGuidance(inputs.innerChildFocusArea)}\n\n`;
    
    // Narrative structure (adapted based on wonder vs healing)
    prompt += this.buildInnerChildNarrativeStructure(inputs);
    
    // Story requirements
    prompt += `\n### Story Requirements:\n`;
    prompt += `Ensure the story includes:\n`;
    prompt += `– A compelling opening that sets emotional stakes.\n`;
    prompt += `– Introduce gentle, emotionally safe twists that deepen the narrative while maintaining the therapeutic focus.\n`;
    prompt += `– Balanced pacing with moments of tension, dialog, action, reflection, and hope.\n`;
    prompt += `– Vivid sensory descriptions and symbolic imagery to enhance emotional engagement.\n`;
    prompt += `– Grounding techniques and moments of emotional regulation modeled by the adult self.\n`;
    prompt += `– A climactic moment of emotional catharsis and reconnection.\n`;
    prompt += `– A resolution that demonstrates transformation, hope, and empowerment.\n`;
    prompt += `– Depth in Dialogue: Ensure dialogue between the protagonist, mentor, and other characters is deeply reflective and emotionally resonant. Conversations should reveal vulnerabilities, foster understanding, and serve as pivotal moments for growth or transformation. Each line should feel authentic to the characters, advancing the narrative while emphasizing connection, healing, and self-discovery.\n`;
    prompt += `– The story must be written as a children's story to help speak to the reader – the current self — subconsciously connect to the inner child. \n`;
    prompt += `– The narrative must avoid detached or meta-storytelling styles. The protector should not be named "the protector" or anything related, nor should the protagonist or mentor be named or called 'protagonist' or 'mentor'. Immerse the reader directly in the protagonist's experiences, with in-the-moment language that feels authentic and emotionally engaging.\n`;
    prompt += `– YOU MUST keep the language clear, simple, and accessible, avoiding complex words, sentence structures, and adjectives as the story needs to be easy to follow without for general readers and children under 7.\n`;
    prompt += `– Ensure you use the plot summary provided as the core foundation of the story – "${inputs.storyPlot}".\n`;
    prompt += `– The story must be written in third-person omniscient perspective and maintain it throughout the story. This creates a smooth reading experience.\n`;
    prompt += `– Write in full paragraphs, using proper indentation or a blank line between paragraphs to set them apart. Each new thought or shift in scene should be indicated by starting a new paragraph. Add conversational dialog and use quotation marks for spoken dialogue and begin each new speaker's dialogue on a new line. Avoid unnecessary formatting outside of <p> tags like bold or italics unless used for emphasis or internal thoughts, and keep the style consistent.\n\n`;
    
    // Formatting
    prompt += this.getFormattingInstructions();
    
    return prompt;
  }

  private buildInnerChildUserPrompt(inputs: InnerChildInputs): string {
    let prompt = `GPT-4, could you, in '${inputs.storyLanguage}' language', write a therapeutic and deeply personal story that bridges the user's inner child, adult self, and protector. Base the story on the following inputs:\n\n`;
    
    prompt += `### Story Inputs:\n`;
    prompt += `– **Story Plot Summary**: Here is the story's plot - '${inputs.storyPlot}'. Ensure the story does not omit or dismiss the plot as it holds the heart of the impact and story we are addressing.\n`;
    prompt += `– **Inner Child Profile**: ${JSON.stringify(inputs.characterProfile)}\n`;
    prompt += `– **Current Name**: This is the name of the inner-child as an adult or 'adult self' – ${inputs.innerChildAdultName}. \n`;
    
    if (inputs.innerChildAdultAge) {
      prompt += `– **Current Age**: This is the age of the inner-child as an adult or 'adult self' – ${inputs.innerChildAdultAge}.\n`;
    }
    
    if (inputs.innerChildRelationshipContext) {
      prompt += `– **Key Relational Impact**: ${inputs.innerChildRelationshipContext}\n`;
    }
    
    prompt += `– **Emotional Focus Areas**: ${inputs.innerChildFocusArea}\n`;
    prompt += `– **Theme**: ${inputs.storyTheme || 'Healing and growth'}\n`;
    prompt += `– **Tone**: ${inputs.storyTone || 'Empathetic and empowering'}\n`;
    prompt += `– **Time Period**: ${inputs.storyTimePeriod || 'Present day'}\n`;
    prompt += `– **Story Location**: ${inputs.storyLocation || 'A neutral or symbolic setting'}\n`;
    
    if (inputs.triggersToAvoid) {
      prompt += `– **Triggers to Avoid**: ${inputs.triggersToAvoid}\n`;
    }
    
    if (inputs.vocabularyWords) {
      prompt += `– **Specific Words or Phrases**: These words or phrases MUST be included in the story – '${inputs.vocabularyWords}'.\n`;
    }
    
    prompt += `– **Word Count**: 1,000 - 1,500 words \n\n`;
    
    prompt += `The final output should be only the story, written in '${inputs.storyLanguage}'.`;
    
    return prompt;
  }

  private buildProtectorJourney(focusArea: InnerChildFocusArea): string {
    switch (focusArea) {
      case 'Abandonment':
        return "Reveal how the protector's actions, though stemming from love, have unintentionally perpetuated feelings of isolation or unworthiness. Gradually uncover moments where the protector's resistance to change creates tension with the adult self, making resolution feel earned.";
      
      case 'Betrayal':
        return "Explore how this guiding presence guards the child against further hurt. The adult self rebuilds trust and safety.";
      
      case 'Fear':
        return "Show how this guiding presence encourages avoidance to prevent danger. The adult self teaches courage and reassurance.";
      
      case 'Anger':
        return "Highlight how this guiding presence channels anger defensively. The adult self transforms anger into healthy strength.";
      
      case 'Guilt':
        return "Explore how guilt is reinforced to maintain control. The adult self helps the child release guilt and feel worthy.";
      
      case 'Shame':
        return "Show how vulnerabilities are hidden by this presence. The adult self models acceptance, allowing the child to feel seen.";
      
      case 'Loneliness':
        return "Explore how isolation prevents pain. The adult self fosters connection, helping the child feel valued.";
      
      case 'Lack of Self-Worth':
        return "Show how perfectionism or pleasing hides fear of rejection. The adult self encourages embracing inherent worth.";
      
      case 'Perfectionism':
        return "Demonstrate how flawlessness is sought to avoid criticism. The adult self teaches self-compassion and love beyond perfection.";
      
      case 'Emotional Numbness':
        return "Explore how feelings are suppressed for safety. The adult self gently reconnects the child with their emotions.";
      
      case 'Overwhelm and Anxiety':
        return "Show how control or avoidance manage anxiety. The adult self provides grounding and calm.";
      
      case 'Trust Issues':
        return "Explore how skepticism prevents betrayal. The adult self models reliability, guiding the child toward trust.";
      
      case 'Self-Doubt':
        return "Highlight how doubt prevents risk. The adult self validates the child's strengths and encourages confidence.";
      
      case 'Grief/Loss':
        return "Show how avoiding sorrow protects the child. The adult self holds space for both grief and joy.";
      
      case 'Discover and heal underlying patterns':
        return "Focus on recurring protective strategies. The adult self reshapes these patterns into empowering beliefs.";
      
      case 'Feeling unseen, tolerated, or undervalued':
        return "Show how walls prevent feeling merely tolerated. The adult self offers unconditional love, helping the child feel celebrated.";
      
      case 'Rediscovering Magic':
        return "Show how seriousness was encouraged, dulling wonder. The adult self reintroduces joy, teaching that safety and imagination coexist.";
      
      case 'Remembering Dreams':
        return "Demonstrate how old aspirations were locked away. The adult self nudges the child to recall their dreams, reigniting hope.";
      
      case 'Embracing Playfulness':
        return "Highlight how playfulness was discouraged. The adult self helps the child laugh and enjoy simple fun again.";
      
      case 'Reclaiming Joy':
        return "Explore how joyful memories were buried to prevent longing. The adult self helps the child remember warmth, laughter, and delight.";
      
      default:
        return "Explore universal protective mechanisms. The protector begins as an antagonistic figure, creating barriers that feel insurmountable. Gradually, through compassionate guidance from the adult self, the protector's fears are reframed, and they transform into a cooperative ally, reflecting the protagonist's inner reconciliation.";
    }
  }

  private buildRelationalThemes(inputs: InnerChildInputs): string {
    switch (inputs.innerChildFocusArea) {
      case 'Abandonment':
        return "Past abandonment shaped fearful relationships. The adult self models unwavering presence.";
      case 'Betrayal':
        return "Broken trust fostered skepticism. The adult self rebuilds faith in love.";
      case 'Fear':
        return "Fear created distance. The adult self offers reassurance and safe closeness.";
      case 'Anger':
        return "Defensive anger affected connections. The adult self teaches healthy expression.";
      case 'Guilt':
        return "Guilt distorted self-worth. The adult self shows forgiveness and kindness.";
      case 'Shame':
        return "Shame caused hiding. The adult self offers acceptance and understanding.";
      case 'Discover and heal underlying patterns':
        return "Recurring patterns shaped relationships. The adult self helps transform them into healthier bonds.";
      case 'Loneliness':
        return "Isolation hindered closeness. The adult self encourages trust and connection.";
      case 'Lack of Self-Worth':
        return "Inadequacy affected interactions. The adult self reinforces inherent value.";
      case 'Perfectionism':
        return "Striving for perfection strained bonds. The adult self loves beyond flaws.";
      case 'Emotional Numbness':
        return "Numbness prevented authentic closeness. The adult self encourages emotional honesty.";
      case 'Overwhelm and Anxiety':
        return "Anxiety led to fearful relating. The adult self offers calm and balance.";
      case 'Trust Issues':
        return "Broken trust made openness hard. The adult self models reliability and safety.";
      case 'Self-Doubt':
        return "Doubt stifled connection. The adult self nurtures belief and courage.";
      case 'Grief/Loss':
        return "Unprocessed loss made bonds tentative. The adult self holds space for healing and joy.";
      case 'Feeling unseen, tolerated, or undervalued':
        return "Feeling 'just tolerated' hurt closeness. The adult self celebrates the child's worth.";
      case 'Rediscovering Magic':
        return "Lost wonder made relationships guarded. Regaining magic invites playful connection.";
      case 'Remembering Dreams':
        return "Forgetting dreams led to hollow bonds. Remembered aspirations inspire richer connections.";
      case 'Embracing Playfulness':
        return "Stifled play dulled warmth in relationships. Playfulness restores closeness and fun.";
      case 'Reclaiming Joy':
        return "Buried joy led to dull interactions. Reclaiming delight renews heartfelt relationships.";
      default:
        return "Universal patterns affect all connections. The adult self fosters healthier, more loving relationships.";
    }
  }

  private buildAdultSelfEmpowerment(isWonderFocus: boolean): string {
    if (isWonderFocus) {
      return "Show that the adult self and the child learn from each other. The adult offers safety, while the child brings dreams, laughter, or color. Together they heal and rediscover wonder.";
    } else {
      return "Demonstrate how the adult self becomes the nurturing mentor the child needs, guiding them toward healing and self-acceptance.";
    }
  }

  private buildRelationalContext(relationshipContext: string): string {
    switch (relationshipContext) {
      case 'Parent/Guardian Relationship':
        return "Examine how caregiver dynamics shaped the child's feelings. The adult self models healthy love now.";
      case 'Peer Relationships':
        return "Reflect on peer acceptance or rejection. The adult self encourages supportive friendships.";
      case 'Romantic Relationships':
        return "Show how early trust issues shaped intimacy. The adult self fosters healthier bonds.";
      case 'Sibling Relationships':
        return "Explore sibling dynamics and their impact. The adult self revisits these connections with compassion.";
      case 'Self-Relationship':
        return "Focus on self-view and self-criticism. The adult self nurtures self-love and acceptance.";
      case 'Marriage/Partnership Dynamics':
        return "Show how wounds influence intimacy. The adult self cultivates understanding and safety.";
      case 'Parent-Child Relationship':
        return "Reflect on how inner child experiences shape one's parenting. The adult self breaks old cycles.";
      case 'Workplace Dynamics':
        return "Explore how early fears or dreams affect work. The adult self sets boundaries, trusts worth.";
      case 'Community/Social Dynamics':
        return "Examine how exclusion or lost wonder affects community ties. The adult self fosters belonging.";
      case 'Spiritual or Faith-Based Relationships':
        return "Reflect on worthiness in spiritual contexts. The adult self finds acceptance and purpose.";
      case 'Teacher/Mentor Dynamics':
        return "Show how authority figures shaped confidence. The adult self reclaims learning with resilience.";
      case 'Extended Family Relationships':
        return "Examine extended family patterns. The adult self approaches them with understanding.";
      case 'Romantic Relationships Post-Separation/Divorce':
        return "Reflect on triggers from separation. The adult self rebuilds trust and emotional recovery.";
      case 'Friendship Dynamics in Adulthood':
        return "Explore how old hurts or forgotten joys affect adult friendships. The adult self encourages meaningful bonds.";
      case 'Imaginary Friend Relationship':
        return "Focus on a once comforting imaginary friend. The adult self helps recall that playful bond, reigniting imagination.";
      case 'Beloved Childhood Toy':
        return "Show how a cherished toy once offered safety or joy. The adult self helps the child remember and feel secure again.";
      case 'Secret Hideout':
        return "Reflect on a special childhood spot representing comfort or dreams. The adult self encourages revisiting that mental refuge.";
      case 'Community Play Space':
        return "Explore how communal play fostered belonging. The adult self supports rediscovering shared laughter.";
      case 'Artistic Mentor from Childhood':
        return "Examine how a creative mentor inspired dreams. The adult self restores this encouragement, embracing imagination.";
      case 'No Specific Relationship':
        return "Focus on universal themes of healing or rediscovered wonder in all connections.";
      default:
        return "Tailor the relational context's impact, whether healing wounds or rekindling joy.";
    }
  }

  private buildInnerChildConclusionGuidance(focusArea: InnerChildFocusArea): string {
    switch (focusArea) {
      case 'Abandonment':
        return "End with the child embracing a newfound sense of belonging and connection, symbolizing the healing of feelings of emptiness and forging lasting bonds.";
      case 'Betrayal':
        return "Conclude with the restoration of trust and the creation of a safe, loving environment, highlighting the renewal of faith in relationships and personal resilience.";
      case 'Fear':
        return "Finish with the child embracing courage and discovering inner strength, illustrating the triumph over their deepest fears and the dawn of newfound bravery.";
      case 'Anger':
        return "Resolve with the child channeling their anger into positive actions, demonstrating emotional mastery, personal growth, and the ability to effect meaningful change.";
      case 'Guilt':
        return "End with the child releasing feelings of guilt and recognizing their inherent worthiness, fostering self-compassion and a balanced sense of responsibility.";
      case 'Shame':
        return "Close as the child sheds feelings of shame, embracing self-acceptance and pride in who they are, paving the way for authentic self-expression.";
      case 'Loneliness':
        return "Show the child discovering they are surrounded by support and love, alleviating feelings of loneliness and fostering a sense of community and belonging.";
      case 'Lack of Self-Worth':
        return "Emphasize the child's intrinsic value, allowing them to feel genuinely valued and appreciated, thereby cultivating a strong sense of self-worth.";
      case 'Perfectionism':
        return "Conclude with the child accepting themselves beyond their flaws, fostering self-compassion and authenticity, and embracing their unique imperfections.";
      case 'Emotional Numbness':
        return "End with the child reconnecting with their emotions, feeling alive and understood, and opening up to a spectrum of feelings that enrich their experience.";
      case 'Overwhelm and Anxiety':
        return "Finish with the child finding inner peace and grounding, portraying a sense of calm and resilience that empowers them to navigate life's challenges.";
      case 'Trust Issues':
        return "Show the child learning that trust is safe, encouraging openness and reliability in their relationships, and building meaningful connections based on mutual respect.";
      case 'Self-Doubt':
        return "End with the child building self-confidence, believing in their own abilities and strengths, and stepping forward with assurance and determination.";
      case 'Grief/Loss':
        return "Close by honoring both sorrow and joy, illustrating the child's capacity to heal and find balance, and celebrating their journey towards emotional wholeness.";
      case 'Feeling unseen, tolerated, or undervalued':
        return "Show the child being truly seen and cherished, reinforcing their sense of worth and belonging, and celebrating their unique presence in the world.";
      case 'Rediscovering Magic':
        return "Conclude with the revival of wonder and imagination, demonstrating that safety and creativity coexist harmoniously, reigniting the child's sense of enchantment.";
      case 'Remembering Dreams':
        return "End with the child rekindling old dreams, inspiring hope and future aspirations, and reigniting their passion for pursuing what they love.";
      case 'Embracing Playfulness':
        return "Finish with the child rediscovering joy and playful delight, restoring a sense of fun and lightheartedness, and celebrating the simple pleasures of life.";
      case 'Reclaiming Joy':
        return "Close with the child regaining their joy, allowing warmth and happiness to flourish in their life, and embracing a future filled with positivity.";
      default:
        return "Conclude by emphasizing healing and renewal, leaving the child feeling loved, empowered, and free to embrace their true self, ready to embark on a journey of continuous growth.";
    }
  }

  private buildInnerChildNarrativeStructure(inputs: InnerChildInputs): string {
    const isWonderFocus = ['Rediscovering Magic', 'Remembering Dreams', 'Embracing Playfulness', 'Reclaiming Joy'].includes(inputs.innerChildFocusArea);
    const isWhimsicalRelation = ['Imaginary Friend Relationship', 'Beloved Childhood Toy', 'Secret Hideout', 'Community Play Space', 'Artistic Mentor from Childhood'].includes(inputs.innerChildRelationshipContext || '');

    const step1 = isWonderFocus
      ? "1. **Opening Scene**: Introduce the child in a vibrant, imaginative environment that reflects their inner joy and creativity—such as a magical playground, a whimsical treehouse, or a colorful art studio."
      : "1. **Opening Scene**: Present the child in a setting that highlights their current emotional state—perhaps a quiet room where they feel unseen, a schoolyard where they hesitate to express themselves, or a serene place that masks their internal struggles.";

    const step2 = isWonderFocus
      ? "2. **Inciting Incident**: Introduce a subtle disruption that signifies something joyful is missing—like the child noticing their favorite playground has become silent or a cherished creative activity has lost its spark."
      : "2. **Inciting Incident**: Present an event that triggers unresolved feelings or fears—such as the child experiencing exclusion, hesitating to voice their thoughts, or encountering a situation that evokes their specific emotional challenge.";

    const step3 = isWonderFocus
      ? "3. **Introducing the Protector**: Reveal a guiding presence that unintentionally limits the child's joy by discouraging imaginative play or creative pursuits, aiming to keep the child 'safe' but stifling their innate wonder."
      : "3. **Introducing the Protector**: Introduce a guiding presence that shields the child from perceived dangers by suppressing emotions, enforcing perfection, or maintaining emotional distance, thereby hindering the child's growth.";

    const step4 = isWonderFocus
      ? "4. **Introducing the Adult Self**: Present the adult self as a compassionate mentor who reassures the child that dreaming and playing are safe. This figure helps the child understand the presence's misguided intentions and encourages the reawakening of their creative spirit."
      : "4. **Introducing the Adult Self**: Introduce the adult self as a nurturing figure who gently explains that the guiding presence's actions stem from a desire to protect and encourages healthier emotional expression.";

    const symbolicHint = " A meaningful memory or cherished object appears, reminding the child of happier times.";
    const step5 = isWonderFocus
      ? `5. **Symbolic Journey**: Embark on a transformative journey through a vibrant, playful setting—perhaps a secret garden where hidden laughter echoes.${symbolicHint} This journey represents the lost wonder waiting to be rediscovered and the child's path back to joy.`
      : `5. **Symbolic Journey**: Begin a reflective journey through a serene, introspective landscape—like a tranquil forest path symbolizing hidden emotions.${symbolicHint} This journey mirrors the child's struggle to express their true self and navigate their emotional landscape.`;

    const step6 = isWonderFocus
      ? "6. **Facing Challenges**: Present gentle obstacles that encourage the child to embrace joy again—such as a bridge that only lights up with laughter or a gate that opens with playful imagination. The guiding presence hesitates, uncertain about letting go, creating a dynamic tension that tests the child's willingness to reconnect with their inner joy."
      : "6. **Facing Challenges**: Introduce subtle challenges that expose the child's hidden fears—like faint whispers of 'you're not enough' or shadows that embody their anxieties. The guiding presence resists change, while the adult self encourages the child to take small, brave steps forward, fostering resilience.";

    const step7 = isWonderFocus
      ? "7. **Revelation**: Unveil that the guiding presence acted out of care, fearing that the child might be hurt by disappointment or loss of innocence. This revelation helps the child understand that safety and joy can coexist, allowing them to embrace both without fear."
      : "7. **Revelation**: Reveal the guiding presence's true motive: a desire to protect the child from emotional pain by hiding or suppressing their feelings. The child realizes they can safely experience and express their emotions, fostering a sense of liberation.";

    const step8 = isWonderFocus
      ? "8. **Integration**: Achieve harmony as the child, adult self, and guiding presence learn to value imagination together. A forgotten treasure—a drawing, a small toy, or another meaningful object—reappears, symbolizing renewed wonder and the seamless integration of creativity and safety."
      : "8. **Integration**: Achieve harmony as all three parts accept that emotions can be shared safely. A gentle symbol, such as a soft light, blooming flower, or another meaningful motif, signifies the integration of healing and the child's emotional wholeness.";

    const step9 = isWonderFocus
      ? "9. **Resolution**: Conclude with the child returning to their everyday life, now able to smile, dream, and play freely. The adult self's warm encouragement reinforces the joy of imagination and laughter, ensuring the child carries forward a lasting sense of wonder and happiness."
      : "9. **Resolution**: Conclude with the child stepping into daily life feeling understood and valued. The adult self's kind words affirm that the child is loved and free to be their authentic self, ready to embrace future opportunities with confidence and emotional strength.";

    return `### Narrative Structure (Adapted):\n\n${step1}\n${step2}\n${step3}\n${step4}\n${step5}\n${step6}\n${step7}\n${step8}\n${step9}\n`;
  }

  // ============================================================================
  // SHARED HELPER METHODS
  // ============================================================================

  // ============================================================================
  // NEW BIRTH PROMPT BUILDER (Therapeutic Level)
  // ============================================================================

  /**
   * Build complete New Birth therapeutic prompt
   * V3 Requirement: Therapeutic-level complexity (~8000+ chars)
   * 
   * New Birth stories are for:
   * - New parents (therapeutic mode): First-time, experienced, overwhelmed, anxious
   * - Celebration (celebration mode): Baby shower gifts, community celebration
   * - Various family structures: Single, LGBTQ+, adoption, surrogacy, blended
   * - Emotional nuances: Joy + anxiety, transformation, overwhelm, healing (rainbow baby)
   */
  buildNewBirthPrompt(inputs: any): { system: string; user: string } {
    const mode = inputs.newBirth?.mode || 'celebration';
    const isTherapeutic = mode === 'therapeutic';

    this.logger.info('Building New Birth prompt', {
      mode,
      emotionalFocus: inputs.newBirth?.emotionalFocus,
      lifeSituation: inputs.newBirth?.lifeSituation
    });

    const systemPrompt = isTherapeutic
      ? this.buildNewBirthTherapeuticSystemPrompt(inputs)
      : this.buildNewBirthCelebrationSystemPrompt(inputs);

    const userPrompt = this.buildNewBirthUserPrompt(inputs, isTherapeutic);

    this.logger.info('New Birth prompt built', {
      mode,
      systemLength: systemPrompt.length,
      userLength: userPrompt.length,
      totalLength: systemPrompt.length + userPrompt.length
    });

    return { system: systemPrompt, user: userPrompt };
  }

  private buildNewBirthTherapeuticSystemPrompt(inputs: any): string {
    const newBirthParams = inputs.newBirth || {};
    const lifeSituation = newBirthParams.lifeSituation || 'first-time-biological';
    const emotionalFocus = newBirthParams.emotionalFocus || 'joy-and-excitement';

    let prompt = `You are a master storyteller crafting therapeutic narratives written in '${inputs.storyLanguage}' for expectant or new parents navigating the profound transformation of welcoming a child. Your stories must balance the joy and wonder of new life with the authentic emotional complexities parents face—anxiety, overwhelm, identity shifts, relationship changes, and the weight of new responsibility. Each story must feel deeply personal, emotionally safe, and empowering, leaving parents feeling supported, capable, and connected.\n\n`;

    prompt += `At the heart of each story is the parent's journey—their hopes, fears, preparations, and the profound love they hold for their child. Your task is to honor this transformation with authenticity, addressing both the magical moments and the challenging realities. Key details about the parent's situation, emotional state, and support system are provided. All details must be naturally woven into the narrative, creating a story that feels specifically crafted for their unique journey.\n\n`;

    prompt += `The narrative must:\n`;
    prompt += `- Follow a Journey of Transformation and Preparation: Guide the protagonist through moments of anticipation, challenge, and empowered readiness.\n`;
    prompt += `- Balance Joy and Anxiety: Celebrate the miracle of new life while acknowledging real fears, uncertainties, and the magnitude of change.\n`;

    // Adapt based on Life Situation
    prompt += `- Adapt to Life Situation: ${this.adaptToLifeSituation(lifeSituation)}\n`;

    // Guide Emotional Focus
    prompt += `- Guide the Emotional Focus: ${this.guideNewBirthEmotionalFocus(emotionalFocus)}\n`;

    // Support system and partnership
    if (newBirthParams.partnerName) {
      prompt += `- Honor Partnership Dynamics: Weave in the partner's role (${newBirthParams.partnerName}), showing mutual support, shared preparation, and the journey you're taking together. Acknowledge that partners may have different emotional experiences and coping styles.\n`;
    } else if (lifeSituation.includes('single')) {
      prompt += `- Honor Solo Parenting: Celebrate the strength, capability, and chosen community of single parents. Emphasize support systems, self-compassion, and the complete family you're creating.\n`;
    }

    // Sibling adjustment
    if (newBirthParams.birthOrder && newBirthParams.birthOrder !== 'first') {
      prompt += `- Address Sibling Adjustment: Gently acknowledge how existing children may feel about the new baby (excitement, jealousy, concern). Show how to include them in preparation and celebrate becoming a bigger sibling.\n`;
    }

    // Cultural/family traditions
    if (newBirthParams.culturalContext) {
      prompt += `- Honor Cultural Context: Weave in cultural traditions, family rituals, or community practices around birth (${newBirthParams.culturalContext}). Show how these connect generations and provide meaning.\n`;
    }

    // Setting
    prompt += `- Ground in Meaningful Setting: ${newBirthParams.storyLocation || 'A warm, nurturing space representing home and family'}. Use settings that reflect preparation, nesting, and the creation of safe space for new life.\n`;

    // Grounding techniques
    prompt += `- Include Grounding Techniques: Integrate calming strategies for parental anxiety—deep breathing, visualization of meeting baby, affirmations of capability, connection to support systems.\n`;

    // User-specific elements
    prompt += `- Weave in User-Specific Elements: Reflect the tone (${inputs.storyTone || 'Warm and empowering'}), theme (${inputs.storyTheme || 'New beginnings and capability'}), and time period (${inputs.storyTimePeriod || 'Present day'}).\n`;

    // Symbolism
    prompt += `- Elevate with Symbolism: Create symbols of transformation, new beginnings, and enduring love—sunrise, blooming flowers, opening doors, nested spaces. Let these emerge naturally from the protagonist's preparation journey.\n`;

    // Vocabulary
    if (inputs.vocabularyWords) {
      prompt += `- Personalize Dialogue: Seamlessly integrate user-specific phrases ("${inputs.vocabularyWords}").\n`;
    }

    // Conclude with empowerment
    prompt += `- Conclude with Empowerment: ${this.buildNewBirthConclusionGuidance(emotionalFocus, lifeSituation)}\n\n`;

    // Narrative structure
    prompt += `### Narrative Structure:\n${this.buildNewBirthNarrativeStructure(lifeSituation, emotionalFocus)}\n\n`;

    // Story requirements
    prompt += `### Story Requirements:\n`;
    prompt += `Ensure the story includes:\n`;
    prompt += `- A compelling opening that sets the emotional stakes of this profound life transition.\n`;
    prompt += `- Gentle acknowledgment of both joy and anxiety—this is transformative and challenging.\n`;
    prompt += `- Balanced pacing with moments of anticipation, doubt, support, and resolution.\n`;
    prompt += `- Vivid sensory descriptions of preparation, nesting, and the warmth of awaiting new life.\n`;
    prompt += `- A climactic moment of emotional readiness and connection to the baby.\n`;
    prompt += `- A resolution demonstrating capability, support, and joyful anticipation.\n`;
    prompt += `- Authentic dialogue reflecting vulnerabilities, hopes, and the realness of this journey.\n`;
    prompt += `- Connection to the unborn/newborn child through simple, heartfelt language.\n`;
    prompt += `- Avoid toxic positivity or dismissing real challenges. Be honest AND empowering.\n`;
    prompt += `- Keep language warm, accessible, and grounded—avoid overly clinical or academic terminology.\n`;
    prompt += `- Write in third-person omniscient perspective for smooth immersion.\n\n`;

    // Formatting
    prompt += this.getFormattingInstructions();

    return prompt;
  }

  private buildNewBirthCelebrationSystemPrompt(inputs: any): string {
    const newBirthParams = inputs.newBirth || {};

    let prompt = `You are a joyful storyteller crafting celebratory gift stories written in '${inputs.storyLanguage}' for baby showers, gender reveals, and new parent celebrations. These stories are gifts from loved ones—friends, family, community—celebrating the miracle of new life with warmth, humor, and heartfelt joy. Your stories should feel like a hug wrapped in words, leaving parents feeling loved, supported, and excited for the adventure ahead.\n\n`;

    prompt += `This story is a gift from ${newBirthParams.giftGiverName || 'a loving friend'} to the expecting parents. It should capture the magic of anticipation, the joy of community celebration, and the promise of this new beginning.\n\n`;

    // If imaginative species (baby shower fun)
    if (newBirthParams.species) {
      prompt += `- Imaginative Element: This is a playful baby shower story where the baby is imagined as a ${newBirthParams.species}—use this for whimsical, delightful storytelling that brings laughter and joy to the celebration.\n`;
    }

    prompt += `The narrative must:\n`;
    prompt += `- Celebrate with Pure Joy: This is a celebration! Fill the story with excitement, wonder, laughter, and the magic of new beginnings.\n`;
    prompt += `- Honor the Gift Giver's Love: Show the care, excitement, and support from ${newBirthParams.giftGiverName || 'friends and family'}.\n`;
    prompt += `- Create Memorable Keepsake: This story will be treasured—make it special, personal, and deeply meaningful.\n`;
    prompt += `- Include Celebration Elements: ${newBirthParams.celebrationTheme || 'Joyful anticipation, community support, and the promise of wonderful adventures ahead'}.\n`;

    // Baby details if provided
    if (newBirthParams.babyName) {
      prompt += `- Feature Baby ${newBirthParams.babyName}: Make the story about this specific baby, weaving their name and the parents' hopes throughout.\n`;
    }

    // Parent names if provided
    if (newBirthParams.parentNames) {
      prompt += `- Honor the Parents: Feature ${newBirthParams.parentNames} as the loving, capable parents-to-be.\n`;
    }

    // Hopes and dreams
    if (newBirthParams.hopesAndDreams) {
      prompt += `- Weave in Hopes and Dreams: Incorporate the parents' hopes: "${newBirthParams.hopesAndDreams}".\n`;
    }

    prompt += `- End with Celebration: Conclude with overwhelming joy, community support, and excitement for the baby's arrival.\n\n`;

    prompt += `### Story Style:\n`;
    prompt += `- Warm, joyful, and celebratory\n`;
    prompt += `- Touch of whimsy and imagination\n`;
    prompt += `- Heartfelt without being saccharine\n`;
    prompt += `- Makes parents laugh and cry happy tears\n`;
    prompt += `- Feels like the best baby shower card ever written\n\n`;

    prompt += this.getFormattingInstructions();

    return prompt;
  }

  private buildNewBirthUserPrompt(inputs: any, isTherapeutic: boolean): string {
    const newBirthParams = inputs.newBirth || {};

    let prompt = `In '${inputs.storyLanguage}', write a ${isTherapeutic ? 'therapeutic and deeply personal' : 'joyful and celebratory'} story about welcoming new life. Base the story on the following inputs:\n\n`;

    prompt += `### Story Inputs:\n`;
    prompt += `- Story Plot: '${inputs.storyPlot}'. Ensure the story honors this plot as the emotional foundation.\n`;
    prompt += `- Theme: ${inputs.storyTheme || 'New beginnings and transformation'}\n`;
    prompt += `- Tone: ${inputs.storyTone || 'Warm and empowering'}\n`;
    prompt += `- Time Period: ${inputs.storyTimePeriod || 'Present day'}\n`;
    prompt += `- Location: ${inputs.storyLocation || 'Home and nurturing spaces'}\n`;

    if (isTherapeutic) {
      prompt += `- Your Name: ${newBirthParams.yourName || 'The expectant parent'}\n`;
      if (newBirthParams.partnerName) {
        prompt += `- Partner's Name: ${newBirthParams.partnerName}\n`;
      }
      if (newBirthParams.babyName) {
        prompt += `- Baby's Name: ${newBirthParams.babyName}\n`;
      }
      if (newBirthParams.dueDate) {
        prompt += `- Due Date: ${newBirthParams.dueDate}\n`;
      }
      prompt += `- Life Situation: ${newBirthParams.lifeSituation || 'First-time biological parents'}\n`;
      prompt += `- Emotional Focus: ${newBirthParams.emotionalFocus || 'Joy and Excitement'}\n`;
      if (newBirthParams.birthOrder) {
        prompt += `- Birth Order: ${newBirthParams.birthOrder}\n`;
      }
      if (newBirthParams.hopesAndDreams) {
        prompt += `- Hopes and Dreams: ${newBirthParams.hopesAndDreams}\n`;
      }
      if (newBirthParams.triggersToAvoid) {
        prompt += `- Triggers to Avoid: ${newBirthParams.triggersToAvoid}\n`;
      }
    } else {
      prompt += `- Gift From: ${newBirthParams.giftGiverName}\n`;
      if (newBirthParams.parentNames) {
        prompt += `- Parents-to-be: ${newBirthParams.parentNames}\n`;
      }
      if (newBirthParams.babyName) {
        prompt += `- Baby's Name: ${newBirthParams.babyName}\n`;
      }
      if (newBirthParams.species) {
        prompt += `- Imaginative Species: ${newBirthParams.species} (for playful baby shower fun)\n`;
      }
      if (newBirthParams.celebrationTheme) {
        prompt += `- Celebration Theme: ${newBirthParams.celebrationTheme}\n`;
      }
      if (newBirthParams.hopesAndDreams) {
        prompt += `- Hopes and Dreams: ${newBirthParams.hopesAndDreams}\n`;
      }
    }

    if (inputs.vocabularyWords) {
      prompt += `- Specific Words/Phrases: ${inputs.vocabularyWords}\n`;
    }

    prompt += `- Word Count: ${newBirthParams.wordCount || '1000-1500'} words\n\n`;

    prompt += `The final output should be only the story, written in '${inputs.storyLanguage}'.`;

    return prompt;
  }

  private adaptToLifeSituation(lifeSituation: string): string {
    switch (lifeSituation) {
      case 'first-time-biological':
        return "Honor the profound identity shift of first-time parenthood. Address anticipation mixed with uncertainty ('Will I be a good parent?'), the magnitude of responsibility, and the transformation of self. Celebrate their capability while acknowledging this is unknown territory. Show preparation, community support, and growing confidence.";

      case 'experienced-parents':
        return "Acknowledge the wisdom of experience balanced with new challenges. Each child is different, family dynamics shift, and juggling multiple children brings unique overwhelm. Celebrate their competence while honoring that this is still a significant adjustment. Address sibling preparation and family rebalancing.";

      case 'single-parent-by-choice':
        return "Celebrate the strength, intentionality, and self-sufficiency of chosen solo parenthood. Honor the robust support system they've built—friends, family, community. Address any societal judgment with confidence and pride. Emphasize their complete capability and the beautiful, intentional family they're creating.";

      case 'lgbtq-parents':
        return "Celebrate the joy, pride, and hard-won journey of LGBTQ+ parenthood. Honor whatever path brought them here—adoption, surrogacy, biological. Address any societal challenges with pride and resilience. Emphasize that love makes a family, representation matters, and their child will be deeply loved.";

      case 'adoptive-parents':
        return "Honor the patience, perseverance, and profound love of the adoption journey. Address the wait, the paperwork, the uncertainty, and now the joyful culmination. Celebrate that family is chosen and love transcends biology. Acknowledge any complex emotions about the birth family with grace.";

      case 'surrogacy-parents':
        return "Honor the complex, beautiful journey of surrogacy—gratitude for the surrogate, anticipation of meeting baby, processing the unique path to parenthood. Address any grief about not carrying the baby balanced with profound gratitude and joy. Celebrate the village that made this possible.";

      case 'foster-to-adopt':
        return "Acknowledge the courage, patience, and open-hearted love of foster-to-adopt parents. Honor the uncertainty of the journey, the bonding that happened during fostering, and now the joyful permanence. Address any attachment challenges with compassion and celebrate this earned, chosen family.";

      case 'high-risk-pregnancy-recovery':
        return "Honor the fear, medical challenges, and profound relief of a successful high-risk pregnancy. Address the anxiety, hospital time, restrictions, and now the overwhelming joy mixed with residual worry. Celebrate resilience, medical support, and the precious baby who made it. Include gentle reassurance about continued health.";

      case 'postpartum-preparation':
        return "Prepare parents for postpartum realities with honest, empowering framing. Address sleep deprivation, hormonal shifts, identity changes, relationship strain, and the intensity of newborn care. Balance this with moments of profound bonding, support systems, self-compassion, and the reminder that 'good enough' parenting is wonderful parenting.";

      case 'rainbow-baby':
        return "Honor the profound complexity of a rainbow baby—joy mixed with grief, hope mixed with fear, celebration mixed with remembrance. Acknowledge the baby you lost while celebrating this new life. Address survivor's guilt, fear of attachment, and hypervigilance. Show how both babies can be honored—grief and joy coexist. This is healing AND new beginning.";

      case 'blended-family-addition':
        return "Navigate the unique dynamics of a new baby joining a blended family. Honor existing children, step-parent relationships, co-parenting complexities, and 'yours, mine, ours' dynamics. Show how this baby can strengthen family bonds while acknowledging adjustment challenges. Celebrate the expanding, evolving family structure.";

      default:
        return "Honor the universal transformation of becoming a parent—the magnitude of responsibility, the depth of love, the identity shift, and the profound capability parents possess. Balance excitement with honest acknowledgment of challenges.";
    }
  }

  private guideNewBirthEmotionalFocus(emotionalFocus: string): string {
    switch (emotionalFocus) {
      case 'joy-and-excitement':
        return "Celebrate pure, unbridled joy—the miracle, the magic, the overwhelming love already felt. This is a story of anticipation, wonder, and excitement for all the beautiful moments ahead. Keep it uplifting and celebratory.";

      case 'anxiety-and-preparation':
        return "Gently address parental anxiety—'Will I be good enough?', 'Can I handle this?', 'What if something goes wrong?'. Guide parents through preparation as empowerment. Show that anxiety is normal, capability grows, and support systems help. End with confident readiness.";

      case 'transformation-and-identity':
        return "Explore the profound identity shift of becoming a parent—how 'you' changes, priorities shift, relationships evolve, and a new chapter begins. Honor what's being released (spontaneity, independence) while celebrating what's being gained (purpose, unconditional love, new dimension of self).";

      case 'overwhelm-and-balance':
        return "Acknowledge the overwhelm—everything changing at once, the enormity of responsibility, loss of control, life turned upside down. Guide toward balance—self-care isn't selfish, asking for help is strength, imperfection is okay. Show that overwhelm lessens and joy breaks through.";

      case 'healing-and-new-beginnings':
        return "For rainbow babies or parents healing from past loss/trauma. Honor that this baby doesn't replace what was lost but represents hope, new life, and healing. Address fear of attachment, survivor's guilt, and hypervigilance. Show that grief and joy can coexist. This is both/and, not either/or.";

      case 'community-and-support':
        return "Celebrate the village raising this child—family, friends, community rallying to support new parents. Show the power of asking for help, accepting support, and building your parenting village. Emphasize that parenting isn't meant to be done alone.";

      case 'capability-and-confidence':
        return "Build parental confidence—you have instincts, you'll learn, you'll figure it out, you're more capable than you think. Address imposter syndrome and self-doubt. Show growth through small wins. Emphasize that loving your child is the most important qualification.";

      case 'partnership-and-teamwork':
        return "Explore how partners navigate parenthood together—communication, shared load, different parenting styles, supporting each other through exhaustion. Show that teamwork makes the dream work, grace for different approaches, and love deepening through this shared journey.";

      case 'sibling-preparation':
        return "Help older siblings prepare for baby's arrival—excitement mixed with worry about losing attention. Show how they'll be included, their special role as big sibling, and that parents' love multiplies (doesn't divide). Address jealousy with compassion and celebrate the expanding family.";

      case 'gratitude-and-miracle':
        return "Emphasize the profound gratitude and miracle of this life—however baby arrived (biological, adoption, surrogacy), this is a precious gift. Reflect on the journey that led here, the people who helped, and the overwhelming thankfulness. Pure appreciation and awe.";

      default:
        return "Balance universal themes of joy, transformation, capability, and support. Celebrate new life while honestly acknowledging the magnitude of change.";
    }
  }

  private buildNewBirthNarrativeStructure(lifeSituation: string, emotionalFocus: string): string {
    // Therapeutic structures vs celebration structures differ
    const isHighChallenge = ['high-risk-pregnancy-recovery', 'postpartum-preparation', 'rainbow-baby', 'single-parent-by-choice'].includes(lifeSituation);
    const isAnxietyFocus = ['anxiety-and-preparation', 'overwhelm-and-balance', 'healing-and-new-beginnings'].includes(emotionalFocus);

    if (isHighChallenge || isAnxietyFocus) {
      return `1. Opening: Establish the parent's current emotional state—hope mixed with fear, preparation mixed with doubt. Show their love for the baby and the weight of upcoming responsibility.
2. Inciting Incident: A moment that crystallizes the magnitude of change—feeling baby kick, seeing nursery come together, a support system conversation, or a moment of panic ('Can I do this?').
3. Rising Challenges: Navigate the internal journey—fears surfacing, preparations feeling inadequate, identity questions emerging. Show honest struggles WITHOUT toxic positivity.
4. Support and Insight: Introduce support—partner, friend, family member, or internal wisdom—that reframes challenges. Not dismissing fears but showing capability alongside uncertainty.
5. Climax: Confront the core fear or doubt head-on. A powerful moment of connection to baby (through imagination, ultrasound memory, preparation ritual) that shifts perspective.
6. Resolution & Empowerment: Emerge with quiet confidence. Not that fears are gone, but that capability is real, support exists, and love is enough. The parent is ready—imperfectly, authentically, powerfully.`;
    } else {
      return `1. Opening: Begin with joyful anticipation—nursery preparation, excitement building, community gathering for celebration.
2. Celebration Building: Show the love surrounding this baby—gifts, well-wishes, laughter, stories from other parents, excitement from friends and family.
3. Moment of Connection: A touching moment where the parent connects with baby (feeling a kick, talking to belly, imagining meeting them)—pure magic and love.
4. Community Support: Emphasize the village—people pledging support, sharing wisdom, promising to be there. Parents feel surrounded by love.
5. Joyful Anticipation: Build to the crescendo of excitement—baby's arrival is near, everything is ready, love overflows.
6. Resolution: Conclude with overwhelming joy, gratitude, and excitement. The baby is already so loved, the family is ready, the adventure begins soon. Pure celebration.`;
    }
  }

  private buildNewBirthConclusionGuidance(emotionalFocus: string, lifeSituation: string): string {
    const situationConclusion = this.getLifeSituationConclusion(lifeSituation);
    const focusConclusion = this.getNewBirthFocusConclusion(emotionalFocus);

    return focusConclusion + " " + situationConclusion;
  }

  private getLifeSituationConclusion(lifeSituation: string): string {
    switch (lifeSituation) {
      case 'first-time-biological':
        return "Emphasize that first-time parents are more capable than they think, their instincts will guide them, and love is the most important qualification. They're ready for this adventure.";
      case 'experienced-parents':
        return "Celebrate their parenting wisdom while acknowledging each child is different. They know what they're doing AND they're flexible enough to adapt. Their family is expanding beautifully.";
      case 'single-parent-by-choice':
        return "Honor their intentional, courageous choice and the complete, loving family they're creating. They are enough, their village is strong, and their child is blessed to have them.";
      case 'lgbtq-parents':
        return "Celebrate their hard-won joy, their pride, and the beautiful representation they provide. Love makes a family, their child is lucky to have them, and they're creating a home filled with acceptance and authenticity.";
      case 'adoptive-parents':
        return "Honor their patient journey and emphasize that chosen family is profound family. The wait made them ready, their love is complete, and this baby was always meant to be theirs.";
      case 'surrogacy-parents':
        return "Celebrate the village—especially the surrogate—who made this miracle possible. Emphasize gratitude, the unique beauty of their path, and the profound love awaiting this baby.";
      case 'rainbow-baby':
        return "Honor that grief and joy coexist. This baby doesn't replace who was lost but represents hope and new life. It's okay to feel both. They can honor both babies. Healing continues alongside new love.";
      case 'postpartum-preparation':
        return "Prepare with honest empowerment—it will be hard AND you'll handle it. Grace for imperfection, permission to ask for help, reminder that survival mode is temporary. You'll find your rhythm, bond with baby, and emerge stronger.";
      default:
        return "Conclude with confidence, support, and joyful anticipation. They are capable, loved, supported, and ready for this beautiful, challenging, transformative adventure.";
    }
  }

  private getNewBirthFocusConclusion(emotionalFocus: string): string {
    switch (emotionalFocus) {
      case 'joy-and-excitement':
        return "End with pure celebration—overwhelming happiness, magical anticipation, and gratitude for this blessing.";
      case 'anxiety-and-preparation':
        return "Conclude with calm confidence—anxiety acknowledged, preparation completed, capability recognized. Ready as they'll ever be.";
      case 'transformation-and-identity':
        return "Show the transformation complete—new identity embraced, old self honored, integrated whole self ready for parenthood.";
      case 'overwhelm-and-balance':
        return "Achieve balance—overwhelm managed, self-care prioritized, support accepted. Not perfect, but ready and resourced.";
      case 'healing-and-new-beginnings':
        return "Integrate healing with new joy—past grief honored, new life celebrated, both babies holding space in the heart.";
      case 'capability-and-confidence':
        return "Affirm parental capability—doubts faced, strength discovered, confidence growing. They've got this.";
      default:
        return "Leave parents feeling supported, capable, and joyfully anticipating their baby's arrival.";
    }
  }

  // ============================================================================
  // SHARED HELPER METHODS
  // ============================================================================

  private getFormattingInstructions(): string {
    return `----

Formatting Instructions:
1. **Title**: Create a child-friendly, engaging title (maximum 7 words).
2. **Logline**: Write a compelling, child-friendly logline (1 sentence; 140–240 characters).
3. **Story Structure**: Regardless of however long the word-count becomes, divide the story into exactly 4 pages, ensuring each page ends with a natural, complete sentence.
4. **Output Format**: Provide the output in a valid JSON format. Do not include placeholders, comments, or explanations.
JSON Structure:
{
  "cover": {
    "title": "<Generated child-friendly title here>",
    "logline": "<Generated child-friendly logline here>"
  },
  "pages": [
    { "index": 1, "text": "<First portion of the story here>" },
    { "index": 2, "text": "<Second portion of the story here>" },
    { "index": 3, "text": "<Third portion of the story here>" },
    { "index": 4, "text": "<Final portion of the story here>" }
  ]
}`;
  }
}

