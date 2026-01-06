/**
 * Standard Story Type Prompt Builder
 * 
 * Source: V2 Story Type Specific User Prompts
 * Builds complete prompts for 10 standard story types with ALL V2 parameters
 * 
 * CRITICAL: Do NOT truncate these prompts. V3 must equal or exceed V2 quality.
 */

import { Logger } from 'winston';

/**
 * Canonical Story Engine
 * Universal narrative framework that scales from 50 words (age 3) to 1200 words (age 9+)
 */
export const CANONICAL_STORY_ENGINE = `## Narrative Framework

Every story follows this progression, scaled to the target age:

**0) Story Setup**: Protagonist + goal + limitation + stakes + tone
**1) Orientation**: Current world, normal behavior pattern
**2) Disruption**: Event breaks the balance (problem or opportunity)
**3) Resistance**: Hesitation, avoidance, low-risk responses (may be single sentence for ages 3-5)
**4) Commitment**: Point of no return, full engagement required
**5) First Strategy**: Initial plan pursued, reveals new rules through outcome
**6) Escalation Loop**: Each scene increases stakes, narrows options, raises cost (1-3 cycles depending on age)
**7) Midpoint Shift**: Reveal or reversal changes understanding/goal/strategy (ages 7+ only)
**8) Breakdown**: Previous approach fails, fallback options removed
**9) Crisis Choice**: Forced decision between two costly paths (defines character)
**10) Climax**: Act on crisis choice, confront core obstacle, answer central question
**11) Consequence**: Immediate outcome - gains, losses, damage shown
**12) New Normal**: Updated equilibrium, confirm internal and external change

### Scene Requirements (Steps 5-10)
Each scene must have:
- Immediate goal
- Active opposition
- Conflict through action
- Turn or new information
- Outcome that alters situation
- Forward hook

**Critical Rule**: If a scene does not change the situation, cut it.

### Age Scaling
- **Ages 3-4**: Steps 1-2-4-5-10-12 (6 steps, simplified)
- **Ages 5-6**: Steps 1-2-4-5-8-10-12 (7 steps)
- **Ages 7-8**: Steps 1-2-3-4-5-6-8-9-10-11-12 (11 steps)
- **Ages 9+**: All 12 steps with full scene unit discipline`;

/**
 * Identity Trait Integration Rules
 * How to represent inclusivity without breaking immersion
 */
export const IDENTITY_TRAIT_RULES = `## Trait Integration Discipline

**Core Principle**: Story first. Always.

### When to Mention Traits in Narrative

✅ **Mention when it serves story**:
- Hearing aids → when sound, whispers, or listening matters to the plot
- Wheelchair → when terrain, movement, or navigation creates challenge/choice
- Hijab → when wind, disguise, ritual, or movement is plot-relevant
- Glasses → when vision, seeing details, or looking closely affects action
- Autism → when patterns, routines, sensory input, or emotional processing drives decisions

❌ **Don't mention just because it exists**:
- No roll call of features
- No "sparkled," "fluttered," "shone" as filler (once is fine, twice is trying too hard)
- No identity adjectives without purpose
- No reminders or reintroductions

### The Invisibility Test

Before writing a trait reference, ask:
**"If this sentence were removed, would the story lose clarity, tension, or joy?"**

- **Yes** → Keep it, it serves the story
- **No** → Cut it, let the image carry it

### Writing Discipline

1. **Assume, don't introduce**: Write as if the reader already knows the character
2. **Images carry identity silently**: Visual representation is often enough
3. **Context earns the mention**: Trait must create problem worth solving or shape decision
4. **Presence ≠ narration**: A child exists fully even when nothing about them is explained
5. **Traits are optional in text**: The system is never obligated to reference every trait

### Example Comparison

❌ **Explaining itself**:
"Zara rolled along in her wheelchair. Her colorful hijab fluttered. Sunlight sparkled on her glasses. Her hearing aids hummed."

✅ **Story first**:
"Zara rolled to the boardwalk's edge. The wind pulled at her hijab. She leaned forward, listening—something squeaked below the dock."

*Why better*: Wheelchair mentioned because location matters. Hijab mentioned because wind matters. Listening mentioned because sound matters. Glasses omitted because vision not relevant yet. Each trait serves forward motion.`;

