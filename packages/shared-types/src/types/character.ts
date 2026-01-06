export type Species = 'human' | 'robot' | 'monster' | 'magical_creature' | 'elemental' | 'superhero' | 'animal';
export type InclusivityTraitType = 'autism' | 'wheelchair' | 'foster' | 'asthma' | 'down_syndrome' | 'gifted' | 'prosthetic' | 'other';

export interface Character {
  id: string;
  libraryId: string;
  name: string;
  traits: CharacterTraits;
  artPrompt?: string;
  appearanceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterTraits {
  name: string;
  age?: number;
  species: Species;
  race?: string[]; // For human-type species
  ethnicity?: string[]; // Multi-racial support
  gender?: string;
  inclusivityTraits?: InclusivityTrait[];
  appearance: CharacterAppearance;
  personality?: string[]; // Personality traits
  interests?: string[]; // Hobbies and interests
  strengths?: string[]; // Character strengths
  challenges?: string[]; // Character challenges
}

export interface InclusivityTrait {
  type: InclusivityTraitType;
  description: string;
  storyIntegration: string; // How this trait affects the story
}

export interface CharacterAppearance {
  eyeColor?: string;
  hairColor?: string;
  hairTexture?: string;
  clothing?: string;
  height?: string;
  weight?: string;
  accessories?: string[];
  scars?: string[];
  devices?: string[]; // Prosthetics, wheelchairs, etc.
}

export interface CharacterChanges {
  from: Partial<CharacterTraits>;
  to: Partial<CharacterTraits>;
  storyImpact: {
    textChanges: Record<string, string>;
    actionChanges: Record<string, string>;
    descriptionChanges: Record<string, string>;
  };
}