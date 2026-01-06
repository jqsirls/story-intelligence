/**
 * Inclusivity Traits Database
 * Comprehensive list for ALL kids to see themselves
 */

export interface InclusivityTrait {
  id: string;
  label: string;
  category: string;
  visualDescription: string;
  conversationalHints: string[];
  gptImageSafePrompt: string;
  celebratoryLanguage: string;
}

// Export comprehensive database
export const INCLUSIVITY_TRAITS: InclusivityTrait[] = [
  {
    id: 'wheelchair_manual',
    label: 'Manual Wheelchair User',
    category: 'mobility',
    visualDescription: 'Custom wheelchair, often decorated',
    conversationalHints: ['uses wheelchair', 'has wheels', 'rolls'],
    gptImageSafePrompt: 'Seated in custom wheelchair visible in frame, decorated with stickers, shown with confidence',
    celebratoryLanguage: 'magical racing chair'
  },
  {
    id: 'wheelchair_power',
    label: 'Power Wheelchair',
    category: 'mobility',
    visualDescription: 'Motorized chair with joystick',
    conversationalHints: ['electric chair', 'joystick'],
    gptImageSafePrompt: 'Motorized wheelchair with joystick control, showing independence',
    celebratoryLanguage: 'super-powered chair'
  },
  {
    id: 'adhd',
    label: 'ADHD',
    category: 'neurodiversity',
    visualDescription: 'High energy, fidget tools',
    conversationalHints: ['lots of energy', 'always moving'],
    gptImageSafePrompt: 'Energetic expression, holding fidget tool',
    celebratoryLanguage: 'lightning-fast ideas and super energy'
  },
  {
    id: 'autism',
    label: 'Autism Spectrum',
    category: 'neurodiversity',
    visualDescription: 'May wear headphones, structured routines',
    conversationalHints: ['likes patterns', 'wears headphones', 'deep interests'],
    gptImageSafePrompt: 'May wear noise-canceling headphones, focused expression',
    celebratoryLanguage: 'sees patterns others miss'
  },
  {
    id: 'vitiligo',
    label: 'Vitiligo',
    category: 'skin',
    visualDescription: 'Light patches creating patterns',
    conversationalHints: ['patches on skin', 'two-toned', 'cool patterns'],
    gptImageSafePrompt: 'Vitiligo creating beautiful light patches forming patterns, celebrated as unique feature',
    celebratoryLanguage: 'beautiful star-pattern skin'
  },
  {
    id: 'down_syndrome',
    label: 'Down Syndrome',
    category: 'neurodiversity',
    visualDescription: 'Almond eyes, rounded features',
    conversationalHints: ['has Down syndrome'],
    gptImageSafePrompt: 'Almond-shaped eyes slight upward slant, flatter nasal bridge, rounded soft features, portrayed with dignity',
    celebratoryLanguage: 'warm joyful spirit'
  },
  {
    id: 'prosthetic_leg',
    label: 'Prosthetic Leg',
    category: 'mobility',
    visualDescription: 'Blade or realistic prosthetic',
    conversationalHints: ['special leg', 'running blade'],
    gptImageSafePrompt: 'Prosthetic leg visible, celebrated feature',
    celebratoryLanguage: 'super-speed running blade'
  },
  {
    id: 'prosthetic_arm',
    label: 'Prosthetic Arm',
    category: 'mobility',
    visualDescription: 'Arm or hand prosthetic',
    conversationalHints: ['robot arm', 'special hand'],
    gptImageSafePrompt: 'Prosthetic arm/hand shown with pride',
    celebratoryLanguage: 'amazing robot arm'
  },
  {
    id: 'hearing_aids',
    label: 'Hearing Aids',
    category: 'sensory',
    visualDescription: 'Colorful ear devices',
    conversationalHints: ['ear helpers', 'hearing devices'],
    gptImageSafePrompt: 'Colorful hearing aids visible behind ears, cool tech accessory',
    celebratoryLanguage: 'super-hearing devices'
  },
  {
    id: 'glasses',
    label: 'Glasses',
    category: 'sensory',
    visualDescription: 'Eyeglasses',
    conversationalHints: ['wears glasses'],
    gptImageSafePrompt: 'Eyeglasses part of their look',
    celebratoryLanguage: 'cool glasses'
  }
];

export const ETHNICITY_OPTIONS = [
  'African', 'African American/Black', 'Afro-Caribbean',
  'Asian Indian', 'Chinese', 'Japanese', 'Korean', 'Filipino',
  'Mexican', 'Hispanic/Latino', 'White/Caucasian',
  'Multiracial/Mixed', 'Other'
];

export const SPECIES_OPTIONS = [
  'Human', 'Animal', 'Magical Creature', 'Dinosaur',
  'Alien', 'Robot', 'Unknown'
];

export const GENDER_OPTIONS = [
  'Male', 'Female', 'Non-Binary', 'Gender Fluid', 'Other', 'Prefer not to specify'
];