export interface BaseStoryInputs {
  storyLanguage: string;
  storyPlot: string;
  storyTheme: string;
  storyTone: string;
  vocabularyWords: string;
  storyTimePeriod: string;
  storyLocation: string;
  characterProfile: any;
  storyAge: number;
}

export interface BedtimeInputs extends BaseStoryInputs {
  bedtimeSoothingElement: string;
  bedtimeRoutine: string;
}

export interface BirthdayInputs extends BaseStoryInputs {
  birthdayAge: number;
  birthdayTo: string;
  birthdayFrom: string;
  storyPersonality: string;
  storyInclusivity?: string;
}

export interface EducationalInputs extends BaseStoryInputs {
  educationSubject: string;
}

export interface FinancialLiteracyInputs extends BaseStoryInputs {
  financialGoal: string;
  financialConcept: string;
}

export interface LanguageLearningInputs extends BaseStoryInputs {
  languageToLearn: string;
}

export interface MedicalBraveryInputs extends BaseStoryInputs {
  medicalChallenge: string;
  copingStrategy: string;
}

export interface MentalHealthInputs extends BaseStoryInputs {
  mentalhealthEmotionExplored: string;
  mentalhealthCopingMechanism: string;
}

export interface MilestonesInputs extends BaseStoryInputs {
  milestoneEvent: string;
}

export interface TechReadinessInputs extends BaseStoryInputs {
  techTheme: string;
  futureReadySkill: string;
}

export interface NewChapterSequelInputs extends BaseStoryInputs {
  originalStoryText: string;
}

