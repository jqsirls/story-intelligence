/**
 * Species Anatomy Profiles
 * 
 * Prevents "human in costume" problem by defining actual anatomy for each species.
 * Enables imaginative device transformation (wheelchair → rocket vehicle).
 * Ensures recognizable trait adaptation across all species.
 * 
 * Philosophy: Mother can say "That dragon has Down syndrome too!" and child feels "That's ME as a hero!"
 */

export interface SpeciesProfile {
  species: string;
  anatomyBase: string;                    // Core anatomy description
  anthropomorphismLevel: string;          // How human-like
  traitAdaptationPrinciple: string;      // How medical traits adapt
  deviceAdaptationPrinciple: string;     // How assistive devices adapt
  criticalAnatomyEmphasis: string;       // "NOT human in costume" statement
  exampleAdaptations?: {                 // Concrete examples for common traits
    downSyndrome?: string;
    vitiligo?: string;
    albinism?: string;
    burnScars?: string;
    wheelchair?: string;
    prosthetic?: string;
    hearingAids?: string;
    autism?: string;
    haloDevice?: string;
  };
}

export const SPECIES_PROFILES: Record<string, SpeciesProfile> = {
  human: {
    species: 'human',
    anatomyBase: 'Human child anatomy with natural proportions for stated age',
    anthropomorphismLevel: 'Fully human',
    traitAdaptationPrinciple: 'Traits apply directly as medically described with full accuracy',
    deviceAdaptationPrinciple: 'Standard human assistive devices as medically accurate',
    criticalAnatomyEmphasis: '', // No emphasis needed for human
    exampleAdaptations: {
      downSyndrome: 'Almond-shaped eyes with upward slant, flatter nasal bridge, rounder features - medically accurate',
      wheelchair: 'Standard wheelchair decorated with child personality - visible and celebrated',
      prosthetic: 'Prosthetic limb (blade/realistic/mechanical) - clearly different from biological limb'
    }
  },
  
  monster: {
    species: 'monster',
    anatomyBase: 'FRIENDLY MONSTER ANATOMY - unusual colors, fun proportions, silly features, furry or scaled or textured. NOT human. This is MONSTER body with monster characteristics (big feet, fuzzy fur, silly ears, tentacles, multiple eyes, unusual limbs).',
    anthropomorphismLevel: 'Bipedal, clothed, expressive, SILLY not scary, playful personality',
    traitAdaptationPrinciple: 'ALL traits RECOGNIZABLE on monster anatomy. Down syndrome = gentler softer monster features (almond monster eyes, rounder monster face). Vitiligo = pattern on monster fur/skin. Mother can say "That monster has [trait] too!" Goal: Representation through silly joyful monster form.',
    deviceAdaptationPrinciple: 'Devices TRANSFORM for monster context. Wheelchair = silly decorated monster mobile with fuzzy wheels. Prosthetic = funny mechanical monster limb (furry robotic tentacle, colorful mechanical paw). VISIBLE + SILLY + CELEBRATED.',
    criticalAnatomyEmphasis: 'CRITICAL: This is FRIENDLY MONSTER anatomy (furry/silly/playful), NOT human child. Monster body, monster features, monster proportions. FRIENDLY and PLAYFUL (never scary).',
    exampleAdaptations: {
      downSyndrome: 'Monster face with gentler softer features - almond-shaped monster eyes, rounder monster face. Recognizable as "has DS too!" on silly monster.',
      vitiligo: 'Pattern patches on monster fur/scales - different colored patches creating vitiligo pattern on monster body.',
      albinism: 'Very pale/white monster fur or skin, light monster eyes - "has albinism too!"',
      wheelchair: 'Silly decorated monster wheelchair with fuzzy accessories and monster stickers. VISIBLE + PLAYFUL.',
      prosthetic: 'Furry mechanical monster limb (colorful robotic tentacle, fuzzy tech paw). SILLY + FUNCTIONAL.',
      hearingAids: 'Colorful hearing aids visible on monster ears (even if silly ears).',
      autism: 'Headphones on monster, fidget toys in monster paws/tentacles. Sensory needs visible.'
    }
  },
  
  robot: {
    species: 'robot',
    anatomyBase: 'MECHANICAL/ROBOTIC ANATOMY - metal panels, circuits, robotic joints, LED eyes, mechanical components, visible tech. NOT a human child in robot suit. This is ACTUAL ROBOT with mechanical body.',
    anthropomorphismLevel: 'Humanoid mechanical form - robot body with expressive design, can show emotion through LED displays, panel configurations, body language',
    traitAdaptationPrinciple: 'ALL traits expressed as DESIGN PHILOSOPHY. Down syndrome = rounder softer panel design, gentler mechanical aesthetic (almond LED eyes). Vitiligo = different colored/textured panels. Autism = processing accommodations visible. Goal: "That robot has [trait] too!" through design.',
    deviceAdaptationPrinciple: 'Devices INTEGRATE as robotic systems. Wheelchair = mobility platform chassis (for superhero = power base with rockets). Prosthetic = mechanical component upgrade. Halo = integrated head stabilization system with tech aesthetic (NOT medical, NOT angel). VISIBLE + TECH-ENHANCED.',
    criticalAnatomyEmphasis: 'CRITICAL: This is ROBOT with mechanical body, NOT human child in robot costume. Metal, circuits, robotic components, LED features, mechanical joints.',
    exampleAdaptations: {
      downSyndrome: 'Robot: Rounder softer panels, gentler aesthetic, almond-shaped LED eyes with upward tilt. Recognizable DS-inspired design - "has DS too!"',
      vitiligo: 'Robot: Different colored/textured panels creating pattern across body - recognizable vitiligo pattern.',
      albinism: 'Robot: Very pale/white panels, light LED eyes, pale aesthetic - "has albinism too!"',
      burnScars: 'Robot: Textured weathered panels showing "healed" metal areas - visible scars on robot.',
      wheelchair: 'Robot mobility platform. Superhero robot = power base with rocket boosters. INTEGRATED + TRANSFORMED.',
      prosthetic: 'Mechanical limb component. Enhanced and celebrated as robot upgrade.',
      hearingAids: 'Visible audio processors, antenna receivers integrated into robot head.',
      autism: 'Processing accommodations visible, headphones integrated, sensory optimization in design.',
      haloDevice: 'Integrated head stabilization system with tech aesthetic. Glowing tech panels (NOT medical brace, NOT angel halo).'
    }
  },
  
  animal: {
    species: 'animal',
    anatomyBase: 'ANIMAL ANATOMY (cat/dog/rabbit/bear/bird/etc based on description) - NOT human child with animal ears and tail. This is ACTUAL animal body structure with animal proportions, animal head/face with muzzle or beak, animal limbs (paws/claws/hooves). Note: Dragons/unicorns are Fantasy Beings, not animals.',
    anthropomorphismLevel: 'Bipedal OR quadruped (depends on animal type), can wear clothing, expressive face, uses tools/objects',
    traitAdaptationPrinciple: 'ALL traits RECOGNIZABLE on animal anatomy. Down syndrome = almond-shaped ANIMAL eyes (cat eyes, dog eyes), softer rounder ANIMAL muzzle. Vitiligo = patches on fur/skin. Albinism = pale fur, light eyes. Goal: "That cat/dog has [trait] too!"',
    deviceAdaptationPrinciple: 'Devices TRANSFORM through imagination. Superhero cat wheelchair = rocket-powered vehicle. Dragon chariot = magical decorated chair. Prosthetic = enhanced animal limb (tech cat paw, mechanical dog leg). VISIBLE + ELEVATED through imagination.',
    criticalAnatomyEmphasis: 'CRITICAL: This is ANIMAL anatomy (cat/dog/rabbit/etc), NOT a human child wearing animal costume. Animal body, animal head with muzzle/beak, animal proportions.',
    exampleAdaptations: {
      downSyndrome: 'Cat/dog: Almond-shaped ANIMAL eyes with upward slant, softer rounder muzzle, gentler animal features. "That cat has DS too!"',
      vitiligo: 'Cat/dog: Light patches on fur creating vitiligo pattern - "has vitiligo too!"',
      albinism: 'Cat/dog: Very pale/white fur, light eyes - "has albinism too!"',
      burnScars: 'Cat/dog: Scar texture visible on fur/skin areas.',
      wheelchair: 'Cat/dog wheelchair: For superhero = rocket vehicle. For adventure = explorer mobile. TRANSFORMED.',
      prosthetic: 'Cat paw prosthetic = tech-enhanced paw. Dog leg = mechanical enhanced limb. POWERFUL.',
      hearingAids: 'Colorful hearing aids visible on animal ears.',
      autism: 'Headphones on animal, fidget toys, natural animal stimming behavior portrayed.'
    }
  },
  
  fantasy_being: {
    species: 'fantasy_being',
    anatomyBase: 'FANTASY BEING ANATOMY (dragon/elf/fairy/unicorn/cyclops/griffin/centaur/etc based on description) - NOT human with fantasy accessories. This is ACTUAL fantasy creature with species-specific anatomy. Dragons: Reptilian body, dragon head with snout, scales, claws, tail, wings. Elves: Pointed ears, elegant features, tall slender. Fairies: Tiny with wings, delicate. Unicorns: Horse body with horn. Cyclops: Single large eye. Each type has distinct non-human anatomy.',
    anthropomorphismLevel: 'Varies by creature type - bipedal (dragons, elves, fairies, cyclops) or quadruped (unicorns, griffins, centaurs). All expressive, can wear clothing adapted to body, interact with objects.',
    traitAdaptationPrinciple: 'ALL traits RECOGNIZABLE on fantasy anatomy. Dragons: Almond DRAGON eyes, softer dragon snout for DS. Vitiligo = patches on dragon scales. Elves: Gentler elf features for DS. Unicorns: Almond horse eyes for DS, patches on coat for vitiligo. Goal: "That dragon/elf/unicorn has [trait] too!"',
    deviceAdaptationPrinciple: 'Devices TRANSFORM through magic + imagination. Dragon wheelchair = MAGICAL CHARIOT with stars and emblems. Unicorn wheelchair = wheeled platform with flowers. Fairy wheelchair = tiny enchanted chair. Halo on dragon = magical crown with power (NOT medical, NOT angel). VISIBLE + MAGICAL.',
    criticalAnatomyEmphasis: 'CRITICAL: This is FANTASY BEING with non-human anatomy (dragon/elf/fairy/unicorn/cyclops/etc), NOT human child with fantasy accessories. Dragons have dragon bodies with scales, snouts, claws, tails, wings - NOT human face with dragon ears. Elves have elf proportions and features - NOT human with pointed ears. Each fantasy being has ACTUAL fantasy anatomy.',
    exampleAdaptations: {
      downSyndrome: 'Dragon: Almond DRAGON eyes with gentle slant, softer rounder dragon snout, gentler draconic features - RECOGNIZABLE as DS-inspired. "That dragon has Down syndrome too!" Elf: Gentler elf features with almond eyes. Fairy: Softer fairy face.',
      vitiligo: 'Dragon: Light/white patches on purple/red scales creating beautiful pattern - "has vitiligo too!" Unicorn: Patches on white/colored coat.',
      albinism: 'Dragon: Very pale/white scales, light eyes - "has albinism too!" Fairy: Extremely pale fairy with white hair.',
      burnScars: 'Dragon: Scar texture on scales. Phoenix: Healed feather areas showing rebirth (meta and meaningful!).',
      wheelchair: 'Dragon: MAGICAL CHARIOT decorated with stars, dragon emblems, sparkles. Unicorn: Wheeled platform with flowers and rainbow. Fairy: Tiny enchanted wheelchair. Device VISIBLE but ELEVATED - not clinical, MAGICAL.',
      prosthetic: 'Dragon: POWERFUL enhanced dragon claw prosthetic (mechanical and magical). Unicorn: Magical prosthetic leg with horn power. Fairy: Shimmering prosthetic wing. CELEBRATED as upgrade.',
      hearingAids: 'Dragon: Colorful devices on dragon ears. Elf: Visible on pointed elf ears.',
      autism: 'Dragon/elf/fairy: Headphones visible, fidget tools adapted to species hands/claws.',
      haloDevice: 'Dragon: Magical crown with stabilization power (NOT medical device, NOT angel halo).'
    }
  },
  
  dinosaur: {
    species: 'dinosaur',
    anatomyBase: 'DINOSAUR ANATOMY (T-Rex/Triceratops/Stegosaurus/Pterodactyl/etc based on description) - NOT human in dinosaur costume. This is ACTUAL DINOSAUR with prehistoric reptilian anatomy, dinosaur head, dinosaur body structure, appropriate limb configuration for dinosaur type.',
    anthropomorphismLevel: 'Bipedal (T-Rex, raptors) or quadruped (Triceratops, Stegosaurus), can wear clothing adapted to dino body, expressive dinosaur face, uses tools',
    traitAdaptationPrinciple: 'ALL traits RECOGNIZABLE on dinosaur anatomy. Down syndrome = almond DINO eyes, softer dino snout. Vitiligo = patches on dino skin/scales. Burn scars = texture on prehistoric skin. Goal: "That dinosaur has [trait] too!"',
    deviceAdaptationPrinciple: 'Devices TRANSFORM for prehistoric context. Wheelchair = prehistoric explorer vehicle with fossil decorations. For superhero dino = rocket time machine. Prosthetic = enhanced dino limb (powerful T-Rex arm prosthetic making tiny arms functional!). VISIBLE + TRANSFORMED.',
    criticalAnatomyEmphasis: 'CRITICAL: This is DINOSAUR anatomy (prehistoric reptile), NOT human child in dinosaur costume. Dinosaur head with snout/jaw, dinosaur body, dinosaur proportions for species type.',
    exampleAdaptations: {
      downSyndrome: 'T-Rex: Almond DINO eyes with gentle slant, softer rounder prehistoric snout, gentler dinosaur features. "That T-Rex has Down syndrome too!" Triceratops: Softer face, gentler despite horns.',
      vitiligo: 'T-Rex: Light patches on scales creating pattern - "has vitiligo too!" Stegosaurus: Patches on dino skin.',
      albinism: 'T-Rex: Very pale scales, light eyes - "has albinism too!" Pterodactyl: Pale feathers.',
      burnScars: 'T-Rex: Scar texture on dinosaur skin - visible healed areas.',
      wheelchair: 'T-Rex: Prehistoric explorer vehicle with fossil stickers. Superhero dino: Rocket-powered time machine. TRANSFORMED from wheelchair.',
      prosthetic: 'T-Rex: ENHANCED mechanical tiny arm (making tiny arms POWERFUL!). Raptor: Super-grip claw prosthetic. CELEBRATED.',
      hearingAids: 'Colorful devices on small dino ears.',
      autism: 'Headphones on dino head, fidget tools in dino claws.',
      haloDevice: 'Prehistoric protective helmet with stabilization (adapted to dino skull, NOT angel).'
    }
  },
  
  alien: {
    species: 'alien',
    anatomyBase: 'ALIEN ANATOMY (extraterrestrial being) - NOT human. This is ALIEN with non-human features: unusual skin colors (green/blue/purple/etc), large eyes, antennae, unusual proportions, alien head shape, non-human characteristics. Can be humanoid OR completely different body plan.',
    anthropomorphismLevel: 'Typically humanoid but distinctly alien - large heads, big eyes, unusual proportions, expressive through alien features',
    traitAdaptationPrinciple: 'ALL traits RECOGNIZABLE on alien anatomy. Down syndrome = almond-shaped ALIEN eyes (large with gentle slant), softer gentler alien features. Vitiligo = pattern on green/blue alien skin. Albinism = pale alien (light green/blue). Goal: "That alien has [trait] too!" even on extraterrestrial.',
    deviceAdaptationPrinciple: 'Devices TRANSFORM for sci-fi context. Wheelchair = space exploration pod with alien tech. Hover platform with antigravity. Prosthetic = advanced alien tech limb. Halo = advanced helmet with alien systems (NOT medical, NOT angel). VISIBLE + SCI-FI ELEVATED.',
    criticalAnatomyEmphasis: 'CRITICAL: This is ALIEN anatomy (extraterrestrial), NOT human child painted green/blue. Alien head shape, alien eyes, alien proportions, alien features. Non-human extraterrestrial being.',
    exampleAdaptations: {
      downSyndrome: 'Alien: Almond-shaped ALIEN eyes (large with gentle upward slant), softer gentler alien face. Even on green/blue alien, recognizably softer. "That alien has Down syndrome too!"',
      vitiligo: 'Alien: Pattern on green/blue skin - different hues creating patches. "Has vitiligo too!"',
      albinism: 'Alien: Pale green/blue skin, very light alien eyes - "has albinism too!"',
      burnScars: 'Alien: Textured areas on alien skin showing healed burn patterns.',
      wheelchair: 'Alien: Space exploration pod with alien tech glyphs. Hover platform with antigravity. TRANSFORMED for sci-fi.',
      prosthetic: 'Alien: Advanced tech limb with alien features. Glowing and enhanced. CELEBRATED as upgrade.',
      hearingAids: 'Alien: Visible audio receivers on alien head/antennae.',
      autism: 'Alien: Headphones adapted to alien head, sensory tools for alien physiology.',
      haloDevice: 'Alien: Advanced stabilization helmet with alien tech display (NOT medical, NOT angel).'
    }
  },
  
  superhero: {
    species: 'superhero',
    anatomyBase: 'SUPERHERO character - can have human anatomy OR fantasy anatomy depending on powers (specify). If human-based: Human proportions with super-suit and power effects. If fantasy-based: Fantasy creature with superpowers (dragon superhero, robot superhero, etc).',
    anthropomorphismLevel: 'Fully anthropomorphic - heroic, expressive, dynamic, powerful',
    traitAdaptationPrinciple: 'Traits apply based on underlying anatomy (human, dragon, robot, etc). Powers celebrated ALONGSIDE inclusivity traits (not despite them). Traits are PART of hero identity. DS features visible and heroic. Vitiligo celebrated as unique hero marking.',
    deviceAdaptationPrinciple: 'Devices TRANSFORM into SUPERHERO POWERS. Wheelchair = ROCKET-POWERED HERO VEHICLE for crime-fighting. Prosthetic = SUPER-POWERED limb shooting energy. Halo = POWER DETECTION HELMET with force fields. Devices ARE superpowers. CELEBRATED + EMPOWERED.',
    criticalAnatomyEmphasis: 'Superhero identity celebrated. Medical devices and inclusivity traits shown as PART of hero power and identity, not limitation. Hero WITH wheelchair IS powerful. Hero WITH prosthetic HAS superpowers through it.',
    exampleAdaptations: {
      downSyndrome: 'If human-based: DS features visible and celebrated as hero identity. If fantasy-based (dragon superhero): DS adapted to species (almond dragon eyes, gentler features) - recognizable.',
      vitiligo: 'Vitiligo pattern celebrated as unique hero marking - part of hero identity. "Hero has vitiligo too!"',
      albinism: 'Pale hero with light features - celebrated as distinctive hero appearance.',
      wheelchair: 'ROCKET-POWERED HERO VEHICLE. Cape flows around chair, emblems glow, boosters on back. Wheelchair IS crime-fighting mobile. NOT just chair - HERO POWER.',
      prosthetic: 'SUPER-POWERED prosthetic shooting energy blasts. Mechanical arm with power capabilities, leg with super speed. Prosthetic IS superpower.',
      hearingAids: 'Tech-enhanced hearing devices with super-hearing capabilities. PART of hero tech suite.',
      autism: 'Headphones are POWER EQUIPMENT for sensory enhancement. Fidget tools are FOCUS ENHANCERS.',
      haloDevice: 'POWER DETECTION HELMET with force field projection and stabilization. Glowing tech crown with energy (NOT medical brace, NEVER angel halo).'
    }
  },
  
  elemental: {
    species: 'elemental',
    anatomyBase: 'ELEMENTAL BEING made of element (fire/water/earth/air/ice/lightning/etc) - NOT human. Body composed entirely of elemental substance taking humanoid FORM. Fire: Body made of flames. Water: Body made of water/liquid. Earth: Body made of stone/plants. Air: Body made of wind/clouds.',
    anthropomorphismLevel: 'Humanoid form made entirely of element - can take shape, interact with solid objects through magical means, expressive through elemental movements',
    traitAdaptationPrinciple: 'ALL traits adapt to ELEMENTAL NATURE. Down syndrome = gentler softer elemental form (softer flames, gentler water flows). Vitiligo = different element hues/properties creating pattern. Burn scars on fire = cooled/healed flame areas (meta!). Goal: "That fire being has [trait] too!" through elemental expression.',
    deviceAdaptationPrinciple: 'Devices through CREATIVE MAGICAL ADAPTATION. Fire wheelchair = ENCHANTED FLOATING PLATFORM (fire cannot sit on solid). Water wheelchair = bubble vessel with wheels. Earth = living stone chair. Halo on fire = magical energy crown (NOT medical, NOT angel). IMAGINATIVE + VISIBLE.',
    criticalAnatomyEmphasis: 'CRITICAL: This is BEING MADE OF ELEMENT (fire/water/earth/air), NOT human painted element colors. Body IS the element - fire body made of flames, water body made of liquid, earth body made of stone. Element takes humanoid form.',
    exampleAdaptations: {
      downSyndrome: 'Fire: Gentler softer flame shapes, rounder fire form. Water: Softer flowing patterns. Earth: Rounder gentler stone form. "That elemental has DS too!" through form.',
      vitiligo: 'Fire: Different flame hues/temperatures creating beautiful pattern. Water: Different transparencies and colors. Earth: Different stone types forming patches. RECOGNIZABLE pattern.',
      albinism: 'Fire: Pale flames (white/blue fire). Water: Crystal clear transparent water. Earth: Pale white stones/quartz. "Has albinism too!"',
      burnScars: 'Fire: Cooled/healed flame areas showing patterns (meta and meaningful!). Water: Frozen/crystallized areas. Earth: Weathered stone texture.',
      wheelchair: 'Fire: ENCHANTED FLOATING PLATFORM made of magical light. Water: BUBBLE VESSEL with wheels. Earth: LIVING STONE WHEELCHAIR grown from nature. Air: CLOUD PLATFORM. IMAGINATIVE TRANSFORMATION.',
      prosthetic: 'Fire: Flame-formed mechanical limb. Water: Shaped water prosthetic. Earth: Living wood/stone prosthetic. MAGICAL + FUNCTIONAL.',
      hearingAids: 'Elemental manifestation of sound-sensing (visual interpretation - glowing sound receptors).',
      autism: 'Elemental processing patterns visible (fire intensity variations, water flow patterns showing sensory needs).',
      haloDevice: 'Fire: Magical flame crown with stabilization energy (NOT medical, NOT angel). Water: Crystal sphere helmet. MAGICAL TRANSFORMATION.'
    }
  }
};

/**
 * Get species profile with fallback to human
 */
export function getSpeciesProfile(species: string): SpeciesProfile {
  const normalized = species.toLowerCase().replace(/[_-]/g, '_');
  return SPECIES_PROFILES[normalized] || SPECIES_PROFILES['human'];
}

/**
 * Check if species needs anatomy prefix (all except human)
 */
export function needsAnatomyPrefix(species: string): boolean {
  return species.toLowerCase() !== 'human';
}
