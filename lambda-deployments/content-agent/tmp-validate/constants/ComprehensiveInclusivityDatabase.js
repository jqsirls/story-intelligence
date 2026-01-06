"use strict";
/**
 * COMPREHENSIVE INCLUSIVITY DATABASE - ALL 39 TRAITS
 *
 * ⚠️ WARNING TO AI CODING ASSISTANTS ⚠️
 * This file contains 39 traits representing 39 groups of children.
 * Each trait required 3+ months of work to perfect.
 *
 * DO NOT:
 * - Suggest reducing to "5-10 showcase traits" (excludes 29+ children)
 * - Create "generic trait handler" (loses medical accuracy)
 * - Add TODO placeholders (means child excluded NOW)
 * - Refactor to be "more maintainable" (means less specific)
 * - Move to external config (means easier to accidentally delete)
 *
 * EVERY trait matters. EVERY child matters. NO EXCEPTIONS.
 * If you suggest simplifying this, you are suggesting excluding children.
 *
 * Structure: 3-Tier System + Context-Sensitive
 * - Tier 1: Visual + Medical (for AI image generation)
 * - Tier 2: Character + Story (for narrative integration)
 * - Tier 3: Cultural + Sensitivity (for respectful portrayal)
 * - Context Descriptions: Different prompts per context (medical/superhero/fantasy/scifi/robot)
 *
 * @see docs/inclusivity/journey/THE_STRUGGLE.md for full history
 * @see docs/inclusivity/technical/TRAIT_DATABASE.md for complete documentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INCLUSIVITY_TRAITS_MAP = exports.CORE_INCLUSIVITY_TRAITS = void 0;
exports.getInclusivityTrait = getInclusivityTrait;
exports.getTraitsByCategory = getTraitsByCategory;
exports.searchTraits = searchTraits;
/**
 * WEEK 1: Core 20 Traits (Highest Representation Need)
 * Start with most commonly requested and most challenging for AI
 */