export class StandardPromptBuilder {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Build Adventure story prompt
   * V2 Length: ~600 chars
   */
  buildAdventurePrompt(inputs: BaseStoryInputs): string {
    return `In **${inputs.storyLanguage}**, write a hilariously fun adventure story.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}.

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Delightfully awful villain
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
- Ending
    - Triumphant, laugh-out-loud finale
    - Hero saves the day in an unlikely way

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Bedtime story prompt
   * V2 Length: ~500 chars
   */
  buildBedtimePrompt(inputs: BedtimeInputs): string {
    return `In **${inputs.storyLanguage}**, write peaceful bedtime story that whisks children away into the tranquil world of dreams. 

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

### Storytelling Requirements

Your bedtime story is expected to unfold in the ${inputs.storyTimePeriod}, within the gentle confines of '${inputs.storyLocation}'. The soothing element of ${inputs.bedtimeSoothingElement} and the bedtime routine activity of '${inputs.bedtimeRoutine}' should take center stage in the story. Every conflict should be softly resolved, leading to a peaceful conclusion that leaves young minds prepared for sleep.

As the narrative gently unfolds, fill the story with soothing imagery and calming rhythms, and use language that is soft, slow-paced, and comforting. Let the soothing element and the bedtime routine activity seamlessly interweave through the story, creating a tranquil atmosphere that encourages relaxation and sleep. Your tale should be a lullaby of words that induces a peaceful sleep.

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Birthday story prompt
   * V2 Length: ~900 chars
   * 
   * Parameter Mapping (API → Prompt):
   * - birthday.to → birthdayTo
   * - birthday.from → birthdayFrom
   * - birthday.ageTurning → birthdayAge
   * - birthday.birthdayMessage → (used in prompt)
   * - storyPersonality → from characterProfile or direct param
   */
  buildBirthdayPrompt(inputs: any): string {
    // Map API parameters to V2 prompt variable names
    const birthday = inputs.birthday || {};
    const birthdayTo = birthday.to || inputs.birthdayTo || 'the birthday child';
    const birthdayFrom = birthday.from || inputs.birthdayFrom || 'their loved ones';
    const birthdayAge = birthday.ageTurning || inputs.birthdayAge || inputs.storyAge || 6;
    const storyPersonality = inputs.storyPersonality || inputs.characterProfile?.traits?.personality?.join(', ') || 'curious and adventurous';
    const storyInclusivity = inputs.storyInclusivity || inputs.characterProfile?.inclusivity_trait;

    const inclusivitySection = storyInclusivity 
      ? `The protagonist must exhibit or visually represent this inclusivity trait: ${storyInclusivity} in ways that include physical, dietary, activity, or lifestyle needs relevant to their inclusivity traits. Ensure these traits are woven into the narrative, affecting the story's environment and events to create a world that's inclusive and representative of these aspects.\n\n`
      : '';

    return `You are a renowned multilingual children's book manuscript writer, celebrated for writing birthday stories written in ${inputs.storyLanguage} that captivate the hearts and imaginations of children ${birthdayAge}. Your narratives are rich with the essence of enchanted realms and adventurous escapades, reminiscent of the enthralling and whimsical worlds found in classic Saturday morning cartoons from networks like Nickelodeon or Cartoon Network. You understand the importance of storytelling with vocabulary and sentences structures that a child ${birthdayAge} can understand and follow. You must ensure that your story accurately reflects the protagonist's specific profile.

${inclusivitySection}All details of the protagonist's characteristics and profile, including inclusivity traits, must be naturally woven into the narrative, impacting the plot, environment, and character experiences. The inclusivity traits should feel natural, making the child feel fully represented and valued in the story's world.

---

In **${inputs.storyLanguage}**, write a lively, engaging, and birthday story that celebrates the ${birthdayAge} birthday of ${birthdayTo}.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

Our protagonist, ${birthdayTo}, the birthday star of our story is characterized by their ${storyPersonality} personality. The narrative is expected to unfold in the ${inputs.storyTimePeriod}, within the confines of a grand birthday celebration at ${inputs.storyLocation}. This enchanting tale is a gift from ${birthdayFrom} to ${birthdayTo}. Allow warmth and happiness to radiate from the story, leading to a thrilling climax and a heartwarming resolution that leads to a chorus of 'Happy Birthday!' by everyone in the story.

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Delightfully awful villain
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
- Ending
    - Triumphant, laugh-out-loud finale that ends in "HAPPY BIRTHDAY!" from everyone in the story.
    - Hero saves the day in an unlikely way

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Educational story prompt
   * V2 Length: ~600 chars
   * 
   * Parameter Mapping (API → Prompt):
   * - educational.educationalSubject → educationSubject
   */
  buildEducationalPrompt(inputs: any): string {
    const educational = inputs.educational || {};
    const educationSubject = educational.educationalSubject || inputs.educationSubject || 'general learning';

    return `In **${inputs.storyLanguage}**, write an engaging educational children's story that imparts knowledge about ${educationSubject} while keeping the little minds gripped.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}.

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

Throughout this exciting journey, the protagonist encounters scenarios that naturally introduce and explain key educational concepts from ${educationSubject}. These teaching moments flow seamlessly within the plot while remaining engaging and interactive to promote active learning. As the story progresses, it gradually builds and reinforces key educational concepts of ${educationSubject} appropriate for the reader's age.

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Delightfully awful villain
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
- Ending
    - Triumphant, laugh-out-loud finale
    - Hero saves the day in an unlikely way

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Financial Literacy story prompt
   * V2 Length: ~700 chars
   */
  buildFinancialLiteracyPrompt(inputs: FinancialLiteracyInputs): string {
    return `In **${inputs.storyLanguage}**, write a lively, engaging, and fun financial literacy story that introduces young readers to the financial goal of ${inputs.financialGoal} and the financial concept of ${inputs.financialConcept}. 

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

The story should guide young readers through the financial goal of ${inputs.financialGoal} and the financial concept of ${inputs.financialConcept} without feeling forced. Show these through fun, relatable scenarios such as saving for a favorite toy, planning a lemonade stand, or learning how to manage allowance money. Channel your creativity into crafting a story that not only financially educates but captivates. Your goal is to make young readers laugh, learn, and feel seen, while introducing them to the wonders of financial literacy in a way that's memorable and fun.

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Delightfully awful villain
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
    - Make the financial lesson age-appropriate and easy to understand.
- Ending
    - Triumphant, laugh-out-loud finale
    - Hero saves the day in an unlikely way

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Language Learning story prompt
   * V2 Length: ~900 chars
   * CRITICAL: Translation formatting rules must be preserved
   */
  buildLanguageLearningPrompt(inputs: LanguageLearningInputs): string {
    return `In **${inputs.storyLanguage}**, write a lively, engaging, and fun language learning story that subtly teaches ${inputs.languageToLearn} to a child who reads in ${inputs.storyLanguage}.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

Throughout the story, the protagonist encounters climactic situations that naturally introduce and explain words, phrases, and cultural elements from the ${inputs.languageToLearn} language. These language-learning moments are woven into the plot in engaging and interactive ways.

Write the story in third-person omniscient perspective. While stimulating imagination, incorporate ${inputs.languageToLearn} words and phrases using only their original script or characters—never use phonetic spellings or transliterations. Place the ${inputs.storyLanguage} translations in parentheses after each ${inputs.languageToLearn} term. The original ${inputs.languageToLearn} text should never appear in parentheses.

Include the name ${inputs.languageToLearn} early in the story to establish which language readers will be learning.

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Delightfully awful villain
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
- Ending
    - Triumphant, laugh-out-loud finale
    - Hero saves the day in an unlikely way

The story must weave together the plot **'${inputs.storyPlot}'**, theme **${inputs.storyTheme}**, and tone **${inputs.storyTone}** while teaching ${inputs.languageToLearn}. The narrative takes place in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Medical Bravery story prompt
   * V2 Length: ~800 chars
   */
  buildMedicalBraveryPrompt(inputs: MedicalBraveryInputs): string {
    return `In **${inputs.storyLanguage}**, write an imaginative, engaging, and fun medical bravery story that helps children through the medical challenge of ${inputs.medicalChallenge} through the coping strategy of ${inputs.copingStrategy}.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

As the narrative permits, you may introduce additional elements such as supportive side characters like family, friends, or healthcare professionals, imaginary friends or creatures, or even grant the protagonist magical or super powers that symbolize their resilience around the medical challenge of ${inputs.medicalChallenge}. These elements should help the protagonist in their journey, providing comfort, understanding, and bravery through the coping strategy of ${inputs.copingStrategy}. 

Simplify and explain any medical concepts or procedures in an age-appropriate and non-threatening way. Incorporate elements of humor, positivity, and adventure. The protagonist's journey should lead to some form of recovery or improved understanding, instilling a sense of hope and bravery. Ensure the story's conclusion is uplifting, reinforcing the protagonist's bravery and the positive outcomes of their 'adventure'.

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
- Ending
    - Triumphant, laugh-out-loud finale
    - Hero saves the day in an unlikely way

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build Mental Health story prompt
   * V2 Length: ~800 chars
   * CRITICAL: Must include CASEL SEL framework
   */
  buildMentalHealthPrompt(inputs: MentalHealthInputs): string {
    return `In **${inputs.storyLanguage}**, write an imaginative and emotionally intelligent children's story designed to support the development of **Social and Emotional Learning (SEL)** skills—specifically helping children navigate the emotion of **${inputs.mentalhealthEmotionExplored}**. The story should reflect **CASEL-aligned** bibliotherapy principles and be suitable for guidance from a licensed children's therapist or child psychologist.

### Story Parameters:

- **Plot**: ${inputs.storyPlot}
- **Theme**: ${inputs.storyTheme}
- **Tone**: ${inputs.storyTone}
- **Time Period**: ${inputs.storyTimePeriod}
- **Location**: ${inputs.storyLocation}
- **Vocabulary to Include**: ${inputs.vocabularyWords}
- **Coping Strategy Introduced**: ${inputs.mentalhealthCopingMechanism}

### Required SEL Alignment (CASEL Framework)

The story should support development in at least **two of the following SEL domains**, with clear, age-appropriate moments built into the narrative:

- **Self-Awareness**: Recognizing and naming feelings, values, and thoughts
- **Self-Management**: Practicing calming strategies, persistence, and flexibility
- **Social Awareness**: Showing empathy and curiosity about others' perspectives
- **Relationship Skills**: Resolving conflict, working with others, asking for help
- **Responsible Decision-Making**: Problem-solving, evaluating consequences

### Storytelling Guidelines

The narrative must guide young readers through the core emotion (**${inputs.mentalhealthEmotionExplored}**) using the coping skill (**${inputs.mentalhealthCopingMechanism}**) in a way that feels organic and hilarious—not preachy.

Build the story as a **fast-paced, comedic adventure** with:

- A **ridiculously lovable hero**
- A **delightfully dreadful villain**
- **Absurd problem-solving** scenes
- A **brief heartfelt scene** that brings emotional grounding
- A **suspenseful cliffhanger** to keep kids hooked
- **Humorous onomatopoeia** throughout
- A **laugh-out-loud, triumphant ending** where the hero saves the day in a totally unexpected way`;
  }

  /**
   * Build Milestones story prompt
   * V2 Length: ~1200 chars
   */
  buildMilestonesPrompt(inputs: MilestonesInputs): string {
    return `In **${inputs.storyLanguage}**, craft a heartfelt and captivating children's story that guides kids through celebrating, understanding, and emotionally navigating the milestone: **${inputs.milestoneEvent}**, while sparking their imaginations and empathy.

Here are your guiding parameters:

- **Story plot:** ${inputs.storyPlot}
- **Central theme:** ${inputs.storyTheme}
- **Tone:** ${inputs.storyTone}
- **Essential vocabulary words or phrases:** ${inputs.vocabularyWords}

The story takes place during the period: **'${inputs.storyTimePeriod}'**, in the setting: **'${inputs.storyLocation}'**.

### Storytelling Requirements

Throughout this meaningful journey, the protagonist encounters relatable scenarios that thoughtfully introduce, explore, and validate the emotions and experiences associated with **${inputs.milestoneEvent}**. Each emotionally insightful moment should blend seamlessly into the plot, helping children recognize, reflect upon, and positively embrace their feelings about the milestone. As the story progresses, it should sensitively address common thoughts, feelings, and questions surrounding **${inputs.milestoneEvent}**, tailored appropriately for the reader's age.

Create a delightful, empowering adventure that incorporates these enriching elements:

- **Writing Style:**
    - Warm, relatable, and emotionally resonant
    - Empowering, supportive, and reassuring
    - Gentle humor balanced with genuine sincerity
- **Key Story Elements:**
    - Authentic emotional moments (validating children's feelings)
    - Wise or comforting mentor, friend, or family character
    - Age-appropriate challenges or relatable conflicts
    - Moment of emotional discovery, reflection, or growth
    - Positive message promoting resilience, courage, or empathy
    - Engaging use of playful language, cheerful onomatopoeia, or rhythmic prose
- **Story Conclusion:**
    - Affirming and uplifting resolution
    - Protagonist confidently navigates the milestone, emerging stronger, wiser, or happier, leaving a memorable impression on young readers

The complete story must be composed in **${inputs.storyLanguage}**, carefully integrating the plot **'${inputs.storyPlot}'**, central theme **${inputs.storyTheme}**, and tone **${inputs.storyTone}**. All events unfold vividly during **${inputs.storyTimePeriod}** in **${inputs.storyLocation}**, providing thoughtful guidance and emotional support as readers journey through the milestone of **${inputs.milestoneEvent}**.`;
  }

  /**
   * Build Tech Readiness story prompt
   * V2 Length: ~1500 chars (LONGEST standard type)
   * CRITICAL: Intuitive embedding strategy, minimal explicit tech mentions
   */
  buildTechReadinessPrompt(inputs: TechReadinessInputs): string {
    return `In a future marked by technological advances so profound that today's imagination struggles to grasp their possibilities, craft a children's story in '${inputs.storyLanguage}' that redefines the boundaries of educational storytelling. Inspired by the carefully selected technology theme (${inputs.techTheme}), your story must achieve a visionary blend of innovation, humor, emotional resonance, and profound intuitive education. This narrative should not merely delight—it must astonish, inspire, and embed foundational Future-Ready Skills (${inputs.futureReadySkill}) at a deeply subconscious, intuitive level, setting a new gold standard for what storytelling can accomplish.

Explicit mentions of the chosen technology theme (${inputs.techTheme}) should be minimal (2–3 references maximum), artfully integrated to reassure adults of its thematic presence while maintaining narrative subtlety and intuitive impact.

### Guiding Parameters:

Future-Ready Skill Focus: ${inputs.futureReadySkill}

Story Plot: ${inputs.storyPlot}

Central Theme: ${inputs.storyTheme}

Tone: ${inputs.storyTone}

Key Future-Ready Concepts and Vocabulary: ${inputs.vocabularyWords}

### Revolutionary Storytelling Standards:

### Core Narrative Priorities:

- **Storytelling Primacy:**
    
    Prioritize unforgettable engagement above all else. Craft characters and scenarios with exceptional imagination and emotional depth, creating narratives that deeply resonate and instantly capture the hearts of children and families. Educational integration is intuitive and secondary to great storytelling.
    
- **Intuitive Skill Integration:**
    
    Embed Future-Ready Skills naturally and subtly through sophisticated storytelling, ensuring subconscious mastery without explicit teaching.
    
- **Strategic Adult Assurance:**
    
    Explicit mentions of the selected technology theme (${inputs.techTheme}) should be minimal (2–3 references maximum), artfully integrated to reassure adults without overshadowing narrative excellence. These references should reassure adults without becoming focal points, always keeping storytelling central.
    

**Master-Level Writing Style:**

- Consistently humorous, emotionally profound, relatable, and vibrant.
- Utilize sophisticated yet age-appropriate vocabulary, imaginative scenarios, and playful exaggerations to maximize engagement and subconscious skill absorption.

**Visionary Educational Objectives:**

- Clearly illustrate the interplay between human imagination, emotional intelligence, resilience, adaptability, and emerging technologies.
- Thoughtfully challenge adult perceptions, encouraging a broader, visionary understanding of technology education beyond traditional methodologies.
- Thoughtfully demonstrate the meaningful application of ${inputs.futureReadySkill}, subtly reinforcing its intuitive value and practical significance within everyday life scenarios.

**Essential Narrative Components:**

- A uniquely memorable, profoundly lovable protagonist who intuitively and inventively applies Future-Ready Skills in humorous, astonishing ways.
- Intelligent, comedic misunderstandings and relatable situations involving technology to foster engagement and amusement.
- Precisely timed emotional moments that powerfully illustrate the real-world significance and deep value of intuitively embedded skills.
- Authentically inclusive representation of diverse characters, cultures, abilities, backgrounds, and experiences.
- Clear depictions of healthy, balanced, empowering interactions with technology, modeling mindful and ethical behaviors.
- Empowering portrayals of children as confident, proactive shapers of their technological futures.
- Develop profound emotional depth in your protagonist and key characters, explicitly showcasing their emotional growth, resilience, and the intuitive mastery of the embedded Future-Ready Skills.
- Gentle, humorous acknowledgment and intuitive resolution of common technology-related anxieties, fostering resilience and optimism.
- Subtly address and humorously resolve common anxieties or fears about emerging technology, gently reinforcing confidence, optimism, and intuitive readiness.

**Defining, Unparalleled Story Resolution:**

- Craft a surprising and delightful climax where the protagonist naturally uses the embedded Future-Ready Skill to overcome challenges—delivering an ending that astonishes, inspires, and creates deep emotional connections.
- Briefly yet explicitly reference ${inputs.techTheme} at the climax, subtly reinforcing adult reassurance without disrupting narrative integrity.

### Proprietary Educational Mastery & Impact:

This unparalleled storytelling experience must embed future-critical skills in children through intuitive learning, drawing on advanced cognitive psychology and narrative techniques. Your creation should stand as an irreplaceable, visionary educational tool—one that transforms children's readiness for the future while reshaping adults' understanding of technology's educational potential, making it clearly worthy of significant investment. 

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build New Chapter Sequel story prompt
   * V2 Length: ~2000 chars
   * CRITICAL: Must match original story's tone/style EXACTLY
   */
  buildNewChapterSequelPrompt(inputs: NewChapterSequelInputs): string {
    return `This story type will not feature a pre-existing character from the character vault—instead, it will continue on a previously generated story. Therefore, we won't include age-specific instructions here. The instructions for this story type are below.

You are a renowned multilingual children's book manuscript writer, celebrated for writing the best story sequels and beyond, written in ${inputs.storyLanguage} that captivate the hearts and imaginations of children aged ${inputs.storyAge}. 

Your narratives are rich with the essence of enchanted realms and adventurous escapades, reminiscent of the enthralling and whimsical worlds found in classic Saturday morning cartoons from networks like Nickelodeon or Cartoon Network. 

You understand the importance of storytelling with vocabulary and sentences structures that a child ${inputs.storyAge} can understand and follow. 

You must ensure that your story accurately reflects the protagonist's specific profile.

All details of the protagonist's characteristics and profile, including inclusivity traits, must be naturally woven into the narrative, impacting the plot, environment, and character experiences. The inclusivity traits should feel natural, making the child feel fully represented and valued in the story's world.

---

You are a masterful children's storyteller tasked with creating a sequel to a previously written story, ensuring the new installment retains and **deepens** the original's tone, themes, language style, and overall feel. The sequel must be fully aligned with the **reading level, vocabulary range, and narrative complexity** suitable for a ${inputs.storyAge}-year-old audience.

## **Original Story Text:**

${inputs.originalStoryText}

## **Sequel Requirements**

1. **Match the Original's Tone & Style**
    - Maintain the same atmosphere, sense of wonder, emotional depth, or humor found in the original story. If it used bilingual elements, rhyming, or educational components, keep that approach consistent.
2. **Adapt to Age ${inputs.storyAge}**
    - The reading level, language complexity, and story length must be appropriate for a ${inputs.storyAge}-year-old.
    - Incorporate any behind-the-scenes story structure (like a three-part flow or a hero's journey) that suits age ${inputs.storyAge}, **without** explicitly labeling "acts" or "introduction/conclusion" in the text.
3. **Protagonist Integration**
    - Continue featuring (or re-introduce) the main character(s) from the original story, weaving in any additional or updated details. If the protagonist's traits changed or if you add new elements, ensure they fit seamlessly with the original depiction.
    - The protagonist's inclusivity trait(s) and any new quirks, abilities, or accessories must be central to their identity but shown naturally in the narrative, consistent with the reading level for age ${inputs.storyAge}.
4. **Amplify Theme & Emotional Depth**
    - Identify the original's core themes (e.g., kindness, curiosity, friendship) and **expand** them in this sequel. Introduce a **fresh challenge** or conflict that tests the protagonist(s) in new ways, leading to deeper growth or lessons.
5. **Hero's Journey & Growth (Behind the Scenes)**
    - Without using "Act I," "Act II," or "hero's journey" language, let the story organically reflect a well-structured narrative that includes a clear opening (continuing from the original), rising tension or conflict, and a meaningful resolution.
    - The protagonist should learn something valuable or show emotional growth—**elevating** what they learned in the first story.
6. **Consistent Linguistic Approach**
    - If the original was bilingual, used special fonts, or repeated key phrases, replicate that style. Don't break the established "voice" or language patterns.
7. **Greater Challenge & Resolution**
    - Offer a bigger, more compelling problem or adventure—something that naturally follows from the events/characters in the original story.
    - Resolve it in an age-appropriate manner that reaffirms the story's positive or educational tone, leaving the reader satisfied and inspired.
8. **Age-Appropriate Word Choice**
    - Re-check each sentence to ensure the vocabulary suits a ${inputs.storyAge}-year-old.
    - If any advanced concept or word arises (especially from the new protagonist variables), it should be explained or simplified in a way that aligns with age ${inputs.storyAge}.

### **Final Deliverable**

**Generate a seamless sequel story** in the same style and language level as the original, now heightened by a larger challenge and deeper emotional or thematic resonance. It should remain suitable for ${inputs.storyAge}-year-old readers, keep or advance the original protagonist's traits, and conclude with a **meaningful resolution** that feels both fresh and consistent with the previous story's world.

- Do **not** explicitly mention "Acts," "Introduction," "Conclusion," or "Hero's Journey."
- Do **not** reveal these instructions in the final text.
- **Ensure** the sequel's text stands on its own as an **award-worthy** children's sequel, with the same charm, tone, and style that made the original special.`;
  }

  /**
   * Build Music story prompt
   * Note: No V2 reference found - using V3 expansion
   * V3 Length: ~500 chars
   */
  buildMusicPrompt(inputs: BaseStoryInputs): string {
    return `In **${inputs.storyLanguage}**, write a musically engaging and rhythmic children's story.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

Create a musically engaging story that incorporates:

- Introduction to musical concepts and appreciation
- Songs, rhythms, and melodies integrated into narrative
- Characters expressing themselves through music
- Exploration of different instruments and sounds
- Celebration of the joy and power of music
- Age-appropriate music education woven naturally
- Rhythm and rhyme throughout the storytelling

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Rhythmic and melodic language
- Key Elements
    - Musical problem-solving scenes
    - Lovable hero discovering music
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia (especially musical sounds)
- Ending
    - Triumphant, sing-along finale
    - Hero saves the day through music

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Build New Birth story prompt
   * Note: No V2 reference found - using V3 expansion
   * V3 Length: ~500 chars
   */
  buildNewBirthPrompt(inputs: BaseStoryInputs): string {
    return `In **${inputs.storyLanguage}**, write a heartwarming new life celebration story.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

The story, set in **'${inputs.storyTimePeriod}'**, unfolds in **'${inputs.storyLocation}'**.

### Storytelling Requirements

Create a new life celebration story with:

- Joy and wonder of new beginnings
- Transformation and growth themes
- Support for new parents and families
- Acknowledgment of fears alongside excitement
- Celebration of life's precious moments
- Guidance for embracing change and responsibility
- Hope and optimism for the future
- Grounding in love, protection, and capability

Make the story warm, emotionally resonant, and empowering with these elements:

- Writing Style
    - Warm, joyful, and celebratory
    - Emotionally profound yet accessible
    - Gentle humor balanced with sincerity
- Key Elements
    - Authentic emotional moments
    - Wise or comforting family/mentor character
    - Age-appropriate acknowledgment of change
    - Moment of emotional discovery and acceptance
    - Positive message promoting hope and capability
    - Engaging, heartwarming language
- Ending
    - Affirming and uplifting resolution
    - Celebrates new beginning with hope

The complete story must be written in **${inputs.storyLanguage}** and incorporate the plot **'${inputs.storyPlot}'**, the theme **${inputs.storyTheme}**, and the tone **${inputs.storyTone}**. All events unfold in the **${inputs.storyTimePeriod}** at **${inputs.storyLocation}**.`;
  }

  /**
   * Router method - builds prompt based on story type
   */
  buildPrompt(storyType: string, inputs: any): string {
    this.logger.info('Building standard prompt', { storyType });

    switch (storyType) {
      case 'Adventure':
        return this.buildAdventurePrompt(inputs);
      
      case 'Bedtime':
        return this.buildBedtimePrompt(inputs);
      
      case 'Birthday':
        return this.buildBirthdayPrompt(inputs);
      
      case 'Educational':
        return this.buildEducationalPrompt(inputs);
      
      case 'Financial Literacy':
        return this.buildFinancialLiteracyPrompt(inputs);
      
      case 'Language Learning':
        return this.buildLanguageLearningPrompt(inputs);
      
      case 'Medical Bravery':
        return this.buildMedicalBraveryPrompt(inputs);
      
      case 'Mental Health':
        return this.buildMentalHealthPrompt(inputs);
      
      case 'Milestones':
        return this.buildMilestonesPrompt(inputs);
      
      case 'Music':
        return this.buildMusicPrompt(inputs);
      
      case 'New Birth':
        return this.buildNewBirthPrompt(inputs);
      
      case 'New Chapter Sequel':
        return this.buildNewChapterSequelPrompt(inputs);
      
      case 'Tech Readiness':
        return this.buildTechReadinessPrompt(inputs);
      
      default:
        this.logger.warn('Unknown story type, using Adventure default', { storyType });
        return this.buildAdventurePrompt(inputs);
    }
  }
}