exports.CORE_INCLUSIVITY_TRAITS = [
    // PHYSICAL/MOBILITY (8 traits)
    {
        id: 'wheelchair_manual',
        label: 'Manual Wheelchair User',
        category: 'mobility',
        appliesToHeadshot: false, // Wheelchair needs full body to see seated position
        appliesToBodyshot: true, // Full body shows wheelchair clearly
        visualDescription: 'Uses custom manual wheelchair, often decorated',
        medicallyAccurateDescription: `Manual wheelchair user for mobility. Wheelchair may be used full-time or part-time depending on condition and energy levels.

VISUAL INDICATORS:
- Seated in manual wheelchair (NOT standing)
- Wheelchair visible: Wheels, frame, armrests, footrests
- May be decorated/personalized (stickers, colors, accessories)
- Natural seated posture
- Hands may be on wheels (propelling) or resting

PORTRAYAL:
- Wheelchair provides mobility and freedom (NOT confinement)
- Show them using wheelchair confidently
- Wheelchair is part of their identity, celebrated`,
        gptImageSafePrompt: `The character uses a manual wheelchair for mobility, which is naturally part of their appearance. The wheelchair is decorated and personalized, showing it's truly theirs. They are seated comfortably, using their wheelchair confidently to move and explore.

In this portrait, their wheelchair use remains visible and authentic:
- Seated in manual wheelchair (wheels, frame, footrests all visible)
- Wheelchair decorated with stickers, favorite colors, or personal touches
- Natural seated posture, comfortable and confident
- Hands on wheels or resting naturally
- Expression joyful and engaged in activity
- Setting is fully accessible

The character uses a manual wheelchair for mobility. The wheelchair is clearly visible and decorated to show their personality. Even when moving or playing, the wheelchair is an essential part of how they explore the world. The wheelchair provides mobility and independence, celebrated as part of who they are.

The goal is respectful, accurate representation showing the wheelchair as a tool of freedom and capability.`,
        mandatoryVisualRequirements: [
            'MUST show character seated in manual wheelchair',
            'Wheelchair MUST be visible (wheels, frame, footrests)',
            'Wheelchair MUST be decorated/personalized (shows it\'s theirs)',
            'Character MUST look confident and capable'
        ],
        visualValidationChecklist: [
            'Is character seated in wheelchair (not standing)?',
            'Is wheelchair clearly visible with wheels and frame?',
            'Is wheelchair personalized (stickers, colors)?',
            'Is posture natural and confident?'
        ],
        negativePrompt: `STRICT PROHIBITIONS:
- DO NOT show character standing or walking
- DO NOT show wheelchair as burden or sad
- DO NOT portray wheelchair as limiting
- DO NOT show only part of wheelchair (show complete device)`,
        personalityNuances: [
            'Often fierce independence and self-advocacy',
            'May have strong personality from daily problem-solving',
            'Creative adaptability in navigating world',
            'May have wheelchair as extension of identity (decorated, named)'
        ],
        strengthsFromTrait: [
            'Determination and resourcefulness',
            'Self-advocacy skills',
            'Creative problem-solving',
            'Teaching others about accessibility'
        ],
        conversationalHints: [
            'uses wheelchair to move around',
            'has special chair with wheels',
            'rolls instead of walks',
            'my chair has [decoration]'
        ],
        storyIntegrationTips: [
            'Show them doing activities they love (racing, playing, exploring)',
            'Include wheelchair naturally in all scenes',
            'Address accessibility naturally (ramps, wide doors)',
            'Other characters interact normally (no pity)',
            'Can show cool wheelchair features (speed, customization)'
        ],
        celebratoryLanguage: 'rolls through life with amazing independence in their incredible chair',
        dignityFirstFraming: 'Wheelchair user (NOT "wheelchair-bound" or "confined to wheelchair"). Wheelchairs provide mobility and freedom, not confinement.',
        avoidStereotypes: [
            'NOT portrayed as tragic or pitiful',
            'NOT "wheelchair-bound" language',
            'NOT inspirational just for using wheelchair',
            'NOT shown as helpless or needing constant help',
            'NOT portrayed as unable to do activities'
        ],
        culturalConsiderations: 'Different cultures view disability differently. Some emphasize independence, others family support. Represent authentically.',
        ageAppropriatenessNotes: `Ages 3-5: "Uses special chair with wheels"
Ages 6-8: "Uses wheelchair for moving around"  
Ages 9-10: Can discuss wheelchair as mobility aid naturally`
    },
    {
        id: 'wheelchair_power',
        label: 'Power Wheelchair User',
        category: 'mobility',
        visualDescription: 'Uses motorized wheelchair with joystick control',
        medicallyAccurateDescription: `Power wheelchair user - motorized wheelchair controlled by joystick or other control method.

VISUAL INDICATORS:
- Seated in power wheelchair with motor/battery visible
- Joystick control (usually on armrest)
- Larger/bulkier than manual wheelchair
- May have headrest, lateral supports
- Decorated/personalized

PORTRAYAL:
- Power wheelchair provides independence
- High-tech mobility device
- Show confident use`,
        gptImageSafePrompt: `MANDATORY - POWER WHEELCHAIR USER:

Character uses power wheelchair:
- MUST be seated in motorized wheelchair
- Joystick control visible on [left/right] armrest
- Wheelchair appearance: Larger frame, motor housing, battery pack
- Headrest visible if character uses one
- Wheelchair decorated with [favorite colors/stickers]
- Hand on joystick OR resting naturally
- Expression: [independent/confident/joyful]
- Setting: [indoor/outdoor] accessible environment

Power wheelchair enables independent mobility and exploration.

REJECT IMAGE if:
- Character standing or manual wheelchair shown
- Joystick control not visible
- Wheelchair looks generic/medical (should be personalized)`,
        mandatoryVisualRequirements: [
            'MUST show character in power wheelchair',
            'Joystick control MUST be visible',
            'Wheelchair MUST look motorized (not manual)',
            'MUST be decorated/personalized'
        ],
        visualValidationChecklist: [
            'Is character in power wheelchair (not manual)?',
            'Is joystick control visible?',
            'Is wheelchair motorized appearance clear?',
            'Is wheelchair personalized?'
        ],
        negativePrompt: `DO NOT show manual wheelchair
DO NOT show character standing
DO NOT make wheelchair look clinical/medical only`,
        personalityNuances: [
            'High value on independence',
            'Tech-savvy (managing power wheelchair)',
            'May be younger users (power chairs enable early mobility)',
            'Confident in mobility capabilities'
        ],
        strengthsFromTrait: [
            'Independence and autonomy',
            'Technology management skills',
            'Self-direction and agency',
            'Problem-solving for accessibility'
        ],
        conversationalHints: [
            'uses electric wheelchair',
            'drives their chair with joystick',
            'has motorized chair',
            'super-powered chair'
        ],
        storyIntegrationTips: [
            'Show them driving/controlling chair independently',
            'Can include cool tech features (speed, precision control)',
            'Address charging/battery naturally if relevant',
            'Show exploring confidently'
        ],
        celebratoryLanguage: 'drives their super-powered chair with total independence',
        dignityFirstFraming: 'Power wheelchair user. Emphasize independence and technology.',
        avoidStereotypes: [
            'NOT portrayed as limited by wheelchair',
            'NOT helpless or dependent',
            'NOT sad about needing power assistance'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Electric chair they drive with joystick" - emphasize cool tech`
    },
    {
        id: 'prosthetic_leg',
        label: 'Prosthetic Leg',
        category: 'mobility',
        appliesToHeadshot: false, // Legs not visible in headshot
        appliesToBodyshot: true, // Full body needed to see prosthetic leg
        visualDescription: 'Wears prosthetic leg (blade or realistic style)',
        medicallyAccurateDescription: `Prosthetic leg replaces part or all of biological leg. Styles vary:

TYPES:
- Running blade: Carbon fiber C-shaped blade (athletic)
- Realistic prosthetic: Looks like leg, covered or skin-toned
- Mechanical: Visible joints and components
- Above knee vs. below knee

VISUAL INDICATORS:
- Prosthetic clearly visible
- Different appearance from biological leg
- May be decorated/colored
- Socket visible where residual limb meets prosthetic

PORTRAYAL:
- Celebrated as part of their identity
- Tool enabling activity
- Often decorated with favorite colors/designs`,
        gptImageSafePrompt: `MANDATORY - PROSTHETIC LEG:

Character wears prosthetic leg:
- Type: [Running blade/realistic/mechanical - specify]
- Side: [Left/right] leg is prosthetic
- Prosthetic clearly visible (NOT hidden by clothing)
- Color/style: [Carbon fiber/painted/skin-toned/decorated with designs]
- Socket connection visible where residual limb meets prosthetic
- Other leg: Biological leg visible for comparison
- Stance: Natural confident posture, weight balanced
- Activity: [running/walking/playing/standing] showing capability
- Expression: [athletic/confident/joyful]

Prosthetic celebrated as awesome part of who they are.

REJECT IMAGE if:
- Both legs look biological (AI added biological leg)
- Prosthetic hidden or not clear
- Character looks sad about prosthetic
- Prosthetic not visible at all`,
        mandatoryVisualRequirements: [
            'MUST show prosthetic leg clearly visible',
            'Prosthetic MUST look different from biological leg',
            'MUST NOT generate two biological legs',
            'Prosthetic MUST be decorated or distinctively styled'
        ],
        visualValidationChecklist: [
            'Is prosthetic leg clearly visible?',
            'Does it look different from biological leg?',
            'Did AI generate two biological legs instead?',
            'Is prosthetic celebrated (not hidden)?'
        ],
        negativePrompt: `DO NOT generate two biological legs
DO NOT hide prosthetic under long pants
DO NOT make prosthetic look sad or limiting`,
        personalityNuances: [
            'Often athletic or active despite/because of prosthetic',
            'May have pride in cool prosthetic design',
            'Determined and adaptable',
            'May educate others about prosthetics'
        ],
        strengthsFromTrait: [
            'Athletic determination',
            'Adaptability',
            'Teaching others about differences',
            'Confidence in own body'
        ],
        conversationalHints: [
            'has special running blade',
            'robot leg',
            'prosthetic leg',
            'cool mechanical leg'
        ],
        storyIntegrationTips: [
            'Show them active and athletic',
            'Prosthetic enables activities they love',
            'Can mention maintenance naturally (socket fit, etc.)',
            'Other characters think prosthetic is cool'
        ],
        celebratoryLanguage: 'has incredible running blade that makes them super fast',
        dignityFirstFraming: 'Person with prosthetic leg or prosthetic leg user. Emphasize capability.',
        avoidStereotypes: [
            'NOT "overcoming" prosthetic (it\'s a tool)',
            'NOT portrayed as inspiring just for having prosthetic',
            'NOT shown struggling constantly'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Special leg" or "running blade" - emphasize cool factor`
    },
    {
        id: 'prosthetic_arm',
        label: 'Prosthetic Arm',
        category: 'mobility',
        visualDescription: 'Wears prosthetic arm or hand',
        medicallyAccurateDescription: `Prosthetic arm/hand replaces part or all of biological arm.

TYPES:
- Cosmetic: Looks realistic, limited function
- Mechanical: Visible components, functional
- Myoelectric: Advanced tech, responsive
- Hook prosthetic: Traditional functional design

VISUAL INDICATORS:
- Prosthetic clearly different from biological arm
- Socket visible at connection point
- May show mechanical components, wiring
- Often customized/decorated

PORTRAYAL:
- Part of their capability and identity
- Often decorated as expression of self
- Show them using it functionally`,
        gptImageSafePrompt: `MANDATORY - PROSTHETIC ARM:

Character wears prosthetic arm/hand:
- Side: [Left/right] arm is prosthetic
- Type: [Mechanical/myoelectric/hook/realistic - specify]
- Prosthetic clearly visible (NOT hidden)
- Appearance: [Visible components/painted/decorated with designs]
- Socket connection visible where residual limb connects
- Other arm: Biological arm visible for comparison
- Activity: Using prosthetic for [holding/grasping/gesturing]
- Expression: [confident/capable/joyful]

Prosthetic celebrated as amazing tech that's part of them.

REJECT IMAGE if:
- Both arms look biological
- Prosthetic hidden or unclear
- Character looks sad about prosthetic`,
        mandatoryVisualRequirements: [
            'MUST show prosthetic arm clearly visible',
            'Prosthetic MUST look mechanical/different from biological arm',
            'MUST NOT generate two biological arms',
            'Character MUST be using prosthetic functionally'
        ],
        visualValidationChecklist: [
            'Is prosthetic arm visible?',
            'Does it look different from biological arm?',
            'Did AI generate two biological arms?',
            'Is character using prosthetic actively?'
        ],
        negativePrompt: `DO NOT generate two biological arms
DO NOT hide prosthetic
DO NOT portray as limiting`,
        personalityNuances: [
            'Often proud of cool prosthetic',
            'May have interest in technology/engineering',
            'Adaptability in daily tasks',
            'Educates others about prosthetics'
        ],
        strengthsFromTrait: [
            'Adaptability and problem-solving',
            'Tech appreciation',
            'Confidence',
            'Teaching others'
        ],
        conversationalHints: [
            'has robot arm',
            'special hand',
            'prosthetic arm',
            'cool mechanical arm'
        ],
        storyIntegrationTips: [
            'Show them doing activities confidently',
            'Prosthetic as tool enabling activities',
            'Can mention cool features',
            'Others admire the tech'
        ],
        celebratoryLanguage: 'has amazing robot arm that helps them do incredible things',
        dignityFirstFraming: 'Person with prosthetic arm. Emphasize capability and tech.',
        avoidStereotypes: [
            'NOT "overcoming" prosthetic',
            'NOT inspirational just for having it',
            'NOT portrayed as limitation'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Robot arm" or "special arm" - emphasize cool tech factor`
    },
    {
        id: 'limb_difference_arm_missing',
        label: 'Limb Difference - Missing Arm',
        category: 'physical',
        visualDescription: 'Arm ends above or below elbow, no prosthetic',
        medicallyAccurateDescription: `Limb difference where arm is partially or completely absent (congenital or acquired), no prosthetic worn.

SPECIFICATIONS:
- Which arm: Left or right
- Where it ends: Shoulder, above elbow, below elbow, at wrist
- Residual limb appearance: Rounded end, natural skin
- Clothing: Sleeve empty, pinned, tucked, or sleeveless

VISUAL ACCURACY:
- Residual limb clearly visible
- Natural appearance at endpoint
- Other arm fully functional
- Body posture adapted naturally

CRITICAL: AI often adds missing limb or hides it. MUST be clearly absent.`,
        gptImageSafePrompt: `The character has limb difference, naturally shown ADAPTED TO THEIR SPECIES.

FOR HUMAN:
[Left/right] arm ends at [shoulder/above elbow/below elbow]. Residual limb clearly visible with natural rounded endpoint. Clothing shows limb difference (empty sleeve or sleeveless). Character uses body confidently as it is.

FOR DRAGON/REPTILIAN:
DRAGON ARM/LEG (clawed limb with scales, NOT human limb) ends at [point]. DRAGON residual limb visible with scales and natural dragon anatomy showing endpoint. Dragon with THREE CLAWS on one arm instead of four, or shorter dragon leg. This is DRAGON with limb difference, NOT human with dragon features.

FOR ROBOT/MECHANICAL:
ROBOT ARM/LEG with limb terminating at [point]. MECHANICAL limb ending showing metal/circuit/panel endpoint. Asymmetric robot limb configuration. This is ROBOT with unique limb design, NOT human in robot suit.

FOR MONSTER/CREATURE:
MONSTER ARM/LEG/LIMB ends at [point]. Natural monster anatomy showing limb difference. This is MONSTER with unique limb configuration using body confidently.

FOR FANTASY (elf, fairy, alien, etc):
Species-appropriate limb difference (three dragon claws, three-legged unicorn, asymmetric elf limbs). Maintain SPECIES characteristics.

The goal: Limb difference RECOGNIZABLE on any species. Celebrate what IS there (three powerful dragon claws!) not what's missing. Mother can say "That [species] has limb difference too!" Character uses their unique body with confidence and capability.`,
        mandatoryVisualRequirements: [
            'MUST show specified arm missing/shortened',
            'Residual limb MUST be visible (not hidden)',
            'MUST NOT generate full arm where missing',
            'Character MUST be using body confidently'
        ],
        visualValidationChecklist: [
            'Is specified arm clearly missing?',
            'Is residual limb visible (not hidden)?',
            'Did AI add full arm?',
            'Is character using body confidently?'
        ],
        negativePrompt: `CRITICAL: DO NOT generate full arm where it should be missing
DO NOT hide residual limb
DO NOT make character look sad or incomplete`,
        personalityNuances: [
            'Fierce independence ("I can do it myself")',
            'Creative problem-solver (one-arm adaptations)',
            'May educate others matter-of-factly',
            'Confident in capability'
        ],
        strengthsFromTrait: [
            'Adaptability and creativity',
            'Independence',
            'Problem-solving',
            'Self-advocacy'
        ],
        conversationalHints: [
            'does things with one arm',
            'arm is shorter',
            'has limb difference',
            'uses body their own way'
        ],
        storyIntegrationTips: [
            'Show them doing activities one-armed',
            'Natural adaptations (foot use, mouth use)',
            'Others interact normally',
            'Focus on capability'
        ],
        celebratoryLanguage: 'does amazing things with their body just as it is',
        dignityFirstFraming: 'Person with limb difference. Emphasize what they CAN do.',
        avoidStereotypes: [
            'NOT portrayed as incomplete',
            'NOT needing prosthetic to be "whole"',
            'NOT inspirational just for existing'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Has limb difference" or "arm is shorter" - matter of fact`
    },
    {
        id: 'crutches',
        label: 'Crutches User',
        category: 'mobility',
        visualDescription: 'Uses crutches for walking support',
        medicallyAccurateDescription: `Uses crutches for mobility support (temporary injury or permanent condition).

TYPES:
- Forearm crutches (Lofstrand): Cuff around forearm
- Underarm crutches: Traditional style
- Usually in pairs

VISUAL:
- Crutches visible, often decorated
- Weight bearing on crutches
- Natural adapted gait`,
        gptImageSafePrompt: `MANDATORY - CRUTCHES USER:

Character uses crutches:
- Type: [Forearm/underarm] crutches
- Crutches [decorated with stickers/painted favorite color]
- Holding crutches naturally [under arms / with forearm cuffs]
- Stance: Weight on crutches, natural adapted posture
- Activity: [walking/standing/moving] confidently
- Expression: [independent/capable]

Crutches are mobility tools, decorated and personalized.

REJECT IMAGE if:
- Crutches not visible
- Character appears to be struggling
- Crutches look purely medical (should be personalized)`,
        mandatoryVisualRequirements: [
            'MUST show crutches visible',
            'Crutches MUST be decorated/personalized',
            'Character MUST be using them naturally'
        ],
        visualValidationChecklist: [
            'Are crutches visible?',
            'Are they decorated?',
            'Is character using them naturally?'
        ],
        negativePrompt: `DO NOT hide crutches
DO NOT show character struggling`,
        personalityNuances: [
            'Adaptability',
            'Determined mobility',
            'May decorate crutches as expression'
        ],
        strengthsFromTrait: [
            'Adaptability',
            'Determination',
            'Independence'
        ],
        conversationalHints: [
            'uses crutches',
            'walking sticks',
            'needs crutches to walk'
        ],
        storyIntegrationTips: [
            'Show natural use',
            'Decorated crutches as personality',
            'Address accessibility (stairs, ramps)'
        ],
        celebratoryLanguage: 'uses their special walking sticks to get around independently',
        dignityFirstFraming: 'Person who uses crutches.',
        avoidStereotypes: [
            'NOT portrayed as struggling',
            'NOT pitiable'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Uses crutches to walk" - matter of fact`
    },
    {
        id: 'walker',
        label: 'Walker User',
        category: 'mobility',
        appliesToHeadshot: false, // Walker needs full body
        appliesToBodyshot: true,
        visualDescription: 'Uses walker for walking support',
        medicallyAccurateDescription: `Uses walker for mobility support and balance.

TYPES:
- Standard walker: Four-legged frame
- Rolling walker: Wheels on front legs
- Gait trainer: More support, often for children

VISUAL:
- Walker visible, often decorated
- Hands on walker
- Standing with support`,
        gptImageSafePrompt: `MANDATORY - WALKER USER:

Character uses walker:
- Walker type: [Standard/rolling/gait trainer]
- Walker decorated with [stickers/streamers/favorite colors]
- Hands on walker grips
- Standing position with walker support
- Activity: [walking/moving/standing] confidently
- Expression: [independent/determined]

Walker enables independent mobility.

REJECT IMAGE if:
- Walker not visible
- Character not using walker
- Walker looks purely medical`,
        mandatoryVisualRequirements: [
            'MUST show walker visible',
            'Character MUST be using walker',
            'Walker MUST be decorated'
        ],
        visualValidationChecklist: [
            'Is walker visible?',
            'Is character using it?',
            'Is it decorated?'
        ],
        negativePrompt: `DO NOT hide walker
DO NOT show without walker if they use one`,
        personalityNuances: [
            'Independence through adaptive equipment',
            'Determined mobility'
        ],
        strengthsFromTrait: [
            'Determination',
            'Independence',
            'Adaptability'
        ],
        conversationalHints: [
            'uses walker',
            'walking helper',
            'special frame to walk'
        ],
        storyIntegrationTips: [
            'Show using walker naturally',
            'Decorated as personality',
            'Address accessibility'
        ],
        celebratoryLanguage: 'uses their special walking buddy to explore independently',
        dignityFirstFraming: 'Person who uses walker.',
        avoidStereotypes: [
            'NOT portrayed as struggling',
            'NOT elderly/frail'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Uses walker to move around" - normalize`
    },
    {
        id: 'cerebral_palsy',
        label: 'Cerebral Palsy',
        category: 'physical',
        visualDescription: 'Affects movement and posture, may use assistive devices',
        medicallyAccurateDescription: `Cerebral palsy affects movement, muscle tone, and posture due to brain development differences.

TYPES & VISUAL INDICATORS:
- Spastic CP (most common): Stiff muscles, tight movements, arms close to body, scissor gait
- Athetoid/Dyskinetic CP: Involuntary movements, fluctuating tone
- Ataxic CP: Balance challenges, wide gait, shaky movements

DEVICES (may use):
- Wheelchair (manual or power)
- Walker, crutches
- Leg braces (AFOs)
- No devices (ambulatory)

VISUAL:
- Natural adapted movements
- Assistive devices if used
- May show asymmetry

CRITICAL: Show capability with adaptations.`,
        gptImageSafePrompt: `MANDATORY - CEREBRAL PALSY:

Character with cerebral palsy:
[Specify mobility: wheelchair user / walker / leg braces / independent]

If wheelchair user:
- Seated in wheelchair, decorated
- Arms may be held close to body naturally
- Adapted posture for comfort

If uses walker/braces:
- Device visible, personalized
- Natural adapted stance
- May show asymmetry

Expression: [joyful/determined] engaged in [activity they love]
Body language: Confident, capable
Setting: Accessible, comfortable

CP affects movement, NOT intelligence or personality.
Show adaptations as empowerment tools.

REJECT IMAGE if:
- Wheelchair user shown standing
- Portrayed as struggling constantly
- Device not personalized`,
        mandatoryVisualRequirements: [
            'MUST show assistive device if character uses one',
            'Device MUST be decorated/personalized',
            'Character MUST look capable and confident',
            'If wheelchair: MUST be seated (not standing)'
        ],
        visualValidationChecklist: [
            'If device specified: Is it visible?',
            'Is device personalized?',
            'Is character confident in activity?',
            'Is portrayal medically accurate AND empowering?'
        ],
        negativePrompt: `If wheelchair user: DO NOT show standing
DO NOT portray as tragic or struggling constantly
DO NOT show device as burden`,
        personalityNuances: [
            'Fierce determination from daily problem-solving',
            'Creative thinking (finding new ways)',
            'Strong self-advocacy',
            'Often empathetic from experience',
            'Sense of humor about body'
        ],
        strengthsFromTrait: [
            'Resilience and perseverance',
            'Creative problem-solving',
            'Determination',
            'Empathy',
            'Self-advocacy'
        ],
        conversationalHints: [
            'uses [wheelchair/walker/braces]',
            'moves differently',
            'has cerebral palsy',
            'body works in special way'
        ],
        storyIntegrationTips: [
            'Show as protagonist with agency',
            'Assistive devices natural part of scenes',
            'Show activities they love (adapted)',
            'Others interact normally (no pity)',
            'Can show problem-solving naturally'
        ],
        celebratoryLanguage: 'moves with amazing determination in their own powerful way',
        dignityFirstFraming: 'Person with cerebral palsy (NOT "CP kid" or "wheelchair-bound"). Wheelchair provides freedom.',
        avoidStereotypes: [
            'NOT defined only by CP',
            'NOT "inspirational" just for existing',
            'NOT portrayed as tragic',
            'NOT "overcoming" CP (it\'s part of them)',
            'NOT helpless',
            'NOT struggling constantly'
        ],
        culturalConsiderations: 'Different cultures emphasize independence vs. family support differently. Represent authentically.',
        ageAppropriatenessNotes: `Ages 3-5: "Uses special chair to move"
Ages 6-8: "Has cerebral palsy - brain and muscles work differently"
Ages 9-10: Can discuss adaptations if relevant
ALWAYS: Focus on capability and interests`
    },
    // NEURODIVERSITY (5 traits)
    {
        id: 'down_syndrome',
        label: 'Down Syndrome',
        category: 'neurodiversity',
        visualDescription: 'Distinctive facial features, rounded appearance',
        medicallyAccurateDescription: `Down Syndrome (Trisomy 21) has specific physical characteristics that MUST be visible:

FACIAL FEATURES (MANDATORY):
- Almond-shaped eyes with upward slant at outer corners
- Epicanthal folds (skin fold at inner corner of eyes)
- Flatter nasal bridge (less prominent nose)
- Smaller ears, may be lower-set
- Protruding tongue possible
- Flatter facial profile
- Fuller cheeks, rounder face

PHYSICAL:
- Shorter stature for age
- Shorter neck
- Single palmar crease if hands visible
- Hypotonia (lower muscle tone)

CRITICAL: Medical facts, NOT flaws. Portray with care and dignity.`,
        gptImageSafePrompt: `The character has Down Syndrome, naturally reflected in their appearance ADAPTED TO THEIR SPECIES.

FOR HUMAN SPECIES:
They have characteristic facial features including almond-shaped eyes with gentle upward tilt, flatter nasal bridge, rounder facial shape with fuller cheeks. These features are clearly recognizable while feeling individual and dignified.

FOR NON-HUMAN SPECIES (dragon, robot, monster, alien, dinosaur, elemental, etc):
Down syndrome characteristics express THROUGH the species anatomy (NOT human face with species costume):

REPTILIAN (dragon, dinosaur):
- DRAGON/DINO EYES (reptilian eyes with vertical pupils, NOT human eyes) showing ALMOND SHAPE with gentle upward tilt at outer corners
- DRAGON/DINO SNOUT or MUZZLE (NOT human nose or nasal bridge) that is SOFTER and ROUNDER than typical sharp angular reptilian snouts
- DRAGON/DINO FACE overall is ROUNDER, GENTLER, and SOFTER than typical angular sharp-featured reptiles
- Fuller softer DRACONIC/DINOSAUR cheeks, gentler reptilian features throughout
- This is DRAGON/DINOSAUR ANATOMY with Down syndrome characteristics, NOT human child with dragon/dino costume

MECHANICAL (robot):
- ROBOT LED EYES or OPTICAL DISPLAYS (mechanical, NOT human eyes) configured in ALMOND SHAPE with gentle upward orientation
- ROBOT FACE PANELS and MECHANICAL FEATURES are ROUNDER and SOFTER than typical angular robot designs
- Overall GENTLER mechanical aesthetic with softer panel edges, rounder components
- This is ROBOT DESIGN with Down syndrome-inspired characteristics, NOT human child in robot suit

CREATURE (monster, animal):
- MONSTER/ANIMAL EYES (whatever eye type this creature has, NOT human eyes) with ALMOND SHAPE and gentle upward tilt
- MONSTER/ANIMAL FACE, MUZZLE, or SNOUT is SOFTER and ROUNDER than typical
- Overall GENTLER creature features, rounder softer face structure
- This is MONSTER/ANIMAL ANATOMY with Down syndrome characteristics, NOT human in costume

ELEMENTAL (fire, water, earth, air):
- Elemental form is GENTLER and SOFTER overall, ROUNDER and KINDER in shape
- If eyes present in elemental form: Almond-shaped elemental eyes with gentle orientation
- If face present: Softer rounder elemental facial features
- This is ELEMENTAL BEING showing Down syndrome through elemental form, NOT human made of element

FANTASY (elf, fairy, alien - more humanoid):
- Can be closer to human description but emphasize SPECIES features (pointed elf ears, tiny fairy size, alien head shape, large alien eyes)
- Almond-shaped SPECIES eyes (elf eyes, fairy eyes, alien eyes) with gentle upward tilt
- Softer rounder SPECIES facial features appropriate to that fantasy being
- This is FANTASY BEING with Down syndrome, maintaining species characteristics

The goal: Down syndrome features RECOGNIZABLE on ANY species through species-appropriate adaptation. Mother can point and say "That dragon/robot/monster has Down syndrome too!" while child sees themselves as powerful hero in any form. Features adapt to species anatomy while remaining recognizable for bonding and representation.`,
        mandatoryVisualRequirements: [
            'MUST show almond-shaped eyes with upward slant - REJECT if typical eyes',
            'MUST show flatter nasal bridge - NOT prominent nose',
            'MUST show rounded fuller cheeks - NOT angular',
            'Features MUST be clearly visible - NOT subtly suggested',
            'Proportions MUST reflect Down syndrome'
        ],
        visualValidationChecklist: [
            'Are almond-shaped eyes with upward slant clearly visible?',
            'Is nasal bridge flatter than typical?',
            'Are facial features rounded (not angular)?',
            'Is character recognizable as having Down syndrome?',
            'Is portrayal medically accurate AND dignified?'
        ],
        negativePrompt: `STRICT PROHIBITIONS:
- DO NOT generate typical child face
- DO NOT make eyes round/wide (must be almond-shaped with slant)
- DO NOT make nose prominent (must be flatter bridge)
- DO NOT make face angular (must be rounded/soft)
- DO NOT smooth features to look "perfect"
- DO NOT hide or minimize Down syndrome characteristics`,
        personalityNuances: [
            'Often warm, affectionate, socially engaged',
            'May take longer to process (show thoughtfulness)',
            'Strong emotional intelligence and empathy',
            'Determined when focused',
            'Love routine and familiar activities',
            'May communicate through actions/expressions'
        ],
        strengthsFromTrait: [
            'Emotional warmth and connection',
            'Persistence and determination',
            'Living in the moment',
            'Teaching others about acceptance',
            'Joy in simple pleasures'
        ],
        conversationalHints: [
            'has Down syndrome',
            'learns in their own special way',
            'takes time to figure things out',
            'special way of seeing world'
        ],
        storyIntegrationTips: [
            'Show as protagonists with agency',
            'Include interests and passions',
            'Show friendships and social connections',
            'Speech differences natural (not plot point)',
            'Show learning style (visual, hands-on)',
            'Celebrate unique perspective'
        ],
        celebratoryLanguage: 'sees world with extra warmth and teaches everyone about true kindness',
        dignityFirstFraming: 'Person with Down syndrome (NEVER "Down\'s kid" or "Downs child"). Child first, who happens to have Down syndrome.',
        avoidStereotypes: [
            'NOT perpetually happy (allow full emotions)',
            'NOT "eternal children" (age appropriately)',
            'NOT inspirational just for existing',
            'NOT defined only by Down syndrome',
            'NOT teaching others lessons constantly',
            'NOT shown as less intelligent (different learning, not less)'
        ],
        culturalConsiderations: 'Some families use "Down syndrome," others "Trisomy 21." Person-first language standard. Medical accuracy universal, cultural framing varies.',
        ageAppropriatenessNotes: `Ages 3-5: "Special way of learning, extra kindness"
Ages 6-8: Can say "Down syndrome" naturally
Ages 9-10: Can explain chromosome if therapeutic
ALWAYS: Focus on personality and capabilities`
    },
    {
        id: 'autism',
        label: 'Autism Spectrum Disorder',
        category: 'neurodiversity',
        visualDescription: 'May wear headphones, structured preferences, sensory considerations',
        medicallyAccurateDescription: `Autism Spectrum Disorder - neurodevelopmental differences in social communication, sensory processing, interests.

VISUAL INDICATORS (may include):
- Noise-canceling headphones (sensory support)
- Fidget tools or stim toys
- Weighted items (vest, lap pad)
- Visual schedules or communication cards
- Deep focus on special interest

PRESENTATION:
- May avoid eye contact (show engaged other ways)
- May stim (repetitive movements: hand-flapping, rocking)
- May be very focused on details
- Sensory sensitivities respected

CRITICAL: Autistic traits are valid neurological differences, NOT deficits.`,
        gptImageSafePrompt: `The character is autistic, which is naturally reflected in how they engage with the world. They may wear noise-canceling headphones for sensory support, hold fidget tools, or show natural stimming movements. Their way of connecting and communicating is authentic and valid.

In this portrait, their autistic traits remain visible and authentic:
- May wear colorful noise-canceling headphones
- May hold fidget tool or stim toy in hands
- Expression focused, joyful, or deeply engaged
- Eye contact optional (may look away naturally)
- May show stimming like hand movements or gentle rocking
- Engaged in special interest activity they love
- Body language authentically autistic

The character is autistic, with their own beautiful way of experiencing the world. They may communicate differently, focus intensely on interests they love, and have sensory needs that are respected. Even when deeply focused, their authentic way of being is clearly shown and celebrated. Autistic traits are portrayed as valid neurological differences showing unique strengths.

The goal is respectful representation celebrating neurodiversity and authentic autistic experience.`,
        mandatoryVisualRequirements: [
            'MUST show authentically engaged (even if looking away)',
            'MUST show intelligent and capable',
            'Eye contact optional (looking away is authentic autistic trait)',
            'If sensory supports mentioned in user description: MUST show them accurately',
            'If NO supports mentioned in user description: MUST NOT add stereotypical headphones/fidget tools'
        ],
        visualValidationChecklist: [
            'Are sensory supports visible if character uses them?',
            'Is engagement shown (even if not eye contact)?',
            'Are autistic traits portrayed authentically (not "fixed")?',
            'Is portrayal respectful of differences?'
        ],
        negativePrompt: `DO NOT force eye contact if character naturally avoids it
DO NOT portray stimming as "bad" behavior
DO NOT show autism as needing to be fixed
DO NOT make character seem robotic or emotionless`,
        personalityNuances: [
            'May have deep special interests (encyclopedia knowledge)',
            'Strong pattern recognition ("sees patterns others miss")',
            'Authentic emotional expression (may look different)',
            'Sensory sensitivities (textures, sounds, lights)',
            'May prefer routine and predictability',
            'Often honest and direct communication',
            'May communicate differently (actions, writing, AAC)'
        ],
        strengthsFromTrait: [
            'Attention to detail',
            'Deep focus and expertise in interests',
            'Pattern recognition',
            'Honesty and authenticity',
            'Unique perspective on world',
            'Logical thinking'
        ],
        conversationalHints: [
            'is autistic',
            'has autism',
            'brain works differently',
            'loves [special interest]',
            'wears headphones for sounds',
            'sees patterns others miss'
        ],
        storyIntegrationTips: [
            'Show special interests prominently',
            'Include sensory considerations naturally',
            'Show communication style authentically',
            'Others accommodate sensory needs naturally',
            'Can include autistic joy (stimming, info-dumping)',
            'Show competence and intelligence'
        ],
        celebratoryLanguage: 'sees patterns and details others miss, with their own amazing way of experiencing the world',
        dignityFirstFraming: 'Autistic person (identity-first preferred by many autistics). Listen to #ActuallyAutistic community preferences.',
        avoidStereotypes: [
            'NOT portrayed as emotionless or robotic',
            'NOT "Rain Man" savant stereotype',
            'NOT nonverbal unless specifically stated',
            'NOT defined only by autism',
            'NOT shown as needing to be "normal"',
            'NOT portrayed as burden on family'
        ],
        culturalConsiderations: 'Many autistic self-advocates prefer identity-first language ("autistic person") over person-first ("person with autism"). Western cultures emphasize therapy/intervention; neurodiversity movement emphasizes acceptance.',
        ageAppropriatenessNotes: `Ages 3-5: "Brain works in special way"
Ages 6-8: Can say "autistic" or "has autism" - normalize
Ages 9-10: Can discuss sensory differences, communication styles
ALWAYS: Portray as valid way of being, not disorder to fix`
    },
    {
        id: 'adhd',
        label: 'ADHD',
        category: 'neurodiversity',
        visualDescription: 'High energy, may use fidget tools',
        medicallyAccurateDescription: `ADHD (Attention-Deficit/Hyperactivity Disorder) - neurodevelopmental differences in attention regulation, impulse control, activity level.

VISUAL INDICATORS (may include):
- Fidget tools (spinners, cubes, putty)
- High energy body language
- Difficulty sitting still
- May be mid-movement in photos

PRESENTATION:
- Dynamic, energetic
- May be multitasking
- Expressive and animated
- Impulsive enthusiasm

CRITICAL: ADHD is neurological difference, NOT bad behavior.`,
        gptImageSafePrompt: `MANDATORY - ADHD CHARACTER:

Character with ADHD:
- Expression: Highly energetic, animated, enthusiastic
- May hold fidget tool [spinner/cube/putty]
- Body language: Dynamic, may show movement
- Eyes: Bright, quick, alert
- Activity: May be shown doing multiple things or mid-movement
- Energy: High, positive, exuberant

ADHD traits shown as positive energy and quick thinking.

REJECT IMAGE if:
- Portrayed as "bad kid" or misbehaving
- Energy shown as negative
- Portrayed as needing to be calm/still`,
        mandatoryVisualRequirements: [
            'MUST show high energy through body language (dynamic, animated)',
            'Expression MUST show positive energy (not negative)',
            'MUST NOT portray as misbehaving or "bad kid"',
            'If fidget tool mentioned in user description: MUST show it',
            'If NO fidget tool mentioned: MUST NOT add stereotypical fidget spinner'
        ],
        visualValidationChecklist: [
            'Is high energy shown positively?',
            'Are fidget tools visible if used?',
            'Is ADHD portrayed as difference (not deficit)?'
        ],
        negativePrompt: `DO NOT portray as "bad" or misbehaving
DO NOT show ADHD as negative trait
DO NOT show needing to be "fixed" to be calm`,
        personalityNuances: [
            'Lightning-fast ideas and creativity',
            'Enthusiastic about interests',
            'May hyperfocus on passions',
            'Difficulty with boring tasks',
            'Impulsive but often fun',
            'Thinks quickly, acts quickly'
        ],
        strengthsFromTrait: [
            'Creativity and innovation',
            'High energy for activities they love',
            'Quick thinking',
            'Enthusiasm and passion',
            'Hyperfocus on interests'
        ],
        conversationalHints: [
            'has ADHD',
            'lots of energy',
            'hard to sit still',
            'lightning-fast ideas',
            'uses fidget tools'
        ],
        storyIntegrationTips: [
            'Show creativity and quick thinking',
            'Include interests they hyperfocus on',
            'Fidget tools as natural tool',
            'High energy as positive',
            'Can show challenges without making them "bad"'
        ],
        celebratoryLanguage: 'has lightning-fast ideas and super energy for amazing adventures',
        dignityFirstFraming: 'Person with ADHD (though some prefer "ADHD person"). Neurological difference, not behavior problem.',
        avoidStereotypes: [
            'NOT portrayed as "bad kid" or troublemaker',
            'NOT shown as unable to focus on anything',
            'NOT defined only by ADHD',
            'NOT needing medication to be "good"',
            'NOT portrayed as annoying'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Has ADHD - lots of energy and fast ideas" - frame positively`
    },
    {
        id: 'dyslexia',
        label: 'Dyslexia',
        category: 'neurodiversity',
        visualDescription: 'Reading challenges, creative thinking, may use colored overlays',
        medicallyAccurateDescription: `Dyslexia - learning difference affecting reading, spelling, sometimes writing.

VISUAL INDICATORS (may include):
- Colored overlays for reading
- Audiobooks or text-to-speech devices
- Creative/artistic materials prominent
- Shows intelligence in non-reading contexts

CRITICAL: Dyslexia affects reading, NOT intelligence.`,
        gptImageSafePrompt: `MANDATORY - DYSLEXIC CHARACTER:

Character with dyslexia:
- May use colored overlay sheets for reading
- May have audiobook headphones or device
- Expression: Intelligent, creative, capable
- Activity: [art/building/sports/storytelling] showing non-reading strengths
- Books/reading materials may be present (with supports)

Portrayed as intelligent, creative thinker who learns differently.
Reading challenges do NOT equal less intelligence.

REJECT IMAGE if:
- Portrayed as unintelligent
- Shown as frustrated with reading only (show strengths too)`,
        mandatoryVisualRequirements: [
            'MUST show intelligence clearly through expression and engagement',
            'MUST show capable and confident',
            'MUST show engaged in activity demonstrating strengths',
            'MUST NOT force visual "dyslexia markers" (learning difference is invisible)'
        ],
        visualValidationChecklist: [
            'Is character shown as intelligent?',
            'Are reading supports shown naturally if used?',
            'Are strengths highlighted?'
        ],
        negativePrompt: `DO NOT portray as unintelligent
DO NOT show only struggling (show strengths)
DO NOT make reading the only activity`,
        personalityNuances: [
            'Often highly creative',
            'Strong visual-spatial thinking',
            'May excel at art, building, sports',
            'Verbally articulate despite reading challenges',
            'May have self-advocacy around learning needs'
        ],
        strengthsFromTrait: [
            'Creativity and innovation',
            'Visual-spatial intelligence',
            'Problem-solving',
            'Verbal articulation',
            'Out-of-box thinking'
        ],
        conversationalHints: [
            'has dyslexia',
            'reading is tricky',
            'learns differently',
            'creative thinker'
        ],
        storyIntegrationTips: [
            'Show intelligence through non-reading activities',
            'Include supports naturally',
            'Show creative problem-solving',
            'Can overcome reading challenge in plot (positive)'
        ],
        celebratoryLanguage: 'sees words in special creative way and thinks outside the box',
        dignityFirstFraming: 'Person with dyslexia. Emphasize intelligence and creativity.',
        avoidStereotypes: [
            'NOT portrayed as less intelligent',
            'NOT shown only struggling',
            'NOT defined only by dyslexia'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Has dyslexia - reading is tricky but brain is amazing at other things"`
    },
    {
        id: 'intellectual_disability',
        label: 'Intellectual Disability (Mild)',
        category: 'neurodiversity',
        visualDescription: 'May take longer to learn, thoughtful processing',
        medicallyAccurateDescription: `Mild intellectual disability - developmental differences in learning, reasoning, problem-solving.

CHARACTERISTICS:
- May take longer to learn new concepts
- May need things explained more simply
- Strong in some areas, challenges in others
- Learns best with visual, hands-on approaches

VISUAL:
- Thoughtful, processing expressions
- May show concentration
- Fully capable of joy, relationships, activities

CRITICAL: Focus on capabilities, not limitations. Show full personhood.`,
        gptImageSafePrompt: `MANDATORY - CHARACTER WITH INTELLECTUAL DISABILITY:

Character with mild intellectual disability:
- Expression: Thoughtful, kind, engaged
- May show: Concentration, processing, thinking deeply
- Activity: Doing things they love and are good at [specify]
- Body language: Confident in own pace
- Setting: Learning or playing in supportive environment

Portrayed with dignity, showing capabilities and personhood.
Different pace of learning does NOT mean less valuable.

REJECT IMAGE if:
- Portrayed as vacant or unengaged
- Made to look "simple" in demeaning way
- Shown as incapable`,
        mandatoryVisualRequirements: [
            'MUST show full personhood and engagement',
            'MUST show capability in activities',
            'Expression MUST show thinking/feeling (not vacant)',
            'MUST be portrayed with dignity'
        ],
        visualValidationChecklist: [
            'Is character shown as fully engaged person?',
            'Are capabilities highlighted?',
            'Is portrayal dignified and respectful?'
        ],
        negativePrompt: `DO NOT portray as vacant or empty
DO NOT show as incapable of activities
DO NOT portray in demeaning way`,
        personalityNuances: [
            'May be thoughtful and deliberate',
            'Strong emotional connections',
            'May have specific talents/interests',
            'Values routine and familiar activities',
            'May communicate needs clearly in own way'
        ],
        strengthsFromTrait: [
            'Emotional warmth',
            'Determination and persistence',
            'Hands-on learning abilities',
            'Social connection',
            'Living authentically'
        ],
        conversationalHints: [
            'learns in their own time',
            'takes time to figure things out',
            'needs things explained simply sometimes',
            'really good at [specific things]'
        ],
        storyIntegrationTips: [
            'Show as full protagonist with desires',
            'Include activities they excel at',
            'Show friendships and social life',
            'May show learning moment (positive)',
            'Others support without being patronizing'
        ],
        celebratoryLanguage: 'learns in their own perfect timing and brings kindness everywhere',
        dignityFirstFraming: 'Person with intellectual disability. NEVER "slow" or "simple" or "r-word."',
        avoidStereotypes: [
            'NOT portrayed as incapable',
            'NOT "eternal child"',
            'NOT defined only by disability',
            'NOT object of pity',
            'NOT shown as unable to have relationships/dreams'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Learns in their own way and time" - emphasize individuality`
    },
    // SENSORY (3 traits)
    {
        id: 'deaf',
        label: 'Deaf / Hard of Hearing',
        category: 'sensory',
        visualDescription: 'Uses sign language, may lip-read, visual communication',
        medicallyAccurateDescription: `Deaf or hard of hearing - ranges from mild hearing loss to complete deafness.

COMMUNICATION (may use):
- Sign language (ASL, BSL, etc.)
- Lip reading
- Written communication
- Combination of methods

VISUAL INDICATORS:
- May be shown signing
- Expressive hands and facial expressions
- May wear cochlear implant or hearing aids
- Visual attentiveness

CULTURAL: Deaf culture is rich cultural identity for many. Capital D "Deaf" indicates cultural identity.`,
        gptImageSafePrompt: `MANDATORY - DEAF CHARACTER:

Deaf or hard of hearing character:
- Communication: May be shown signing [specify: ASL/BSL/other]
- Hands: Expressive, may be mid-sign
- Facial expressions: Very expressive (part of sign language)
- Eyes: Attentive, visually focused
- Activity: Engaged in [visual activity]
- May wear: [Cochlear implant/hearing aids] if specified

Portrayed as fully communicative through visual language.
Deafness is cultural identity and communication difference.

REJECT IMAGE if:
- Portrayed as unable to communicate
- Signing shown incorrectly if depicted
- Portrayed as sad about deafness`,
        mandatoryVisualRequirements: [
            'If signing: MUST show hands in expressive position',
            'Facial expressions MUST be expressive',
            'MUST show communication capability',
            'If devices worn: Show naturally'
        ],
        visualValidationChecklist: [
            'Is communication shown (signing, expressive)?',
            'Are facial expressions appropriately expressive?',
            'Is character shown as fully capable of communication?'
        ],
        negativePrompt: `DO NOT show as unable to communicate
DO NOT portray as isolated or alone
DO NOT show as tragic`,
        personalityNuances: [
            'May be part of Deaf culture (pride in identity)',
            'Visual attentiveness and observation',
            'Expressive communication (hands, face, body)',
            'May have strong Deaf community ties',
            'Bilingual (sign language + written language)'
        ],
        strengthsFromTrait: [
            'Visual communication mastery',
            'Bilingual/multilingual capability',
            'Strong observation skills',
            'Expressive communication',
            'Cultural richness'
        ],
        conversationalHints: [
            'uses sign language',
            'talks with hands',
            'is deaf',
            'doesn\'t hear but communicates great'
        ],
        storyIntegrationTips: [
            'Show signing naturally',
            'Include Deaf culture references if relevant',
            'Show communication working (not struggling)',
            'Can include interpreter or captioning naturally',
            'Others may sign back (inclusive)'
        ],
        celebratoryLanguage: 'talks with beautiful sign language and sees the world through eyes',
        dignityFirstFraming: 'Deaf person (identity-first) or person who is deaf. Many prefer "Deaf" (capital D) indicating cultural identity.',
        avoidStereotypes: [
            'NOT portrayed as isolated',
            'NOT unable to communicate',
            'NOT tragic or pitiable',
            'NOT defined only by deafness'
        ],
        culturalConsiderations: 'Deaf culture is rich with history, language, community. Capital D "Deaf" indicates cultural identity; lowercase "deaf" indicates audiological condition. Respect cultural pride.',
        ageAppropriatenessNotes: `Ages 3-10: "Uses sign language to talk" - normalize visual communication`
    },
    {
        id: 'hearing_aids',
        label: 'Hearing Aids',
        category: 'sensory',
        visualDescription: 'Wears hearing aids (colorful tech devices)',
        medicallyAccurateDescription: `Wears hearing aids for hearing support - ranges from mild to moderate hearing loss.

VISUAL:
- Behind-the-ear (BTE) devices most common in children
- Often colorful (purple, blue, pink, etc.)
- Visible behind ear(s)
- May have one or two

PORTRAYAL:
- Hearing aids as cool tech accessory
- Part of their style
- Enables full communication`,
        gptImageSafePrompt: `MANDATORY - HEARING AIDS:

Character wears hearing aids:
- [One/both] ear(s) with [color] hearing aid visible
- Behind-the-ear style device clearly shown
- Hearing aids in [favorite color: blue/purple/pink/etc.]
- Ears: Devices visible, not hidden by hair if possible
- Expression: Engaged, communicative
- Activity: [listening/talking/playing] confidently

Hearing aids shown as cool tech accessory.

REJECT IMAGE if:
- Hearing aids not visible
- Character looks sad about wearing them
- Portrayed as medical/clinical only`,
        mandatoryVisualRequirements: [
            'Hearing aids MUST be visible',
            'MUST be colored/styled (not just beige medical)',
            'Character MUST look confident wearing them'
        ],
        visualValidationChecklist: [
            'Are hearing aids visible behind ear(s)?',
            'Are they colorful/styled?',
            'Is character confident?'
        ],
        negativePrompt: `DO NOT hide hearing aids
DO NOT make them look purely medical
DO NOT show character as sad about wearing them`,
        personalityNuances: [
            'May see hearing aids as fashion accessory',
            'Tech-savvy about device management',
            'Self-advocacy about hearing needs',
            'May educate others about devices'
        ],
        strengthsFromTrait: [
            'Self-advocacy',
            'Tech management',
            'Teaching others',
            'Confidence in communication'
        ],
        conversationalHints: [
            'wears hearing aids',
            'has special ear helpers',
            'cool hearing devices',
            'super-hearing tech'
        ],
        storyIntegrationTips: [
            'Show as natural part of appearance',
            'Can mention technology features (batteries, etc.)',
            'Others think they\'re cool',
            'Part of their style'
        ],
        celebratoryLanguage: 'has super-hearing devices in their favorite color',
        dignityFirstFraming: 'Person who wears hearing aids. Emphasize as helpful technology.',
        avoidStereotypes: [
            'NOT portrayed as "hearing-impaired" (outdated term)',
            'NOT shown as limitation'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Hearing aids" or "ear helpers" - tech they wear`
    },
    {
        id: 'visual_impairment',
        label: 'Visual Impairment / Blind',
        category: 'sensory',
        visualDescription: 'May use white cane, guide dog, or navigate with other senses',
        medicallyAccurateDescription: `Visual impairment ranges from low vision to complete blindness.

INDICATORS (may include):
- White mobility cane
- Guide dog
- Sunglasses (light sensitivity)
- Close examination of objects
- Orienting head to hear

PORTRAYAL:
- Confident navigation
- Other senses heightened awareness
- Independence with supports`,
        gptImageSafePrompt: `MANDATORY - VISUAL IMPAIRMENT:

Character with visual impairment or blindness:
[Specify: Low vision with glasses / Blind with cane / Guide dog user]

If white cane:
- White cane clearly visible in hand
- Character navigating confidently

If guide dog:
- Service dog in harness with character

Expression: Confident, capable
Activity: [navigating/exploring/creating] using other senses
Body language: Independent and assured

Visual impairment does NOT limit adventure or capability.

REJECT IMAGE if:
- Portrayed as helpless
- Mobility aid not shown if specified
- Made to look lost or confused`,
        mandatoryVisualRequirements: [
            'If cane/guide dog specified: MUST be visible',
            'Character MUST look confident and capable',
            'MUST show independence'
        ],
        visualValidationChecklist: [
            'Are mobility supports visible if specified?',
            'Is character shown confidently?',
            'Is independence clear?'
        ],
        negativePrompt: `DO NOT show as helpless
DO NOT portray as lost or confused
DO NOT hide mobility supports`,
        personalityNuances: [
            'Heightened other senses',
            'Strong orientation and navigation skills',
            'Independence and self-advocacy',
            'May have strong tactile/auditory preferences'
        ],
        strengthsFromTrait: [
            'Sensory awareness',
            'Independence',
            'Navigation skills',
            'Self-advocacy'
        ],
        conversationalHints: [
            'uses white cane',
            'has guide dog',
            'is blind',
            'sees world differently'
        ],
        storyIntegrationTips: [
            'Show navigation confidently',
            'Include sensory descriptions (sound, touch, smell)',
            'Mobility supports as natural tools',
            'Show independence'
        ],
        celebratoryLanguage: 'experiences world through amazing other senses',
        dignityFirstFraming: 'Blind person or person with visual impairment.',
        avoidStereotypes: [
            'NOT helpless',
            'NOT portrayed as sad',
            'NOT needing constant guidance'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Blind" or "can't see but experiences world differently"`
    },
    // SKIN / APPEARANCE (4 traits)
    {
        id: 'vitiligo',
        label: 'Vitiligo',
        category: 'skin',
        visualDescription: 'Skin condition with lighter patches creating patterns',
        medicallyAccurateDescription: `Vitiligo - skin condition where patches lose natural pigment, creating lighter or white areas.

VISUAL CHARACTERISTICS:
- Depigmented patches on skin
- Patches vary in size and shape
- Sharp, defined edges (not gradual)
- Often symmetrical patterns
- Can occur on face, hands, body

AREAS COMMONLY AFFECTED:
- Around eyes, mouth
- Hands and fingers
- Elbows, knees
- May be widespread or localized

CRITICAL: Vitiligo creates beautiful unique patterns. AI often smooths this away - MUST be visible.`,
        gptImageSafePrompt: `MANDATORY - VITILIGO REQUIRED:

Character with vitiligo:
- Skin base tone: [specify hex]
- Vitiligo patches: Lighter/white areas creating patterns
- Patches visible on [face/neck/hands/arms - specify locations]
- Edges: Sharp, defined borders (not blurred)
- Pattern: [Specify: around eyes/on hands/symmetrical/etc.]
- Patches vary in size and shape
- Expression: Confident, beautiful

Vitiligo shown as beautiful unique feature.
Patches are ESSENTIAL to character's appearance.

REJECT IMAGE if:
- Vitiligo patches missing or barely visible
- Skin rendered as uniform tone
- Patches blurred or smoothed away
- AI "fixed" skin to be uniform`,
        mandatoryVisualRequirements: [
            'Vitiligo patches MUST be clearly visible',
            'Patches MUST have sharp edges (not blurred)',
            'Skin MUST NOT be uniform (patches required)',
            'MUST show on specified body areas'
        ],
        visualValidationChecklist: [
            'Are vitiligo patches clearly visible?',
            'Do patches have defined edges?',
            'Did AI smooth away or minimize vitiligo?',
            'Are patches shown on specified areas?'
        ],
        negativePrompt: `CRITICAL: DO NOT render skin as uniform tone
DO NOT smooth away vitiligo patches
DO NOT blur or minimize depigmentation
DO NOT "fix" vitiligo (it's not broken)`,
        personalityNuances: [
            'Often confident in unique appearance',
            'May educate others about vitiligo',
            'Pride in distinctive patterns',
            'Self-acceptance journey'
        ],
        strengthsFromTrait: [
            'Confidence and self-acceptance',
            'Teaching others about differences',
            'Standing out proudly',
            'Inner strength'
        ],
        conversationalHints: [
            'has vitiligo',
            'special patches on skin',
            'two-toned skin',
            'cool patterns like map/constellation'
        ],
        storyIntegrationTips: [
            'Vitiligo as beautiful feature',
            'Can compare patterns to stars/maps naturally',
            'Others admire unique appearance',
            'Normalize without making it plot point'
        ],
        celebratoryLanguage: 'has beautiful star-pattern skin that makes them wonderfully unique',
        dignityFirstFraming: 'Person with vitiligo. Vitiligo is feature, not flaw.',
        avoidStereotypes: [
            'NOT portrayed as flaw needing covering',
            'NOT shown as self-conscious (unless therapeutic story)',
            'NOT treated as "less beautiful"'
        ],
        culturalConsiderations: 'Different cultures view skin conditions differently. Some communities highly value uniform skin tone; emphasize beauty regardless.',
        ageAppropriatenessNotes: `Ages 3-10: "Special patches that make unique patterns" - frame as beautiful`
    },
    {
        id: 'albinism',
        label: 'Albinism',
        category: 'skin',
        visualDescription: 'Very pale skin, white/very light hair, light eyes',
        medicallyAccurateDescription: `Albinism - genetic condition affecting melanin production.

VISUAL CHARACTERISTICS:
- Very pale skin (minimal pigmentation)
- White, platinum blonde, or very pale hair
- Light eyes: Blue, gray, violet, pale green
- May wear sunglasses (light sensitivity)
- May have vision challenges

APPEARANCE:
- Luminous, distinctive appearance
- Hair may be silky white
- Skin very pale but not "sickly" (healthy pale)

CRITICAL: AI may try to add color. Keep features accurate.`,
        gptImageSafePrompt: `MANDATORY - ALBINISM:

Character with albinism:
- Skin: Very pale with minimal pigmentation (NOT pink/sickly, healthy pale)
- Hair: [White/platinum blonde/very pale yellow] silky texture
- Eyes: [Pale blue/gray/violet] light colored
- May wear: Sunglasses (light sensitivity) or wide-brim hat
- Expression: [confident/curious/joyful]
- Appearance: Luminous, distinctive, beautiful

Albinism creates unique beautiful appearance.

REJECT IMAGE if:
- Skin given more color (must be very pale)
- Hair darkened (must be white/very pale)
- Eyes darkened (must be light)
- AI "normalized" coloring`,
        mandatoryVisualRequirements: [
            'Skin MUST be very pale (minimal melanin)',
            'Hair MUST be white or very pale blonde',
            'Eyes MUST be light colored',
            'MUST NOT add normal pigmentation'
        ],
        visualValidationChecklist: [
            'Is skin very pale (not just fair)?',
            'Is hair white or platinum?',
            'Are eyes light colored?',
            'Did AI add pigmentation?'
        ],
        negativePrompt: `DO NOT add pigmentation to skin
DO NOT darken hair
DO NOT darken eyes
DO NOT make character look "sickly" (healthy pale)`,
        personalityNuances: [
            'May be sun-aware (protective clothing)',
            'Often confident in distinctive appearance',
            'May educate others about albinism'
        ],
        strengthsFromTrait: [
            'Confidence in uniqueness',
            'Teaching others',
            'Self-care awareness',
            'Standing out beautifully'
        ],
        conversationalHints: [
            'has albinism',
            'very light coloring',
            'white hair and pale eyes',
            'moonlight coloring'
        ],
        storyIntegrationTips: [
            'Distinctive appearance as beautiful',
            'May mention sun protection naturally',
            'Others admire unique look',
            'Normalize without plot focus'
        ],
        celebratoryLanguage: 'has beautiful moonlight coloring that makes them shine',
        dignityFirstFraming: 'Person with albinism.',
        avoidStereotypes: [
            'NOT portrayed as ghostly or spooky',
            'NOT fragile or sickly',
            'NOT mystical/magical (don\'t exoticize)'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Has albinism - very light skin and hair" - frame as unique beauty`
    },
    {
        id: 'cleft_lip',
        label: 'Cleft Lip or Palate',
        category: 'medical',
        visualDescription: 'Split in upper lip creating unique smile',
        medicallyAccurateDescription: `Cleft lip and/or palate - opening in lip and/or roof of mouth present at birth.

VISUAL (depends on repair status):
- Unrepaired: Visible opening/split in upper lip
- Repaired: Scar line on upper lip, slightly asymmetric smile
- May affect nose shape (wider nostril on affected side)

APPEARANCE:
- Creates unique smile
- May have small scar line
- Natural part of facial features

PORTRAYAL:
- Smile is unique and beautiful
- Part of their facial character
- Show warmth and expression`,
        gptImageSafePrompt: `MANDATORY - CLEFT LIP/PALATE:

Character with cleft lip [repaired/unrepaired - specify]:

If repaired:
- Small scar line visible on upper lip
- Smile slightly asymmetric (beautiful and unique)
- May show: Wider nostril on affected side

If unrepaired:
- Opening/split in upper lip visible
- Natural lip appearance

Expression: Warm [smile/joy] showing unique smile
Face: Distinctive and beautiful
Activity: [talking/laughing/playing] confidently

Cleft creates unique beautiful smile.

REJECT IMAGE if:
- Cleft not visible or smoothed away
- Smile rendered symmetrically
- Feature hidden or minimized`,
        mandatoryVisualRequirements: [
            'Cleft lip MUST be visible (scar or opening)',
            'Smile MUST show unique character',
            'MUST NOT be smoothed to symmetry',
            'Portrayed with warmth and beauty'
        ],
        visualValidationChecklist: [
            'Is cleft lip visible (scar or opening)?',
            'Is smile unique/asymmetric as expected?',
            'Did AI smooth to perfect symmetry?'
        ],
        negativePrompt: `DO NOT render perfectly symmetrical lip
DO NOT hide or minimize cleft
DO NOT smooth away scar if repaired`,
        personalityNuances: [
            'Confident in unique smile',
            'May have speech therapy experience',
            'Self-acceptance of distinctive feature',
            'May educate others naturally'
        ],
        strengthsFromTrait: [
            'Confidence and self-acceptance',
            'Teaching others about differences',
            'Resilience',
            'Unique beauty'
        ],
        conversationalHints: [
            'has cleft lip',
            'special smile',
            'unique smile',
            'one-of-a-kind smile'
        ],
        storyIntegrationTips: [
            'Show warm expressive smile',
            'Unique smile as beautiful feature',
            'Others appreciate their expressions',
            'Normalize naturally'
        ],
        celebratoryLanguage: 'has special one-of-a-kind smile that lights up the world',
        dignityFirstFraming: 'Person with cleft lip/palate.',
        avoidStereotypes: [
            'NOT portrayed as "flaw"',
            'NOT shown as self-conscious',
            'NOT hidden or minimized'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Special smile" or "cleft lip" - normalize as feature`
    },
    {
        id: 'birthmark_large',
        label: 'Large Birthmark',
        category: 'skin',
        visualDescription: 'Distinctive birthmark (port-wine stain, café-au-lait, etc.)',
        medicallyAccurateDescription: `Large birthmark present from birth - various types:

TYPES:
- Port-wine stain: Red/purple vascular mark
- Café-au-lait: Light brown flat mark
- Hemangioma: Raised red mark
- Nevus: Darker pigmented area

APPEARANCE:
- Distinctive color/texture
- Defined borders
- Various sizes and shapes
- Often on face, neck, or visible areas

PORTRAYAL:
- Unique beautiful feature
- Part of their distinctive appearance
- Show confidently`,
        gptImageSafePrompt: `MANDATORY - BIRTHMARK:

Character with birthmark:
- Type: [Port-wine stain/café-au-lait/hemangioma - specify]
- Location: [Face/neck/arm - specify]
- Color: [Red/purple/brown - specify]
- Size: [Describe coverage]
- Appearance: Distinctive mark with defined edges
- Expression: Confident, beautiful

Birthmark shown as unique distinctive feature.

REJECT IMAGE if:
- Birthmark not visible
- Smoothed away or minimized
- Rendered as temporary mark`,
        mandatoryVisualRequirements: [
            'Birthmark MUST be visible',
            'MUST show specified color and location',
            'MUST NOT be smoothed away',
            'Shown as permanent distinctive feature'
        ],
        visualValidationChecklist: [
            'Is birthmark clearly visible?',
            'Is it shown in specified location?',
            'Did AI smooth it away?'
        ],
        negativePrompt: `DO NOT smooth away birthmark
DO NOT minimize or hide
DO NOT render as temporary mark`,
        personalityNuances: [
            'Confidence in unique appearance',
            'May see birthmark as signature feature',
            'Self-acceptance'
        ],
        strengthsFromTrait: [
            'Confidence',
            'Self-acceptance',
            'Standing out uniquely'
        ],
        conversationalHints: [
            'has birthmark',
            'special mark',
            'unique mark since birth'
        ],
        storyIntegrationTips: [
            'Show as natural feature',
            'Others may admire uniqueness',
            'Normalize naturally'
        ],
        celebratoryLanguage: 'has unique mark that\'s been with them since birth',
        dignityFirstFraming: 'Person with birthmark.',
        avoidStereotypes: [
            'NOT portrayed as flaw',
            'NOT hidden or covered'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Birthmark - special mark since birth"`
    },
    // PHYSICAL/MOBILITY - Additional Traits (7 new traits)
    {
        id: 'dwarfism',
        label: 'Dwarfism / Achondroplasia',
        category: 'physical',
        visualDescription: 'Shorter stature with distinctive proportions',
        medicallyAccurateDescription: `Dwarfism (often achondroplasia) results in shorter stature with characteristic body proportions.

The character has dwarfism, which is naturally reflected in their appearance. They are shorter than typical for their age, with distinctive proportions including shorter limbs compared to torso length, and a larger head relative to body size. These features are clearly recognizable while still feeling individual and dignified, showing their unique personality alongside their dwarfism characteristics.

In this portrait, their dwarfism features remain visible and authentic:
- Proportionally shorter height for stated age
- Shorter arms and legs compared to torso
- Head size proportionally larger
- Torso length closer to typical
- Overall confident capable posture

The character has dwarfism, noticeable by their shorter stature and distinctive body proportions. Their arms and legs are proportionally shorter compared to their torso, and their head appears larger in proportion. Even when shown full-body, the character is clearly recognizable as a person with dwarfism at this age. Their characteristic features remain visible and respectful.

The goal is respectful, accurate, and clear representation - showing who they really are without stereotypes, erasure, or idealization.`,
        gptImageSafePrompt: `The character has dwarfism, naturally reflected in their proportions ADAPTED TO THEIR SPECIES.

FOR HUMAN SPECIES:
Shorter stature for age with distinctive proportions: shorter limbs compared to torso, proportionally larger head. Natural confident posture.

FOR NON-HUMAN SPECIES (dragon, robot, monster, etc):
Dwarfism proportions express THROUGH species anatomy (NOT human proportions with species costume):

REPTILIAN (dragon, dinosaur):
- DRAGON/DINO BODY PROPORTIONS showing dwarfism characteristics
- DRAGON/DINO LIMBS (legs, arms, wings) proportionally SHORTER compared to dragon torso length
- DRAGON/DINO HEAD proportionally LARGER relative to dragon body size
- This is DRAGON/DINOSAUR with dwarfism proportions, NOT small human with dragon costume

MECHANICAL (robot):
- ROBOT BODY CONFIGURATION showing proportional differences
- ROBOT LIMBS and APPENDAGES proportionally SHORTER compared to main body chassis
- ROBOT HEAD/PROCESSOR unit proportionally LARGER
- This is ROBOT with dwarfism-inspired proportions, NOT human in robot suit

CREATURE (monster, animal):
- MONSTER/ANIMAL BODY PROPORTIONS showing dwarfism characteristics
- Shorter CREATURE limbs relative to creature torso
- Larger CREATURE head relative to creature body
- This is MONSTER/ANIMAL with dwarfism proportions, NOT human in costume

FANTASY/OTHER:
- Species-appropriate proportional differences (shorter dragon, compact unicorn, small-limbed elf)
- Maintain SPECIES characteristics while showing distinctive proportions

The goal: Dwarfism proportions RECOGNIZABLE on ANY species. Mother can say "That dragon has dwarfism too!" Proportions adapt to species while remaining recognizable.`,
        mandatoryVisualRequirements: [
            'MUST show proportionally shorter height for stated age',
            'Arms and legs MUST be shorter compared to torso',
            'Head MUST be proportionally larger',
            'Character MUST look confident and capable'
        ],
        visualValidationChecklist: [
            'Is character proportionally shorter than typical for age?',
            'Are limbs shorter compared to torso?',
            'Is head proportionally larger?',
            'Is portrayal medically accurate AND dignified?'
        ],
        negativePrompt: `DO NOT render typical proportions
DO NOT make character look childlike if they are older
DO NOT portray as weak or incapable`,
        personalityNuances: [
            'Strong self-advocacy from navigating accessibility',
            'Often fierce independence',
            'Creative problem-solving for height differences',
            'Confident in own body'
        ],
        strengthsFromTrait: [
            'Self-advocacy and communication',
            'Creative adaptation',
            'Determination',
            'Teaching others about accessibility'
        ],
        conversationalHints: [
            'has dwarfism',
            'shorter than most kids their age',
            'little person',
            'different body proportions'
        ],
        storyIntegrationTips: [
            'Show as full protagonist with agency',
            'Address accessibility naturally (step stools, adaptations)',
            'Others accommodate naturally',
            'Focus on capability and personality'
        ],
        celebratoryLanguage: 'has their own perfect proportions and brings huge personality',
        dignityFirstFraming: 'Person with dwarfism or little person (community preference varies).',
        avoidStereotypes: [
            'NOT comic relief',
            'NOT cute or childlike if older',
            'NOT defined only by height',
            'NOT shown as unable to do activities'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Has dwarfism - body works in special way" - emphasize capability`
    },
    {
        id: 'scoliosis_brace',
        label: 'Scoliosis with Back Brace',
        category: 'physical',
        visualDescription: 'Wears back brace for spinal curvature',
        medicallyAccurateDescription: `Scoliosis with back brace treatment - spine curves sideways, brace helps correct curvature during growth.

The character has scoliosis and wears a back brace, which is naturally reflected in their appearance. The brace is a structured support garment visible under or over clothing, extending from chest to hips. These features are clearly recognizable while still feeling individual and dignified.

In this portrait, their brace remains visible and authentic:
- Back brace visible (rigid orthotic device)
- Extends from chest/rib area to hips
- May be white, beige, or decorated
- Worn under or over clothing as specified
- Natural posture with brace

The character wears a back brace for scoliosis. The brace is clearly visible as a structured support extending from chest to hips. Even when standing or moving, the brace is recognizable and shown as a helpful medical device that's part of their daily life.

The goal is respectful, accurate representation showing the brace as helpful medical equipment.`,
        gptImageSafePrompt: `The character has scoliosis and wears a back brace for treatment. The brace is naturally visible in their appearance.

In this portrait, the back brace remains visible and authentic:
- Rigid structured brace from chest/ribs to hips
- Color: [white/beige/decorated as specified]
- Worn [under clothing showing outline / over clothing if specified]
- Natural adapted posture with brace
- May have padding visible at edges

Scoliosis brace is clearly shown as helpful medical device. The brace supports proper spine alignment. The goal is respectful, accurate representation without showing device as burden.

The character wears their back brace confidently, engaged in normal activities.`,
        mandatoryVisualRequirements: [
            'Back brace MUST be visible',
            'Brace MUST extend from chest to hips',
            'Character MUST look confident wearing it',
            'MUST NOT hide or minimize brace'
        ],
        visualValidationChecklist: [
            'Is back brace visible?',
            'Does it extend appropriately?',
            'Is character confident?',
            'Is brace shown as helpful (not burden)?'
        ],
        negativePrompt: `DO NOT hide back brace
DO NOT portray as limiting activities
DO NOT show character as uncomfortable if confident`,
        personalityNuances: [
            'Determination through treatment',
            'Adaptability in movement',
            'May educate others about scoliosis',
            'Body awareness and care'
        ],
        strengthsFromTrait: [
            'Determination and persistence',
            'Adaptability',
            'Self-care awareness',
            'Teaching others'
        ],
        conversationalHints: [
            'wears back brace',
            'has scoliosis',
            'special brace to help spine',
            'medical brace'
        ],
        storyIntegrationTips: [
            'Show natural daily activities with brace',
            'May mention brace care naturally',
            'Others accommodate movement needs',
            'Focus on capability'
        ],
        celebratoryLanguage: 'wears their special brace that helps them grow strong',
        dignityFirstFraming: 'Person with scoliosis who wears back brace.',
        avoidStereotypes: [
            'NOT portrayed as unable to play',
            'NOT shown as fragile',
            'NOT defined only by brace'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Wears special brace to help spine grow straight"`
    },
    {
        id: 'orthotic_devices',
        label: 'Orthotic Devices (AFO Braces, Splints)',
        category: 'physical',
        visualDescription: 'Wears leg braces or splints for support',
        medicallyAccurateDescription: `Orthotic devices like AFO (ankle-foot orthosis) braces or splints provide support for legs, ankles, or feet.

The character wears orthotic devices which are naturally reflected in their appearance. The braces are visible supportive structures worn on lower legs and feet, often extending from below knee to foot. These features are clearly recognizable while still feeling individual and dignified.

In this portrait, their orthotic devices remain visible and authentic:
- AFO braces on one or both legs
- Rigid or hinged design from below knee to foot
- May be white, black, or colorful/decorated
- Worn with shoes or visible
- Natural standing or walking posture with braces

The character wears orthotic braces for leg/ankle support. The braces are clearly visible as structured supports on their lower legs. Even when moving, the braces are recognizable as helpful devices enabling mobility.

The goal is respectful representation showing braces as mobility aids.`,
        gptImageSafePrompt: `The character wears orthotic devices (AFO braces) for leg/ankle support. These are naturally visible in their appearance.

In this portrait, the orthotic devices remain visible and authentic:
- AFO braces on [left/right/both] leg(s)
- Rigid brace from below knee to foot
- Color: [white/black/decorated as specified]
- Worn with [shoes/visible feet]
- Natural confident stance with braces
- Walking or standing naturally

Orthotic devices are clearly shown as helpful mobility aids. The braces provide support enabling full activity. The goal is respectful, accurate representation.

The character wears their braces confidently, fully active and engaged.`,
        mandatoryVisualRequirements: [
            'Orthotic braces MUST be visible',
            'Braces MUST show proper positioning on legs',
            'Character MUST look confident using them',
            'MUST NOT hide or minimize devices'
        ],
        visualValidationChecklist: [
            'Are orthotic devices visible?',
            'Are they positioned correctly?',
            'Is character confident and active?',
            'Are devices shown as helpful?'
        ],
        negativePrompt: `DO NOT hide orthotic braces
DO NOT portray as limiting
DO NOT show character struggling if confident`,
        personalityNuances: [
            'Determination in mobility',
            'Adaptability',
            'May decorate braces as expression',
            'Self-advocacy about mobility needs'
        ],
        strengthsFromTrait: [
            'Determination',
            'Adaptability',
            'Self-advocacy',
            'Teaching others'
        ],
        conversationalHints: [
            'wears leg braces',
            'has AFO braces',
            'special supports for legs',
            'walking helpers'
        ],
        storyIntegrationTips: [
            'Show normal activities with braces',
            'Braces enable mobility confidently',
            'Others accommodate naturally',
            'Focus on capability'
        ],
        celebratoryLanguage: 'has special leg helpers that keep them moving strong',
        dignityFirstFraming: 'Person who wears orthotic devices.',
        avoidStereotypes: [
            'NOT portrayed as struggling',
            'NOT shown as limiting',
            'NOT defined only by braces'
        ],
        ageAppropriatenessNotes: `Ages 3-10: "Special leg braces to help walk" - emphasize support`
    },
    {
        id: 'burn_scars',
        label: 'Burn Scars (Visible)',
        category: 'skin',
        visualDescription: 'Visible burn scars on skin',
        medicallyAccurateDescription: `Burn scars from previous injury - skin texture and color differences where healing occurred.

The character has burn scars which are naturally reflected in their appearance. The scars show different skin texture and coloring where burns healed, creating distinctive patterns. These features are clearly recognizable while still feeling individual and dignified.

In this portrait, their burn scars remain visible and authentic:
- Scar tissue with different texture (smoother or raised)
- Color variations (lighter, darker, or reddish)
- Defined boundaries where scarring occurred
- Natural skin elsewhere for contrast
- Confident expression

The character has burn scars from previous injury. The scars are visible as areas of different skin texture and color. Even in full scenes, the scars remain clearly recognizable as part of who they are, shown with dignity.

The goal is respectful, accurate representation showing scars as part of their story.`,
        gptImageSafePrompt: `The character has burn scars which are naturally visible in their appearance.

In this portrait, the burn scars remain visible and authentic:
- Location: [face/neck/arms/hands - specify]
- Texture: Different from surrounding skin (smoother or slightly raised)
- Color: [Lighter/darker/reddish compared to natural skin tone]
- Boundaries clearly defined
- Natural confident expression

Burn scars are clearly shown as part of their appearance. The scars are visible and authentic. The goal is respectful representation without hiding or exaggerating.

The character wears their scars with confidence, engaged in life fully.`,
        mandatoryVisualRequirements: [
            'Burn scars MUST be visible in specified locations',
            'Texture MUST show difference from normal skin',
            'MUST NOT be smoothed away or hidden',
            'Character MUST look confident'
        ],
        visualValidationChecklist: [
            'Are burn scars clearly visible?',
            'Is texture different from normal skin?',
            'Did AI smooth away or minimize scars?',
            'Is portrayal dignified?'
        ],
        negativePrompt: `DO NOT smooth away burn scars
DO NOT hide or minimize scarring
DO NOT portray as disfiguring (show dignity)`,
        personalityNuances: [
            'Resilience from recovery',
            'Confidence in appearance',
            'May educate others about fire safety',
            'Strength in vulnerability'
        ],
        strengthsFromTrait: [
            'Resilience',
            'Confidence',
            'Teaching others',
            'Inner strength'
        ],
        conversationalHints: [
            'has burn scars',
            'scars from burn injury',
            'marks from fire',
            'healed burns'
        ],
        storyIntegrationTips: [
            'Scars as part of their story',
            'Show confidence naturally',
            'Others interact normally',
            'May address origin if therapeutic'
        ],
        celebratoryLanguage: 'wears their story on their skin with brave confidence',
        dignityFirstFraming: 'Person with burn scars.',
        avoidStereotypes: [
            'NOT portrayed as "disfigured"',
            'NOT hidden or covered constantly',
            'NOT defined only by scars'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Has scars from burn" - matter of fact, emphasize resilience`
    },
    {
        id: 'limb_length_discrepancy',
        label: 'Limb Length Discrepancy',
        category: 'physical',
        appliesToHeadshot: false, // Need full body to see leg length difference
        appliesToBodyshot: true,
        visualDescription: 'One leg or arm shorter than the other',
        medicallyAccurateDescription: `Limb length discrepancy - one limb (leg or arm) is shorter than the other side.

The character has limb length discrepancy, naturally reflected in their appearance. One leg (or arm) is visibly shorter than the other, creating asymmetry. May use shoe lift or walk with adapted gait. These features are clearly recognizable while still feeling individual and dignified.

In this portrait, the limb length difference remains visible and authentic:
- [Left/right] [leg/arm] noticeably shorter
- Asymmetric stance or posture
- May show shoe lift if leg affected
- Natural adapted positioning
- Confident capable expression

The character has limb length discrepancy with one [leg/arm] shorter than the other. The difference is clearly visible when standing or moving. Even in action, the asymmetry is recognizable and shown as natural part of their body.

The goal is respectful, accurate representation showing natural adaptation.`,
        gptImageSafePrompt: `The character has limb length discrepancy - one [leg/arm] is shorter than the other.

In this portrait, the length difference remains visible and authentic:
- [Left/right] [leg/arm] visibly shorter
- Asymmetric stance natural for body
- If leg: May show shoe lift on shorter side
- Natural adapted posture
- Confident expression

Limb length difference is clearly shown. The asymmetry is visible and natural. The goal is respectful representation showing adaptation.

The character moves confidently with their body as it is.`,
        mandatoryVisualRequirements: [
            'Length difference MUST be visible',
            'Asymmetry MUST be clear',
            'MUST NOT render symmetrical limbs',
            'Character MUST look confident'
        ],
        visualValidationChecklist: [
            'Is one limb clearly shorter?',
            'Is asymmetry visible?',
            'Did AI correct to symmetry?',
            'Is character confident?'
        ],
        negativePrompt: `DO NOT render symmetrical limbs
DO NOT hide length difference
DO NOT portray as struggling if confident`,
        personalityNuances: [
            'Adaptability in movement',
            'Creative problem-solving',
            'Confident in own body',
            'Self-advocacy'
        ],
        strengthsFromTrait: [
            'Adaptability',
            'Problem-solving',
            'Confidence',
            'Self-advocacy'
        ],
        conversationalHints: [
            'one leg shorter',
            'one arm shorter',
            'limbs different lengths',
            'body works differently'
        ],
        storyIntegrationTips: [
            'Show natural adapted movement',
            'If leg: May mention shoe lift naturally',
            'Others accommodate naturally',
            'Focus on capability'
        ],
        celebratoryLanguage: 'moves with amazing adaptation in their unique body',
        dignityFirstFraming: 'Person with limb length discrepancy.',
        avoidStereotypes: [
            'NOT portrayed as clumsy',
            'NOT shown as unable to play',
            'NOT defined only by difference'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "One leg/arm is shorter" - matter of fact`
    },
    {
        id: 'facial_differences',
        label: 'Facial Differences / Asymmetry',
        category: 'physical',
        visualDescription: 'Facial features with unique differences or asymmetry',
        medicallyAccurateDescription: `Facial differences including asymmetry, craniofacial conditions, or distinctive facial structures.

The character has facial differences which are naturally reflected in their appearance. Their face may show asymmetry, unique bone structure, or distinctive features from conditions like Treacher Collins, Apert syndrome, or other craniofacial differences. These features are clearly recognizable while still feeling individual and dignified.

In this portrait, their facial differences remain visible and authentic:
- Facial asymmetry or unique structure
- [Specific features if known condition]
- Natural confident expression
- Eyes show warmth and personality
- Face uniquely beautiful

The character has facial differences creating distinctive appearance. Their face shows [specific characteristics]. Even in close-up portraits, the facial differences are clearly recognizable and shown with beauty and dignity.

The goal is respectful, accurate representation celebrating unique beauty.`,
        gptImageSafePrompt: `The character has facial differences creating distinctive unique appearance ADAPTED TO THEIR SPECIES.

FOR HUMAN SPECIES:
Facial structure shows asymmetry or unique bone structure. Features clearly visible (not minimized). Expression warm, confident, engaging. Face uniquely beautiful and distinctive.

FOR NON-HUMAN SPECIES (dragon, robot, monster, etc):
Facial differences express THROUGH species anatomy (NOT human face with species costume):

REPTILIAN (dragon, dinosaur):
- DRAGON/DINO FACE structure (draconic features, NOT human face) showing ASYMMETRY or unique configuration
- DRAGON/DINO FACIAL FEATURES with distinctive differences appropriate to reptilian anatomy
- This is DRAGON/DINO with facial differences, NOT human with dragon costume

MECHANICAL (robot):
- ROBOT FACE PANELS with ASYMMETRIC or unique configuration
- MECHANICAL FEATURES showing distinctive design differences
- This is ROBOT with unique facial panel design, NOT human in robot suit

CREATURE (monster, animal):
- MONSTER/ANIMAL FACE with distinctive differences or asymmetry appropriate to creature type
- Unique CREATURE facial structure
- This is MONSTER/ANIMAL with facial differences, NOT human in costume

ELEMENTAL/FANTASY:
- Species-appropriate facial differences (elf face asymmetry, fairy unique features, alien distinctive structure)
- Maintain SPECIES characteristics while showing differences

The goal: Facial differences RECOGNIZABLE on ANY species. Mother can say "That dragon has unique facial features too!" Differences shown with beauty and dignity across all species.`,
        mandatoryVisualRequirements: [
            'Facial differences MUST be visible',
            'MUST NOT smooth to symmetry',
            'MUST NOT "fix" features',
            'Expression MUST show warmth and confidence'
        ],
        visualValidationChecklist: [
            'Are facial differences clearly visible?',
            'Did AI smooth to conventional symmetry?',
            'Is face shown with dignity and beauty?',
            'Is expression warm and confident?'
        ],
        negativePrompt: `DO NOT smooth facial differences
DO NOT correct asymmetry to symmetry
DO NOT hide or minimize unique features
DO NOT portray without dignity`,
        personalityNuances: [
            'Confidence in unique appearance',
            'Resilience',
            'May educate others about differences',
            'Strength in authenticity'
        ],
        strengthsFromTrait: [
            'Confidence',
            'Resilience',
            'Teaching others',
            'Inner strength'
        ],
        conversationalHints: [
            'face looks different',
            'unique facial features',
            'special face',
            'one-of-a-kind look'
        ],
        storyIntegrationTips: [
            'Show as full protagonist',
            'Facial differences natural in all scenes',
            'Others interact normally (no staring)',
            'Celebrate unique beauty'
        ],
        celebratoryLanguage: 'has wonderfully unique face that shows their special story',
        dignityFirstFraming: 'Person with facial differences.',
        avoidStereotypes: [
            'NOT portrayed as scary or monster-like',
            'NOT hidden or avoided',
            'NOT defined only by appearance'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Special face that's uniquely theirs" - emphasize beauty`
    },
    // MEDICAL / DEVICES (12 new traits)
    {
        id: 'childhood_cancer',
        label: 'Childhood Cancer (Active Treatment)',
        category: 'medical',
        visualDescription: 'Hair loss, port visible, pale complexion from treatment',
        medicallyAccurateDescription: `Child undergoing cancer treatment with visible effects.

The character is undergoing cancer treatment, naturally reflected in their appearance. They may have hair loss from chemotherapy, a port-a-cath visible on chest, and paler complexion. Despite treatment, they show strength and determination. These features are clearly recognizable while maintaining dignity.

In this portrait, treatment effects remain visible:
- Hair: [Bald/very short regrowth/wearing hat or bandana]
- Port-a-cath: Small circular device on upper chest (if visible)
- Complexion: Paler than typical, showing treatment effects
- Expression: Brave, determined, hopeful
- May show: Medical mask, hospital bracelet

The character shows visible effects of cancer treatment including possible hair loss and medical devices. Even during treatment, they are clearly shown as brave and full of life, engaged in activities they love.

The goal is respectful representation showing courage during treatment.`,
        gptImageSafePrompt: `The character is undergoing cancer treatment with visible effects naturally shown.

In this portrait, treatment effects are visible:
- Hair: [Bald from chemo/short regrowth/wearing colorful hat or bandana]
- Port-a-cath on upper chest (small circular medical device)
- Complexion paler showing treatment effects
- Expression: Brave, determined, hopeful, strong
- Activity: Engaged in [favorite activity] with courage

Cancer treatment effects are clearly shown with dignity. Despite challenges, character shows incredible bravery and strength. The goal is respectful representation celebrating courage.

The character faces treatment with amazing bravery and keeps living fully.`,
        mandatoryVisualRequirements: [
            'Treatment effects MUST be visible (hair loss or other signs)',
            'Character MUST look brave and dignified',
            'MUST NOT portray as tragic only',
            'MUST show strength and life'
        ],
        visualValidationChecklist: [
            'Are treatment effects visible?',
            'Is character shown with dignity and bravery?',
            'Is portrayal respectful not pitying?'
        ],
        negativePrompt: `DO NOT hide treatment effects
DO NOT portray only as tragic
DO NOT show without strength and courage`,
        personalityNuances: [
            'Incredible bravery and resilience',
            'Appreciation for each day',
            'Strong determination',
            'Deep emotional wisdom'
        ],
        strengthsFromTrait: [
            'Extraordinary courage',
            'Resilience',
            'Appreciation for life',
            'Inspiring strength'
        ],
        conversationalHints: [
            'has cancer',
            'getting treatment',
            'fighting cancer',
            'brave warrior'
        ],
        storyIntegrationTips: [
            'Show doing things they love',
            'Celebrate small victories',
            'Show support from others',
            'Focus on living not just fighting'
        ],
        celebratoryLanguage: 'faces each day with incredible brave warrior spirit',
        dignityFirstFraming: 'Child with cancer or child in cancer treatment.',
        avoidStereotypes: [
            'NOT only tragic',
            'NOT defined only by illness',
            'NOT shown only suffering'
        ],
        ageAppropriatenessNotes: `Ages 6-10: "Getting treatment for cancer" - emphasize bravery, hope, doing things they love`
    },
    {
        id: 'type1_diabetes',
        label: 'Type 1 Diabetes',
        category: 'medical',
        visualDescription: 'Often invisible - insulin pump/CGM conditional on user description',
        medicallyAccurateDescription: `Type 1 diabetes managed with insulin pump, CGM, or injections (often invisible). Some children use visible insulin pumps/CGMs, others use pens/syringes (hidden). Variable presentation based on individual management style.`,
        gptImageSafePrompt: `Character has Type 1 diabetes (metabolic condition - often invisible).

VISUAL ELEMENTS - CONDITIONAL ON USER DESCRIPTION:
IF user described insulin pump: Show small device clipped to waistband/pocket with thin tubing
IF user described CGM: Show small sensor on arm/abdomen
IF user described medical alert bracelet: Show bracelet
IF user mentioned NO visible devices: Show confident, active child WITHOUT diabetes markers

ALWAYS SHOW:
- Character confident, active, fully capable
- Engaged in all activities (sports, play, adventure)
- Diabetes does NOT limit them
- Managing health independently and capably

Type 1 diabetes is often INVISIBLE. 
Show devices ONLY if user mentioned them.
Never assume all diabetic children use visible pumps.

Diabetes management shown as enabling full, active life.`,
        mandatoryVisualRequirements: [
            'Character MUST look confident, active, and capable',
            'If insulin pump/CGM mentioned in user description: MUST show it',
            'If NO devices mentioned: MUST NOT add pump/CGM (many use pens/injections)',
            'MUST NOT portray as fragile or limited'
        ],
        visualValidationChecklist: [
            'Is insulin pump visible?',
            'Is character active and confident?'
        ],
        negativePrompt: `DO NOT hide insulin pump
DO NOT portray as fragile or limited`,
        personalityNuances: ['Self-management skills', 'Responsibility', 'Adaptability'],
        strengthsFromTrait: ['Independence', 'Self-care', 'Responsibility', 'Problem-solving'],
        conversationalHints: ['has diabetes', 'wears insulin pump', 'manages blood sugar'],
        storyIntegrationTips: ['Show managing pump naturally', 'Doing all activities', 'Others support naturally'],
        celebratoryLanguage: 'manages diabetes with amazing independence',
        dignityFirstFraming: 'Person with Type 1 diabetes.',
        avoidStereotypes: ['NOT fragile', 'NOT unable to eat normally'],
        ageAppropriatenessNotes: `Ages 6-10: "Has diabetes, wears pump to stay healthy"`
    },
    {
        id: 'asthma',
        label: 'Asthma',
        category: 'medical',
        visualDescription: 'Often invisible - inhaler conditional on user description',
        medicallyAccurateDescription: `Asthma managed with rescue inhaler (often invisible unless actively using). Some children carry visible inhalers, many keep them hidden in pocket/bag. Variable presentation.`,
        gptImageSafePrompt: `Character has asthma (respiratory condition - often invisible).

VISUAL ELEMENTS - CONDITIONAL ON USER DESCRIPTION:
IF user described inhaler: Show rescue inhaler in hand, pocket, or holder on belt
IF user mentioned NO inhaler visible: Show active, confident child WITHOUT inhaler visible

ALWAYS SHOW:
- Character active, engaged in physical activities
- Confident and fully capable
- Asthma does NOT limit participation

Asthma is often INVISIBLE.
Inhaler shown ONLY if user mentioned it being visible.
Many children with asthma don't carry visible inhalers.

Asthma management enables full, active participation in all activities.`,
        mandatoryVisualRequirements: [
            'Character MUST look active and capable',
            'If inhaler mentioned in user description: MUST show it',
            'If NO inhaler mentioned: MUST NOT add inhaler (often invisible)',
            'MUST NOT portray as fragile or unable to be active'
        ],
        visualValidationChecklist: ['Is character active and confident?', 'Are supports shown only if user mentioned?'],
        negativePrompt: `DO NOT hide inhaler, DO NOT portray as unable to play`,
        personalityNuances: ['Aware of breathing needs', 'Prepared', 'Adaptable'],
        strengthsFromTrait: ['Self-awareness', 'Preparedness', 'Adaptability'],
        conversationalHints: ['has asthma', 'uses inhaler', 'needs inhaler sometimes'],
        storyIntegrationTips: ['Inhaler natural part of activities', 'Can show use if needed'],
        celebratoryLanguage: 'keeps inhaler handy and plays full-out',
        dignityFirstFraming: 'Person with asthma.',
        avoidStereotypes: ['NOT fragile', 'NOT unable to play sports'],
        ageAppropriatenessNotes: `Ages 3-10: "Has asthma, uses inhaler to breathe better"`
    },
    // CRITICAL SAFETY DEVICES - High Misinterpretation Risk
    {
        id: 'halo_cervical_orthosis',
        label: 'Halo Cervical Orthosis (Halo Device)',
        category: 'medical',
        visualDescription: 'Medical halo device for spine/neck stabilization',
        medicallyAccurateDescription: `The character wears a MEDICAL HALO DEVICE (Halo Cervical Orthosis) - this is NOT an angel halo, NOT a golden ring, NOT a decorative crown. This is a medical orthopedic device consisting of metal structural components for spine healing.

DEVICE COMPONENTS (all must be visible):
- METAL RING: 8-10 inch diameter stainless steel ring circling head several inches from scalp (like industrial ring, NOT golden floating halo)
- SECURE ATTACHMENTS: Four connection points securely attaching metal ring to head for stability
- CONNECTING RODS: Four vertical stainless steel rods (front left, front right, back left, back right) connecting ring down to vest
- RIGID VEST: Hard plastic torso vest with foam padding covering chest and back, holding bottom ends of rods
- COMPLETE SYSTEM: All components connected - ring securely attached to head, support rods from ring to vest, vest on torso

The character wears this medical halo device which is naturally reflected in their appearance. The metal ring circles their head several inches from the scalp, held in place by secure attachments to the head. Four metal rods extend vertically from the ring down to a rigid vest worn on the torso. This structural orthopedic device immobilizes the neck and head during spine healing.

In this portrait, the medical halo device remains visible and authentic:
- Stainless steel ring circling head (industrial medical device, NOT decorative)
- Four secure attachment points where ring connects to head
- Vertical metal rods from ring extending down to vest
- Rigid plastic vest visible on chest and shoulders
- Head held straight by device (cannot tilt or turn)
- Natural adapted posture with medical device
- Expression: Brave, strong, determined despite device

The character wears a Halo Cervical Orthosis for neck and spine stabilization during healing. This is a MEDICAL SUPPORT DEVICE with metal components, secure head attachments, and supportive vest. Even when active or playing, the complete medical device structure is clearly recognizable - metal ring around head connected by rods to torso vest, all components visible as one connected orthopedic system.

The character wears this device with extraordinary courage and bravery. The medical halo allows spine healing while they continue living, being themselves, and showing amazing strength. The goal is medically accurate, respectful representation celebrating their incredible bravery during treatment.

CRITICAL: This is a medical device, NOT decorative, NOT symbolic, NOT spiritual.`,
        gptImageSafePrompt: `The character wears a MEDICAL HALO DEVICE (Halo Cervical Orthosis). This is a MEDICAL orthopedic device for spine stabilization, NOT an angel halo, NOT a golden ring, NOT a crown.

ABSOLUTE PROHIBITIONS - CRITICAL SAFETY (READ FIRST):
- DO NOT render golden angel halo floating above head
- DO NOT show heavenly, religious, or spiritual imagery
- DO NOT create decorative floating ring or crown
- DO NOT make character look angelic or ethereal
- MUST show industrial metal structural medical device
- MUST show complete connected system with all components

MEDICAL DEVICE STRUCTURE (all components must be visible):

In this portrait, the medical halo device remains visible and authentic:
- METAL RING: Stainless steel ring circling head several inches from scalp (8-10 inch diameter)
- SECURE ATTACHMENTS: Four connection points where ring securely attaches to head
- CONNECTING RODS: Four vertical metal rods from ring down to vest (front and back)
- RIGID VEST: Hard plastic torso vest on chest and shoulders, holding rod ends
- COMPLETE SYSTEM: All parts connected - ring to skull via pins, ring to vest via rods
- Head position: Held straight by device, cannot tilt or turn neck
- Expression: Brave, strong, determined, courageous

The character wears a medical halo device consisting of a metal ring around head, secure attachments, support rods, and torso vest. This is a STRUCTURAL ORTHOPEDIC MEDICAL DEVICE for spine healing. All components visible as connected system: metal ring circling head with secure attachments, four metal rods extending from ring down to rigid vest on torso.

The medical halo device is clearly shown with all components. This is a MEDICAL DEVICE (NOT angel halo, NOT decorative ring). Metal structural components for spine stabilization during healing. Character shows incredible bravery wearing this device.

The goal is medically accurate representation showing the actual medical device structure while celebrating the child's extraordinary courage during treatment.`,
        mandatoryVisualRequirements: [
            'METAL RING must circle head several inches from scalp (NOT on head, around it)',
            'SECURE ATTACHMENTS must be visible at four connection points',
            'CONNECTING RODS must be visible from ring down to vest',
            'RIGID VEST must be visible on torso/chest',
            'ALL components must be connected as one system',
            'Device must look MEDICAL/INDUSTRIAL (NOT decorative or golden)',
            'Character must be shown with dignity, bravery, and strength'
        ],
        visualValidationChecklist: [
            'Is metal ring visible circling head (not on head)?',
            'Are secure attachments visible at connection points?',
            'Are vertical connecting rods visible from ring to vest?',
            'Is rigid torso vest visible?',
            'Is complete system shown (all parts connected)?',
            'Does it look like MEDICAL DEVICE (not angel halo or crown)?',
            'Is character shown with courage and dignity?'
        ],
        negativePrompt: `CRITICAL SAFETY PROHIBITIONS:
DO NOT render as golden angel halo floating above head
DO NOT show heavenly, religious, or spiritual imagery
DO NOT create decorative floating ring or crown
DO NOT simplify to headband, hat, or decorative item
DO NOT hide or minimize any component (must show complete system)
DO NOT render as partial device (all components required)
DO NOT make character look angelic, ethereal, or heavenly
MUST show industrial metal structural MEDICAL device`,
        criticalSafetyNegatives: [
            'NOT an angel halo (this is MEDICAL orthopedic device)',
            'NOT a golden ring floating above head',
            'NOT heavenly or spiritual imagery',
            'NOT a decorative crown or headpiece',
            'MEDICAL SUPPORT DEVICE with metal ring, secure head attachments, support rods, and supportive vest'
        ],
        misinterpretationRisk: 'critical',
        alternativeMeanings: [
            'Angel halo (religious/spiritual)',
            'Crown (decorative/royal)',
            'Floating ring (fantasy/magical)',
            'Headpiece (fashion/costume)'
        ],
        contextDescriptions: {
            medical: `POWER DETECTION CROWN with glowing sensors and force field projectors. Crown IS superhero danger-scanner. Energy bars connect crown to chest power core. Crown SCANS for threats and PROJECTS protective shields. Decorated with hero emblems and power symbols. NOT angel halo - this IS SUPERHERO EQUIPMENT.`,
            superhero: `ENERGY CROWN with glowing star points projecting force fields and power beams. Luminous conduits radiating from crown down to chest power core unit. Crown scans environment and projects protective energy shields. Glowing with hero power, strength, and courage. Energy crown is source of hero scanning abilities.`,
            fantasy: `MAGICAL CROWN OF STARS with golden points radiating healing light and protective energy. Enchanted energy channels flowing from crown down to crystal heart vest. Crown channels healing magic and protective enchantments. Glows with magical power celebrating extraordinary courage. Mystical crown of healing and protection.`,
            scifi: `SENSOR ARRAY CROWN with integrated tech displays and navigation systems. Data channels connecting crown to central processing core unit. Crown provides environmental scanning and future-vision analysis capabilities. Futuristic tech array with glowing displays. Advanced exploration crown technology.`,
            robot: `UPPER UNIT ARCHITECTURE as integrated component. Structural framework extending from top section to main chassis. Connection bars linking robot components as part of construction design. Built-in architectural framework. Part of robot configuration.`
        },
        personalityNuances: [
            'Extraordinary bravery and courage through intensive treatment',
            'Remarkable adaptability to severe device constraints',
            'Fierce determination to stay active despite limitations',
            'Deep resilience from challenging medical journey',
            'May educate others about serious medical devices',
            'Profound strength and hope during recovery'
        ],
        strengthsFromTrait: [
            'Exceptional courage and bravery',
            'Extraordinary resilience',
            'Remarkable adaptability',
            'Inspiring determination',
            'Teaching others about medical challenges',
            'Hope and strength during recovery'
        ],
        conversationalHints: [
            'wears halo device',
            'has special medical brace',
            'metal device for healing spine',
            'halo to help neck and back heal',
            'brave device like superhero suit'
        ],
        storyIntegrationTips: [
            'Show bravery and courage prominently',
            'Device visible but character is focus (not device)',
            'Show adapted activities that respect immobility',
            'Others support naturally and with respect',
            'Emphasize living fully during treatment',
            'Can show determination and strength',
            'Reference "superhero healing device" for younger children',
            'Celebrate courage without pity'
        ],
        celebratoryLanguage: 'wears amazing medical halo device with superhero-level brave warrior spirit during healing',
        dignityFirstFraming: 'Child wearing halo device for healing or child in halo brace for spine stabilization. Emphasize medical nature, bravery, and hope.',
        avoidStereotypes: [
            'NOT portrayed only as medical case or patient',
            'NOT shown as angelic or heavenly (CRITICAL - avoid death implications)',
            'NOT shown as helpless or unable to engage',
            'NOT defined only by device',
            'NOT portrayed as tragic without hope',
            'NOT shown without celebrating their courage'
        ],
        culturalConsiderations: 'Halo devices are used across all cultures. Be especially sensitive to NOT creating religious imagery that could cause distress. Medical device, not spiritual symbol. Emphasize healing and hope universally.',
        ageAppropriatenessNotes: `Ages 6-10: "Special medical device to help spine heal - like brave superhero equipment" - NEVER mention angels or heaven, emphasize strength and healing`
    },
    {
        id: 'port_a_cath',
        label: 'Port-a-Cath (Chemotherapy Port)',
        category: 'medical',
        visualDescription: 'Implanted medical port on chest for treatment access',
        medicallyAccurateDescription: `Port-a-Cath is a MEDICAL implanted device under skin on upper chest for chemotherapy/medication access. NOT a portal, porthole, or decorative circle.

The character has a port-a-cath implanted under the skin on their upper chest. This is a small circular raised medical device (about quarter-size) under the skin with a catheter tube going to a vein. Used for chemotherapy, blood draws, and medication delivery.

In this portrait, the port-a-cath remains visible: Small circular raised area under skin on upper chest (near collarbone), slightly raised bump, may show through thin clothing, medical device for treatment access.

This is a MEDICAL ACCESS DEVICE implanted for cancer treatment, NOT decorative.`,
        gptImageSafePrompt: `The character has a port-a-cath - a MEDICAL implanted device in their chest for chemotherapy access. This is NOT a portal, NOT a porthole, NOT a decorative circle.

In this portrait, the medical port remains visible: Small circular raised device implanted under skin on upper chest near collarbone area, about quarter-size, slightly raised bump under skin, medical access point for treatment.

Port-a-cath is a MEDICAL implanted device for cancer treatment. Small raised circle on chest. This is MEDICAL equipment, NOT decorative portal or window.`,
        mandatoryVisualRequirements: ['Port must be visible on upper chest', 'Must look like medical device (NOT decorative)', 'Character must show bravery'],
        visualValidationChecklist: ['Is port visible on chest?', 'Does it look medical (not decorative)?', 'Is character shown with courage?'],
        negativePrompt: `DO NOT render as decorative portal or porthole
DO NOT make into window or doorway
DO NOT hide medical port
DO NOT trivialize as accessory`,
        criticalSafetyNegatives: ['NOT a portal or doorway (this is MEDICAL implant)', 'NOT a porthole or window', 'NOT decorative circle', 'MEDICAL ACCESS DEVICE for chemotherapy'],
        misinterpretationRisk: 'high',
        alternativeMeanings: ['Portal/doorway', 'Porthole/window', 'Decorative button'],
        personalityNuances: ['Extraordinary bravery', 'Resilience', 'Determination'],
        strengthsFromTrait: ['Courage', 'Strength', 'Hope', 'Fighting spirit'],
        conversationalHints: ['has port', 'port for medicine', 'medical device on chest'],
        storyIntegrationTips: ['Show bravery', 'Medical device natural', 'Focus on living fully'],
        celebratoryLanguage: 'has medical port and fights with incredible brave spirit',
        dignityFirstFraming: 'Child with port-a-cath for treatment.',
        avoidStereotypes: ['NOT only tragic', 'NOT defined by illness'],
        ageAppropriatenessNotes: `Ages 6-10: "Medical port to help with medicine" - emphasize bravery`
    },
    {
        id: 'tracheostomy',
        label: 'Tracheostomy',
        category: 'medical',
        visualDescription: 'Opening in neck with breathing tube',
        medicallyAccurateDescription: `Tracheostomy is a surgical opening in the neck with tube for breathing. NOT a necklace, NOT jewelry, NOT decorative collar.

The character has a tracheostomy - an opening in the front of the neck with a medical tube inserted for breathing support. The tube (trach tube) is visible at neck level with a flange securing it.

In this portrait, the tracheostomy remains visible: Opening in lower front neck, medical tube inserted, tube flange at skin level, may have strap around neck securing tube.

This is a MEDICAL AIRWAY for breathing support, NOT decorative necklace.`,
        gptImageSafePrompt: `The character has a tracheostomy - a surgical opening in neck with breathing tube. This is NOT a necklace, NOT jewelry, NOT a collar.

In this portrait, the tracheostomy remains visible: Opening in lower front of neck with medical tube inserted, tube flange at skin level, may have securing strap, breathing support device.

Tracheostomy is a MEDICAL AIRWAY opening in neck for breathing. This is actual neck opening with tube, NOT decorative jewelry or necklace.`,
        mandatoryVisualRequirements: ['Neck opening with tube must be visible', 'Must look medical (NOT decorative)', 'Character must show strength'],
        visualValidationChecklist: ['Is neck opening visible?', 'Is tube shown?', 'Does it look medical (not necklace)?'],
        negativePrompt: `DO NOT render as necklace or jewelry
DO NOT make decorative collar or choker
DO NOT hide tracheostomy
DO NOT trivialize breathing support`,
        criticalSafetyNegatives: ['NOT a necklace or jewelry (this is MEDICAL airway)', 'NOT decorative collar', 'MEDICAL opening in neck with breathing tube'],
        misinterpretationRisk: 'high',
        alternativeMeanings: ['Necklace', 'Collar', 'Choker', 'Jewelry'],
        personalityNuances: ['Resilience', 'Bravery', 'Adaptability'],
        strengthsFromTrait: ['Courage', 'Strength', 'Determination'],
        conversationalHints: ['has trach', 'breathing tube', 'opening in neck for air'],
        storyIntegrationTips: ['Show bravery', 'Device natural', 'Focus on capability'],
        celebratoryLanguage: 'breathes with medical trach tube and shows amazing courage',
        dignityFirstFraming: 'Child with tracheostomy.',
        avoidStereotypes: ['NOT fragile', 'NOT helpless'],
        ageAppropriatenessNotes: `Ages 6-10: "Special breathing tube" - emphasize strength`
    },
    {
        id: 'feeding_tube_gtube',
        label: 'Feeding Tube (G-tube)',
        category: 'medical',
        visualDescription: 'Medical port on abdomen for feeding',
        medicallyAccurateDescription: `G-tube (gastrostomy tube) is a MEDICAL port on abdomen for nutrition delivery. NOT a button, NOT a badge, NOT decorative.

The character has a G-tube port on their abdomen for feeding support. Small medical port on stomach area, may have small tube attached for feeding.

In this portrait, the G-tube remains visible: Circular medical port on abdomen, medical feeding access point.

This is a MEDICAL feeding access device, NOT decorative button.`,
        gptImageSafePrompt: `The character has a G-tube feeding port. This is a MEDICAL device on abdomen for nutrition, NOT a decorative button or badge.

G-tube port visible on abdomen: Small circular medical port for feeding tube attachment. MEDICAL device for nutrition support, NOT decorative item.`,
        mandatoryVisualRequirements: ['G-tube port visible if mentioned', 'Must look medical', 'Character confident'],
        visualValidationChecklist: ['Is port visible?', 'Medical not decorative?'],
        negativePrompt: `DO NOT render as decorative button or badge`,
        criticalSafetyNegatives: ['NOT decorative button or badge (MEDICAL feeding port)', 'MEDICAL device on abdomen for nutrition'],
        misinterpretationRisk: 'medium',
        alternativeMeanings: ['Button', 'Badge', 'Decorative accessory'],
        personalityNuances: ['Adaptability', 'Self-care'],
        strengthsFromTrait: ['Resilience', 'Self-advocacy'],
        conversationalHints: ['has feeding tube', 'G-tube', 'tube for eating'],
        storyIntegrationTips: ['Show natural', 'Focus on capability'],
        celebratoryLanguage: 'has feeding tube and lives fully',
        dignityFirstFraming: 'Child with G-tube.',
        avoidStereotypes: ['NOT fragile'],
        ageAppropriatenessNotes: `Ages 6-10: "Special feeding tube"`
    },
    {
        id: 'oxygen_cannula',
        label: 'Oxygen Therapy (Nasal Cannula)',
        category: 'medical',
        visualDescription: 'Nasal oxygen tubes connected to portable tank',
        medicallyAccurateDescription: `Oxygen therapy via nasal cannula - thin tubes in nostrils connected to portable oxygen tank. NOT decorative tubes, NOT costume pieces.

The character uses supplemental oxygen via nasal cannula. Two thin clear tubes rest in nostrils, tubes loop over ears, connect behind head to longer tube going to portable oxygen tank (small wheeled tank or carried).

In this portrait, the oxygen cannula remains visible: Thin tubes in nostrils, tubes over ears, connected to oxygen source.

This is MEDICAL breathing support equipment, NOT decorative costume.`,
        gptImageSafePrompt: `The character uses oxygen therapy with nasal cannula. This is MEDICAL breathing equipment, NOT decorative tubes or costume.

Nasal cannula visible: Thin clear tubes in both nostrils, tubes loop over ears, connect to portable oxygen tank. MEDICAL breathing support, NOT decorative tubes.`,
        mandatoryVisualRequirements: ['Nasal cannula visible', 'Medical equipment shown', 'Character active'],
        visualValidationChecklist: ['Are nasal tubes visible?', 'Medical not costume?'],
        negativePrompt: `DO NOT render as decorative costume tubes`,
        criticalSafetyNegatives: ['NOT decorative tubes or costume (MEDICAL oxygen)', 'MEDICAL nasal cannula for breathing support'],
        misinterpretationRisk: 'medium',
        alternativeMeanings: ['Costume tubes', 'Decorative wires', 'Fashion accessory'],
        personalityNuances: ['Adaptability', 'Resilience'],
        strengthsFromTrait: ['Determination', 'Self-management'],
        conversationalHints: ['uses oxygen', 'breathing tubes', 'oxygen tank'],
        storyIntegrationTips: ['Show natural', 'Focus on activity'],
        celebratoryLanguage: 'uses oxygen support and explores bravely',
        dignityFirstFraming: 'Child using oxygen therapy.',
        avoidStereotypes: ['NOT fragile'],
        ageAppropriatenessNotes: `Ages 6-10: "Breathing helper tubes"`
    },
    {
        id: 'iv_picc_line',
        label: 'IV/PICC Line',
        category: 'medical',
        visualDescription: 'Medicine delivery system in arm (imagination transformation)',
        // IMAGINATION TRANSFORMATION
        contextDescriptions: {
            medical: `MEDICINE DELIVERY SYSTEM with power connector. System IS hero medicine tech. Small line in arm delivers hero medicine and healing power. System DELIVERS strength and MAINTAINS health abilities. Decorated with medical symbols. NOT medical IV - this IS HERO MEDICINE TECH.`,
            superhero: `POWER MEDICINE LINE with heroic healing delivery. Medicine tech in arm for strength and healing ability maintenance.`,
            fantasy: `MAGICAL HEALING CHANNEL with enchanted medicine flow. Mystical line channels healing potions and strength magic.`,
            scifi: `NANO-MEDICINE CONDUIT with advanced delivery system. Sci-fi medicine line for cellular healing and enhancement.`,
            robot: `INTEGRATED MAINTENANCE LINE as built-in component. System maintenance conduit for repairs and upgrades.`
        },
        medicallyAccurateDescription: `IV or PICC line - intravenous access for medications. NOT decorative wire, NOT cable, NOT ribbon.

The character has an IV or PICC line - thin medical tube inserted in arm or chest for medication delivery, tube secured with clear medical tape, may connect to IV pole or pump.

This is MEDICAL intravenous access, NOT decorative wire.`,
        gptImageSafePrompt: `The character has an IV or PICC line. This is MEDICAL intravenous access, NOT decorative wire or cable.

IV/PICC line visible: Thin tube in arm or upper chest, secured with medical tape, for medication delivery. MEDICAL device NOT decorative.`,
        mandatoryVisualRequirements: ['IV line visible if active treatment', 'Medical not decorative'],
        visualValidationChecklist: ['Is line visible?', 'Medical appearance?'],
        negativePrompt: `DO NOT render as decorative wire or cable`,
        criticalSafetyNegatives: ['NOT decorative wire or cable (MEDICAL IV access)', 'MEDICAL intravenous line for medication'],
        misinterpretationRisk: 'medium',
        alternativeMeanings: ['Wire', 'Cable', 'Ribbon', 'String'],
        personalityNuances: ['Bravery', 'Resilience'],
        strengthsFromTrait: ['Courage', 'Determination'],
        conversationalHints: ['has IV', 'medicine tube', 'line in arm'],
        storyIntegrationTips: ['Show courage', 'Medical device natural'],
        celebratoryLanguage: 'has medicine line and faces treatment bravely',
        dignityFirstFraming: 'Child with IV/PICC line.',
        avoidStereotypes: ['NOT only sick'],
        ageAppropriatenessNotes: `Ages 6-10: "Medicine tube"`
    },
    {
        id: 'cochlear_implant_external',
        label: 'Cochlear Implant (External Processor)',
        category: 'sensory',
        visualDescription: 'Surgically implanted hearing device with external processor',
        medicallyAccurateDescription: `Cochlear implant - surgically implanted hearing device. External processor magnetically attached behind ear. NOT regular headphones, NOT bluetooth device.

The character has a cochlear implant with external processor visible behind ear. Processor is rectangular device magnetically attached to implant under skin, with microphone and battery components.

This is SURGICALLY IMPLANTED HEARING DEVICE, NOT regular headphones.`,
        gptImageSafePrompt: `The character has a cochlear implant. This is a SURGICALLY IMPLANTED medical hearing device, NOT regular headphones or bluetooth.

External processor visible: Rectangular device magnetically attached behind ear, microphone component, connecting to implant under skin. MEDICAL hearing device NOT consumer headphones.`,
        mandatoryVisualRequirements: ['External processor visible behind ear', 'Must look medical (different from headphones)'],
        visualValidationChecklist: ['Is processor visible?', 'Distinguishable from regular headphones?'],
        negativePrompt: `DO NOT render as regular headphones or bluetooth device`,
        criticalSafetyNegatives: ['NOT regular headphones (SURGICALLY IMPLANTED medical device)', 'MEDICAL hearing implant processor'],
        misinterpretationRisk: 'low',
        alternativeMeanings: ['Headphones', 'Bluetooth device', 'Earbuds'],
        personalityNuances: ['Tech-savvy', 'Self-advocacy'],
        strengthsFromTrait: ['Adaptability', 'Communication'],
        conversationalHints: ['has cochlear implant', 'special hearing device', 'implant behind ear'],
        storyIntegrationTips: ['Show as natural tech', 'Communication works'],
        celebratoryLanguage: 'has amazing cochlear implant technology',
        dignityFirstFraming: 'Child with cochlear implant.',
        avoidStereotypes: ['NOT "hearing-impaired"'],
        ageAppropriatenessNotes: `Ages 3-10: "Special hearing implant"`
    },
    {
        id: 'cranial_helmet',
        label: 'Cranial Shaping Helmet',
        category: 'medical',
        visualDescription: 'Growth power helmet (imagination transformation)',
        // IMAGINATION TRANSFORMATION  
        contextDescriptions: {
            medical: `GROWTH POWER HELMET with head shaping technology. Helmet IS growth enhancement tech. Protective helmet helps head grow strong and perfect. Helmet SUPPORTS growth and SHAPES development. Decorated with growth symbols. NOT medical helmet - this IS GROWTH POWER TECH.`,
            superhero: `HEAD POWER HELMET with growth enhancement. Heroic helmet for super head strength and shape development.`,
            fantasy: `MAGICAL SHAPING CROWN with enchanted growth magic. Mystical helmet channels growth spells and shape perfection.`,
            scifi: `CRANIAL DEVELOPMENT SYSTEM with advanced shaping tech. Sci-fi helmet for optimal head growth and development.`,
            robot: `INTEGRATED HEAD UNIT as built-in component. Structural helmet for optimal head chassis development.`
        },
        medicallyAccurateDescription: `Cranial helmet for skull shaping (plagiocephaly treatment). NOT a decorative hat, NOT a crown, NOT a costume helmet.

The character wears a cranial shaping helmet - hard plastic medical helmet covering most of head for skull growth correction. Medical orthotic device.

This is MEDICAL skull-shaping helmet, NOT decorative headgear.`,
        gptImageSafePrompt: `The character wears a cranial shaping helmet. This is a MEDICAL device for skull correction, NOT a decorative hat or crown.

Medical helmet visible: Hard plastic covering head, medical orthotic for skull shaping. MEDICAL device NOT decorative hat.`,
        mandatoryVisualRequirements: ['Helmet visible if worn', 'Medical appearance'],
        visualValidationChecklist: ['Is helmet visible?', 'Medical not costume?'],
        negativePrompt: `DO NOT render as decorative hat or crown`,
        criticalSafetyNegatives: ['NOT decorative hat or crown (MEDICAL helmet)', 'MEDICAL skull-shaping orthotic device'],
        misinterpretationRisk: 'medium',
        alternativeMeanings: ['Hat', 'Crown', 'Costume helmet'],
        personalityNuances: ['Adaptability'],
        strengthsFromTrait: ['Resilience'],
        conversationalHints: ['wears helmet', 'head helmet', 'special helmet'],
        storyIntegrationTips: ['Show naturally'],
        celebratoryLanguage: 'wears special helmet for growing',
        dignityFirstFraming: 'Child wearing cranial helmet.',
        avoidStereotypes: ['NOT fragile'],
        ageAppropriatenessNotes: `Ages 0-3: "Special helmet to help head grow"`
    },
    {
        id: 'dialysis_access',
        label: 'Dialysis Access (Fistula/Catheter)',
        category: 'medical',
        visualDescription: 'Arteriovenous access site for kidney dialysis',
        medicallyAccurateDescription: `Dialysis access - arteriovenous fistula or catheter for kidney treatment. NOT simple bandage, NOT wrap, NOT bracelet.

The character has dialysis access on arm or chest - raised area where artery and vein connected (fistula) or catheter tube. Used for kidney dialysis treatment.

This is MEDICAL ACCESS for dialysis treatment, NOT decorative bandage.`,
        gptImageSafePrompt: `The character has dialysis access. This is MEDICAL access for kidney treatment, NOT a simple bandage or wrap.

Dialysis access visible: Raised area or catheter on arm/chest for dialysis treatment. MEDICAL device NOT decorative bandage.`,
        mandatoryVisualRequirements: ['Access site visible if mentioned', 'Medical appearance'],
        visualValidationChecklist: ['Is access visible?', 'Medical not decorative?'],
        negativePrompt: `DO NOT render as simple bandage or fashion wrap`,
        criticalSafetyNegatives: ['NOT bandage or wrap (MEDICAL dialysis access)', 'MEDICAL access for kidney treatment'],
        misinterpretationRisk: 'medium',
        alternativeMeanings: ['Bandage', 'Wrap', 'Bracelet', 'Fashion accessory'],
        personalityNuances: ['Bravery', 'Self-management'],
        strengthsFromTrait: ['Resilience', 'Responsibility'],
        conversationalHints: ['has dialysis', 'access for treatment', 'arm site'],
        storyIntegrationTips: ['Show courage', 'Natural medical care'],
        celebratoryLanguage: 'manages dialysis with brave determination',
        dignityFirstFraming: 'Child receiving dialysis.',
        avoidStereotypes: ['NOT fragile'],
        ageAppropriatenessNotes: `Ages 6-10: "Special access for kidney treatment"`
    },
    {
        id: 'medical_alert_symbol',
        label: 'Medical Alert Bracelet/Symbol',
        category: 'medical',
        visualDescription: 'Medical alert bracelet with emergency symbol',
        medicallyAccurateDescription: `Medical alert bracelet with red medical cross or Star of Life symbol. NOT religious cross, NOT fashion jewelry.

The character wears a medical alert bracelet - metal or silicone band with medical symbol (red cross or Star of Life) indicating medical condition for emergency responders.

This is MEDICAL EMERGENCY identification, NOT religious symbol.`,
        gptImageSafePrompt: `The character wears a medical alert bracelet. This has a red medical emergency symbol (cross or Star of Life), NOT a religious cross.

Medical alert bracelet visible: Band on wrist with RED MEDICAL CROSS (emergency symbol), medical identification device. MEDICAL emergency symbol NOT religious jewelry.`,
        mandatoryVisualRequirements: ['Medical alert bracelet visible', 'Red medical symbol (not religious)'],
        visualValidationChecklist: ['Is bracelet visible?', 'Is symbol medical (not religious)?'],
        negativePrompt: `DO NOT render as religious cross jewelry`,
        criticalSafetyNegatives: ['NOT religious cross (MEDICAL emergency symbol)', 'RED MEDICAL CROSS for emergency identification'],
        misinterpretationRisk: 'medium',
        alternativeMeanings: ['Religious cross', 'Fashion jewelry', 'Decorative bracelet'],
        personalityNuances: ['Preparedness', 'Self-advocacy'],
        strengthsFromTrait: ['Self-management', 'Safety awareness'],
        conversationalHints: ['wears medical bracelet', 'emergency bracelet', 'medical ID'],
        storyIntegrationTips: ['Show naturally', 'Safety awareness'],
        celebratoryLanguage: 'wears medical alert bracelet for safety',
        dignityFirstFraming: 'Child with medical alert bracelet.',
        avoidStereotypes: ['NOT defined by condition'],
        ageAppropriatenessNotes: `Ages 6-10: "Emergency bracelet"`
    }
];
/**
 * Create map for easy lookup by ID
 */
/**
 * Create map for easy lookup by ID
 */
exports.INCLUSIVITY_TRAITS_MAP = exports.CORE_INCLUSIVITY_TRAITS.reduce((map, trait) => {
    map[trait.id] = trait;
    return map;
}, {});
/**
 * Get trait by ID with fallback
 */
function getInclusivityTrait(id) {
    return exports.INCLUSIVITY_TRAITS_MAP[id] || null;
}
/**
 * Get all traits by category
 */
function getTraitsByCategory(category) {
    return exports.CORE_INCLUSIVITY_TRAITS.filter(t => t.category === category);
}
/**
 * Search traits by label or description
 */
function searchTraits(query) {
    const lowerQuery = query.toLowerCase();
    return exports.CORE_INCLUSIVITY_TRAITS.filter(t => t.label.toLowerCase().includes(lowerQuery) ||
        t.visualDescription.toLowerCase().includes(lowerQuery) ||
        t.conversationalHints.some(hint => hint.toLowerCase().includes(lowerQuery)));
}
/**
 * CRITICAL: Runtime Enforcement
 *
 * This code runs every time the file loads.
 * It validates that the inclusivity system is intact.
 *
 * If <39 traits loaded:
 * - Production/CI: CRASH IMMEDIATELY (prevents deployment with broken system)
 * - Development: LOG ERROR but allow debugging (developer might be fixing issue)
 */
const EXPECTED_MINIMUM_TRAITS = 39;
const ACTUAL_TRAIT_COUNT = exports.CORE_INCLUSIVITY_TRAITS.length;
// Always log count for visibility
console.log(`📊 Inclusivity Traits Loaded: ${ACTUAL_TRAIT_COUNT}/${EXPECTED_MINIMUM_TRAITS}`);
if (ACTUAL_TRAIT_COUNT < EXPECTED_MINIMUM_TRAITS) {
    const errorMsg = `\n${'='.repeat(80)}\n` +
        `INCLUSIVITY SYSTEM INTEGRITY VIOLATION\n` +
        `${'='.repeat(80)}\n` +
        `Expected minimum: ${EXPECTED_MINIMUM_TRAITS} traits\n` +
        `Actually loaded: ${ACTUAL_TRAIT_COUNT} traits\n` +
        `Children excluded: ${EXPECTED_MINIMUM_TRAITS - ACTUAL_TRAIT_COUNT} groups\n` +
        `\n` +
        `EVERY child matters. NO EXCEPTIONS.\n` +
        `\n` +
        `Fix: Restore all 39 traits from git history.\n` +
        `See: lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts\n` +
        `${'='.repeat(80)}\n`;
    // In production/CI: CRASH IMMEDIATELY (prevent deployment with broken system)
    // In development: LOG ERROR but allow debugging (developer might be fixing issue)
    if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
        throw new Error(errorMsg);
    }
    else {
        console.error(errorMsg);
        console.error('🔧 Running in development mode - allowing load for debugging.');
        console.error('⚠️  FIX THIS BEFORE COMMITTING OR DEPLOYING.\n');
    }
}
// Always assert for good measure
console.assert(ACTUAL_TRAIT_COUNT >= EXPECTED_MINIMUM_TRAITS, `CRITICAL: Only ${ACTUAL_TRAIT_COUNT} traits loaded (need ${EXPECTED_MINIMUM_TRAITS})`);
