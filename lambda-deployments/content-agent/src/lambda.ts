/**
 * Content Agent Lambda Handler
 * Full production implementation with GPT-5, ElevenLabs, GPT Image models, and Supabase
 */

import { RealContentAgent, RealContentAgentConfig } from './RealContentAgent';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { OpenAI } from 'openai';
import { getGlobalStyleHash, isGlobalStylePresent } from './constants/GlobalArtStyle';
import { isRatingAcceptable } from './constants/SafetyRatingCriteria'
import { parseFinalizationJobPayload, runFinalizationJob } from './workers/FinalizationWorker'
import QRCode from 'qrcode'
import { createHash, randomUUID } from 'crypto'
import { MODEL_CONFIG } from './config/models'
import { getDevelopmentalVisualProfile, resolveAgeBand, sanitizeAgePhrases, sanitizeChildWords } from './utils/childWording'
import {
  CANONICAL_DICTIONARIES,
  CANONICAL_SETS,
  isEmptyLike,
  resolveCanonicalAgeBucket,
  resolveCanonicalEthnicity,
  resolveCanonicalGender,
  resolveCanonicalInclusivityTrait,
  resolveCanonicalLanguage,
  resolveCanonicalPersonalityTrait,
  resolveCanonicalSpecies
} from '@alexa-multi-agent/shared-types'
import { sanitizeStylePhrases } from './utils/promptSanitizers'

// Global instance for Lambda warm starts
let contentAgent: RealContentAgent | null = null;

const SPECIES_KEYS = new Set(CANONICAL_DICTIONARIES.species.map(entry => entry.key))

function sanitizeText(input?: string): string | undefined {
  if (!input) return input
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  const unsafePatterns = [
    /\b(nude|nudity|naked|explicit|sexual|porn|lingerie|fetish)\b/gi,
    /\b(gore|blood|decap|dismember|maim|mutilat|corpse)\b/gi
  ]
  let sanitized = trimmed
  unsafePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, 'age-appropriate')
  })
  return sanitized
}

function normalizeFreeText(input?: string): string | undefined {
  if (!input) return input
  const sanitized = sanitizeText(input)
  if (!sanitized) return sanitized
  if (isEmptyLike(sanitized)) return undefined
  return sanitized
}

type SanitizeArrayOptions = {
  label?: string
  allowObject?: boolean
}

function summarizeCoercionInput(input: unknown): Record<string, unknown> {
  if (input === null) return { type: 'null' }
  if (input === undefined) return { type: 'undefined' }
  if (Array.isArray(input)) return { type: 'array', length: input.length }
  const valueType = typeof input
  if (typeof input === 'string') return { type: 'string', length: input.length }
  if (valueType === 'object') {
    const keys = Object.keys(input as Record<string, unknown>)
    return { type: 'object', keyCount: keys.length, keys: keys.slice(0, 5) }
  }
  return { type: valueType }
}

export function sanitizeArray(
  input: unknown,
  options: SanitizeArrayOptions = {}
): Array<string | Record<string, unknown>> {
  const label = options.label || 'unknown'
  const allowObject = options.allowObject === true

  if (input === null || input === undefined) return []

  if (Array.isArray(input)) {
    return input
      .map(value => {
        if (typeof value === 'string') return sanitizeText(value) || ''
        if (allowObject && value && typeof value === 'object') return value as Record<string, unknown>
        return ''
      })
      .filter(Boolean)
  }

  if (typeof input === 'string') {
    const sanitized = sanitizeText(input) || ''
    console.warn('[Content Agent] sanitizeArray coerced non-array input', {
      field: label,
      allowObject,
      summary: summarizeCoercionInput(input)
    })
    return sanitized ? [sanitized] : []
  }

  if (typeof input === 'object') {
    console.warn('[Content Agent] sanitizeArray coerced non-array input', {
      field: label,
      allowObject,
      summary: summarizeCoercionInput(input)
    })
    return allowObject ? [input as Record<string, unknown>] : []
  }

  console.warn('[Content Agent] sanitizeArray coerced non-array input', {
    field: label,
    allowObject,
    summary: summarizeCoercionInput(input)
  })
  return []
}

export function sanitizeStringArray(input: unknown, label: string): string[] {
  return sanitizeArray(input, { label, allowObject: false })
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

type TraitsShapeError = {
  code: string
  field: string
  expected: string
  actual: string
}

function validateCanonicalTraitsPayload(traits: unknown): TraitsShapeError | null {
  if (!traits || typeof traits !== 'object' || Array.isArray(traits)) {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits',
      expected: 'object',
      actual: Array.isArray(traits) ? 'array' : typeof traits
    }
  }
  const traitsObj = traits as Record<string, unknown>

  const ethnicity = traitsObj.ethnicity
  if (ethnicity !== undefined && !Array.isArray(ethnicity) && typeof ethnicity !== 'string') {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits.ethnicity',
      expected: 'array|string',
      actual: typeof ethnicity
    }
  }

  const personalityTraits = traitsObj.personalityTraits
  if (personalityTraits !== undefined && !Array.isArray(personalityTraits)) {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits.personalityTraits',
      expected: 'array',
      actual: typeof personalityTraits
    }
  }

  const inclusivityTraits = traitsObj.inclusivityTraits || traitsObj.inclusivity_traits
  if (inclusivityTraits !== undefined && !Array.isArray(inclusivityTraits)) {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits.inclusivityTraits',
      expected: 'array',
      actual: typeof inclusivityTraits
    }
  }

  const traitUserDescriptions = traitsObj.traitUserDescriptions || traitsObj.trait_user_descriptions
  if (traitUserDescriptions !== undefined && (typeof traitUserDescriptions !== 'object' || Array.isArray(traitUserDescriptions))) {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits.traitUserDescriptions',
      expected: 'object',
      actual: Array.isArray(traitUserDescriptions) ? 'array' : typeof traitUserDescriptions
    }
  }

  const characterSpokenLanguage = traitsObj.characterSpokenLanguage || traitsObj.character_spoken_language
  if (characterSpokenLanguage !== undefined && typeof characterSpokenLanguage !== 'string') {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits.characterSpokenLanguage',
      expected: 'string',
      actual: typeof characterSpokenLanguage
    }
  }

  const readerLanguage = traitsObj.readerLanguage || traitsObj.reader_language
  if (readerLanguage !== undefined && typeof readerLanguage !== 'string') {
    return {
      code: 'INVALID_TRAITS_SHAPE',
      field: 'traits.readerLanguage',
      expected: 'string',
      actual: typeof readerLanguage
    }
  }

  return null
}

const DEFAULT_AGE = 6
const DEFAULT_LANGUAGE = 'en-US'
const DEFAULT_PERSONALITY_TRAITS = ['kind']

const resolveAgeFromBucket = (bucket: string): number => {
  switch (bucket) {
    case '3_and_under':
      return 3
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
    case '10':
      return Number(bucket)
    case '10_plus':
      return 11
    default:
      return DEFAULT_AGE
  }
}

const normalizeCanonicalList = (
  values: string[],
  resolver: (value: string) => { value: string | null; isAlias: boolean }
): { resolved: string[]; invalid: string[] } => {
  const resolved: string[] = []
  const invalid: string[] = []
  values.forEach(value => {
    if (!value || isEmptyLike(value)) return
    const resolvedValue = resolver(value).value
    if (resolvedValue) {
      resolved.push(resolvedValue)
    } else {
      invalid.push(value)
    }
  })
  return { resolved: Array.from(new Set(resolved)), invalid }
}

const resolveCanonicalTraitId = (
  rawId: string,
  traitUserDescriptions: Record<string, string>
): string | null => {
  const resolved = resolveCanonicalInclusivityTrait(rawId)
  let normalizedId = resolved.value
  const normalizedToken = resolved.normalized || ''
  if (!normalizedId && normalizedToken) {
    const description = String(traitUserDescriptions?.[rawId] || '').toLowerCase()
    if (normalizedToken === 'prosthetic') {
      if (/(arm|hand)/.test(description)) normalizedId = 'prosthetic_arm'
      if (/(leg|foot)/.test(description)) normalizedId = 'prosthetic_leg'
    }
    if (normalizedToken === 'wheelchair') {
      normalizedId = /(power|electric)/.test(description) ? 'wheelchair_power' : 'wheelchair_manual'
    }
  }
  return normalizedId || null
}

const normalizeInclusivityTraits = (
  rawTraits: Array<string | Record<string, any>>,
  traitUserDescriptions: Record<string, string>
): {
  normalizedTraits: Array<string | Record<string, any>>
  normalizedDescriptions: Record<string, string>
  invalidTraits: string[]
} => {
  const normalizedTraits: Array<string | Record<string, any>> = []
  const invalidTraits: string[] = []
  const normalizedDescriptions: Record<string, string> = {}

  rawTraits.forEach((trait: any) => {
    const rawId = typeof trait === 'string'
      ? trait
      : (trait?.type || trait?.id || '')
    const normalizedId = resolveCanonicalTraitId(rawId, traitUserDescriptions)
    if (!normalizedId) {
      invalidTraits.push(rawId)
      return
    }
    if (typeof trait === 'string') {
      normalizedTraits.push(normalizedId)
    } else {
      normalizedTraits.push({ ...trait, type: normalizedId, id: normalizedId })
    }
    const description = traitUserDescriptions?.[rawId] || traitUserDescriptions?.[normalizedId]
    if (description && !isEmptyLike(description)) {
      normalizedDescriptions[normalizedId] = description
    }
  })

  return { normalizedTraits, normalizedDescriptions, invalidTraits }
}

const normalizeExplicitInput = (rawTraits: any) => {
  const rawPersonalityTraits = Array.isArray(rawTraits?.personalityTraits)
    ? rawTraits.personalityTraits
    : (Array.isArray(rawTraits?.personality) ? rawTraits.personality : (Array.isArray(rawTraits?.personality_traits) ? rawTraits.personality_traits : []))
  const rawPersonalityText = typeof rawTraits?.personality === 'string'
    ? rawTraits.personality
    : (typeof rawTraits?.personalityText === 'string' ? rawTraits.personalityText : '')

  const rawInput: ExplicitCharacterInput = {
    name: rawTraits?.name || '',
    age: rawTraits?.age ?? undefined,
    ageBucket: rawTraits?.ageBucket || rawTraits?.age_bucket,
    species: rawTraits?.species || '',
    gender: rawTraits?.gender,
    ethnicity: rawTraits?.ethnicity,
    personalityTraits: rawPersonalityTraits,
    personality: rawPersonalityText,
    appearance: rawTraits?.appearance,
    inclusivityTraits: rawTraits?.inclusivityTraits || rawTraits?.inclusivity_traits || [],
    traitUserDescriptions: rawTraits?.traitUserDescriptions || rawTraits?.trait_user_descriptions || {},
    characterSpokenLanguage: rawTraits?.characterSpokenLanguage || rawTraits?.character_spoken_language,
    readerLanguage: rawTraits?.readerLanguage || rawTraits?.reader_language
  }

  const explicitInput: ExplicitCharacterInput = {
    name: normalizeFreeText(rawInput.name) || '',
    age: Number.isFinite(Number(rawInput.age)) ? Number(rawInput.age) : undefined,
    ageBucket: normalizeFreeText(rawInput.ageBucket || undefined),
    species: normalizeFreeText(rawInput.species) || 'human',
    gender: normalizeFreeText(rawInput.gender),
    ethnicity: sanitizeStringArray(rawInput.ethnicity, 'traits.ethnicity'),
    personalityTraits: sanitizeStringArray(rawInput.personalityTraits || [], 'traits.personalityTraits'),
    personality: normalizeFreeText(rawInput.personality),
    appearance: normalizeFreeText(rawInput.appearance),
    inclusivityTraits: rawInput.inclusivityTraits || [],
    traitUserDescriptions: rawInput.traitUserDescriptions || {},
    characterSpokenLanguage: normalizeFreeText(rawInput.characterSpokenLanguage),
    readerLanguage: normalizeFreeText(rawInput.readerLanguage)
  }

  const resolvedSpecies = resolveCanonicalSpecies(explicitInput.species || '').value
  const speciesKey = resolvedSpecies || resolveSpeciesKey({
    species: explicitInput.species,
    appearance: explicitInput.appearance,
    aboutThem: explicitInput.personality
  })

  const resolvedGender = resolveCanonicalGender(explicitInput.gender || '').value
    || 'prefer-not-to-specify'

  const resolvedAgeBucket = explicitInput.ageBucket
    ? resolveCanonicalAgeBucket(explicitInput.ageBucket).value
    : null
  const resolvedAge = Number.isFinite(Number(explicitInput.age))
    ? Number(explicitInput.age)
    : (resolvedAgeBucket ? resolveAgeFromBucket(resolvedAgeBucket) : DEFAULT_AGE)
  const ageBucket = resolvedAgeBucket || resolveAgeBand(resolvedAge)

  const personalityResult = normalizeCanonicalList(
    explicitInput.personalityTraits || DEFAULT_PERSONALITY_TRAITS,
    resolveCanonicalPersonalityTrait
  )
  const personalityTraits = personalityResult.resolved.length > 0
    ? personalityResult.resolved
    : DEFAULT_PERSONALITY_TRAITS

  const ethnicityResult = normalizeCanonicalList(
    explicitInput.ethnicity || [],
    resolveCanonicalEthnicity
  )
  const ethnicityAllowed = speciesKey === 'human' || speciesKey === 'superhero'
  const ethnicity = ethnicityAllowed ? ethnicityResult.resolved : []

  const characterSpokenLanguage = resolveCanonicalLanguage(
    explicitInput.characterSpokenLanguage || DEFAULT_LANGUAGE
  ).value || DEFAULT_LANGUAGE
  const readerLanguage = resolveCanonicalLanguage(
    explicitInput.readerLanguage || DEFAULT_LANGUAGE
  ).value || DEFAULT_LANGUAGE

  const inclusivityResult = normalizeInclusivityTraits(
    Array.isArray(explicitInput.inclusivityTraits) ? explicitInput.inclusivityTraits as Array<string | Record<string, any>> : [],
    explicitInput.traitUserDescriptions || {}
  )

  const invalid = {
    personalityTraits: personalityResult.invalid,
    ethnicity: ethnicityResult.invalid,
    inclusivityTraits: inclusivityResult.invalidTraits
  }

  return {
    rawInput,
    explicitInput: {
      ...explicitInput,
      age: resolvedAge,
      ageBucket,
      species: explicitInput.species || 'human',
      gender: explicitInput.gender || resolvedGender,
      personalityTraits,
      ethnicity,
      characterSpokenLanguage,
      readerLanguage,
      inclusivityTraits: inclusivityResult.normalizedTraits,
      traitUserDescriptions: inclusivityResult.normalizedDescriptions
    },
    enums: {
      speciesKey,
      genderKey: resolvedGender,
      ageBucket,
      characterSpokenLanguage,
      readerLanguage,
      personalityTraits,
      ethnicity
    },
    normalizedTraits: inclusivityResult.normalizedTraits,
    normalizedTraitDescriptions: inclusivityResult.normalizedDescriptions,
    invalid
  }
}

function resolveSpeciesKey(input: {
  speciesKey?: string
  species?: string
  speciesDescriptor?: string
  aboutThem?: string
  appearance?: string
}): string {
  const raw = input.speciesKey || input.species || ''
  const resolved = resolveCanonicalSpecies(raw).value
  if (resolved && SPECIES_KEYS.has(resolved)) return resolved

  const descriptor = (input.speciesDescriptor || '').toLowerCase()
  if (descriptor.includes('human')) return 'human'
  if (descriptor.includes('robot')) return 'robot'
  if (descriptor.includes('super')) return 'superhero'
  if (descriptor.includes('alien')) return 'alien'
  if (descriptor.includes('dino')) return 'dinosaur'
  if (descriptor.includes('monster')) return 'monster'
  if (descriptor.includes('spooky') || descriptor.includes('ghost')) return 'spooky'
  if (descriptor.includes('magic') || descriptor.includes('fantasy')) return 'fantasy_being'
  if (descriptor.includes('element')) return 'elemental'
  if (descriptor.includes('animal')) return 'animal'

  const looksHuman = `${input.aboutThem || ''} ${input.appearance || ''}`.toLowerCase().includes('looks like a human')
  if (looksHuman) return 'human'

  return 'made_up'
}

function isHumanLikeInput(input: {
  speciesKey?: string
  speciesDescriptor?: string
  aboutThem?: string
  appearance?: string
}): boolean {
  const key = (input.speciesKey || '').toLowerCase()
  if (key === 'human' || key === 'superhero') return true
  const descriptor = (input.speciesDescriptor || '').toLowerCase()
  const about = (input.aboutThem || '').toLowerCase()
  const appearance = (input.appearance || '').toLowerCase()
  return descriptor.includes('human') || about.includes('looks like a human') || appearance.includes('looks like a human')
}

function computeWorldMaterialHint(
  speciesDescriptor?: string,
  appearance?: string,
  aboutThem?: string
): string {
  const text = `${speciesDescriptor || ''} ${appearance || ''} ${aboutThem || ''}`.toLowerCase()
  if (/(cloud|mist|fog|smoke|vapor)/.test(text)) return 'cloud/mist'
  if (/(water|ocean|sea|river|rain|ice|snow)/.test(text)) return 'water/ice'
  if (/(fire|flame|ember|lava|coal)/.test(text)) return 'fire/ember'
  if (/(foil|paper|wrapp|cardboard|origami)/.test(text)) return 'foil/paper'
  if (/(doodle|graphite|pencil|sketch|chalk)/.test(text)) return 'doodle/graphite'
  if (/(slime|goo|gel|ooze)/.test(text)) return 'slime/goo'
  if (/(candy|sugar|gum|chocolate|waffle|cookie|sprinkle)/.test(text)) return 'candy/sugar'
  if (/(stone|rock|boulder|clay|earth|mud|sand)/.test(text)) return 'stone/earth'
  if (/(wood|tree|bark|leaf|forest|vine|plant)/.test(text)) return 'wood/plant'
  if (/(metal|steel|iron|chrome|copper|bronze|robot|mechanical|circuit)/.test(text)) return 'metal/robotic'
  if (/(bone|skeletal|skull|fossil)/.test(text)) return 'bone'
  if (/(fabric|thread|cloth|yarn|knit|woven)/.test(text)) return 'fabric/thread'
  return 'soft, playful, abstract materials consistent with the creature.'
}

function computeWorldPhysicsHint(
  speciesDescriptor?: string,
  appearance?: string,
  aboutThem?: string
): string {
  const text = `${speciesDescriptor || ''} ${appearance || ''} ${aboutThem || ''}`.toLowerCase()
  if (/(floaty|floating|hover)/.test(text)) return 'floaty'
  if (/(puffy|fluffy)/.test(text)) return 'puffy'
  if (/(squishy|squish)/.test(text)) return 'squishy'
  if (/(bouncy|bounce)/.test(text)) return 'bouncy'
  if (/(stretchy|stretch)/.test(text)) return 'stretchy'
  if (/(crinkly|crinkle)/.test(text)) return 'crinkly'
  if (/(drippy|drip|melty)/.test(text)) return 'drippy'
  if (/(sparkly|sparkle|glitter)/.test(text)) return 'sparkly'
  if (/(sticky|gooey)/.test(text)) return 'sticky'
  if (/(wiggly|wiggle)/.test(text)) return 'wiggly'
  if (/(airy|air|misty)/.test(text)) return 'airy'
  if (/(heavy|weighted)/.test(text)) return 'heavy'
  if (/(rocky|stone|craggy)/.test(text)) return 'rocky'
  if (/(swirly|swirl)/.test(text)) return 'swirly'
  return 'playful, cartoon physics consistent with the creature'
}

function buildTraitsFromRow(row: any): Record<string, any> {
  const base = row?.traits?.explicit || row?.traits?.explicit_input || row?.traits?.explicitInput || row?.traits || {}
  const derived = row?.traits?.derived || {}
  const enums = row?.traits?.enums || {}
  const story = row?.traits?.story || row?.traits?.story_kernel || {}
  const age = row?.age_raw ?? base.age ?? derived.age ?? DEFAULT_AGE
  const speciesDescriptor = row?.speciesDescriptor
    || derived.speciesDescriptor
    || base.speciesDescriptor
    || row?.species
    || base.species
    || ''
  const appearance = row?.appearance || derived.appearance || base.appearance
  const aboutThem = row?.aboutThem || derived.aboutThem || base.aboutThem
  const traitsForPrompt = {
    name: row?.name || base.name || 'Character',
    age,
    ageSafeLanguage: row?.age_safe_language || buildAgeSafeLanguage(age || 7),
    species: row?.species || base.species || enums.speciesKey || 'made_up',
    speciesKey: row?.speciesKey || enums.speciesKey || resolveSpeciesKey({
      speciesKey: enums.speciesKey || base.speciesKey,
      species: row?.species || base.species || enums.speciesKey,
      speciesDescriptor,
      aboutThem,
      appearance
    }),
    speciesDescriptor,
    appearance,
    aboutThem,
    gender: row?.gender || base.gender || enums.genderKey,
    ethnicity: row?.ethnicity || base.ethnicity || enums.ethnicity || [],
    personality: row?.personality || base.personality || base.personalityTraits || enums.personalityTraits || [],
    personalityTraits: base.personalityTraits || enums.personalityTraits || [],
    personalityText: base.personality,
    characterSpokenLanguage: base.characterSpokenLanguage || enums.characterSpokenLanguage,
    readerLanguage: base.readerLanguage || enums.readerLanguage,
    worldMaterialHint: row?.worldMaterialHint || derived.worldMaterialHint || base.worldMaterialHint || computeWorldMaterialHint(speciesDescriptor, appearance, aboutThem),
    worldPhysicsHint: row?.worldPhysicsHint || derived.worldPhysicsHint || base.worldPhysicsHint || computeWorldPhysicsHint(speciesDescriptor, appearance, aboutThem),
    hairColor: row?.hairColor || derived.hairColor || base.hairColor,
    hairTexture: row?.hairTexture || derived.hairTexture || base.hairTexture,
    hairLength: row?.hairLength || derived.hairLength || base.hairLength,
    eyeColor: row?.eyeColor || derived.eyeColor || base.eyeColor,
    skinTone: row?.skinTone || derived.skinTone || base.skinTone,
    surfaceMaterial: row?.surfaceMaterial || derived.surfaceMaterial || base.surfaceMaterial,
    surfaceLogic: row?.surfaceLogic || derived.surfaceLogic || base.surfaceLogic,
    clothing: row?.clothing || derived.clothing || base.clothing,
    clothingColors: row?.clothingColors || derived.clothingColors || base.clothingColors,
    accessories: row?.accessories || derived.accessories || base.accessories,
    signatureColors: row?.signatureColors || derived.signatureColors || base.signatureColors,
    signatureProps: row?.signatureProps || derived.signatureProps || base.signatureProps,
    styleNotes: row?.styleNotes || derived.styleNotes || base.styleNotes,
    story
  }
  return traitsForPrompt
}

const USER_BANNERS = [
  'We’re refining a detail. Your character will refresh shortly.'
]

function pickUserBanner(seed: string): string {
  const hash = createHash('sha256').update(seed, 'utf8').digest('hex')
  const index = parseInt(hash.slice(0, 2), 16) % USER_BANNERS.length
  return USER_BANNERS[index]
}

const HEADSHOT_EDIT_CODES = new Set([
  'nonhuman_drift_human_default',
  'missing_traits',
  'traits_unconfirmed',
  'wheelchair_unconfirmed',
  'style_drift',
  'headshot_transparent_background'
])

const BODYSHOT_EDIT_CODES = new Set([
  'nonhuman_drift_human_default',
  'species_anatomy_unconfirmed',
  'elemental_embodiment_missing',
  'missing_traits',
  'wheelchair_not_present',
  'limb_difference_missing_not_present',
  'wheelchair_unconfirmed',
  'world_native_support_missing'
])

function shouldQueueEdit(assetType: 'headshot' | 'bodyshot', failureCodes: string[]): boolean {
  if (!Array.isArray(failureCodes) || failureCodes.length === 0) return false
  if (failureCodes.includes('safety')) return false
  const codeSet = assetType === 'headshot' ? HEADSHOT_EDIT_CODES : BODYSHOT_EDIT_CODES
  return failureCodes.some(code => codeSet.has(code))
}

function isSupportTraitId(traitId: string): boolean {
  return /wheelchair|hearing|halo|brace|orthotic|prosthetic|crutch|walker|cane/.test(traitId)
}

function isExplicitHumanSpecies(speciesKey: string, speciesDescriptor: string): boolean {
  const key = String(speciesKey || '').toLowerCase()
  const descriptor = String(speciesDescriptor || '').toLowerCase()
  if (key === 'human') return true
  // Assumption: superhero counts as human only when explicitly stated in species text.
  if (key === 'superhero') return /\bhuman\b/.test(descriptor)
  return false
}

function isLimbDifferenceTraitId(traitId: string): boolean {
  return /limb_difference|limb_length_discrepancy|amputation|missing/.test(traitId)
}

function isHardSupportTraitId(traitId: string): boolean {
  return /wheelchair|prosthetic|halo/.test(traitId)
}

function isHardIdentityTraitId(traitId: string): boolean {
  return isLimbDifferenceTraitId(traitId) || isHardSupportTraitId(traitId)
}

function summarizeValidation(review: any): Record<string, any> | null {
  if (!review) return null
  return {
    rating: review.rating,
    is_child_safe: review.is_child_safe,
    trait_visibility_pass: review.trait_visibility_pass ?? null,
    missing_traits: review.missing_traits || [],
    is_photorealistic: review.is_photorealistic ?? null,
    suggested_fix_prompt: review.suggested_fix_prompt || null,
    suggested_trait_fix: review.suggested_trait_fix || null,
    suggested_style_fix: review.suggested_style_fix || null,
    limbs: review.limbs || null,
    species_anatomy_confirmed: review.species_anatomy_confirmed ?? null,
    species_notes: review.species_notes || null,
    support_world_fit: review.support_world_fit || null,
    nonhuman_human_default: review.nonhuman_human_default ?? null,
    nonhuman_human_default_confidence: review.nonhuman_human_default_confidence ?? null,
    nonhuman_human_default_reason: review.nonhuman_human_default_reason ?? null
  }
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:image/')) {
    const base64Data = imageUrl.split(',')[1]
    if (!base64Data) throw new Error('Invalid base64 data URI')
    return Buffer.from(base64Data, 'base64')
  }
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function detectTransparentBackground(imageUrl: string): Promise<{ hasTransparency: boolean; ratio: number; sampleCount: number }> {
  try {
    const buffer = await fetchImageBuffer(imageUrl)
    const { default: Jimp } = await import('jimp')
    const image = await Jimp.read(buffer)
    const width = image.bitmap.width
    const height = image.bitmap.height
    const totalPixels = width * height
    const sampleSize = Math.min(2000, totalPixels)
    const step = Math.max(1, Math.floor(totalPixels / sampleSize))
    let transparentCount = 0
    let sampled = 0
    for (let i = 0; i < totalPixels; i += step) {
      const x = i % width
      const y = Math.floor(i / width)
      if (y >= height) break
      const pixelColor = image.getPixelColor(x, y)
      const rgba = Jimp.intToRGBA(pixelColor)
      if (rgba.a < 250) {
        transparentCount += 1
      }
      sampled += 1
    }
    const ratio = sampled > 0 ? transparentCount / sampled : 0
    return { hasTransparency: ratio >= 0.01, ratio, sampleCount: sampled }
  } catch (error: any) {
    console.warn('[Content Agent] Headshot alpha check failed', { error: error?.message || String(error) })
    return { hasTransparency: false, ratio: 0, sampleCount: 0 }
  }
}

function classifyReviewOutcome(
  review: any,
  inclusivityTraits: any[],
  options: {
    assetType?: 'headshot' | 'bodyshot'
    speciesKey?: string
    speciesDescriptor?: string
    isEditPass?: boolean
    strictMode?: boolean
    alphaDetected?: boolean
  } = {}
) {
  const failureCodes: string[] = []
  const missingTraits = Array.isArray(review?.missing_traits) ? review.missing_traits : []
  const traitLabelToId = new Map(inclusivityTraits.map((trait: any) => [trait.label, trait.id]))

  const assetType = options.assetType || 'bodyshot'
  const speciesKey = String(options.speciesKey || '').toLowerCase()
  const speciesDescriptor = String(options.speciesDescriptor || '').toLowerCase()
  const isExplicitHuman = isExplicitHumanSpecies(speciesKey, speciesDescriptor)
  const nonhumanDriftDetected = !isExplicitHuman && review?.nonhuman_human_default === true
  const isEditPass = options.isEditPass === true
  const strictNonhuman = options.strictMode === true
  const requiresLimbDifference = assetType === 'bodyshot'
    && inclusivityTraits.some((trait: any) => isLimbDifferenceTraitId(trait.id))
  const limbDifferenceConfirmed = review?.limbs?.limb_difference_confirmed
  const limbDifferenceUnconfirmed = requiresLimbDifference && limbDifferenceConfirmed !== true
  const requiresElementalEmbodiment = assetType === 'bodyshot'
    && (speciesKey === 'elemental' || speciesDescriptor.includes('elemental'))
  const requiresAlienAnatomy = assetType === 'bodyshot' && speciesKey === 'alien'
  const speciesAnatomyConfirmed = review?.species_anatomy_confirmed
  const elementalEmbodimentMissing = requiresElementalEmbodiment && speciesAnatomyConfirmed === false
  const elementalEmbodimentUnconfirmed = requiresElementalEmbodiment && speciesAnatomyConfirmed === null
  const alienAnatomyMissing = requiresAlienAnatomy && speciesAnatomyConfirmed === false
  const alienAnatomyUnconfirmed = requiresAlienAnatomy && speciesAnatomyConfirmed === null
  const speciesAnatomyUnconfirmed = assetType === 'bodyshot'
    && !isExplicitHuman
    && !requiresElementalEmbodiment
    && !requiresAlienAnatomy
    && speciesAnatomyConfirmed === null
  const supportWorldFitEntries = assetType === 'bodyshot' && Array.isArray(review?.support_world_fit)
    ? review.support_world_fit
    : []
  const supportWorldFitIssues = supportWorldFitEntries.length > 0
    ? supportWorldFitEntries.filter((entry: any) => entry?.world_fit === false)
    : []

  const MIN_CONFIDENCE_FOR_MISSING = 60
  const traitVisibility = Array.isArray(review?.traits_visible)
    ? new Map(review.traits_visible.map((entry: any) => [
      entry?.trait,
      {
        visible: typeof entry?.visible === 'boolean' ? entry.visible : null,
        confidence: typeof entry?.confidence === 'number' ? entry.confidence : 0
      }
    ]))
    : new Map()
  const missingTraitEntries = missingTraits.map((label: string) => {
    const visibility = traitVisibility.get(label) || { visible: null, confidence: 0 }
    return {
      label,
      visible: visibility.visible,
      confidence: visibility.confidence
    }
  })
  const confirmedMissingTraitIds = missingTraitEntries
    .filter(entry => entry.visible === false && entry.confidence >= MIN_CONFIDENCE_FOR_MISSING)
    .map(entry => traitLabelToId.get(entry.label) || entry.label)
  const unconfirmedMissingTraitIds = missingTraitEntries
    .filter(entry => entry.visible === null || (entry.visible === false && entry.confidence < MIN_CONFIDENCE_FOR_MISSING))
    .map(entry => traitLabelToId.get(entry.label) || entry.label)
  const isWheelchairTraitId = (traitId: string) => /wheelchair/.test(traitId)
  const wheelchairTraitLabel = inclusivityTraits.find((trait: any) => isWheelchairTraitId(trait.id))?.label
  const wheelchairVisibility = wheelchairTraitLabel ? traitVisibility.get(wheelchairTraitLabel) : undefined
  const wheelchairMissing = assetType === 'bodyshot'
    && !!wheelchairTraitLabel
    && wheelchairVisibility?.visible === false
    && (wheelchairVisibility?.confidence || 0) >= MIN_CONFIDENCE_FOR_MISSING
  const wheelchairMissingByTrait = assetType === 'bodyshot'
    && confirmedMissingTraitIds.some(id => /wheelchair/.test(String(id)))
  const wheelchairSupportPresent = assetType === 'bodyshot'
    && supportWorldFitEntries.some((entry: any) => /wheelchair/i.test(String(entry?.trait || '')))

  const safetyFail = review && (!review.is_child_safe || !isRatingAcceptable(review.rating, 'G'))
  const styleFail = review?.is_photorealistic === true
  const traitFail = confirmedMissingTraitIds.length > 0
  const traitUnconfirmed = unconfirmedMissingTraitIds.length > 0 || review?.trait_visibility_pass === null
  const alphaDetected = options.alphaDetected === true && assetType === 'headshot'

  let status: 'pass' | 'soft_fail' | 'hard_fail' = 'pass'
  const applyNonhumanStatus = (code: string) => {
    if (strictNonhuman) {
      status = 'hard_fail'
    } else if (status === 'pass') {
      status = 'soft_fail'
    }
    failureCodes.push(code)
  }
  if (safetyFail) {
    status = 'hard_fail'
    failureCodes.push('safety')
  }
  if (alphaDetected) {
    status = 'hard_fail'
    failureCodes.push('headshot_transparent_background')
  }
  if (limbDifferenceUnconfirmed) {
    status = 'hard_fail'
    failureCodes.push('limb_difference_missing_not_present')
  }
  if (elementalEmbodimentMissing) {
    applyNonhumanStatus('elemental_embodiment_missing')
  }
  if (elementalEmbodimentUnconfirmed) {
    applyNonhumanStatus('elemental_embodiment_unconfirmed')
  }
  if (alienAnatomyMissing) {
    applyNonhumanStatus('alien_nonhuman_cues_missing')
  }
  if (alienAnatomyUnconfirmed) {
    applyNonhumanStatus('alien_nonhuman_cues_unconfirmed')
  }
  if (speciesAnatomyUnconfirmed && status === 'pass') {
    applyNonhumanStatus('species_anatomy_unconfirmed')
  }
  if (wheelchairMissing) {
    status = 'hard_fail'
    failureCodes.push('wheelchair_not_present')
  }
  if (!wheelchairMissing && wheelchairMissingByTrait) {
    status = 'hard_fail'
    failureCodes.push('wheelchair_not_present')
  }
  if (nonhumanDriftDetected) {
    const driftCode = isEditPass
      ? 'nonhuman_drift_human_default_terminal'
      : 'nonhuman_drift_human_default'
    applyNonhumanStatus(driftCode)
  }
  if (traitFail) {
    const hardTraitMissing = confirmedMissingTraitIds.some(id => isHardIdentityTraitId(id))
    if (hardTraitMissing && status !== 'hard_fail') status = 'hard_fail'
    if (!hardTraitMissing && status === 'pass') status = 'soft_fail'
    failureCodes.push('missing_traits')
  } else if (traitUnconfirmed && status === 'pass') {
    status = 'soft_fail'
    failureCodes.push('traits_unconfirmed')
  }
  if (supportWorldFitIssues.length > 0 && status === 'pass') {
    status = 'soft_fail'
    failureCodes.push('world_native_support_missing')
  }
  if (assetType === 'bodyshot' && !wheelchairMissing && wheelchairVisibility?.visible === null && status === 'pass' && wheelchairTraitLabel && !wheelchairSupportPresent) {
    status = 'soft_fail'
    failureCodes.push('wheelchair_unconfirmed')
  }
  if (styleFail && status === 'pass') {
    status = 'soft_fail'
    failureCodes.push('style_drift')
  }

  const failureReasonParts: string[] = []
  if (safetyFail) failureReasonParts.push('Safety review failed')
  if (limbDifferenceUnconfirmed) failureReasonParts.push('Limb difference not confirmed')
  if (elementalEmbodimentMissing) failureReasonParts.push('Elemental embodiment missing')
  if (elementalEmbodimentUnconfirmed) failureReasonParts.push('Elemental embodiment not confirmed')
  if (alienAnatomyMissing) failureReasonParts.push('Alien nonhuman cues missing')
  if (alienAnatomyUnconfirmed) failureReasonParts.push('Alien nonhuman cues not confirmed')
  if (speciesAnatomyUnconfirmed) failureReasonParts.push('Species anatomy not confirmed')
  if (wheelchairMissing) failureReasonParts.push('Wheelchair not present')
  if (nonhumanDriftDetected) {
    failureReasonParts.push(isEditPass ? 'Nonhuman drift persisted after edit' : 'Nonhuman drift detected')
  }
  if (confirmedMissingTraitIds.length > 0) {
    failureReasonParts.push(`Missing traits: ${confirmedMissingTraitIds.join(', ')}`)
  } else if (unconfirmedMissingTraitIds.length > 0) {
    failureReasonParts.push(`Traits not confirmed: ${unconfirmedMissingTraitIds.join(', ')}`)
  }
  if (alphaDetected) failureReasonParts.push('Headshot background transparent')
  if (supportWorldFitIssues.length > 0) {
    const supportLabels = supportWorldFitIssues.map((entry: any) => entry?.trait).filter(Boolean)
    failureReasonParts.push(`World-native support mismatch: ${supportLabels.join(', ')}`)
  }
  if (styleFail) failureReasonParts.push('Style drift detected')

  return {
    status,
    failureCodes,
    failureReason: failureReasonParts.join(' | ') || null,
    missingTraitIds: confirmedMissingTraitIds
  }
}

async function getNextAttemptIndex(supabase: any, characterId: string, assetType: string): Promise<number> {
  const { data, error } = await supabase
    .from('character_image_attempts')
    .select('attempt_index')
    .eq('character_id', characterId)
    .eq('asset_type', assetType)
    .order('attempt_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return 1
  }
  const lastIndex = data?.attempt_index || 0
  return lastIndex + 1
}

function buildAttemptTraceKey(input: {
  characterId: string
  assetType: 'headshot' | 'bodyshot'
  attemptIndex: number
  requestId?: string | null
  timestamp?: number
}): string {
  const timestamp = input.timestamp || Date.now()
  const requestSuffix = input.requestId
    ? String(input.requestId).replace(/[^a-zA-Z0-9_-]/g, '')
    : 'request'
  return `characters/${input.characterId}/trace/${timestamp}-${input.assetType}-attempt-${input.attemptIndex}-${requestSuffix}.json`
}

async function fetchGenerationTask(supabase: any, taskId?: string | null): Promise<any | null> {
  if (!taskId) return null
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

async function updateGenerationTask(
  supabase: any,
  taskId: string | null | undefined,
  updates: Record<string, any>
): Promise<void> {
  if (!taskId) return
  try {
    await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
  } catch (error) {
    console.warn('[Content Agent] Failed to update generation task', {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

async function createImageAttempt(
  supabase: any,
  payload: {
    characterId: string
    assetType: 'headshot' | 'bodyshot'
    status: 'pass' | 'soft_fail' | 'hard_fail'
    attemptIndex?: number
    imageUrl?: string | null
    failImageUrl?: string | null
    prompt?: string | null
    promptHash?: string | null
    traceUrl?: string | null
    failureCodes?: string[]
    failureReason?: string | null
    modelUsed?: string | null
    fixOfAttemptId?: string | null
    openaiRequestId?: string | null
    validationSummary?: Record<string, any> | null
    visibility?: 'internal_only' | 'user_visible'
  }
): Promise<{ id: string; attempt_index: number } | null> {
  try {
    const attemptIndex = payload.attemptIndex
      ? payload.attemptIndex
      : await getNextAttemptIndex(supabase, payload.characterId, payload.assetType)
    const { data, error } = await supabase
      .from('character_image_attempts')
      .insert({
        character_id: payload.characterId,
        asset_type: payload.assetType,
        attempt_index: attemptIndex,
        status: payload.status,
        image_url: payload.imageUrl || null,
        fail_image_url: payload.failImageUrl || null,
        prompt: payload.prompt || null,
        prompt_hash: payload.promptHash || null,
        trace_url: payload.traceUrl || null,
        failure_codes: payload.failureCodes || [],
        failure_reason: payload.failureReason || null,
        model_used: payload.modelUsed || null,
        fix_of_attempt_id: payload.fixOfAttemptId || null,
        openai_request_id: payload.openaiRequestId || null,
        validation_summary: payload.validationSummary || null,
        visibility: payload.visibility || 'internal_only'
      })
      .select('id, attempt_index')
      .single()

    if (error) {
      console.error('[Content Agent] Failed to create image attempt', { error, characterId: payload.characterId })
      return null
    }
    return data
  } catch (error: any) {
    console.error('[Content Agent] Failed to create image attempt', { error: error?.message || String(error), characterId: payload.characterId })
    return null
  }
}

async function queueEditFix(payload: Record<string, any>): Promise<void> {
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME
  if (!functionName) return
  try {
    const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' })
    await lambda.send(new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify(payload))
    }))
  } catch (error: any) {
    console.warn('[Content Agent] Failed to queue edit fix', { error: error?.message || String(error) })
  }
}

async function uploadImageToS3Global(imageUrl: string, key: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const { getCdnUrl } = await import('./utils/cdnUrl')
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
  const bucketName = process.env.ASSET_BUCKET || process.env.S3_BUCKET_NAME || 'storytailor-assets-production'

  let imageBuffer: Buffer
  if (imageUrl.startsWith('data:image/')) {
    const base64Data = imageUrl.split(',')[1]
    if (!base64Data) {
      throw new Error('Invalid base64 data URI')
    }
    imageBuffer = Buffer.from(base64Data, 'base64')
  } else {
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }
    imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
  }

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000'
  }))

  return getCdnUrl(key)
}

async function uploadJsonToS3Global(payload: any, key: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const { getCdnUrl } = await import('./utils/cdnUrl')
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
  const bucketName = process.env.ASSET_BUCKET || process.env.S3_BUCKET_NAME || 'storytailor-assets-production'

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: Buffer.from(JSON.stringify(payload, null, 2)),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=31536000'
  }))

  return getCdnUrl(key)
}

function buildAgeSafeLanguage(age: number): string {
  const profile = getDevelopmentalVisualProfile(age)
  return sanitizeAgePhrases(profile, profile)
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex')
}

function resolveHexColor(colorName: string | undefined, fallback: string): string {
  if (!colorName) return fallback
  const trimmed = colorName.trim()
  if (trimmed.startsWith('#') && trimmed.length >= 4) return trimmed
  const map: Record<string, string> = {
    black: '#1A1A1A',
    white: '#F5F5F5',
    brown: '#8B4513',
    blonde: '#E0C27A',
    blond: '#E0C27A',
    red: '#B03030',
    orange: '#D17A22',
    yellow: '#D4B43C',
    green: '#3A7D44',
    blue: '#3A5FCD',
    purple: '#6A4FB3',
    pink: '#D16BA5',
    gray: '#7A7A7A',
    grey: '#7A7A7A'
  }
  const normalized = trimmed.toLowerCase()
  return map[normalized] || fallback
}

type ExplicitCharacterInput = {
  name: string
  age?: number
  ageBucket?: string
  species?: string
  gender?: string
  ethnicity?: string[]
  personalityTraits?: string[]
  personality?: string
  appearance?: string
  inclusivityTraits?: Array<string | Record<string, any>>
  traitUserDescriptions?: Record<string, string>
  characterSpokenLanguage?: string
  readerLanguage?: string
}

type StoryKernel = {
  back_story: string
  origin?: string | null
  story_constants: {
    core_desire: string
    core_fear: string
    key_relationships?: string[]
    signature_object: string
    recurring_setting: string
    motif_words?: string[]
    scene_seed: string
  }
  tone_notes?: string | null
  guardrails: {
    no_violence: string
    no_medicalized_language: string
    no_adult_themes: string
  }
}

type DerivedEnrichment = {
  hairColor?: string
  hairTexture?: string
  hairLength?: string
  eyeColor?: string
  skinTone?: string
  surfaceMaterial?: string
  surfaceLogic?: string
  clothing?: string
  clothingColors?: string[]
  accessories?: string[]
  signatureColors?: string[]
  signatureProps?: string[]
  styleNotes?: string
  worldMaterialHint?: string
  worldPhysicsHint?: string
  values?: string[]
  strengths?: string[]
  fears?: string[]
  joyTriggers?: string[]
  comfortSignals?: string[]
  catchphrase?: string
  aboutThem?: string
  speciesDescriptor?: string
  appearanceSummary?: string
}

async function generateStoryKernel(
  openai: OpenAI,
  explicit: ExplicitCharacterInput,
  enums: {
    speciesKey: string
    genderKey: string | null
    ageBucket: string
    characterSpokenLanguage: string
    readerLanguage: string
  },
  ageSafeLanguage: string,
  worldMaterialHint: string
): Promise<StoryKernel> {
  const systemPrompt = [
    'You are a story kernel generator for children.',
    'Return ONLY JSON with the exact keys requested.',
    'Never overwrite explicit user inputs; you are filling story context around them.',
    'Backstory must be short, vivid, child-safe, and award-caliber.',
    'Avoid medical/diagnostic language, adult themes, or violence.'
  ].join(' ')

  const userPrompt = [
    'Explicit user input (do not overwrite):',
    JSON.stringify(explicit, null, 2),
    '',
    'Resolved enums (do not override):',
    JSON.stringify(enums, null, 2),
    '',
    'Rules:',
    '- Use a 3-act micro-arc in back_story (setup, challenge, growth).',
    '- Build story_constants that are stable anchors for visuals and behavior.',
    '- Use scene_seed as ONE sentence describing a cinematic background moment.',
    '- Keep tone warm, hopeful, imaginative, and child-safe.',
    `- Developmental visual profile: ${ageSafeLanguage}`,
    `- World material hint: ${worldMaterialHint}`,
    '',
    'Return JSON with keys:',
    '{"back_story":string,"origin":string|null,"story_constants":{"core_desire":string,"core_fear":string,"key_relationships":string[]|null,"signature_object":string,"recurring_setting":string,"motif_words":string[]|null,"scene_seed":string},"tone_notes":string|null,"guardrails":{"no_violence":string,"no_medicalized_language":string,"no_adult_themes":string}}'
  ].join('\n')

  const response = await openai.chat.completions.create({
    model: MODEL_CONFIG.TEXT,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5
  })

  const content = response.choices[0]?.message?.content || '{}'
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse story kernel JSON: ${error}`)
  }
}

async function deriveCharacterEnrichment(
  openai: OpenAI,
  explicit: ExplicitCharacterInput,
  enums: {
    speciesKey: string
    genderKey: string | null
    ageBucket: string
    characterSpokenLanguage: string
    readerLanguage: string
  },
  storyKernel: StoryKernel,
  ageSafeLanguage: string
): Promise<DerivedEnrichment> {
  const systemPrompt = [
    'You are a character derivation engine for children.',
    'Return ONLY JSON with the exact keys requested.',
    'Never overwrite explicit user inputs; only fill missing fields.',
    'Use the story kernel to drive world, style, and props.',
    'Avoid medical/diagnostic language; keep visuals respectful and story-native.'
  ].join(' ')

  const userPrompt = [
    'Explicit user input (do not overwrite):',
    JSON.stringify(explicit, null, 2),
    '',
    'Resolved enums (do not override):',
    JSON.stringify(enums, null, 2),
    '',
    'Story kernel (source of truth for world vibe):',
    JSON.stringify(storyKernel, null, 2),
    '',
    'Rules:',
    '- Fill ONLY missing fields. If explicit input exists for a field, return null for that field.',
    '- World and style cues should match the story kernel.',
    '- Keep materials and physics consistent with species.',
    `- Developmental visual profile: ${ageSafeLanguage}`,
    '',
    'Return JSON with keys:',
    '{"hairColor":string|null,"hairTexture":string|null,"hairLength":string|null,"eyeColor":string|null,"skinTone":string|null,"surfaceMaterial":string|null,"surfaceLogic":string|null,"clothing":string|null,"clothingColors":string[]|null,"accessories":string[]|null,"signatureColors":string[]|null,"signatureProps":string[]|null,"styleNotes":string|null,"worldMaterialHint":string|null,"worldPhysicsHint":string|null,"values":string[]|null,"strengths":string[]|null,"fears":string[]|null,"joyTriggers":string[]|null,"comfortSignals":string[]|null,"catchphrase":string|null,"aboutThem":string|null,"speciesDescriptor":string|null,"appearanceSummary":string|null}'
  ].join('\n')

  const response = await openai.chat.completions.create({
    model: MODEL_CONFIG.TEXT,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5
  })

  const content = response.choices[0]?.message?.content || '{}'
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse derived enrichment JSON: ${error}`)
  }
}

// Helper to get SSM parameter
async function getSsmParam(name: string, decrypt: boolean = false): Promise<string | null> {
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
    const client = new SSMClient({ region: 'us-east-1' }); // Fixed: use us-east-1 for SSM
    const result = await client.send(new GetParameterCommand({
      Name: name,
      WithDecryption: decrypt
    }));
    return result.Parameter?.Value || null;
  } catch (error) {
    console.warn(`Failed to get SSM parameter ${name}:`, error);
    return null;
  }
}

async function getFirstSsmParam(
  names: string[],
  decrypt: boolean
): Promise<string | null> {
  for (const name of names) {
    const value = await getSsmParam(name, decrypt)
    if (value) return value
  }
  return null
}

// Initialize content agent
async function getContentAgent(): Promise<RealContentAgent> {
  if (contentAgent) return contentAgent;

  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || ''
  const inferredStage =
    functionName.includes('production') ? 'production' :
    functionName.includes('staging') ? 'staging' :
    (process.env.NODE_ENV === 'production' ? 'production' : 'staging')
  const stage = process.env.STAGE || inferredStage
  const prefix = `/storytailor-${stage}`

  // Get API keys from SSM or environment
  const openaiKey = process.env.OPENAI_API_KEY || await getFirstSsmParam([
    `${prefix}/openai/api-key`,
    `${prefix}/openai-api-key`,
    `${prefix}/openai/api_key`,
  ], true)

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY || await getFirstSsmParam([
    `${prefix}/tts/elevenlabs/api-key`,
    `${prefix}/elevenlabs/api-key`,
    `${prefix}/elevenlabs-api-key`,
  ], true)

  const supabaseUrl = process.env.SUPABASE_URL || await getFirstSsmParam([
    `${prefix}/supabase/url`,
    `${prefix}/supabase-url`,
  ], false)
  // Use service role key to bypass RLS for Lambda functions
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    await getFirstSsmParam([`${prefix}/supabase/service-key`, `${prefix}/supabase-service-key`], true) ||
    process.env.SUPABASE_ANON_KEY ||
    await getFirstSsmParam([`${prefix}/supabase/anon-key`, `${prefix}/supabase-anon-key`], true)

  // Propagate loaded secrets into env for other helpers that read process.env directly
  if (openaiKey) process.env.OPENAI_API_KEY = openaiKey
  if (elevenLabsKey) process.env.ELEVENLABS_API_KEY = elevenLabsKey
  if (supabaseUrl) process.env.SUPABASE_URL = supabaseUrl
  if (supabaseKey) {
    // In Lambda we prefer using service-role style access for persistence
    process.env.SUPABASE_SERVICE_KEY = supabaseKey
    if (!process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = supabaseKey
  }

  // Finalization queue configuration (optional unless ASSET_FINALIZATION_ENABLED=true)
  const finalizationQueueUrl =
    process.env.ASSET_FINALIZATION_QUEUE_URL ||
    process.env.FINALIZATION_QUEUE_URL ||
    await getFirstSsmParam(
      [
        `${prefix}/finalization/queue-url`,
        `${prefix}/finalization-queue-url`,
        `${prefix}/assets/finalization-queue-url`,
      ],
      false
    )
  if (finalizationQueueUrl) {
    process.env.ASSET_FINALIZATION_QUEUE_URL = finalizationQueueUrl
  }

  const assetFinalizationEnabled =
    process.env.ASSET_FINALIZATION_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/asset-finalization/enabled`,
        `${prefix}/asset_finalization_enabled`,
        `${prefix}/ASSET_FINALIZATION_ENABLED`,
      ],
      false
    )
  if (assetFinalizationEnabled) {
    process.env.ASSET_FINALIZATION_ENABLED = assetFinalizationEnabled
  }

  const artFinalizationEnabled =
    process.env.ART_FINALIZATION_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/art/finalization-enabled`,
        `${prefix}/art-finalization-enabled`,
        `${prefix}/ART_FINALIZATION_ENABLED`,
      ],
      false
    )
  if (artFinalizationEnabled) {
    process.env.ART_FINALIZATION_ENABLED = artFinalizationEnabled
  }

  const audioAsyncEnabled =
    process.env.AUDIO_ASYNC_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/audio/async-enabled`,
        `${prefix}/audio-async-enabled`,
        `${prefix}/AUDIO_ASYNC_ENABLED`,
      ],
      false
    )
  if (audioAsyncEnabled) {
    process.env.AUDIO_ASYNC_ENABLED = audioAsyncEnabled
  }

  const audioChunkingEnabled =
    process.env.AUDIO_CHUNKING_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/audio/chunking-enabled`,
        `${prefix}/audio-chunking-enabled`,
        `${prefix}/AUDIO_CHUNKING_ENABLED`,
      ],
      false
    )
  if (audioChunkingEnabled) {
    process.env.AUDIO_CHUNKING_ENABLED = audioChunkingEnabled
  }

  const longformNarrationProvider =
    process.env.LONGFORM_NARRATION_PROVIDER ||
    process.env.NARRATION_PROVIDER ||
    await getFirstSsmParam(
      [
        `${prefix}/audio/longform-narration-provider`,
        `${prefix}/audio/longform_narration_provider`,
        `${prefix}/LONGFORM_NARRATION_PROVIDER`,
      ],
      false
    )
  if (longformNarrationProvider) {
    process.env.LONGFORM_NARRATION_PROVIDER = longformNarrationProvider
  }

  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured, stories will not be persisted');
  }

  const config: RealContentAgentConfig = {
    openai: {
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL_STORY || process.env.OPENAI_MODEL || 'gpt-5.2'
    },
    elevenlabs: {
      apiKey: elevenLabsKey || 'placeholder',
      defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
    },
    supabase: {
      url: supabaseUrl || 'https://placeholder.supabase.co',
      anonKey: supabaseKey || 'placeholder'
    },
    s3: {
      bucketName: process.env.S3_BUCKET || 'storytailor-audio',
      region: 'us-east-1' // Fixed: bucket is in us-east-1, not us-east-2
    }
  };

  contentAgent = new RealContentAgent(config);
  await contentAgent.initialize();
  
  console.log('[Content Agent] Initialized with real GPT-5, ElevenLabs, GPT Image models, and Supabase');
  return contentAgent;
}

export const handler = async (event: any): Promise<any> => {
  console.log('[Content Agent] Invoked', { hasBody: !!event.body, rawPath: event.rawPath, hasJobId: !!event.jobId });

  try {
    // Handle SQS-triggered finalization jobs
    if (Array.isArray(event?.Records) && event.Records[0]?.eventSource === 'aws:sqs') {
      return await handleFinalizationQueueEvent(event)
    }

    // Handle async job invocation (from AsyncJobManager)
    // IMPORTANT: Asset Worker also sends a `jobId` field for asset_generation_jobs.
    // Only treat as AsyncJobManager invocation when no explicit action is provided.
    if (event.jobId && !event.action && !event.body) {
      return await handleAsyncJob(event);
    }

    // Handle Function URL (HTTP) vs direct invocation
    let body: any = event;
    if (event.body) {
      // Function URL HTTP request
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    // Support both direct format {action, data} AND Router format {intent, context, memoryState}
    // Map Router intent types to actions (Router sends various intents to content agent)
    const intentToAction: Record<string, string> = {
      'create_story': 'generate_story',
      'continue_story': 'generate_story',
      'edit_story': 'generate_story',
      'finish_story': 'generate_story',      // Finish/complete story
      'greeting': 'generate_story',          // User says hi → Start story
      'help': 'generate_story',              // User asks for help → Offer story
      'goodbye': 'generate_story',           // Goodbye → Wrap up
      'unknown': 'generate_story',           // Fallback → Try story
      'create_character': 'create_character',
      'edit_character': 'edit_character',
      'confirm_character': 'create_character'
    };
    
    const action = body.action || intentToAction[body.intent?.type] || null;
    const data = body.data || body;

    // Health check
    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'content',
          success: true,
          data: {
            status: 'healthy',
            service: 'content-agent',
            features: {
              gpt5: !!process.env.OPENAI_API_KEY,
              elevenlabs: !!process.env.ELEVENLABS_API_KEY,
              supabase: !!process.env.SUPABASE_URL
            }
          }
        })
      };
    }

    // Generate story using real AI
    if (action === 'generate_story' || body.intent?.type === 'create_story') {
      // Extract request parameters
      const userId = body.userId || body.memoryState?.userId || 'anonymous';
      const creatorUserId = body.creatorUserId || body.userId || data.userId || userId;  // CRITICAL: Track creator for quota attribution
      
      // Get or initialize content agent (also hydrates env from SSM for production where env vars may be unset)
      const agent = await getContentAgent();

      // Check tier and usage limits
      const { TierQualityService } = await import('./services/TierQualityService');
      const tierService = new TierQualityService(
        process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );
      
      const tierCheck = await tierService.checkAndGetQuality(userId).catch(() => ({
        allowed: true,
        quality: { gptModel: 'gpt-5', imageCount: 5, audioProvider: 'elevenlabs' as const },
        tierInfo: { tier: 'individual', storyLimit: -1, storiesUsed: 0, canCreate: true, hasCredits: false, credits: 0 }
      }));
      
      if (!tierCheck.allowed) {
        const message = 'message' in tierCheck ? tierCheck.message : 'Story limit reached';
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: message,
            data: {
              tier: tierCheck.tierInfo.tier,
              storiesUsed: tierCheck.tierInfo.storiesUsed,
              storyLimit: tierCheck.tierInfo.storyLimit,
              upgradeOptions: ['individual', 'story_pack_5']
            }
          })
        };
      }
      const sessionId = body.sessionId || body.memoryState?.sessionId || data.sessionId || `session_${Date.now()}`;
      const characterName = data.character?.name || data.characterName || 'our hero';
      const storyType = data.storyType || body.intent?.details?.storyType || 'adventure';
      const userAge = data.userAge || body.memoryState?.context?.age || 7;
      
      // Extract conversation phase and story ID from request (check both body and data)
      const conversationPhase =
        data.conversationPhase ||
        body.conversationPhase ||
        body.context?.conversationPhase ||
        body.memoryState?.conversationPhase ||
        (body.intent?.type === 'finish_story' ? 'finalize' : undefined)
      const storyId = data.storyId || body.storyId || body.context?.storyId || body.memoryState?.currentStoryId;
      const beatNumber = data.beatNumber || body.beatNumber || body.context?.beatNumber;

      console.log('[Content Agent] Generating story with real AI', {
        userId,
        sessionId,
        characterName,
        storyType,
        userAge,
        conversationPhase,
        storyId,
        hasStoryId: !!storyId
      });

      // Override model based on tier
      if (tierCheck.quality.gptModel !== 'gpt-5') {
        process.env.OPENAI_MODEL = tierCheck.quality.gptModel;
      }

      // Extract REST API parameters (if provided)
      const characterId = body.characterId || data.characterId;
      const storyIdea = body.storyIdea || data.storyIdea;
      const themes = body.themes || data.themes || [];
      const moralLesson = body.moralLesson || data.moralLesson;
      const avoidTopics = body.avoidTopics || data.avoidTopics || [];
      const therapeuticGoals = body.therapeuticGoals || data.therapeuticGoals || [];
      const emotionalContext = body.emotionalContext || data.emotionalContext;
      const libraryId = body.libraryId || data.libraryId;
      // Preserve generateAssets as-is (can be boolean or array of asset types)
      const generateAssets = body.generateAssets !== undefined ? body.generateAssets : (data.generateAssets !== undefined ? data.generateAssets : true);
      
      // Extract story type-specific inputs
      const bedtime = body.bedtime || data.bedtime;
      const birthday = body.birthday || data.birthday;
      const educational = body.educational || data.educational;
      const financialLiteracy = body.financialLiteracy || data.financialLiteracy;
      const languageLearning = body.languageLearning || data.languageLearning;
      const medicalBravery = body.medicalBravery || data.medicalBravery;
      const mentalHealth = body.mentalHealth || data.mentalHealth;
      const milestones = body.milestones || data.milestones;
      const sequel = body.sequel || data.sequel;
      const techReadiness = body.techReadiness || data.techReadiness;
      const innerChild = body.innerChild || data.innerChild;
      const childLoss = body.childLoss || data.childLoss;
      const newBirth = body.newBirth || data.newBirth;
      
      // Generate story with phase and ID parameters for multi-turn conversation
      const result = await agent.generateStory({
        userId,
        creatorUserId,  // CRITICAL: Pass creator for quota attribution
        sessionId,
        characterName,
        characterTraits: data.character?.traits || data.characterTraits || body.characterTraits,
        characterId,    // REST API: character ID for reference images
        storyType,
        userAge,
        conversationPhase,  // Pass phase (story_planning, cover_generation, beat_confirmed)
        storyId,           // Pass story ID for retrieval
        beatNumber,        // Pass beat number if generating specific beat
        storyIdea,         // REST API: user's story idea
        themes,            // REST API: story themes
        moralLesson,       // REST API: moral lesson
        avoidTopics,       // REST API: topics to avoid
        therapeuticGoals,   // REST API: therapeutic goals
        emotionalContext,  // REST API: emotional context
        libraryId,         // REST API: target library ID
        // Story type-specific inputs
        bedtime,
        birthday,
        educational,
        financialLiteracy,
        languageLearning,
        medicalBravery,
        mentalHealth,
        milestones,
        sequel,
        techReadiness,
        innerChild,
        childLoss,
        newBirth
      } as any);
      
      // If libraryId provided and story was created, update it
      if (libraryId && result.story?.storyId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
          );
          await supabase
            .from('stories')
            .update({ library_id: libraryId })
            .eq('id', result.story.storyId);
        } catch (err) {
          console.warn('[Content Agent] Failed to update story library_id:', err);
        }
      }
      
      // If generateAssets is true or an array, create asset jobs
      const shouldGenerateAssets = generateAssets !== false && (Array.isArray(generateAssets) || generateAssets === true);
      if (shouldGenerateAssets && result.story?.storyId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
          );
          
          // Determine asset types
          let assetTypes: string[];
          
          // Check if generateAssets is an array (specific asset types requested from REST API)
          if (Array.isArray(generateAssets)) {
            // Use the array directly (e.g., ['cover'] for adult therapeutic stories)
            assetTypes = generateAssets;
            console.log('[Content Agent] Using specific asset types from request', { assetTypes });
          } else {
            // Use Lambda's logic for boolean generateAssets
            // Adult therapeutic story types default to cover art only
            const adultTherapeuticTypes = ['inner child', 'inner-child', 'child loss', 'child-loss'];
            const normalizedStoryType = (storyType || '').toLowerCase().trim();
            const isNewBirthTherapeutic = (normalizedStoryType === 'new birth' || normalizedStoryType === 'new-birth') 
              && (newBirth?.mode === 'therapeutic');
            const isAdultTherapeutic = adultTherapeuticTypes.includes(normalizedStoryType) || isNewBirthTherapeutic;
            
            // Check if user explicitly requested full assets (for adult therapeutic types)
            const explicitFullAssets = body.explicitFullAssets || data.explicitFullAssets || false;
            
            if (isAdultTherapeutic && !explicitFullAssets) {
              // Adult therapeutic stories: cover art only (default)
              assetTypes = ['cover'];
              console.log('[Content Agent] Adult therapeutic story detected - generating cover art only', { storyType: normalizedStoryType, mode: newBirth?.mode });
            } else {
              // Children's stories: full assets
              // NEW ORDER (V3): Cover → Scenes → Activities → Audio → PDF
              // Rationale: Visual assets appear first, activities while audio renders, PDF last with all assets
              assetTypes = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'activities', 'audio', 'pdf'];
            }
          }
          
          for (const assetType of assetTypes) {
            await supabase
              .from('asset_generation_jobs')
              .insert({
                story_id: result.story.storyId,
                asset_type: assetType,
                status: 'queued',
                metadata: {}
              });
          }
        } catch (err) {
          console.warn('[Content Agent] Failed to create asset jobs:', err);
        }
      }
      
      // Increment usage after successful generation
      if (result.success) {
        await tierService.incrementUsage(userId).catch(err => {
          console.warn('[Content Agent] Failed to increment usage:', err);
        });
        
        // Check if upgrade suggestion needed
        const upgradeCheck = await tierService.shouldSuggestUpgrade(userId).catch(() => null);
        if (upgradeCheck?.suggest) {
          (result as any).upgradeSuggestion = {
            fromTier: upgradeCheck.fromTier,
            toTier: upgradeCheck.toTier,
            reason: upgradeCheck.reason
          };
        }
      }

      // Build response in AgentResponse format for Router
      const agentResponse = {
        agentName: 'content',
        success: result.success,
        data: {
          message: result.message,
          speechText: result.speechText,
          story: result.story,
          coverImageUrl: result.coverImageUrl,
          beatImages: result.beatImages || [],
          audioUrl: result.audioUrl,
          assetsStatus: result.assetsStatus,
          imageTimestamps: result.imageTimestamps,
          webvttUrl: result.webvttUrl || null,
          animatedCoverUrl: null, // Future: Sora-2-Pro
          conversationPhase: 'story_building',
          shouldEndSession: false
        },
        nextPhase: 'story_building',
        requiresFollowup: false
      };
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentResponse)
      };
    }

    // Generate Sora video animation
    if (action === 'generate_sora_video' || action === 'generate_animation') {
      const agent = await getContentAgent();
      const animationModule: any = await import('./services/AnimationService');
      const AnimationService = animationModule.AnimationService || animationModule.default;
      const TierRestrictionError = animationModule.TierRestrictionError || animationModule.AnimationService?.TierRestrictionError || Error;
      const { TierQualityService } = await import('./services/TierQualityService');
      const logger = { info: console.log, warn: console.warn, error: console.error };
      
      // Extract userId from request
      const userId = data.userId || body.userId || body.memoryState?.userId || 'anonymous';
      
      // Initialize tier service for access control
      const tierService = new TierQualityService(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );
      const animationService: any = new AnimationService(logger as any, tierService);
      
      try {
        const animationResult = await animationService.generateAnimatedCover({
          storyText: data.storyText || data.story?.content || '',
          images: data.images || data.imageUrls || [],
          characterTraits: data.character || data.characterTraits,
          duration: data.duration || 10,
          userId: userId
        });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              animatedCoverUrl: animationResult.animatedCoverUrl,
              duration: animationResult.duration,
              format: animationResult.format,
              message: 'Sora animation generated successfully'
            }
          })
        };
      } catch (error) {
        // Handle tier restriction errors with upgrade messaging
        if (error instanceof TierRestrictionError) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: error.message,
              upgradeRequired: true,
              upgradeMessage: error.upgradeMessage,
              tier: error.tier
            })
          };
        }
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: `Sora generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        };
      }
    }

    // Generate sound effects
    if (action === 'generate_sound_effect' || action === 'generate_sound_effects') {
      const { SoundEffectsService } = await import('./services/SoundEffectsService');
      const logger = { info: console.log, warn: console.warn, error: console.error };
      const soundService = new SoundEffectsService(logger as any);
      
      try {
        const effectType = data.effectType || data.type || 'ambient';
        const effectResult = await soundService.generateSoundEffect(
          effectType as any,
          data.duration || 5
        );
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              soundEffectUrl: effectResult,
              effectType: effectType,
              duration: data.duration || 5,
              message: 'Sound effect generated successfully'
            }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: `Sound effect generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        };
      }
    }

    // Character Visual + Voice actions
    if (action === 'complete_character_creation_with_visuals') {
      const { userId, libraryId, traits, conversationHistory, currentPhase, canary, taskId: taskIdFromBody, task_id: taskIdSnake } = data || {};
      const taskId = taskIdFromBody || taskIdSnake || null
      
      if (!userId || !libraryId || !traits) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: userId, libraryId, traits'
          })
        };
      }

      const traitsShapeError = validateCanonicalTraitsPayload(traits)
      if (traitsShapeError) {
        console.warn('[Content Agent] Invalid traits payload shape', traitsShapeError)
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Invalid traits payload shape',
            code: traitsShapeError.code,
            field: traitsShapeError.field
          })
        }
      }

      let pipelineCharacterId: string | null = null;
      let pipelineSupabase: any = null;
      try {
        const logger = { info: console.log, warn: console.warn, error: console.error };
        await getContentAgent();
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        pipelineSupabase = supabase;

        const normalized = normalizeExplicitInput(traits)
        const explicitInput = normalized.explicitInput
        const rawInput = normalized.rawInput
        const enums = normalized.enums
        const normalizedTraits = normalized.normalizedTraits
        const normalizedTraitDescriptions = normalized.normalizedTraitDescriptions
        const inclusivityTraitIds = normalizedTraits
          .map(trait => typeof trait === 'string' ? trait : (trait?.type || trait?.id))
          .filter(Boolean)

        if (!explicitInput.name) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: 'Missing required field: name'
            })
          };
        }

        const resolvedSpeciesDescriptor = explicitInput.species || 'made-up character'
        const ageSafeLanguage = buildAgeSafeLanguage(explicitInput.age || DEFAULT_AGE)
        const baseWorldMaterialHint = computeWorldMaterialHint(
          resolvedSpeciesDescriptor,
          explicitInput.appearance,
          explicitInput.personality
        )
        const baseWorldPhysicsHint = computeWorldPhysicsHint(
          resolvedSpeciesDescriptor,
          explicitInput.appearance,
          explicitInput.personality
        )
        const isHumanLike = isHumanLikeInput({
          speciesKey: enums.speciesKey,
          speciesDescriptor: resolvedSpeciesDescriptor,
          aboutThem: explicitInput.personality,
          appearance: explicitInput.appearance
        });
        const requestedCharacterId = data.characterId || data.character_id || traits?.characterId || traits?.id || null
        const characterId = requestedCharacterId || randomUUID();
        pipelineCharacterId = characterId;
        const ingestedAt = new Date().toISOString();

        const createPayload = {
          id: characterId,
          character_id: characterId,
          library_id: libraryId,
          creator_user_id: userId,
          name: explicitInput.name,
          age_raw: explicitInput.age || DEFAULT_AGE,
          age_safe_language: ageSafeLanguage,
          species: explicitInput.species || 'human',
          "speciesKey": enums.speciesKey,
          "speciesDescriptor": resolvedSpeciesDescriptor,
          ethnicity: enums.ethnicity || null,
          gender: enums.genderKey || null,
          personality: enums.personalityTraits || null,
          appearance: explicitInput.appearance || null,
          "inclusivityTraits": inclusivityTraitIds || null,
          "traitUserDescriptions": normalizedTraitDescriptions || null,
          headshot_status: 'pending',
          bodyshot_status: 'pending',
          character_state: 'draft',
          visible_to_user: false,
          generation_timestamps: { ingested_at: ingestedAt },
          traits: {
            explicit: explicitInput,
            explicit_input: explicitInput,
            raw_input: rawInput,
            enums,
            story: null,
            derived: null
          }
        };

        const { data: existingRow } = await supabase
          .from('characters')
          .select('id, library_id, creator_user_id, generation_timestamps, character_state, visible_to_user')
          .eq('id', characterId)
          .maybeSingle()

        const libraryIdToPersist = existingRow?.library_id || libraryId
        const creatorUserIdToPersist = existingRow?.creator_user_id || userId
        const ingestedGenerationTimestamps = {
          ...(existingRow?.generation_timestamps || {}),
          ingested_at: ingestedAt
        }
        const basePayload = {
          ...createPayload,
          library_id: libraryIdToPersist,
          creator_user_id: creatorUserIdToPersist,
          generation_timestamps: ingestedGenerationTimestamps,
          character_state: existingRow?.character_state || createPayload.character_state,
          visible_to_user: typeof existingRow?.visible_to_user === 'boolean'
            ? existingRow.visible_to_user
            : createPayload.visible_to_user
        }

        const { data: createdRow, error: createError } = existingRow
          ? await supabase
            .from('characters')
            .update(basePayload)
            .eq('id', characterId)
            .select()
            .single()
          : await supabase
            .from('characters')
            .insert(basePayload)
            .select()
            .single();

        if (createError) {
          throw new Error(`Failed to create character row: ${createError.message}`);
        }

        const storyKernel = await generateStoryKernel(
          openai,
          explicitInput,
          {
            speciesKey: enums.speciesKey,
            genderKey: enums.genderKey,
            ageBucket: enums.ageBucket,
            characterSpokenLanguage: enums.characterSpokenLanguage,
            readerLanguage: enums.readerLanguage
          },
          ageSafeLanguage,
          baseWorldMaterialHint
        )

        const { data: storyRow, error: storyError } = await supabase
          .from('characters')
          .update({
            "speciesKey": enums.speciesKey,
            "speciesDescriptor": resolvedSpeciesDescriptor,
            age_safe_language: ageSafeLanguage,
            "worldMaterialHint": baseWorldMaterialHint,
            "worldPhysicsHint": baseWorldPhysicsHint,
            "back_story": storyKernel.back_story || null,
            "origin": storyKernel.origin || null,
            "generation_timestamps": {
              ...(createdRow.generation_timestamps || {}),
              story_kernel_at: new Date().toISOString()
            },
            "traits": {
              explicit: explicitInput,
              explicit_input: explicitInput,
              raw_input: rawInput,
              enums,
              story: storyKernel,
              derived: null
            }
          })
          .eq('id', characterId)
          .select()
          .single();

        if (storyError) {
          throw new Error(`Failed to update story kernel: ${storyError.message}`);
        }

        const derived = await deriveCharacterEnrichment(
          openai,
          explicitInput,
          {
            speciesKey: enums.speciesKey,
            genderKey: enums.genderKey,
            ageBucket: enums.ageBucket,
            characterSpokenLanguage: enums.characterSpokenLanguage,
            readerLanguage: enums.readerLanguage
          },
          storyKernel,
          ageSafeLanguage
        )

        const finalDerived: DerivedEnrichment = {
          ...derived,
          worldMaterialHint: derived.worldMaterialHint || baseWorldMaterialHint,
          worldPhysicsHint: derived.worldPhysicsHint || baseWorldPhysicsHint,
          speciesDescriptor: derived.speciesDescriptor || resolvedSpeciesDescriptor,
          aboutThem: derived.aboutThem || null
        }

        const signatureColors = finalDerived.signatureColors && finalDerived.signatureColors.length > 0
          ? finalDerived.signatureColors
          : [
              resolveHexColor(finalDerived.skinTone, '#F4C2A1'),
              resolveHexColor(finalDerived.hairColor, '#8B4513'),
              resolveHexColor(finalDerived.eyeColor, '#4A90E2')
            ];

        const hexColors = {
          skin: resolveHexColor(finalDerived.skinTone, '#F4C2A1'),
          hair: resolveHexColor(finalDerived.hairColor, '#8B4513'),
          eyes: resolveHexColor(finalDerived.eyeColor, '#4A90E2')
        };

        const traitsPayload = {
          name: explicitInput.name,
          age: explicitInput.age || DEFAULT_AGE,
          ageBucket: enums.ageBucket,
          species: explicitInput.species || 'human',
          speciesKey: enums.speciesKey,
          speciesDescriptor: finalDerived.speciesDescriptor,
          gender: enums.genderKey,
          ethnicity: enums.ethnicity || [],
          personalityTraits: enums.personalityTraits || DEFAULT_PERSONALITY_TRAITS,
          personality: enums.personalityTraits || DEFAULT_PERSONALITY_TRAITS,
          personalityText: explicitInput.personality,
          appearance: explicitInput.appearance,
          aboutThem: finalDerived.aboutThem,
          characterSpokenLanguage: enums.characterSpokenLanguage,
          readerLanguage: enums.readerLanguage,
          inclusivityTraits: inclusivityTraitIds,
          traitUserDescriptions: normalizedTraitDescriptions,
          ageSafeLanguage,
          worldMaterialHint: finalDerived.worldMaterialHint,
          worldPhysicsHint: finalDerived.worldPhysicsHint,
          hairColor: finalDerived.hairColor,
          hairTexture: finalDerived.hairTexture,
          hairLength: finalDerived.hairLength,
          eyeColor: finalDerived.eyeColor,
          skinTone: finalDerived.skinTone,
          surfaceMaterial: finalDerived.surfaceMaterial,
          surfaceLogic: finalDerived.surfaceLogic,
          clothing: finalDerived.clothing,
          clothingColors: finalDerived.clothingColors,
          accessories: finalDerived.accessories,
          signatureColors,
          signatureProps: finalDerived.signatureProps,
          styleNotes: finalDerived.styleNotes,
          values: finalDerived.values,
          strengths: finalDerived.strengths,
          fears: finalDerived.fears,
          joyTriggers: finalDerived.joyTriggers,
          comfortSignals: finalDerived.comfortSignals,
          catchphrase: finalDerived.catchphrase,
          appearanceSummary: finalDerived.appearanceSummary,
          back_story: storyKernel.back_story,
          origin: storyKernel.origin,
          explicit: explicitInput,
          explicit_input: explicitInput,
          raw_input: rawInput,
          enums,
          story: storyKernel,
          derived: finalDerived
        }

        const { data: enrichedRow, error: enrichError } = await supabase
          .from('characters')
          .update({
            "speciesKey": enums.speciesKey,
            "speciesDescriptor": finalDerived.speciesDescriptor,
            age_safe_language: ageSafeLanguage,
            "worldMaterialHint": finalDerived.worldMaterialHint,
            "worldPhysicsHint": finalDerived.worldPhysicsHint,
            "hairColor": finalDerived.hairColor || null,
            "hairTexture": finalDerived.hairTexture || null,
            "hairLength": finalDerived.hairLength || null,
            "eyeColor": finalDerived.eyeColor || null,
            "skinTone": finalDerived.skinTone || null,
            "surfaceMaterial": finalDerived.surfaceMaterial || null,
            "surfaceLogic": finalDerived.surfaceLogic || null,
            "clothing": finalDerived.clothing || null,
            "clothingColors": finalDerived.clothingColors || null,
            "accessories": finalDerived.accessories || null,
            "signatureColors": signatureColors,
            "signatureProps": finalDerived.signatureProps || null,
            "styleNotes": finalDerived.styleNotes || null,
            "values": finalDerived.values || null,
            "strengths": finalDerived.strengths || null,
            "fears": finalDerived.fears || null,
            "joyTriggers": finalDerived.joyTriggers || null,
            "comfortSignals": finalDerived.comfortSignals || null,
            "catchphrase": finalDerived.catchphrase || null,
            "back_story": storyKernel.back_story || null,
            "origin": storyKernel.origin || null,
            "aboutThem": finalDerived.aboutThem || null,
            "personality": enums.personalityTraits || null,
            "appearance": explicitInput.appearance || null,
            "ethnicity": enums.ethnicity || null,
            "gender": enums.genderKey || null,
            "inclusivityTraits": inclusivityTraitIds || null,
            "traitUserDescriptions": normalizedTraitDescriptions || null,
            "generation_timestamps": {
              ...(storyRow?.generation_timestamps || createdRow.generation_timestamps || {}),
              derived_at: new Date().toISOString(),
              enriched_at: new Date().toISOString()
            },
            "traits": traitsPayload
          })
          .eq('id', characterId)
          .select()
          .single();

        if (enrichError) {
          throw new Error(`Failed to update enrichment: ${enrichError.message}`);
        }

        const { CharacterImageGenerator } = await import('./services/CharacterImageGenerator');
        const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');

        const inclusivityTraits = (explicitInput.inclusivityTraits || [])
          .map((trait: any) => {
            const rawId = typeof trait === 'string'
              ? trait
              : (trait?.type || trait?.id || '')
            const normalizedId = resolveCanonicalTraitId(rawId, explicitInput.traitUserDescriptions || {})
            if (!normalizedId) return null
            const traitDef = INCLUSIVITY_TRAITS_MAP[normalizedId];
            if (!traitDef) return null;
            const userDescription = typeof trait === 'object' && trait
              ? (trait.description || trait.storyIntegration || trait.userDescription)
              : normalizedTraitDescriptions?.[normalizedId];
            return {
              ...traitDef,
              userDescription,
              selectedVisualIndicators: trait?.selectedVisualIndicators,
              selectedBehavioralIndicators: trait?.selectedBehavioralIndicators,
              selectedSeverity: trait?.severity || trait?.selectedSeverity,
              selectedSubtype: trait?.subtype || trait?.selectedSubtype
            };
          })
          .filter(Boolean) as any[];

        const traitsForPrompt: any = {
          characterId,
          name: explicitInput.name,
          age: explicitInput.age || DEFAULT_AGE,
          ageSafeLanguage,
          species: explicitInput.species || enums.speciesKey,
          speciesKey: enums.speciesKey,
          speciesDescriptor: finalDerived.speciesDescriptor || resolvedSpeciesDescriptor,
          ethnicity: enums.ethnicity || [],
          gender: enums.genderKey,
          aboutThem: finalDerived.aboutThem,
          appearance: explicitInput.appearance,
          appearanceSummary: finalDerived.appearanceSummary,
          worldMaterialHint: finalDerived.worldMaterialHint,
          worldPhysicsHint: finalDerived.worldPhysicsHint,
          signatureColors: signatureColors,
          hairColor: finalDerived.hairColor,
          hairTexture: finalDerived.hairTexture,
          hairLength: finalDerived.hairLength,
          eyeColor: finalDerived.eyeColor,
          skinTone: finalDerived.skinTone,
          surfaceMaterial: finalDerived.surfaceMaterial,
          surfaceLogic: finalDerived.surfaceLogic,
          clothing: finalDerived.clothing,
          clothingColors: finalDerived.clothingColors,
          accessories: finalDerived.accessories,
          personality: enums.personalityTraits || [],
          personalityTraits: enums.personalityTraits || [],
          personalityText: explicitInput.personality,
          story: storyKernel
        };

        const imageGenerator = new CharacterImageGenerator(openai, logger as any);
        let headshotPromptResult: any
        try {
          headshotPromptResult = imageGenerator.buildHeadshotPromptForPersistence(traitsForPrompt, inclusivityTraits, hexColors);
        } catch (error: any) {
          const prompt = error?.prompt || null
          const promptHash = prompt ? hashPrompt(prompt) : null
          const failureCodes = ['prompt_guard']
          const attemptIndex = await getNextAttemptIndex(supabase, characterId, 'headshot')
          const tracePayload = {
            characterId,
            assetType: 'headshot',
            attemptIndex,
            generationMode: 'character_headshot',
            prompt,
            promptHash,
            model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            url: null,
            openaiRequestId: error?.request_id || error?.requestId || null,
            failureCodes,
            failureReason: error?.message || 'Headshot prompt guard failed',
            validation: null
          }
          const traceKey = buildAttemptTraceKey({
            characterId,
            assetType: 'headshot',
            attemptIndex,
            requestId: error?.request_id || error?.requestId || null
          })
          const traceUrl = await uploadJsonToS3Global(tracePayload, traceKey)
          await createImageAttempt(supabase, {
            characterId,
            assetType: 'headshot',
            status: 'hard_fail',
            attemptIndex,
            imageUrl: null,
            failImageUrl: null,
            prompt,
            promptHash,
            traceUrl,
            failureCodes,
            failureReason: error?.message || 'Headshot prompt guard failed',
            modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            openaiRequestId: error?.request_id || error?.requestId || null,
            validationSummary: {
              failure_code: 'prompt_guard',
              failure_reason: error?.message || 'Headshot prompt guard failed'
            },
            visibility: 'internal_only'
          })
          await supabase
            .from('characters')
            .update({
              headshot_status: 'failed_hard',
              headshot_trace_url: traceUrl,
              failure_codes: failureCodes,
              failure_summary: error?.message || 'Headshot prompt guard failed',
              admin_review_required: true,
              character_state: 'failed_hard',
              visible_to_user: false,
              last_failure_at: new Date().toISOString()
            })
            .eq('id', characterId)
          await updateGenerationTask(supabase, taskId, {
            state: 'failed_hard',
            current_stage: 'generating_headshot',
            current_asset: 'headshot',
            attempt_index: attemptIndex,
            retryable: false,
            next_poll_ms: 0,
            error_code: 'prompt_guard',
            error_message: error?.message || 'Prompt guard failed'
          })
          throw error
        }

        let bodyshotPromptResult: any
        try {
          bodyshotPromptResult = imageGenerator.buildBodyshotPromptForPersistence(traitsForPrompt, inclusivityTraits, hexColors, inclusivityTraits);
        } catch (error: any) {
          const prompt = error?.prompt || null
          const promptHash = prompt ? hashPrompt(prompt) : null
          const failureCodes = ['prompt_guard']
          const attemptIndex = await getNextAttemptIndex(supabase, characterId, 'bodyshot')
          const tracePayload = {
            characterId,
            assetType: 'bodyshot',
            attemptIndex,
            generationMode: 'character_bodyshot_outpaint',
            prompt,
            promptHash,
            model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            url: null,
            openaiRequestId: error?.request_id || error?.requestId || null,
            failureCodes,
            failureReason: error?.message || 'Bodyshot prompt guard failed',
            validation: null
          }
          const traceKey = buildAttemptTraceKey({
            characterId,
            assetType: 'bodyshot',
            attemptIndex,
            requestId: error?.request_id || error?.requestId || null
          })
          const traceUrl = await uploadJsonToS3Global(tracePayload, traceKey)
          await createImageAttempt(supabase, {
            characterId,
            assetType: 'bodyshot',
            status: 'hard_fail',
            attemptIndex,
            imageUrl: null,
            failImageUrl: null,
            prompt,
            promptHash,
            traceUrl,
            failureCodes,
            failureReason: error?.message || 'Bodyshot prompt guard failed',
            modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            openaiRequestId: error?.request_id || error?.requestId || null,
            validationSummary: {
              failure_code: 'prompt_guard',
              failure_reason: error?.message || 'Bodyshot prompt guard failed'
            },
            visibility: 'internal_only'
          })
          await supabase
            .from('characters')
            .update({
              bodyshot_status: 'failed_hard',
              bodyshot_trace_url: traceUrl,
              failure_codes: failureCodes,
              failure_summary: error?.message || 'Bodyshot prompt guard failed',
              admin_review_required: true,
              character_state: 'needs_retry',
              last_failure_at: new Date().toISOString()
            })
            .eq('id', characterId)
          await updateGenerationTask(supabase, taskId, {
            state: 'failed_hard',
            current_stage: 'generating_bodyshot',
            current_asset: 'bodyshot',
            attempt_index: attemptIndex,
            retryable: false,
            next_poll_ms: 0,
            error_code: 'prompt_guard',
            error_message: error?.message || 'Prompt guard failed'
          })
          throw error
        }
        const promptHashes = {
          headshot: hashPrompt(headshotPromptResult.prompt),
          bodyshot: hashPrompt(bodyshotPromptResult.prompt)
        };

        const { data: promptRow, error: promptError } = await supabase
          .from('characters')
          .update({
            "headshot_prompt": headshotPromptResult.prompt,
            "bodyshot_prompt": bodyshotPromptResult.prompt,
            "prompt_hashes": promptHashes,
            "global_style_hash": getGlobalStyleHash(),
            "applied_inclusivity_traits": headshotPromptResult.traitTrace?.applicableTraitIds || [],
            "excluded_traits_headshot": headshotPromptResult.traitTrace?.excludedForHeadshotLeakage || [],
            "excluded_traits_bodyshot": bodyshotPromptResult.traitTrace?.excludedTraitIds || [],
            "image_model_used": process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            "character_state": 'generating_headshot',
            "headshot_status": 'generating',
            "visible_to_user": false,
            "generation_timestamps": {
              ...(enrichedRow?.generation_timestamps || {}),
              prompts_saved_at: new Date().toISOString()
            }
          })
          .eq('id', characterId)
          .select()
          .single();

        if (promptError) {
          throw new Error(`Failed to persist prompts: ${promptError.message}`);
        }

        let generationTimestamps = {
          ...(promptRow?.generation_timestamps || {})
        } as Record<string, any>;

        async function uploadImageToS3(imageUrl: string, key: string): Promise<string> {
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
          const { getCdnUrl } = await import('./utils/cdnUrl');
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
          await s3.send(new PutObjectCommand({
            Bucket: process.env.ASSET_BUCKET || process.env.S3_BUCKET_NAME || 'storytailor-assets-production',
            Key: key,
            Body: buffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000'
          }));
          return getCdnUrl(key);
        }

        async function uploadJsonToS3(payload: any, key: string): Promise<string> {
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
          const { getCdnUrl } = await import('./utils/cdnUrl');
          const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
          await s3.send(new PutObjectCommand({
            Bucket: process.env.ASSET_BUCKET || process.env.S3_BUCKET_NAME || 'storytailor-assets-production',
            Key: key,
            Body: Buffer.from(JSON.stringify(payload, null, 2)),
            ContentType: 'application/json',
            CacheControl: 'public, max-age=31536000'
          }));
          return getCdnUrl(key);
        }

        async function getBase64FromImageUrl(imageUrl: string): Promise<string> {
          if (imageUrl.startsWith('data:image/')) {
            const base64Data = imageUrl.split(',')[1];
            if (!base64Data) throw new Error('Invalid base64 data URI');
            return base64Data;
          }
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          return buffer.toString('base64');
        }

        const headshot = await imageGenerator.generateHeadshot(traitsForPrompt, inclusivityTraits, hexColors, characterId);
        const headshotKey = `characters/${characterId}/headshot-${Date.now()}.png`;
        const headshotUrl = await uploadImageToS3(headshot.url, headshotKey);
        generationTimestamps = {
          ...generationTimestamps,
          headshot_generated_at: new Date().toISOString()
        };
        const headshotAlpha = await detectTransparentBackground(headshotUrl)

        const { ImageSafetyReviewService } = await import('./services/ImageSafetyReviewService');
        const validationTraits = inclusivityTraits.filter(trait => trait.id !== 'autism');
        const safetyService = new ImageSafetyReviewService(openai, logger as any, process.env.OPENAI_MODEL_VISION || 'gpt-5.2');
        const headshotValidation = await safetyService.reviewImageComprehensive({
          candidateB64: await getBase64FromImageUrl(headshot.url),
          targetRating: 'G',
          characterName: explicitInput.name,
          expectedTraits: validationTraits,
          imageType: 'headshot',
          characterContext: {
            speciesKey: enums.speciesKey,
            speciesDescriptor: finalDerived.speciesDescriptor || resolvedSpeciesDescriptor,
            isHumanLike,
            developmentalProfile: ageSafeLanguage,
            worldMaterialHint: finalDerived.worldMaterialHint,
            worldPhysicsHint: finalDerived.worldPhysicsHint,
            signatureColors: traitsForPrompt.signatureColors
          }
        });
        const headshotValidationWithAlpha = {
          ...headshotValidation,
          transparent_background: headshotAlpha.hasTransparency,
          transparent_background_ratio: headshotAlpha.ratio
        }
        const headshotOutcome = classifyReviewOutcome(headshotValidationWithAlpha, inclusivityTraits, {
          assetType: 'headshot',
          speciesKey: enums.speciesKey,
          speciesDescriptor: finalDerived.speciesDescriptor || resolvedSpeciesDescriptor,
          alphaDetected: headshotAlpha.hasTransparency
        })
        const headshotStatus = headshotOutcome.status === 'pass' ? 'ready' : headshotOutcome.status
        const maxHeadshotAttempts = Number(process.env.HEADSHOT_MAX_ATTEMPTS || '2')
        let headshotState = headshotOutcome.status === 'pass'
          ? 'headshot_ready'
          : (headshotOutcome.status === 'soft_fail' ? 'failed_soft' : 'failed_hard')
        const headshotBanner = headshotOutcome.status === 'soft_fail' ? pickUserBanner(characterId) : null
        const headshotAttemptIndex = await getNextAttemptIndex(supabase, characterId, 'headshot')
        const headshotTracePayload = {
          characterId,
          assetType: 'headshot',
          attemptIndex: headshotAttemptIndex,
          generationMode: 'character_headshot',
          prompt: headshotPromptResult.prompt,
          promptHash: headshot.promptHash,
          model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
          url: headshotUrl,
          openaiRequestId: (headshot as any).openaiRequestId || null,
          validation: headshotValidationWithAlpha,
          appliedTraits: headshotPromptResult.traitTrace?.applicableTraitIds || [],
          excludedTraits: headshotPromptResult.traitTrace?.excludedForHeadshotLeakage || [],
          outcome: headshotOutcome,
          globalStyleHash: getGlobalStyleHash()
        };
        const headshotTraceKey = buildAttemptTraceKey({
          characterId,
          assetType: 'headshot',
          attemptIndex: headshotAttemptIndex,
          requestId: (headshot as any).openaiRequestId || null
        });
        const headshotTraceUrl = await uploadJsonToS3(headshotTracePayload, headshotTraceKey);
        const headshotAttempt = await createImageAttempt(supabase, {
          characterId,
          assetType: 'headshot',
          status: headshotOutcome.status,
          attemptIndex: headshotAttemptIndex,
          imageUrl: headshotUrl,
          failImageUrl: headshotOutcome.status === 'hard_fail' ? headshotUrl : null,
          prompt: headshotPromptResult.prompt,
          promptHash: headshot.promptHash,
          traceUrl: headshotTraceUrl,
          failureCodes: headshotOutcome.failureCodes,
          failureReason: headshotOutcome.failureReason,
          modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
          openaiRequestId: (headshot as any).openaiRequestId || null,
          validationSummary: headshotValidationWithAlpha || null,
          visibility: headshotOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
        })
        const shouldRetryHeadshot = headshotOutcome.status === 'hard_fail'
          && (headshotAttempt?.attempt_index || 0) < maxHeadshotAttempts
        if (shouldRetryHeadshot) {
          headshotState = 'needs_retry'
        }

        await supabase
          .from('characters')
          .update({
            "headshot_url": headshotUrl,
            "headshot_status": headshotStatus,
            "headshot_trace_url": headshotTraceUrl,
            "current_headshot_attempt_id": headshotAttempt?.id || null,
            "last_good_headshot_attempt_id": headshotOutcome.status === 'pass' ? headshotAttempt?.id || null : null,
            "headshot_fail_url": headshotOutcome.status === 'hard_fail' ? headshotUrl : null,
            "failure_codes": headshotOutcome.failureCodes,
            "failure_summary": headshotOutcome.failureReason,
            "admin_review_required": headshotOutcome.status === 'hard_fail' && !shouldRetryHeadshot,
            "character_state": headshotState,
            "visible_to_user": headshotOutcome.status !== 'hard_fail',
            "user_banner": headshotBanner,
            "user_banner_updated_at": headshotBanner ? new Date().toISOString() : null,
            "retries_count": headshotOutcome.status === 'hard_fail' ? (headshotAttempt?.attempt_index || 0) : (enrichedRow?.retries_count || 0),
            "last_failure_at": headshotOutcome.status === 'hard_fail' ? new Date().toISOString() : null,
            "generation_timestamps": {
              ...generationTimestamps
            }
          })
          .eq('id', characterId);

        if (shouldQueueEdit('headshot', headshotOutcome.failureCodes) && headshotAttempt?.id) {
          await queueEditFix({
            action: 'edit_character_image',
            characterId,
            attemptId: headshotAttempt.id,
            assetType: 'headshot'
          })
        }
        if (shouldRetryHeadshot) {
          await queueEditFix({
            action: 'retry_headshot',
            characterId
          })
        }


        let headshotBuffer: Buffer;
        if (headshot.url.startsWith('data:image/')) {
          const base64Data = headshot.url.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid base64 data URI for headshot');
          }
          headshotBuffer = Buffer.from(base64Data, 'base64');
        } else {
          const imageResponse = await fetch(headshot.url);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download headshot: ${imageResponse.status}`);
          }
          headshotBuffer = Buffer.from(await imageResponse.arrayBuffer());
        }

        await supabase
          .from('characters')
          .update({
            "bodyshot_status": 'generating',
            "character_state": headshotOutcome.status === 'pass' ? 'generating_bodyshot' : 'failed_soft'
          })
          .eq('id', characterId);

        const bodyshot = await imageGenerator.generateBodyshotWithReference(
          traitsForPrompt,
          inclusivityTraits,
          hexColors,
          headshotBuffer,
          characterId,
          inclusivityTraits
        );
        const bodyshotKey = `characters/${characterId}/bodyshot-${Date.now()}.png`;
        const bodyshotUrl = await uploadImageToS3(bodyshot.url, bodyshotKey);
        generationTimestamps = {
          ...generationTimestamps,
          bodyshot_generated_at: new Date().toISOString()
        };

        const bodyshotValidation = await safetyService.reviewImageComprehensive({
          candidateB64: await getBase64FromImageUrl(bodyshot.url),
          targetRating: 'G',
          characterName: explicitInput.name,
          expectedTraits: validationTraits,
          imageType: 'bodyshot',
          characterContext: {
            speciesKey: enums.speciesKey,
            speciesDescriptor: finalDerived.speciesDescriptor || resolvedSpeciesDescriptor,
            isHumanLike,
            developmentalProfile: ageSafeLanguage,
            worldMaterialHint: finalDerived.worldMaterialHint,
            worldPhysicsHint: finalDerived.worldPhysicsHint,
            signatureColors: traitsForPrompt.signatureColors
          }
        });
        const bodyshotOutcome = classifyReviewOutcome(bodyshotValidation, inclusivityTraits, {
          assetType: 'bodyshot',
          speciesKey: enums.speciesKey,
          speciesDescriptor: finalDerived.speciesDescriptor || resolvedSpeciesDescriptor
        })
        const bodyshotStatus = bodyshotOutcome.status === 'pass' ? 'ready' : bodyshotOutcome.status
        const maxBodyshotAttempts = Number(process.env.BODYSHOT_MAX_ATTEMPTS || '2')
        let bodyshotState = headshotOutcome.status === 'hard_fail'
          ? 'failed_hard'
          : headshotOutcome.status === 'soft_fail'
            ? 'failed_soft'
            : (bodyshotOutcome.status === 'pass'
              ? 'ready'
              : (bodyshotOutcome.status === 'soft_fail' ? 'failed_soft' : 'needs_retry'))
        const bodyshotBanner = headshotOutcome.status === 'soft_fail'
          ? headshotBanner
          : (bodyshotOutcome.status === 'soft_fail' ? pickUserBanner(characterId) : null)
        const bodyshotAttemptIndex = await getNextAttemptIndex(supabase, characterId, 'bodyshot')
        const bodyshotTracePayload = {
          characterId,
          assetType: 'bodyshot',
          attemptIndex: bodyshotAttemptIndex,
          generationMode: 'character_bodyshot_outpaint',
          prompt: bodyshotPromptResult.prompt,
          promptHash: bodyshot.promptHash,
          model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
          url: bodyshotUrl,
          openaiRequestId: (bodyshot as any).openaiRequestId || null,
          validation: bodyshotValidation,
          appliedTraits: bodyshotPromptResult.traitTrace?.applicableTraitIds || [],
          excludedTraits: bodyshotPromptResult.traitTrace?.excludedTraitIds || [],
          outcome: bodyshotOutcome,
          globalStyleHash: getGlobalStyleHash(),
          similarity: bodyshot.similarity || null
        };
        const bodyshotTraceKey = buildAttemptTraceKey({
          characterId,
          assetType: 'bodyshot',
          attemptIndex: bodyshotAttemptIndex,
          requestId: (bodyshot as any).openaiRequestId || null
        });
        const bodyshotTraceUrl = await uploadJsonToS3(bodyshotTracePayload, bodyshotTraceKey);
        const bodyshotAttempt = await createImageAttempt(supabase, {
          characterId,
          assetType: 'bodyshot',
          status: bodyshotOutcome.status,
          attemptIndex: bodyshotAttemptIndex,
          imageUrl: bodyshotUrl,
          failImageUrl: bodyshotOutcome.status === 'hard_fail' ? bodyshotUrl : null,
          prompt: bodyshotPromptResult.prompt,
          promptHash: bodyshot.promptHash,
          traceUrl: bodyshotTraceUrl,
          failureCodes: bodyshotOutcome.failureCodes,
          failureReason: bodyshotOutcome.failureReason,
          modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
          openaiRequestId: (bodyshot as any).openaiRequestId || null,
          validationSummary: bodyshotValidation || null,
          visibility: bodyshotOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
        })
        const shouldRetryBodyshot = bodyshotOutcome.status === 'hard_fail'
          && (bodyshotAttempt?.attempt_index || 0) < maxBodyshotAttempts
        if (shouldRetryBodyshot) {
          bodyshotState = 'needs_retry'
        }

        await supabase
          .from('characters')
          .update({
            "bodyshot_url": bodyshotUrl,
            "bodyshot_status": bodyshotStatus,
            "bodyshot_trace_url": bodyshotTraceUrl,
            "current_bodyshot_attempt_id": bodyshotAttempt?.id || null,
            "last_good_bodyshot_attempt_id": bodyshotOutcome.status === 'pass' ? bodyshotAttempt?.id || null : null,
            "bodyshot_fail_url": bodyshotOutcome.status === 'hard_fail' ? bodyshotUrl : null,
            "failure_codes": headshotOutcome.status !== 'pass' ? headshotOutcome.failureCodes : bodyshotOutcome.failureCodes,
            "failure_summary": headshotOutcome.status !== 'pass' ? headshotOutcome.failureReason : bodyshotOutcome.failureReason,
            "admin_review_required": headshotOutcome.status === 'hard_fail' || (bodyshotOutcome.status === 'hard_fail' && !shouldRetryBodyshot),
            "character_state": bodyshotState,
            "visible_to_user": headshotOutcome.status !== 'hard_fail',
            "user_banner": bodyshotBanner,
            "user_banner_updated_at": bodyshotBanner ? new Date().toISOString() : null,
            "retries_count": bodyshotOutcome.status === 'hard_fail' ? (bodyshotAttempt?.attempt_index || 0) : (promptRow?.retries_count || 0),
            "last_failure_at": bodyshotOutcome.status === 'hard_fail' ? new Date().toISOString() : null,
            "generation_timestamps": {
              ...generationTimestamps
            }
          })
          .eq('id', characterId);

        if (shouldQueueEdit('bodyshot', bodyshotOutcome.failureCodes) && bodyshotAttempt?.id) {
          await queueEditFix({
            action: 'edit_character_image',
            characterId,
            attemptId: bodyshotAttempt.id,
            assetType: 'bodyshot'
          })
        }
        if (shouldRetryBodyshot) {
          await queueEditFix({
            action: 'retry_bodyshot',
            characterId
          })
        }

        // T-POSES REMOVED. See docs/contracts/tpose-deprecation-contract.md
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              characterId,
              name: explicitInput.name,
              headshotUrl,
              bodyshotUrl,
              traceUrls: canary ? {
                headshot: headshotTraceUrl,
                bodyshot: bodyshotTraceUrl
              } : null,
              prompts: canary ? {
                headshot: headshotPromptResult.prompt,
                bodyshot: bodyshotPromptResult.prompt
              } : null,
              promptHashes: canary ? promptHashes : null,
              appliedInclusivityTraits: headshotPromptResult.traitTrace?.applicableTraitIds || [],
              excludedTraitsHeadshot: headshotPromptResult.traitTrace?.excludedForHeadshotLeakage || [],
              excludedTraitsBodyshot: bodyshotPromptResult.traitTrace?.excludedTraitIds || [],
              validation: canary ? {
                headshot: headshotValidationWithAlpha,
                bodyshot: bodyshotValidation
              } : undefined,
              continuity: canary ? {
                identity: bodyshot.similarity || null,
                supports: {
                  expectedSupportTraitIds: (validationTraits || [])
                    .filter(t => t.id && /wheelchair|hearing|halo|brace|orthotic|prosthetic|crutch|walker|cane/.test(t.id))
                    .map(t => t.id),
                  promptSupportIntegration: bodyshotPromptResult.prompt.includes('SUPPORT TRANSLATION (required):')
                }
              } : undefined,
              snapshots: canary ? {
                after_create: createdRow,
                after_enrichment: enrichedRow,
                after_prompts: promptRow,
                after_headshot: { headshot_url: headshotUrl, headshot_trace_url: headshotTraceUrl },
                after_bodyshot: { bodyshot_url: bodyshotUrl, bodyshot_trace_url: bodyshotTraceUrl }
              } : undefined
            }
          })
        };
      } catch (error) {
        console.error('[Content Agent] Character creation failed', error);
        if (pipelineSupabase && pipelineCharacterId) {
          try {
            await pipelineSupabase
              .from('characters')
              .update({
                headshot_status: 'failed',
                bodyshot_status: 'failed',
                character_state: 'failed_hard',
                admin_review_required: true,
                visible_to_user: false,
                generation_timestamps: {
                  failed_at: new Date().toISOString()
                }
              })
              .eq('id', pipelineCharacterId);
          } catch (updateError) {
            console.error('[Content Agent] Failed to mark pipeline failure', updateError);
          }
        }
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Character creation failed'
          })
        };
      }
    }

    if (action === 'get_user_characters') {
      const { userId, libraryId } = data || {};
      
      if (!userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required field: userId'
          })
        };
      }

      try {
        const { CharacterDatabase } = await import('./database/CharacterDatabase');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        const characterDb = new CharacterDatabase(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
          logger as any
        );
        
        const characters = await characterDb.getCharactersByUser(userId, { libraryId });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: { characters }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Failed to get characters'
          })
        };
      }
    }

    if (action === 'get_character_by_id') {
      const { characterId, userId } = data || {};
      
      if (!characterId || !userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: characterId, userId'
          })
        };
      }

      try {
        const { CharacterDatabase } = await import('./database/CharacterDatabase');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        const characterDb = new CharacterDatabase(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
          logger as any
        );
        
        const character = await characterDb.getCharacterById(characterId);
        
        if (!character) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: 'Character not found'
            })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: { character }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Failed to get character'
          })
        };
      }
    }

    // Generate character art
    if (action === 'generate_character_art') {
      const { characterId, characterName, characterTraits, userId, ethnicity, isMixedRace, inclusivityTraits: bodyInclusivityTraits, speciesKey, speciesDescriptor, taskId: taskIdFromBody, task_id: taskIdSnake } = body;
      const taskId = taskIdFromBody || taskIdSnake || null
      
      if (!characterId || !characterName || !userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: characterId, characterName, userId'
          })
        };
      }
      console.log('[Content Agent] generate_character_art start', { characterId, userId, hasTraits: !!characterTraits });
      
      try {
        const agent = await getContentAgent();
        const { CharacterImageGenerator } = await import('./services/CharacterImageGenerator');
        const { OpenAI } = await import('openai');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        
        // Get OpenAI instance from agent or create new one
        const openaiKey = process.env.OPENAI_API_KEY || '';
        if (!openaiKey) {
          throw new Error('OpenAI API key not configured');
        }
        const openai = new OpenAI({ apiKey: openaiKey });
        const { ImageSafetyReviewService } = await import('./services/ImageSafetyReviewService');
        const safetyService = new ImageSafetyReviewService(
          openai,
          logger as any,
          process.env.OPENAI_MODEL_VISION || 'gpt-5.2'
        );

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const bucketName = getAssetBucketName();
        
        const imageGenerator = new CharacterImageGenerator(openai, logger as any);

        const existingTask = await fetchGenerationTask(supabase, taskId)
        if (existingTask?.state === 'cancelled') {
          await updateGenerationTask(supabase, taskId, {
            state: 'cancelled',
            current_stage: 'done',
            current_asset: null,
            attempt_index: existingTask?.attempt_index || 0,
            retryable: false,
            next_poll_ms: 0,
            error_code: null,
            error_message: null
          })
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, characterId, status: 'cancelled' })
          };
        }
        
        // Extract traits for character generation
        // Prioritize top-level ethnicity over nested characterTraits.ethnicity
        const characterEthnicity = ethnicity || characterTraits?.ethnicity || [];
        const resolvedSpeciesDescriptor = (speciesDescriptor || characterTraits?.speciesDescriptor || characterTraits?.species || body.species || '').trim();
        const resolvedSpeciesKey = resolveSpeciesKey({
          speciesKey,
          species: characterTraits?.species || body.species,
          speciesDescriptor: resolvedSpeciesDescriptor,
          aboutThem: characterTraits?.aboutThem,
          appearance: characterTraits?.appearance
        });
        const ageSafeLanguage = buildAgeSafeLanguage(characterTraits?.age || 7);
        const worldMaterialHint = computeWorldMaterialHint(
          resolvedSpeciesDescriptor,
          characterTraits?.appearance,
          characterTraits?.aboutThem
        );
        const worldPhysicsHint = computeWorldPhysicsHint(
          resolvedSpeciesDescriptor,
          characterTraits?.appearance,
          characterTraits?.aboutThem
        );
        
        if (!resolvedSpeciesDescriptor || !resolvedSpeciesKey) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: 'Missing required fields: speciesKey/species and speciesDescriptor'
            })
          };
        }
        
        const traits: any = {
          name: characterName,
          age: characterTraits?.age || 7,
          species: characterTraits?.species || resolvedSpeciesKey,
          speciesKey: resolvedSpeciesKey,
          speciesDescriptor: resolvedSpeciesDescriptor,
          ageSafeLanguage,
          worldMaterialHint,
          worldPhysicsHint,
          ethnicity: characterEthnicity,
          gender: characterTraits?.gender,
          isMixedRace: isMixedRace || (Array.isArray(characterEthnicity) && characterEthnicity.length > 1),
          ...characterTraits
        };
        
        // Extract inclusivity traits from body or characterTraits
        const rawInclusivityTraits = bodyInclusivityTraits || characterTraits?.inclusivityTraits || [];
        
        // Convert string array to full trait objects
        // CharacterImageGenerator expects full InclusivityTrait objects from ComprehensiveInclusivityDatabase
        // But REST API passes array of strings like ['hearing_aid', 'wheelchair']
        const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
        
        const inclusivityTraits = rawInclusivityTraits
          .map((trait: any) => {
            const rawId = typeof trait === 'string'
              ? trait
              : (trait?.type || trait?.id || '')
            const normalizedId = resolveCanonicalTraitId(rawId, characterTraits?.traitUserDescriptions || {})
            
            const traitDef = normalizedId ? INCLUSIVITY_TRAITS_MAP[normalizedId] : null
              if (!traitDef) {
                console.warn(`Unknown inclusivity trait: ${trait} (normalized: ${normalizedId})`);
                console.warn(`Available traits:`, Object.keys(INCLUSIVITY_TRAITS_MAP).slice(0, 10).join(', '), '...');
                return null;
              }
            if (typeof trait === 'object' && trait) {
              return {
                ...traitDef,
                userDescription: trait.description || trait.storyIntegration || trait.userDescription,
                selectedVisualIndicators: trait.selectedVisualIndicators,
                selectedBehavioralIndicators: trait.selectedBehavioralIndicators,
                selectedSeverity: trait.severity || trait.selectedSeverity,
                selectedSubtype: trait.subtype || trait.selectedSubtype
              }
            }
            return traitDef;
          })
          .filter((t: any) => t !== null); // Remove nulls
        
        // Generate hex colors (simplified - would normally calculate from traits)
        const hexColors = {
          skin: characterTraits?.skinTone || '#F4C2A1',
          hair: characterTraits?.hairColor || '#8B4513',
          eyes: characterTraits?.eyeColor || '#4A90E2'
        };
        
        // Generate headshot (reference) first
        const headshotAttemptIndex = await getNextAttemptIndex(supabase, characterId, 'headshot')
        await updateGenerationTask(supabase, taskId, {
          state: 'running',
          current_stage: 'generating_headshot',
          current_asset: 'headshot',
          attempt_index: headshotAttemptIndex,
          retryable: true,
          next_poll_ms: 2000,
          error_code: null,
          error_message: null
        })
        let headshot: any;
        try {
          headshot = await imageGenerator.generateHeadshot(traits, inclusivityTraits, hexColors, characterId);
        } catch (error: any) {
          const prompt = error?.prompt || null
          const promptHash = prompt ? hashPrompt(prompt) : null
          const failureCodes = ['prompt_guard']
          const tracePayload = {
            characterId,
            assetType: 'headshot',
            attemptIndex: headshotAttemptIndex,
            generationMode: 'character_headshot',
            prompt,
            promptHash,
            model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            url: null,
            openaiRequestId: error?.request_id || error?.requestId || null,
            failureCodes,
            failureReason: error?.message || 'Headshot prompt guard failed',
            validation: null
          }
          const traceKey = buildAttemptTraceKey({
            characterId,
            assetType: 'headshot',
            attemptIndex: headshotAttemptIndex,
            requestId: error?.request_id || error?.requestId || null
          })
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: traceKey,
            Body: Buffer.from(JSON.stringify(tracePayload, null, 2)),
            ContentType: 'application/json',
            CacheControl: 'public, max-age=31536000'
          }))
          const traceUrl = getCdnUrl(traceKey)
          await createImageAttempt(supabase, {
            characterId,
            assetType: 'headshot',
            status: 'hard_fail',
            attemptIndex: headshotAttemptIndex,
            imageUrl: null,
            failImageUrl: null,
            prompt,
            promptHash,
            traceUrl,
            failureCodes,
            failureReason: error?.message || 'Headshot prompt guard failed',
            modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            openaiRequestId: error?.request_id || error?.requestId || null,
            validationSummary: {
              failure_code: 'prompt_guard',
              failure_reason: error?.message || 'Headshot prompt guard failed'
            },
            visibility: 'internal_only'
          })
          await supabase
            .from('characters')
            .update({
              headshot_status: 'failed_hard',
              headshot_trace_url: traceUrl,
              failure_codes: failureCodes,
              failure_summary: error?.message || 'Headshot prompt guard failed',
              admin_review_required: true,
              character_state: 'failed_hard',
              visible_to_user: false,
              last_failure_at: new Date().toISOString()
            })
            .eq('id', characterId)
          throw error
        }

        // Prepare headshot buffer for images.edit()
        let headshotBuffer: Buffer;
        if (headshot.url.startsWith('data:image/')) {
          const base64Data = headshot.url.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid base64 data URI for headshot');
          }
          headshotBuffer = Buffer.from(base64Data, 'base64');
        } else {
          const imageResponse = await fetch(headshot.url);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download headshot: ${imageResponse.status}`);
          }
          headshotBuffer = Buffer.from(await imageResponse.arrayBuffer());
        }

        const taskAfterHeadshot = await fetchGenerationTask(supabase, taskId)
        if (taskAfterHeadshot?.state === 'cancelled') {
          await updateGenerationTask(supabase, taskId, {
            state: 'cancelled',
            current_stage: 'done',
            current_asset: null,
            attempt_index: taskAfterHeadshot?.attempt_index || 0,
            retryable: false,
            next_poll_ms: 0,
            error_code: null,
            error_message: null
          })
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, characterId, status: 'cancelled' })
          };
        }

        // Generate bodyshot using headshot as reference (images.edit)
        const bodyshotAttemptIndex = await getNextAttemptIndex(supabase, characterId, 'bodyshot')
        await updateGenerationTask(supabase, taskId, {
          state: 'running',
          current_stage: 'generating_bodyshot',
          current_asset: 'bodyshot',
          attempt_index: bodyshotAttemptIndex,
          retryable: true,
          next_poll_ms: 2000,
          error_code: null,
          error_message: null
        })
        let bodyshot: any;
        try {
          bodyshot = await imageGenerator.generateBodyshotWithReference(
          traits,
          inclusivityTraits,
          hexColors,
          headshotBuffer,
          characterId,
          inclusivityTraits
        );
        } catch (error: any) {
          const prompt = error?.prompt || null
          const promptHash = prompt ? hashPrompt(prompt) : null
          const failureCodes = ['prompt_guard']
          const tracePayload = {
            characterId,
            assetType: 'bodyshot',
            attemptIndex: bodyshotAttemptIndex,
            generationMode: 'character_bodyshot_outpaint',
            prompt,
            promptHash,
            model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            url: null,
            openaiRequestId: error?.request_id || error?.requestId || null,
            failureCodes,
            failureReason: error?.message || 'Bodyshot prompt guard failed',
            validation: null
          }
          const traceKey = buildAttemptTraceKey({
            characterId,
            assetType: 'bodyshot',
            attemptIndex: bodyshotAttemptIndex,
            requestId: error?.request_id || error?.requestId || null
          })
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: traceKey,
            Body: Buffer.from(JSON.stringify(tracePayload, null, 2)),
            ContentType: 'application/json',
            CacheControl: 'public, max-age=31536000'
          }))
          const traceUrl = getCdnUrl(traceKey)
          await createImageAttempt(supabase, {
            characterId,
            assetType: 'bodyshot',
            status: 'hard_fail',
            attemptIndex: bodyshotAttemptIndex,
            imageUrl: null,
            failImageUrl: null,
            prompt,
            promptHash,
            traceUrl,
            failureCodes,
            failureReason: error?.message || 'Bodyshot prompt guard failed',
            modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
            openaiRequestId: error?.request_id || error?.requestId || null,
            validationSummary: {
              failure_code: 'prompt_guard',
              failure_reason: error?.message || 'Bodyshot prompt guard failed'
            },
            visibility: 'internal_only'
          })
          await supabase
            .from('characters')
            .update({
              bodyshot_status: 'failed_hard',
              bodyshot_trace_url: traceUrl,
              failure_codes: failureCodes,
              failure_summary: error?.message || 'Bodyshot prompt guard failed',
              admin_review_required: true,
              character_state: 'needs_retry',
              last_failure_at: new Date().toISOString()
            })
            .eq('id', characterId)
          throw error
        }
        
        // Upload images to S3 and get CDN URLs
        
        // Helper to upload image and return CDN URL
        async function uploadImageToS3(imageUrl: string, key: string): Promise<string> {
          // If already an S3/CDN URL, return as-is
          if (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('assets.storytailor.dev')) {
            // If it's an S3 URL, convert to CDN
            if (imageUrl.includes('s3.amazonaws.com')) {
              const match = imageUrl.match(/s3[.-]?[a-z0-9-]*\.amazonaws\.com\/(.+)$/i);
              if (match && match[1]) {
                return getCdnUrl(match[1]);
              }
            }
            return imageUrl;
          }
          
          let imageBuffer: Buffer;
          
          // Check if it's a base64 data URI
          if (imageUrl.startsWith('data:image/')) {
            // Extract base64 data from data URI
            const base64Data = imageUrl.split(',')[1];
            if (!base64Data) {
              throw new Error('Invalid base64 data URI');
            }
            imageBuffer = Buffer.from(base64Data, 'base64');
            console.log('[Content Agent] Converted base64 data URI to buffer', { 
              keyPreview: key.substring(0, 50),
              bufferSize: imageBuffer.length 
            });
          } else {
            // Download from temporary URL (OpenAI HTTP URL)
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.status}`);
            }
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          }
          
          // Upload to S3
          console.log('[Content Agent] Uploading to S3', { bucket: bucketName, key });
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000'
          }));
          console.log('[Content Agent] S3 upload successful', { key });
          
          // Return CDN URL
          const cdnUrl = getCdnUrl(key);
          console.log('[Content Agent] CDN URL generated', { cdnUrl });
          return cdnUrl;
        }
        
        // Upload headshot
        const headshotKey = `characters/${characterId}/headshot-${Date.now()}.png`;
        const headshotCdnUrl = await uploadImageToS3(headshot.url, headshotKey);
        
        // Upload bodyshot
        const bodyshotKey = `characters/${characterId}/bodyshot-${Date.now()}.png`;
        const bodyshotCdnUrl = await uploadImageToS3(bodyshot.url, bodyshotKey);

        const getBase64FromImageUrl = async (imageUrl: string): Promise<string> => {
          if (imageUrl.startsWith('data:image/')) {
            const base64Data = imageUrl.split(',')[1];
            if (!base64Data) throw new Error('Invalid base64 data URI');
            return base64Data;
          }
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image for validation: ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          return buffer.toString('base64');
        }

        const validationTraits = inclusivityTraits.filter((trait: any) => trait.id !== 'autism');
        const headshotAlpha = await detectTransparentBackground(headshotCdnUrl)
        const headshotValidation = await safetyService.reviewImageComprehensive({
          candidateB64: await getBase64FromImageUrl(headshotCdnUrl),
          targetRating: 'G',
          characterName,
          expectedTraits: validationTraits,
          imageType: 'headshot',
          characterContext: {
            speciesKey: resolvedSpeciesKey,
            speciesDescriptor: resolvedSpeciesDescriptor,
            isHumanLike: isHumanLikeInput(traits),
            developmentalProfile: ageSafeLanguage,
            worldMaterialHint,
            worldPhysicsHint,
            signatureColors: traits.signatureColors
          }
        });
        const headshotValidationWithAlpha = {
          ...headshotValidation,
          transparent_background: headshotAlpha.hasTransparency,
          transparent_background_ratio: headshotAlpha.ratio
        }
        const bodyshotValidation = await safetyService.reviewImageComprehensive({
          candidateB64: await getBase64FromImageUrl(bodyshotCdnUrl),
          targetRating: 'G',
          characterName,
          expectedTraits: validationTraits,
          imageType: 'bodyshot',
          characterContext: {
            speciesKey: resolvedSpeciesKey,
            speciesDescriptor: resolvedSpeciesDescriptor,
            isHumanLike: isHumanLikeInput(traits),
            developmentalProfile: ageSafeLanguage,
            worldMaterialHint,
            worldPhysicsHint,
            signatureColors: traits.signatureColors
          }
        });

        const headshotOutcome = classifyReviewOutcome(headshotValidationWithAlpha, inclusivityTraits, {
          assetType: 'headshot',
          speciesKey: resolvedSpeciesKey,
          speciesDescriptor: resolvedSpeciesDescriptor,
          alphaDetected: headshotAlpha.hasTransparency
        })
        const bodyshotOutcome = classifyReviewOutcome(bodyshotValidation, inclusivityTraits, {
          assetType: 'bodyshot',
          speciesKey: resolvedSpeciesKey,
          speciesDescriptor: resolvedSpeciesDescriptor
        })
        const headshotStatus = headshotOutcome.status === 'pass' ? 'ready' : headshotOutcome.status
        const bodyshotStatus = bodyshotOutcome.status === 'pass' ? 'ready' : bodyshotOutcome.status
        const maxHeadshotAttempts = Number(process.env.HEADSHOT_MAX_ATTEMPTS || '2')
        const maxBodyshotAttempts = Number(process.env.BODYSHOT_MAX_ATTEMPTS || '2')
        const shouldRetryHeadshot = headshotOutcome.status === 'hard_fail' && headshotAttemptIndex < maxHeadshotAttempts
        const shouldRetryBodyshot = bodyshotOutcome.status === 'hard_fail' && bodyshotAttemptIndex < maxBodyshotAttempts
        let characterState = headshotOutcome.status === 'pass'
          ? (bodyshotOutcome.status === 'pass'
            ? 'ready'
            : (bodyshotOutcome.status === 'soft_fail' ? 'failed_soft' : (shouldRetryBodyshot ? 'needs_retry' : 'failed_hard')))
          : (headshotOutcome.status === 'soft_fail'
            ? 'failed_soft'
            : (shouldRetryHeadshot ? 'needs_retry' : 'failed_hard'))
        const headshotBanner = headshotOutcome.status === 'soft_fail' ? pickUserBanner(characterId) : null
        const bodyshotBanner = headshotOutcome.status === 'soft_fail'
          ? headshotBanner
          : (bodyshotOutcome.status === 'soft_fail' ? pickUserBanner(characterId) : null)
        
        // Create image objects with both S3 (for internal use) and CDN (for frontend) URLs
        const { getS3Url } = await import('./utils/cdnUrl');
        const headshotS3Url = getS3Url(headshotKey);
        const bodyshotS3Url = getS3Url(bodyshotKey);
        
        const images = [
          { 
            url: headshotCdnUrl, // CDN URL for frontend
            s3Url: headshotS3Url, // S3 URL for internal reference downloads
            type: 'headshot', 
            prompt: headshot.prompt,
            openaiRequestId: (headshot as any).openaiRequestId || null
          },
          { 
            url: bodyshotCdnUrl, // CDN URL for frontend
            s3Url: bodyshotS3Url, // S3 URL for internal reference downloads
            type: 'bodyshot', 
            prompt: bodyshot.prompt,
            openaiRequestId: (bodyshot as any).openaiRequestId || null
          }

        ];

        // Build and upload per-asset trace files (production parity)
        const traceTimestamp = Date.now();
        const modelName = process.env.IMAGE_MODEL || 'gpt-image-1.5';
        const headshotPrompt = headshot.prompt || ''
        const bodyshotPrompt = bodyshot.prompt || ''
        const supportTraitIds = inclusivityTraits
          .filter(trait => {
            const id = trait.id.toLowerCase()
            const category = (trait.category || '').toLowerCase()
            const supportCategories = ['mobility', 'sensory']
            return supportCategories.includes(category) || /wheelchair|prosthetic|hearing|halo|brace|crutch|walker|cane/.test(id)
          })
          .map(trait => trait.id)
        const identityTraitIds = inclusivityTraits
          .filter(trait => !supportTraitIds.includes(trait.id))
          .map(trait => trait.id)
        const similarityPayload = (bodyshot as any).similarity
          ? {
              method: (bodyshot as any).similarity.method,
              score: (bodyshot as any).similarity.score
            }
          : null

        const traceBase = {
          characterId,
          timestamp: new Date(traceTimestamp).toISOString(),
          globalStyleHash: getGlobalStyleHash(),
          globalStylePresent: {
            headshot: isGlobalStylePresent(headshotPrompt),
            bodyshot: isGlobalStylePresent(bodyshotPrompt)
          },
          inclusivityTraits: {
            raw: rawInclusivityTraits,
            converted: inclusivityTraits.map(trait => ({
              id: trait.id,
              label: trait.label,
              category: trait.category,
              appliesToHeadshot: (trait as any).appliesToHeadshot !== false,
              appliesToBodyshot: (trait as any).appliesToBodyshot !== false,
              userDescription: (trait as any).userDescription || null
            }))
          },
          appliedTraits: {
            headshot: (headshot as any).traitTrace?.applicableTraitIds || [],
            bodyshot: (bodyshot as any).traitTrace?.applicableTraitIds || [],
            headshotExcluded: (headshot as any).traitTrace?.excludedTraitIds || [],
            bodyshotExcluded: (bodyshot as any).traitTrace?.excludedTraitIds || []
          },
          appliedTraitsHeadshot: (headshot as any).traitTrace?.applicableTraitIds || [],
          appliedTraitsBodyshot: (bodyshot as any).traitTrace?.applicableTraitIds || [],
          excludedForHeadshotLeakage: (headshot as any).traitTrace?.excludedForHeadshotLeakage || [],
          blocksPresent: {
            identityLock: headshotPrompt.includes('MADE-UP SPECIES LOCK:') || bodyshotPrompt.includes('MADE-UP SPECIES LOCK:'),
            worldMaterials: headshotPrompt.includes('WORLD MATERIALS:') || bodyshotPrompt.includes('WORLD MATERIALS:'),
            supportTranslation: headshotPrompt.includes('SUPPORT TRANSLATION (required):') || bodyshotPrompt.includes('SUPPORT TRANSLATION (required):'),
            identityTranslation: headshotPrompt.includes('IDENTITY TRAIT TRANSLATION (required):') || bodyshotPrompt.includes('IDENTITY TRAIT TRANSLATION (required):')
          },
          similarity: similarityPayload,
          continuity: {
            identity: similarityPayload,
            supports: {
              expectedSupportTraitIds: supportTraitIds,
              expectedIdentityTraitIds: identityTraitIds,
              appliedSupportTraitIds: supportTraitIds.filter(id => (bodyshot as any).traitTrace?.applicableTraitIds?.includes(id)),
              promptSupportIntegration: bodyshotPrompt.includes('SUPPORT TRANSLATION (required):')
            }
          },
          imageKeys: {
            headshotKey,
            bodyshotKey
          },
          headshotInputHash: (bodyshot as any).headshotInputHash || null
        };

        const writeAssetTrace = async (
          assetType: 'headshot' | 'bodyshot',
          prompt: string,
          promptHash: string | null,
          requestId: string | null,
          endpoint: string,
          attemptIndex: number,
          validation: any,
          outcome: any
        ) => {
          const traceKey = buildAttemptTraceKey({
            characterId,
            assetType,
            attemptIndex,
            requestId
          })
          const tracePayload = {
            ...traceBase,
            assetType,
            attemptIndex,
            openaiRequestId: requestId,
            prompt,
            promptLenOriginal: prompt.length || 0,
            promptLenFinal: prompt.length || 0,
            promptHash,
            model: modelName,
            endpoint,
            validation,
            outcome
          }
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: traceKey,
            Body: Buffer.from(JSON.stringify(tracePayload, null, 2)),
          ContentType: 'application/json',
          CacheControl: 'public, max-age=31536000'
          }))
          return { traceKey, traceUrl: getCdnUrl(traceKey) }
        }

        const headshotTrace = await writeAssetTrace(
          'headshot',
          headshotPrompt,
          (headshot as any).promptHash || null,
          (headshot as any).openaiRequestId || null,
          '/v1/images/generations',
          headshotAttemptIndex,
          headshotValidationWithAlpha,
          headshotOutcome
        )
        const bodyshotTrace = await writeAssetTrace(
          'bodyshot',
          bodyshotPrompt,
          (bodyshot as any).promptHash || null,
          (bodyshot as any).openaiRequestId || null,
          '/v1/images/edits',
          bodyshotAttemptIndex,
          bodyshotValidation,
          bodyshotOutcome
        )

        images.forEach(image => {
          if (image.type === 'headshot') {
            (image as any).traceUrl = headshotTrace.traceUrl;
            (image as any).traceKey = headshotTrace.traceKey;
          }
          if (image.type === 'bodyshot') {
            (image as any).traceUrl = bodyshotTrace.traceUrl;
            (image as any).traceKey = bodyshotTrace.traceKey;
          }
        });
        
        const headshotAttempt = await createImageAttempt(supabase, {
          characterId,
          assetType: 'headshot',
          status: headshotOutcome.status,
          attemptIndex: headshotAttemptIndex,
          imageUrl: headshotCdnUrl,
          failImageUrl: headshotOutcome.status === 'hard_fail' ? headshotCdnUrl : null,
          prompt: headshotPrompt,
          promptHash: (headshot as any).promptHash || null,
          traceUrl: headshotTrace.traceUrl,
          failureCodes: headshotOutcome.failureCodes,
          failureReason: headshotOutcome.failureReason,
          modelUsed: modelName,
          openaiRequestId: (headshot as any).openaiRequestId || null,
          validationSummary: headshotValidationWithAlpha || null,
          visibility: headshotOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
        })
        const bodyshotAttempt = await createImageAttempt(supabase, {
          characterId,
          assetType: 'bodyshot',
          status: bodyshotOutcome.status,
          attemptIndex: bodyshotAttemptIndex,
          imageUrl: bodyshotCdnUrl,
          failImageUrl: bodyshotOutcome.status === 'hard_fail' ? bodyshotCdnUrl : null,
          prompt: bodyshotPrompt,
          promptHash: (bodyshot as any).promptHash || null,
          traceUrl: bodyshotTrace.traceUrl,
          failureCodes: bodyshotOutcome.failureCodes,
          failureReason: bodyshotOutcome.failureReason,
          modelUsed: modelName,
          openaiRequestId: (bodyshot as any).openaiRequestId || null,
          validationSummary: bodyshotValidation || null,
          visibility: bodyshotOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
        })

        // V3 ENHANCEMENT: Extract character color palette (3 signature colors)

        // Use headshot for color extraction (more representative of character identity)
        let characterColorPalette: string[] = [];
        try {
          const { ColorExtractionService } = await import('./services/ColorExtractionService');
          const { default: winston } = await import('winston');
          const colorLogger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [new winston.transports.Console({ format: winston.format.simple() })]
          });
          const colorExtractor = new ColorExtractionService(colorLogger);
          
          // Extract colors from headshot S3 URL (use S3 URL for internal access)
          const extractedColors = await colorExtractor.extractDeepContrastingColors(headshotS3Url);
          characterColorPalette = [
            extractedColors.primary,
            extractedColors.secondary,
            extractedColors.tertiary
          ];
          
          console.log('[Content Agent] Extracted character color palette', {
            characterId,
            colorPalette: characterColorPalette
          });
        } catch (colorError) {
          console.warn('[Content Agent] Failed to extract character colors, using fallback', {
            characterId,
            error: colorError instanceof Error ? colorError.message : String(colorError)
          });
          // Fallback: use default palette
          characterColorPalette = ['#1A1A1A', '#8B0000', '#191970'];
        }
        
        // Update character in database with CDN URLs
        console.log('[Content Agent] Updating character in database', { 
          characterId,
          headshotCdnUrl,
          bodyshotCdnUrl,
          imageCount: images.length
        });

        const failureCodes = headshotOutcome.status === 'hard_fail'
          ? headshotOutcome.failureCodes
          : (bodyshotOutcome.status === 'hard_fail' ? bodyshotOutcome.failureCodes : [])
        const failureSummary = headshotOutcome.status === 'hard_fail'
          ? headshotOutcome.failureReason
          : (bodyshotOutcome.status === 'hard_fail' ? bodyshotOutcome.failureReason : null)
        const adminReviewRequired = (headshotOutcome.status === 'hard_fail' && !shouldRetryHeadshot)
          || (bodyshotOutcome.status === 'hard_fail' && !shouldRetryBodyshot)
        const userBanner = bodyshotBanner
        
        const { data: updateResult, error: updateError } = await supabase
          .from('characters')
          .update({
            reference_images: images,
            appearance_url: headshotCdnUrl,
            color_palette: characterColorPalette, // V3 ENHANCEMENT: 3 signature colors for HUE consistency
            "headshot_url": headshotCdnUrl,
            "bodyshot_url": bodyshotCdnUrl,
            "headshot_status": headshotStatus,
            "bodyshot_status": bodyshotStatus,
            "headshot_fail_url": headshotOutcome.status === 'hard_fail' ? headshotCdnUrl : null,
            "bodyshot_fail_url": bodyshotOutcome.status === 'hard_fail' ? bodyshotCdnUrl : null,
            "headshot_prompt": headshot.prompt,
            "bodyshot_prompt": bodyshot.prompt,
            "current_headshot_attempt_id": headshotAttempt?.id || null,
            "current_bodyshot_attempt_id": bodyshotAttempt?.id || null,
            "last_good_headshot_attempt_id": headshotOutcome.status === 'pass' ? headshotAttempt?.id || null : null,
            "last_good_bodyshot_attempt_id": bodyshotOutcome.status === 'pass' ? bodyshotAttempt?.id || null : null,
            "prompt_hashes": {
              headshot: (headshot as any).promptHash || null,
              bodyshot: (bodyshot as any).promptHash || null
            },
            "global_style_hash": getGlobalStyleHash(),
            "applied_inclusivity_traits": (headshot as any).traitTrace?.applicableTraitIds || [],
            "excluded_traits_headshot": (headshot as any).traitTrace?.excludedForHeadshotLeakage || [],
            "excluded_traits_bodyshot": (bodyshot as any).traitTrace?.excludedTraitIds || [],
            "image_model_used": modelName,
            "headshot_trace_url": headshotTrace.traceUrl,
            "bodyshot_trace_url": bodyshotTrace.traceUrl,
            "failure_codes": failureCodes,
            "failure_summary": failureSummary,
            "admin_review_required": adminReviewRequired,
            "character_state": characterState,
            "visible_to_user": headshotOutcome.status !== 'hard_fail',
            "user_banner": userBanner,
            "user_banner_updated_at": userBanner ? new Date().toISOString() : null,
            "generation_timestamps": {
              generated_at: new Date().toISOString()
            }
          })
          .eq('id', characterId)
          .select();
        
        if (updateError) {
          console.error('[Content Agent] Supabase update failed', { 
            error: updateError,
            characterId 
          });
          throw new Error(`Failed to update character: ${updateError.message}`);
        }
        
        console.log('[Content Agent] Character updated successfully in database', { 
          characterId,
          updateResult
        });

        const headshotNeedsEdit = shouldQueueEdit('headshot', headshotOutcome.failureCodes)
        const bodyshotNeedsEdit = shouldQueueEdit('bodyshot', bodyshotOutcome.failureCodes)
        const editQueued = headshotNeedsEdit || bodyshotNeedsEdit
        if (headshotOutcome.status === 'hard_fail' && !shouldRetryHeadshot) {
          await updateGenerationTask(supabase, taskId, {
            state: 'failed_hard',
            current_stage: 'generating_headshot',
            current_asset: 'headshot',
            attempt_index: headshotAttemptIndex,
            retryable: false,
            next_poll_ms: 0,
            error_code: headshotOutcome.failureCodes[0] || 'headshot_failed',
            error_message: headshotOutcome.failureReason || 'Headshot failed'
          })
        } else if (bodyshotOutcome.status === 'hard_fail' && !shouldRetryBodyshot) {
          await updateGenerationTask(supabase, taskId, {
            state: 'failed_hard',
            current_stage: 'generating_bodyshot',
            current_asset: 'bodyshot',
            attempt_index: bodyshotAttemptIndex,
            retryable: false,
            next_poll_ms: 0,
            error_code: bodyshotOutcome.failureCodes[0] || 'bodyshot_failed',
            error_message: bodyshotOutcome.failureReason || 'Bodyshot failed'
          })
        } else if (shouldRetryHeadshot) {
          await updateGenerationTask(supabase, taskId, {
            state: 'running',
            current_stage: 'generating_headshot',
            current_asset: 'headshot',
            attempt_index: headshotAttemptIndex,
            retryable: true,
            next_poll_ms: 2000,
            error_code: headshotOutcome.failureCodes[0] || null,
            error_message: headshotOutcome.failureReason || null
          })
        } else if (shouldRetryBodyshot) {
          await updateGenerationTask(supabase, taskId, {
            state: 'running',
            current_stage: 'generating_bodyshot',
            current_asset: 'bodyshot',
            attempt_index: bodyshotAttemptIndex,
            retryable: true,
            next_poll_ms: 2000,
            error_code: bodyshotOutcome.failureCodes[0] || null,
            error_message: bodyshotOutcome.failureReason || null
          })
        } else if (editQueued) {
          await updateGenerationTask(supabase, taskId, {
            state: 'running',
            current_stage: 'editing_soft_fix',
            current_asset: 'edit',
            attempt_index: 0,
            retryable: false,
            next_poll_ms: 2000,
            error_code: null,
            error_message: null
          })
        } else {
          await updateGenerationTask(supabase, taskId, {
            state: 'succeeded',
            current_stage: 'done',
            current_asset: null,
            attempt_index: bodyshotAttemptIndex,
            retryable: false,
            next_poll_ms: 0,
            error_code: null,
            error_message: null
          })
        }

        if (headshotNeedsEdit && headshotAttempt?.id) {
          await queueEditFix({
            action: 'edit_character_image',
            characterId,
            attemptId: headshotAttempt.id,
            assetType: 'headshot',
            taskId
          })
        }
        if (bodyshotNeedsEdit && bodyshotAttempt?.id) {
          await queueEditFix({
            action: 'edit_character_image',
            characterId,
            attemptId: bodyshotAttempt.id,
            assetType: 'bodyshot',
            taskId
          })
        }
        if (shouldRetryHeadshot) {
          await queueEditFix({ action: 'retry_headshot', characterId, taskId })
        }
        if (shouldRetryBodyshot) {
          await queueEditFix({ action: 'retry_bodyshot', characterId, taskId })
        }
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            characterId,
            images
          })
        };
      } catch (error) {
        console.error('[Content Agent] Character art generation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Character art generation failed'
          })
        };
      }
    }

    if (action === 'edit_character_image') {
      const {
        characterId,
        attemptId,
        assetType,
        taskId: taskIdFromBody,
        task_id: taskIdSnake,
        force_edit: forceEdit,
        forceEdit: forceEditCamel,
        force_full_redraw: forceFullRedraw,
        forceFullRedraw: forceFullRedrawCamel
      } = body;
      const taskId = taskIdFromBody || taskIdSnake || null
      if (!characterId || !attemptId || !assetType) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: characterId, attemptId, assetType'
          })
        };
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );
      const logger = { info: console.log, warn: console.warn, error: console.error };
      const { OpenAI } = await import('openai');
      const openaiKey = process.env.OPENAI_API_KEY || '';
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured');
      }
      const openai = new OpenAI({ apiKey: openaiKey });

      const { data: attempt, error: attemptError } = await supabase
        .from('character_image_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('character_id', characterId)
        .single();

      if (attemptError || !attempt) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Attempt not found'
          })
        };
      }

      const allowRepeat = forceEdit === true || forceEditCamel === true
      const useFullRedraw = forceFullRedraw === true || forceFullRedrawCamel === true
      const { data: priorEdits } = await supabase
        .from('character_image_attempts')
        .select('id')
        .eq('fix_of_attempt_id', attemptId)
        .limit(1)

      if (!allowRepeat && Array.isArray(priorEdits) && priorEdits.length > 0) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            skipped: true,
            reason: 'Edit already exists for this attempt'
          })
        };
      }

      const { data: characterRow, error: characterError } = await supabase
        .from('characters')
        .select('id, name, traits, headshot_status, bodyshot_status, character_state, prompt_hashes')
        .eq('id', characterId)
        .single();

      if (characterError || !characterRow) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Character not found'
          })
        };
      }

      const sourceUrl = attempt.image_url || attempt.fail_image_url;
      if (!sourceUrl) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'No source image found for edit'
          })
        };
      }

      const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
      const { CharacterImageGenerator } = await import('./services/CharacterImageGenerator')

      const rawTraits = characterRow.traits || {};
      const rawInclusivityTraits = rawTraits.inclusivityTraits || [];
      const inclusivityTraits = (rawInclusivityTraits || [])
        .map((trait: any) => {
          const rawId = typeof trait === 'string'
            ? String(trait).trim()
            : (trait?.type || trait?.id || '')
          const normalizedId = resolveCanonicalTraitId(rawId, rawTraits?.traitUserDescriptions || {})
          const traitDef = INCLUSIVITY_TRAITS_MAP[normalizedId];
          if (!traitDef) return null;
          if (typeof trait === 'object' && trait) {
            return {
              ...traitDef,
              userDescription: trait.description || trait.storyIntegration || trait.userDescription,
              selectedVisualIndicators: trait.selectedVisualIndicators,
              selectedBehavioralIndicators: trait.selectedBehavioralIndicators,
              selectedSeverity: trait.severity || trait.selectedSeverity,
              selectedSubtype: trait.subtype || trait.selectedSubtype
            }
          }
          return { ...traitDef };
        })
        .filter(Boolean);

      const imageGenerator = new CharacterImageGenerator(openai, logger as any)
      const editAttemptIndex = await getNextAttemptIndex(supabase, characterId, assetType)
      const supportWorldFitIssues = Array.isArray(attempt.validation_summary?.support_world_fit)
        ? attempt.validation_summary.support_world_fit.filter((entry: any) => entry?.world_fit === false)
        : []
      const supportWorldFitNotes = supportWorldFitIssues.length > 0
        ? imageGenerator.buildSupportWorldFitEditNotes(rawTraits, inclusivityTraits)
        : ''
      const mobilityTraitPresent = inclusivityTraits.some(trait => /wheelchair|walker|crutch|cane/.test(String(trait.id || '')))
      const mobilityVisibilityEntry = Array.isArray(attempt.validation_summary?.traits_visible)
        ? attempt.validation_summary.traits_visible.find((entry: any) => /wheelchair|mobility/i.test(String(entry?.trait || '')))
        : null
      const mobilityMissingByLabel = Array.isArray(attempt.validation_summary?.missing_traits)
        && attempt.validation_summary.missing_traits.some((label: string) => /wheelchair|mobility/i.test(String(label || '')))
      const mobilityMissingOrUnclear = mobilityTraitPresent && (
        mobilityVisibilityEntry?.visible === false
        || mobilityVisibilityEntry?.visible === null
        || mobilityMissingByLabel
      )
      const baseAttemptIndex = attempt.attempt_index || 1
      const editPassNumber = Math.max(1, editAttemptIndex - baseAttemptIndex)
      const mobilitySupportEditNotes = mobilityMissingOrUnclear
        ? (editPassNumber <= 1
          ? 'MOBILITY SUPPORT FIX (attempt 1): Add a world-native mobility support device clearly in use. Wheels optional. Include a visible seat/support frame, contact points, and a gentle motion cue (glide trail, cloud dew tracks, starlight wake). Keep it safe, kid-friendly, and story-native.'
          : 'MOBILITY SUPPORT FIX (attempt 2): Simplify pose and framing for clarity. Make the mobility support device dominant in frame, with a clear seat/support frame, obvious contact points, and minimal occlusion. Keep whimsy, but prioritize readability and in-use posture.'
        )
        : ''
      const constraintBlock = imageGenerator.buildTraitConstraintsBlock(
        rawTraits,
        inclusivityTraits,
        assetType === 'headshot' ? 'headshot' : 'bodyshot'
      )
      const constraintText = constraintBlock ? `${constraintBlock}\n` : ''
      const speciesKey = resolveSpeciesKey(rawTraits)
      const isExplicitHuman = isExplicitHumanSpecies(speciesKey, rawTraits?.speciesDescriptor || '')
      const nonhumanIdentityNotes = !isExplicitHuman
        ? imageGenerator.buildNonHumanMaterialIdentityBlock(rawTraits, assetType === 'headshot' ? 'headshot' : 'bodyshot')
        : ''
      // Assumption: drift correction should be stronger but still positive and identity-preserving.
      const driftMaterial = rawTraits.worldMaterialHint || 'world-native material'
      const nonhumanDriftNotes = attempt.validation_summary?.nonhuman_human_default === true && !isExplicitHuman
        ? `Material-first correction: reshape the face and head so they are fully formed from ${driftMaterial}. Keep the same expression, gaze, and framing while rendering the face as layered ${driftMaterial} shapes with embedded light features and soft material texture.`
        : ''

      const refinementNotes = [
        nonhumanDriftNotes,
        nonhumanIdentityNotes,
        supportWorldFitNotes,
        mobilitySupportEditNotes,
        attempt.validation_summary?.suggested_trait_fix,
        attempt.validation_summary?.suggested_style_fix,
        attempt.validation_summary?.suggested_fix_prompt
      ].filter(Boolean)

      const refinementText = refinementNotes.length > 0
        ? refinementNotes.join(' ')
        : 'Refine clarity and compliance while preserving identity and overall design.'

      const basePrompt = (() => {
        const rawPrompt = attempt.prompt || ''
        if (isExplicitHuman) return rawPrompt
        const lines = rawPrompt.split('\n')
        const filtered = lines.filter(line => {
          const lower = line.toLowerCase()
          if (lower.includes('skin tone') || lower.includes('hair:') || lower.includes('eyes:')) return false
          if (lower.includes('ethnicity:') || lower.includes('heritage')) return false
          if (lower.includes('developmental visual profile')) return false
          if (lower.includes('precise visual details')) return false
          return true
        })
        return filtered.join('\n').trim()
      })()
      const editPrompt = supportWorldFitNotes
        ? `DEVICE WORLD-FIT REFINEMENT: Preserve identity, colors, materials, and expression from the source image. Only adjust assistive device materials, silhouette accents, and world integration. ${constraintText}${refinementText} ${basePrompt}`.trim()
        : `REFINEMENT PASS: Preserve identity, colors, materials, and expression from the source image. ${constraintText}${refinementText} ${basePrompt}`.trim()
      const sanitizedEditPrompt = sanitizeStylePhrases(sanitizeChildWords(editPrompt))
      const editPromptHash = hashPrompt(sanitizedEditPrompt)

      const fetchBufferFromUrl = async (imageUrl: string) => {
        if (imageUrl.startsWith('data:image/')) {
          const base64Data = imageUrl.split(',')[1];
          if (!base64Data) throw new Error('Invalid base64 data URI');
          return Buffer.from(base64Data, 'base64');
        }
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status}`);
        }
        return Buffer.from(await response.arrayBuffer());
      };

      const sourceBuffer = await fetchBufferFromUrl(sourceUrl);
      const { default: Jimp } = await import('jimp');
      const sourceImage = await Jimp.read(sourceBuffer);
      const width = sourceImage.getWidth();
      const height = sourceImage.getHeight();
      const size = width === height ? '1024x1024' : (height > width ? '1024x1536' : '1536x1024');
      // Assumption: full-redraw edit is only used for manual remediation of drifted assets.
      const maskBuffer = useFullRedraw
        ? await new Jimp(width, height, 0xffffffff).getBufferAsync(Jimp.MIME_PNG)
        : null;

      const FileCtor = (globalThis as any).File;
      const imageFile: any = FileCtor
        ? new FileCtor([sourceBuffer], 'edit-source.png', { type: 'image/png' })
        : sourceBuffer as any;
      const maskFile: any = maskBuffer && FileCtor
        ? new FileCtor([maskBuffer], 'edit-mask.png', { type: 'image/png' })
        : (maskBuffer as any);

      const editResponse = await openai.images.edit({
        model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        image: imageFile,
        ...(maskFile ? { mask: maskFile } : {}),
        prompt: sanitizedEditPrompt,
        size,
        quality: 'high'
      });

      const editData = editResponse.data?.[0];
      if (!editData) {
        throw new Error('No image data returned from edit pass');
      }

      const editedUrl = editData.url
        ? editData.url
        : (editData.b64_json ? `data:image/png;base64,${editData.b64_json}` : null);

      if (!editedUrl) {
        throw new Error('No URL or b64_json returned from edit pass');
      }

      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getCdnUrl } = await import('./utils/cdnUrl');
      const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      const assetBucket = process.env.ASSET_BUCKET || process.env.S3_BUCKET_NAME || 'storytailor-assets-production';
      const assetKey = `characters/${characterId}/${assetType}-edit-${Date.now()}.png`;
      const editedBuffer = editedUrl.startsWith('data:image/')
        ? Buffer.from(editedUrl.split(',')[1], 'base64')
        : await fetchBufferFromUrl(editedUrl);

      await s3.send(new PutObjectCommand({
        Bucket: assetBucket,
        Key: assetKey,
        Body: editedBuffer,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000'
      }));

      const editedCdnUrl = getCdnUrl(assetKey);
      const editAlpha = assetType === 'headshot'
        ? await detectTransparentBackground(editedCdnUrl)
        : { hasTransparency: false, ratio: 0, sampleCount: 0 }

      const { ImageSafetyReviewService } = await import('./services/ImageSafetyReviewService');
      const safetyService = new ImageSafetyReviewService(openai, logger as any, process.env.OPENAI_MODEL_VISION || 'gpt-5.2');
      const candidateB64 = editedBuffer.toString('base64');
      const validation = await safetyService.reviewImageComprehensive({
        candidateB64,
        targetRating: 'G',
        characterName: characterRow.name,
        expectedTraits: inclusivityTraits,
        imageType: assetType === 'bodyshot' ? 'bodyshot' : 'headshot',
        characterContext: {
          speciesKey: resolveSpeciesKey(rawTraits),
          speciesDescriptor: rawTraits.speciesDescriptor,
          isHumanLike: isHumanLikeInput(rawTraits),
          developmentalProfile: rawTraits.ageSafeLanguage || getDevelopmentalVisualProfile(rawTraits.age || 7),
          worldMaterialHint: rawTraits.worldMaterialHint || computeWorldMaterialHint(rawTraits.speciesDescriptor, rawTraits.appearance, rawTraits.aboutThem),
          worldPhysicsHint: rawTraits.worldPhysicsHint || computeWorldPhysicsHint(rawTraits.speciesDescriptor, rawTraits.appearance, rawTraits.aboutThem),
          signatureColors: rawTraits.signatureColors
        }
      });

      const validationWithAlpha = assetType === 'headshot'
        ? {
            ...validation,
            transparent_background: editAlpha.hasTransparency,
            transparent_background_ratio: editAlpha.ratio
          }
        : validation
      const editOutcome = classifyReviewOutcome(validationWithAlpha, inclusivityTraits, {
        assetType,
        speciesKey: resolveSpeciesKey(rawTraits),
        speciesDescriptor: rawTraits?.speciesDescriptor || '',
        isEditPass: true,
        alphaDetected: editAlpha.hasTransparency
      })
      await updateGenerationTask(supabase, taskId, {
        state: 'running',
        current_stage: 'editing_soft_fix',
        current_asset: 'edit',
        attempt_index: editAttemptIndex,
        retryable: false,
        next_poll_ms: 2000,
        error_code: null,
        error_message: null
      })
      const tracePayload = {
        characterId,
        assetType,
        attemptIndex: editAttemptIndex,
        generationMode: `${assetType}_edit`,
        prompt: sanitizedEditPrompt,
        promptHash: editPromptHash,
        model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        url: editedCdnUrl,
        openaiRequestId: (editResponse as any)._request_id || null,
        validation: validationWithAlpha,
        outcome: editOutcome,
        globalStyleHash: getGlobalStyleHash()
      };

      const traceKey = buildAttemptTraceKey({
        characterId,
        assetType,
        attemptIndex: editAttemptIndex,
        requestId: (editResponse as any)._request_id || null
      });
      await s3.send(new PutObjectCommand({
        Bucket: assetBucket,
        Key: traceKey,
        Body: Buffer.from(JSON.stringify(tracePayload, null, 2)),
        ContentType: 'application/json',
        CacheControl: 'public, max-age=31536000'
      }));

      const traceUrl = getCdnUrl(traceKey);
      const editAttempt = await createImageAttempt(supabase, {
        characterId,
        assetType,
        status: editOutcome.status,
        attemptIndex: editAttemptIndex,
        imageUrl: editedCdnUrl,
        failImageUrl: editOutcome.status === 'hard_fail' ? editedCdnUrl : null,
        prompt: sanitizedEditPrompt,
        promptHash: editPromptHash,
        traceUrl,
        failureCodes: editOutcome.failureCodes,
        failureReason: editOutcome.failureReason,
        modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        fixOfAttemptId: attemptId,
        openaiRequestId: (editResponse as any)._request_id || null,
        validationSummary: validation || null,
        visibility: editOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
      })

      await updateGenerationTask(supabase, taskId, {
        state: 'succeeded',
        current_stage: 'done',
        current_asset: null,
        attempt_index: editAttemptIndex,
        retryable: false,
        next_poll_ms: 0,
        error_code: null,
        error_message: null,
        admin_error_detail: editOutcome.status === 'hard_fail'
          ? { failureCodes: editOutcome.failureCodes, failureReason: editOutcome.failureReason }
          : null
      })

      if (editOutcome.status === 'pass') {
        const nextHeadshotStatus = assetType === 'headshot' ? 'ready' : characterRow.headshot_status
        const nextBodyshotStatus = assetType === 'bodyshot' ? 'ready' : characterRow.bodyshot_status
        const nextState = (nextHeadshotStatus === 'soft_fail' || nextBodyshotStatus === 'soft_fail')
          ? 'failed_soft'
          : (nextBodyshotStatus === 'ready' ? 'ready' : (nextHeadshotStatus === 'ready' ? 'headshot_ready' : 'draft'))
        const updateFields: Record<string, any> = {
          character_state: nextState,
          user_banner: null,
          user_banner_updated_at: new Date().toISOString()
        }
        if (assetType === 'headshot') {
          updateFields.headshot_url = editedCdnUrl
          updateFields.headshot_status = 'ready'
          updateFields.headshot_trace_url = traceUrl
          updateFields.current_headshot_attempt_id = editAttempt?.id || null
          updateFields.last_good_headshot_attempt_id = editAttempt?.id || null
          updateFields.prompt_hashes = {
            ...(characterRow.prompt_hashes || {}),
            headshot: editPromptHash
          }
        }
        if (assetType === 'bodyshot') {
          updateFields.bodyshot_url = editedCdnUrl
          updateFields.bodyshot_status = 'ready'
          updateFields.bodyshot_trace_url = traceUrl
          updateFields.current_bodyshot_attempt_id = editAttempt?.id || null
          updateFields.last_good_bodyshot_attempt_id = editAttempt?.id || null
          updateFields.prompt_hashes = {
            ...(characterRow.prompt_hashes || {}),
            bodyshot: editPromptHash
          }
        }
        await supabase.from('characters').update(updateFields).eq('id', characterId)
      } else {
        const failureState = editOutcome.status === 'hard_fail' ? 'failed_hard' : 'failed_soft'
        const failureFields: Record<string, any> = {
          character_state: characterRow.character_state || failureState,
          admin_review_required: true,
          user_banner: failureState === 'failed_soft' ? pickUserBanner(characterId) : null,
          user_banner_updated_at: failureState === 'failed_soft' ? new Date().toISOString() : null,
          last_failure_at: new Date().toISOString()
        }
        if (assetType === 'headshot') {
          failureFields.headshot_fail_url = editedCdnUrl
        }
        if (assetType === 'bodyshot') {
          failureFields.bodyshot_fail_url = editedCdnUrl
        }
        await supabase.from('characters').update(failureFields).eq('id', characterId)
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          characterId,
          attemptId: editAttempt?.id || null,
          status: editOutcome.status,
          imageUrl: editedCdnUrl
        })
      };
    }

    if (action === 'retry_headshot') {
      const { characterId, taskId: taskIdFromBody, task_id: taskIdSnake } = body;
      const taskId = taskIdFromBody || taskIdSnake || null
      if (!characterId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required field: characterId'
          })
        };
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );

      const { data: characterRow, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterError || !characterRow) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Character not found'
          })
        };
      }

      const maxAttempts = Number(process.env.HEADSHOT_MAX_ATTEMPTS || '2');
      const nextAttemptIndex = await getNextAttemptIndex(supabase, characterId, 'headshot');
      await updateGenerationTask(supabase, taskId, {
        state: 'running',
        current_stage: 'generating_headshot',
        current_asset: 'headshot',
        attempt_index: nextAttemptIndex,
        retryable: true,
        next_poll_ms: 2000,
        error_code: null,
        error_message: null
      })
      if (nextAttemptIndex > maxAttempts) {
        await supabase
          .from('characters')
          .update({
            character_state: 'failed_hard',
            admin_review_required: true,
            visible_to_user: false,
            last_failure_at: new Date().toISOString(),
            retries_count: nextAttemptIndex - 1
          })
          .eq('id', characterId);
        await updateGenerationTask(supabase, taskId, {
          state: 'failed_hard',
          current_stage: 'generating_headshot',
          current_asset: 'headshot',
          attempt_index: nextAttemptIndex,
          retryable: false,
          next_poll_ms: 0,
          error_code: 'max_retries_exhausted',
          error_message: 'Headshot retries exhausted'
        })
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, characterId, status: 'failed_hard' })
        };
      }

      const { CharacterImageGenerator } = await import('./services/CharacterImageGenerator');
      const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
      const { ImageSafetyReviewService } = await import('./services/ImageSafetyReviewService');
      const { OpenAI } = await import('openai');
      const logger = { info: console.log, warn: console.warn, error: console.error };

      const openaiKey = process.env.OPENAI_API_KEY || '';
      const openai = new OpenAI({ apiKey: openaiKey });
      const imageGenerator = new CharacterImageGenerator(openai, logger as any);

      const rawInclusivityTraits = characterRow.inclusivityTraits
        || characterRow.traits?.explicitInput?.inclusivityTraits
        || characterRow.traits?.inclusivityTraits
        || [];
      const inclusivityTraits = (rawInclusivityTraits || [])
        .map((trait: any) => {
          const rawId = typeof trait === 'string'
            ? String(trait).trim()
            : (trait?.type || trait?.id || '')
          const normalizedId = resolveCanonicalTraitId(rawId, characterRow.traits?.traitUserDescriptions || {})
          const traitDef = INCLUSIVITY_TRAITS_MAP[normalizedId];
          if (!traitDef) return null;
          if (typeof trait === 'object' && trait) {
            return {
              ...traitDef,
              userDescription: trait.description || trait.storyIntegration || trait.userDescription,
              selectedVisualIndicators: trait.selectedVisualIndicators,
              selectedBehavioralIndicators: trait.selectedBehavioralIndicators,
              selectedSeverity: trait.severity || trait.selectedSeverity,
              selectedSubtype: trait.subtype || trait.selectedSubtype
            }
          }
          return { ...traitDef };
        })
        .filter(Boolean);

      const traitsForPrompt = buildTraitsFromRow(characterRow) as any;
      const hexColors = {
        skin: resolveHexColor(traitsForPrompt.skinTone, '#F4C2A1'),
        hair: resolveHexColor(traitsForPrompt.hairColor, '#8B4513'),
        eyes: resolveHexColor(traitsForPrompt.eyeColor, '#4A90E2')
      };

      const headshot = await imageGenerator.generateHeadshot(traitsForPrompt, inclusivityTraits, hexColors, characterId);
      const headshotKey = `characters/${characterId}/headshot-retry-${Date.now()}.png`;
      const headshotUrl = await uploadImageToS3Global(headshot.url, headshotKey);
      const headshotAlpha = await detectTransparentBackground(headshotUrl)

      const safetyService = new ImageSafetyReviewService(openai, logger as any, process.env.OPENAI_MODEL_VISION || 'gpt-5.2');
      const validationTraits = inclusivityTraits.filter((trait: any) => trait.id !== 'autism');
      const headshotValidation = await safetyService.reviewImageComprehensive({
        candidateB64: await (async () => {
          if (headshot.url.startsWith('data:image/')) {
            return headshot.url.split(',')[1] || '';
          }
          const response = await fetch(headshot.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          return buffer.toString('base64');
        })(),
        targetRating: 'G',
        characterName: characterRow.name,
        expectedTraits: validationTraits,
        imageType: 'headshot',
        characterContext: {
          speciesKey: traitsForPrompt.speciesKey,
          speciesDescriptor: traitsForPrompt.speciesDescriptor,
          isHumanLike: isHumanLikeInput(traitsForPrompt),
          developmentalProfile: traitsForPrompt.ageSafeLanguage,
          worldMaterialHint: traitsForPrompt.worldMaterialHint,
          worldPhysicsHint: traitsForPrompt.worldPhysicsHint,
          signatureColors: traitsForPrompt.signatureColors
        }
      });

      const headshotValidationWithAlpha = {
        ...headshotValidation,
        transparent_background: headshotAlpha.hasTransparency,
        transparent_background_ratio: headshotAlpha.ratio
      }
      const headshotOutcome = classifyReviewOutcome(headshotValidationWithAlpha, inclusivityTraits, {
        assetType: 'headshot',
        speciesKey: resolveSpeciesKey(traitsForPrompt),
        speciesDescriptor: traitsForPrompt?.speciesDescriptor || '',
        alphaDetected: headshotAlpha.hasTransparency
      })
      const shouldRetry = headshotOutcome.status === 'hard_fail' && nextAttemptIndex < maxAttempts
      const headshotState = shouldRetry
        ? 'needs_retry'
        : (headshotOutcome.status === 'pass'
          ? (characterRow.bodyshot_status === 'ready' ? 'ready' : 'headshot_ready')
          : (headshotOutcome.status === 'soft_fail' ? 'failed_soft' : 'failed_hard'))
      const headshotBanner = headshotOutcome.status === 'soft_fail' ? pickUserBanner(characterId) : null

      const tracePayload = {
        characterId,
        assetType: 'headshot',
        attemptIndex: nextAttemptIndex,
        generationMode: 'character_headshot_retry',
        prompt: headshot.prompt,
        promptHash: headshot.promptHash,
        model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        url: headshotUrl,
        openaiRequestId: (headshot as any).openaiRequestId || null,
        validation: headshotValidationWithAlpha,
        outcome: headshotOutcome,
        globalStyleHash: getGlobalStyleHash()
      };
      const traceKey = buildAttemptTraceKey({
        characterId,
        assetType: 'headshot',
        attemptIndex: nextAttemptIndex,
        requestId: (headshot as any).openaiRequestId || null
      });
      const headshotTraceUrl = await uploadJsonToS3Global(tracePayload, traceKey);

      const headshotAttempt = await createImageAttempt(supabase, {
        characterId,
        assetType: 'headshot',
        status: headshotOutcome.status,
        attemptIndex: nextAttemptIndex,
        imageUrl: headshotUrl,
        failImageUrl: headshotOutcome.status === 'hard_fail' ? headshotUrl : null,
        prompt: headshot.prompt,
        promptHash: headshot.promptHash,
        traceUrl: headshotTraceUrl,
        failureCodes: headshotOutcome.failureCodes,
        failureReason: headshotOutcome.failureReason,
        modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        openaiRequestId: (headshot as any).openaiRequestId || null,
        validationSummary: headshotValidationWithAlpha || null,
        visibility: headshotOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
      })

      await supabase
        .from('characters')
        .update({
          headshot_url: headshotUrl,
          headshot_status: headshotOutcome.status === 'pass' ? 'ready' : headshotOutcome.status,
          headshot_trace_url: headshotTraceUrl,
          current_headshot_attempt_id: headshotAttempt?.id || null,
          last_good_headshot_attempt_id: headshotOutcome.status === 'pass' ? headshotAttempt?.id || null : characterRow.last_good_headshot_attempt_id,
          headshot_fail_url: headshotOutcome.status === 'hard_fail' ? headshotUrl : null,
          failure_codes: headshotOutcome.failureCodes,
          failure_summary: headshotOutcome.failureReason,
          admin_review_required: headshotOutcome.status === 'hard_fail' && !shouldRetry,
          character_state: headshotState,
          visible_to_user: headshotOutcome.status !== 'hard_fail',
          user_banner: headshotBanner,
          user_banner_updated_at: headshotBanner ? new Date().toISOString() : null,
          last_failure_at: headshotOutcome.status !== 'pass' ? new Date().toISOString() : null,
          retries_count: nextAttemptIndex
        })
        .eq('id', characterId);

      if (shouldRetry) {
        await updateGenerationTask(supabase, taskId, {
          state: 'running',
          current_stage: 'generating_headshot',
          current_asset: 'headshot',
          attempt_index: nextAttemptIndex,
          retryable: true,
          next_poll_ms: 2000,
          error_code: headshotOutcome.failureCodes[0] || null,
          error_message: headshotOutcome.failureReason || null
        })
        await queueEditFix({ action: 'retry_headshot', characterId, taskId })
      } else if (headshotOutcome.status === 'hard_fail') {
        await updateGenerationTask(supabase, taskId, {
          state: 'failed_hard',
          current_stage: 'generating_headshot',
          current_asset: 'headshot',
          attempt_index: nextAttemptIndex,
          retryable: false,
          next_poll_ms: 0,
          error_code: headshotOutcome.failureCodes[0] || 'headshot_failed',
          error_message: headshotOutcome.failureReason || 'Headshot failed'
        })
      } else if (characterRow.bodyshot_status === 'ready') {
        await updateGenerationTask(supabase, taskId, {
          state: 'succeeded',
          current_stage: 'done',
          current_asset: null,
          attempt_index: nextAttemptIndex,
          retryable: false,
          next_poll_ms: 0,
          error_code: null,
          error_message: null
        })
      } else {
        await updateGenerationTask(supabase, taskId, {
          state: 'running',
          current_stage: 'generating_bodyshot',
          current_asset: 'bodyshot',
          attempt_index: 0,
          retryable: true,
          next_poll_ms: 2000,
          error_code: null,
          error_message: null
        })
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, characterId, status: headshotOutcome.status })
      };
    }

    if (action === 'retry_bodyshot') {
      const { characterId, taskId: taskIdFromBody, task_id: taskIdSnake } = body;
      const taskId = taskIdFromBody || taskIdSnake || null
      if (!characterId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required field: characterId'
          })
        };
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );

      const { data: characterRow, error: characterError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterError || !characterRow) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Character not found'
          })
        };
      }

      const maxAttempts = Number(process.env.BODYSHOT_MAX_ATTEMPTS || '2');
      const nextAttemptIndex = await getNextAttemptIndex(supabase, characterId, 'bodyshot');
      await updateGenerationTask(supabase, taskId, {
        state: 'running',
        current_stage: 'generating_bodyshot',
        current_asset: 'bodyshot',
        attempt_index: nextAttemptIndex,
        retryable: true,
        next_poll_ms: 2000,
        error_code: null,
        error_message: null
      })
      if (nextAttemptIndex > maxAttempts) {
        await supabase
          .from('characters')
          .update({
            character_state: 'failed_hard',
            admin_review_required: true,
            visible_to_user: characterRow.headshot_status !== 'hard_fail',
            last_failure_at: new Date().toISOString(),
            retries_count: nextAttemptIndex - 1
          })
          .eq('id', characterId);
        await updateGenerationTask(supabase, taskId, {
          state: 'failed_hard',
          current_stage: 'generating_bodyshot',
          current_asset: 'bodyshot',
          attempt_index: nextAttemptIndex,
          retryable: false,
          next_poll_ms: 0,
          error_code: 'max_retries_exhausted',
          error_message: 'Bodyshot retries exhausted'
        })
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, characterId, status: 'failed_hard' })
        };
      }

      if (!characterRow.headshot_url) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing headshot_url for bodyshot retry'
          })
        };
      }

      const { CharacterImageGenerator } = await import('./services/CharacterImageGenerator');
      const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
      const { ImageSafetyReviewService } = await import('./services/ImageSafetyReviewService');
      const { OpenAI } = await import('openai');
      const logger = { info: console.log, warn: console.warn, error: console.error };

      const openaiKey = process.env.OPENAI_API_KEY || '';
      const openai = new OpenAI({ apiKey: openaiKey });
      const imageGenerator = new CharacterImageGenerator(openai, logger as any);

      const rawInclusivityTraits = characterRow.inclusivityTraits
        || characterRow.traits?.explicitInput?.inclusivityTraits
        || characterRow.traits?.inclusivityTraits
        || [];
      const inclusivityTraits = (rawInclusivityTraits || [])
        .map((trait: any) => {
          const rawId = typeof trait === 'string'
            ? String(trait).trim()
            : (trait?.type || trait?.id || '')
          const normalizedId = resolveCanonicalTraitId(rawId, characterRow.traits?.traitUserDescriptions || {})
          const traitDef = INCLUSIVITY_TRAITS_MAP[normalizedId];
          if (!traitDef) return null;
          if (typeof trait === 'object' && trait) {
            return {
              ...traitDef,
              userDescription: trait.description || trait.storyIntegration || trait.userDescription,
              selectedVisualIndicators: trait.selectedVisualIndicators,
              selectedBehavioralIndicators: trait.selectedBehavioralIndicators,
              selectedSeverity: trait.severity || trait.selectedSeverity,
              selectedSubtype: trait.subtype || trait.selectedSubtype
            }
          }
          return { ...traitDef };
        })
        .filter(Boolean);

      const traitsForPrompt = buildTraitsFromRow(characterRow) as any;
      const hexColors = {
        skin: resolveHexColor(traitsForPrompt.skinTone, '#F4C2A1'),
        hair: resolveHexColor(traitsForPrompt.hairColor, '#8B4513'),
        eyes: resolveHexColor(traitsForPrompt.eyeColor, '#4A90E2')
      };

      const headshotBuffer = await (async () => {
        const response = await fetch(characterRow.headshot_url);
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer;
      })();

      const bodyshot = await imageGenerator.generateBodyshotWithReference(
        traitsForPrompt,
        inclusivityTraits,
        hexColors,
        headshotBuffer,
        characterId,
        inclusivityTraits
      );

      const bodyshotKey = `characters/${characterId}/bodyshot-retry-${Date.now()}.png`;
      const bodyshotUrl = await uploadImageToS3Global(bodyshot.url, bodyshotKey);

      const safetyService = new ImageSafetyReviewService(openai, logger as any, process.env.OPENAI_MODEL_VISION || 'gpt-5.2');
      const validationTraits = inclusivityTraits.filter((trait: any) => trait.id !== 'autism');
      const bodyshotValidation = await safetyService.reviewImageComprehensive({
        candidateB64: await (async () => {
          if (bodyshot.url.startsWith('data:image/')) {
            return bodyshot.url.split(',')[1] || '';
          }
          const response = await fetch(bodyshot.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          return buffer.toString('base64');
        })(),
        targetRating: 'G',
        characterName: characterRow.name,
        expectedTraits: validationTraits,
        imageType: 'bodyshot',
        characterContext: {
          speciesKey: traitsForPrompt.speciesKey,
          speciesDescriptor: traitsForPrompt.speciesDescriptor,
          isHumanLike: isHumanLikeInput(traitsForPrompt),
          developmentalProfile: traitsForPrompt.ageSafeLanguage,
          worldMaterialHint: traitsForPrompt.worldMaterialHint,
          worldPhysicsHint: traitsForPrompt.worldPhysicsHint,
          signatureColors: traitsForPrompt.signatureColors
        }
      });

      const bodyshotOutcome = classifyReviewOutcome(bodyshotValidation, inclusivityTraits, {
        assetType: 'bodyshot',
        speciesKey: resolveSpeciesKey(traitsForPrompt),
        speciesDescriptor: traitsForPrompt?.speciesDescriptor || ''
      })
      const shouldRetry = bodyshotOutcome.status === 'hard_fail' && nextAttemptIndex < maxAttempts
      const bodyshotState = shouldRetry
        ? 'needs_retry'
        : (bodyshotOutcome.status === 'pass'
          ? 'ready'
          : (bodyshotOutcome.status === 'soft_fail' ? 'failed_soft' : 'failed_hard'))
      const bodyshotBanner = bodyshotOutcome.status === 'soft_fail' ? pickUserBanner(characterId) : null

      const tracePayload = {
        characterId,
        assetType: 'bodyshot',
        attemptIndex: nextAttemptIndex,
        generationMode: 'character_bodyshot_retry',
        prompt: bodyshot.prompt,
        promptHash: bodyshot.promptHash,
        model: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        url: bodyshotUrl,
        openaiRequestId: (bodyshot as any).openaiRequestId || null,
        validation: bodyshotValidation,
        outcome: bodyshotOutcome,
        globalStyleHash: getGlobalStyleHash()
      };
      const traceKey = buildAttemptTraceKey({
        characterId,
        assetType: 'bodyshot',
        attemptIndex: nextAttemptIndex,
        requestId: (bodyshot as any).openaiRequestId || null
      });
      const bodyshotTraceUrl = await uploadJsonToS3Global(tracePayload, traceKey);

      const bodyshotAttempt = await createImageAttempt(supabase, {
        characterId,
        assetType: 'bodyshot',
        status: bodyshotOutcome.status,
        attemptIndex: nextAttemptIndex,
        imageUrl: bodyshotUrl,
        failImageUrl: bodyshotOutcome.status === 'hard_fail' ? bodyshotUrl : null,
        prompt: bodyshot.prompt,
        promptHash: bodyshot.promptHash,
        traceUrl: bodyshotTraceUrl,
        failureCodes: bodyshotOutcome.failureCodes,
        failureReason: bodyshotOutcome.failureReason,
        modelUsed: process.env.IMAGE_MODEL || MODEL_CONFIG.IMAGE,
        openaiRequestId: (bodyshot as any).openaiRequestId || null,
        validationSummary: bodyshotValidation || null,
        visibility: bodyshotOutcome.status === 'hard_fail' ? 'internal_only' : 'user_visible'
      })

      await supabase
        .from('characters')
        .update({
          bodyshot_url: bodyshotUrl,
          bodyshot_status: bodyshotOutcome.status === 'pass' ? 'ready' : bodyshotOutcome.status,
          bodyshot_trace_url: bodyshotTraceUrl,
          current_bodyshot_attempt_id: bodyshotAttempt?.id || null,
          last_good_bodyshot_attempt_id: bodyshotOutcome.status === 'pass' ? bodyshotAttempt?.id || null : characterRow.last_good_bodyshot_attempt_id,
          bodyshot_fail_url: bodyshotOutcome.status === 'hard_fail' ? bodyshotUrl : null,
          failure_codes: bodyshotOutcome.failureCodes,
          failure_summary: bodyshotOutcome.failureReason,
          admin_review_required: bodyshotOutcome.status === 'hard_fail' && !shouldRetry,
          character_state: bodyshotState,
          visible_to_user: characterRow.headshot_status !== 'hard_fail',
          user_banner: bodyshotBanner,
          user_banner_updated_at: bodyshotBanner ? new Date().toISOString() : null,
          last_failure_at: bodyshotOutcome.status !== 'pass' ? new Date().toISOString() : null,
          retries_count: nextAttemptIndex
        })
        .eq('id', characterId);

      if (shouldRetry) {
        await updateGenerationTask(supabase, taskId, {
          state: 'running',
          current_stage: 'generating_bodyshot',
          current_asset: 'bodyshot',
          attempt_index: nextAttemptIndex,
          retryable: true,
          next_poll_ms: 2000,
          error_code: bodyshotOutcome.failureCodes[0] || null,
          error_message: bodyshotOutcome.failureReason || null
        })
        await queueEditFix({ action: 'retry_bodyshot', characterId, taskId })
      } else if (bodyshotOutcome.status === 'hard_fail') {
        await updateGenerationTask(supabase, taskId, {
          state: 'failed_hard',
          current_stage: 'generating_bodyshot',
          current_asset: 'bodyshot',
          attempt_index: nextAttemptIndex,
          retryable: false,
          next_poll_ms: 0,
          error_code: bodyshotOutcome.failureCodes[0] || 'bodyshot_failed',
          error_message: bodyshotOutcome.failureReason || 'Bodyshot failed'
        })
      } else if (bodyshotOutcome.status === 'soft_fail') {
        await updateGenerationTask(supabase, taskId, {
          state: 'running',
          current_stage: 'editing_soft_fix',
          current_asset: 'edit',
          attempt_index: 0,
          retryable: false,
          next_poll_ms: 2000,
          error_code: null,
          error_message: null
        })
      } else {
        await updateGenerationTask(supabase, taskId, {
          state: 'succeeded',
          current_stage: 'done',
          current_asset: null,
          attempt_index: nextAttemptIndex,
          retryable: false,
          next_poll_ms: 0,
          error_code: null,
          error_message: null
        })
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, characterId, status: bodyshotOutcome.status })
      };
    }

    // Generate story images (async - called when story art is missing on load)
    if (action === 'generate_story_images') {
      const { storyId, story, characterId, characterName, characterTraits, libraryId } = body;
      
      if (!storyId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: storyId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        // Get story content
        const storyContent = typeof story.content === 'string' 
          ? story.content 
          : (story.content?.text || '');
        const keyBeats = story.content?.metadata?.keyBeats || story.keyBeats || [];
        
        // Helper to update asset status in database
        async function updateAssetStatus(assetType: string, status: 'generating' | 'ready' | 'failed', data?: { url?: string; progress?: number }): Promise<void> {
          try {
            const { data: currentStory } = await supabase
              .from('stories')
              .select('asset_generation_status, cover_art_url, scene_art_urls')
              .eq('id', storyId)
              .single();

            const currentStatus = currentStory?.asset_generation_status || {
              overall: 'generating',
              assets: {}
            };

            currentStatus.assets[assetType] = {
              status,
              ...data,
              ...(status === 'generating' ? { startedAt: new Date().toISOString() } : {}),
              ...(status === 'ready' || status === 'failed' ? { completedAt: new Date().toISOString() } : {})
            };

            // Update specific asset URLs when ready
            const updateData: Record<string, any> = {
              asset_generation_status: currentStatus
            };

            if (assetType === 'cover' && status === 'ready' && data?.url) {
              updateData.cover_art_url = data.url;
            } else if (assetType.startsWith('scene_') && status === 'ready' && data?.url) {
              const sceneIndex = parseInt(assetType.split('_')[1]) - 1;
              const currentUrls = currentStory?.scene_art_urls || [];
              const updatedUrls = [...currentUrls];
              while (updatedUrls.length <= sceneIndex) {
                updatedUrls.push(null);
              }
              updatedUrls[sceneIndex] = data.url;
              // IMPORTANT: Preserve index positions (scene_1..scene_4) for realtime UX.
              // Do NOT filter out nulls, otherwise indexes shift and the frontend can show
              // the wrong scene image for a given beat.
              updateData.scene_art_urls = updatedUrls;
            }

            // Calculate overall status
            const assetStatuses = Object.values(currentStatus.assets);
            if (assetStatuses.every((a: any) => a.status === 'ready')) {
              currentStatus.overall = 'ready';
            } else if (assetStatuses.some((a: any) => a.status === 'failed') && !assetStatuses.some((a: any) => a.status === 'generating')) {
              currentStatus.overall = 'failed';
            } else if (assetStatuses.some((a: any) => a.status === 'generating')) {
              currentStatus.overall = 'generating';
            }

            await supabase
              .from('stories')
              .update(updateData)
              .eq('id', storyId);

            // One-line, searchable production log for frontend stability investigations
            if (status === 'ready') {
              console.log(`story_asset_ready storyId=${storyId} asset=${assetType}`)
            }
            console.log(`[Content Agent] Updated ${assetType} status: ${status}`, { storyId, assetType });
          } catch (error) {
            console.error(`[Content Agent] Failed to update ${assetType} status`, { storyId, assetType, error });
          }
        }

        // Generate story images using character reference images with progressive status updates
        const images = await agent.generateStoryImages(
          {
            title: story.title || 'Untitled Story',
            keyBeats: keyBeats
          },
          characterName || 'hero',
          characterTraits || {},
          characterId,
          'batch',
          undefined,
          storyId,
          updateAssetStatus
        );
        
        // Upload images to S3 and get CDN URLs
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const bucketName = getAssetBucketName();
        
        // Helper to upload image and return CDN URL
        async function uploadImageToS3(imageUrl: string, key: string): Promise<string> {
          // If already an S3/CDN URL, return as-is
          if (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('assets.storytailor.dev')) {
            if (imageUrl.includes('s3.amazonaws.com')) {
              const match = imageUrl.match(/s3[.-]?[a-z0-9-]*\.amazonaws\.com\/(.+)$/i);
              if (match && match[1]) {
                return getCdnUrl(match[1]);
              }
            }
            return imageUrl;
          }
          
          // Download from temporary URL (OpenAI)
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
          }
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          // Upload to S3
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000'
          }));
          
          // Return CDN URL
          return getCdnUrl(key);
        }
        
        // Upload cover image
        const coverKey = `stories/${storyId}/cover-${Date.now()}.png`;
        const coverCdnUrl = await uploadImageToS3(images.coverImageUrl, coverKey);
        
        // Upload beat images
        const beatCdnUrls: string[] = [];
        for (let i = 0; i < images.beatImages.length; i++) {
          const beat = images.beatImages[i];
          const beatKey = `stories/${storyId}/beat-${beat.beatNumber}-${Date.now()}.png`;
          const beatCdnUrl = await uploadImageToS3(beat.imageUrl, beatKey);
          beatCdnUrls.push(beatCdnUrl);
        }
        
        // Update story in database with CDN URLs (individual beat statuses)
        // Note: Individual beat statuses should already be updated via onProgress callback
        // This final update ensures all URLs are set correctly
        const { data: currentStory } = await supabase
          .from('stories')
          .select('asset_generation_status')
          .eq('id', storyId)
          .single();

        const currentStatus = currentStory?.asset_generation_status || {
          overall: 'generating',
          assets: {}
        };

        // Update with CDN URLs (individual beat statuses)
        currentStatus.assets['cover'] = { status: 'ready', progress: 100, url: coverCdnUrl };
        for (let i = 0; i < beatCdnUrls.length; i++) {
          const sceneKey = `scene_${i + 1}`;
          currentStatus.assets[sceneKey] = { status: 'ready', progress: 100, url: beatCdnUrls[i] };
        }

        // Calculate overall status
        const assetStatuses = Object.values(currentStatus.assets);
        if (assetStatuses.every((a: any) => a.status === 'ready')) {
          currentStatus.overall = 'ready';
        } else if (assetStatuses.some((a: any) => a.status === 'generating')) {
          currentStatus.overall = 'generating';
        }

        await supabase
          .from('stories')
          .update({
            cover_art_url: coverCdnUrl,
            scene_art_urls: beatCdnUrls,
            asset_generation_status: currentStatus,
            status: 'ready'
          })
          .eq('id', storyId);

        // One-line, searchable production log for each asset URL that lands on the story row
        console.log(`story_asset_ready storyId=${storyId} asset=cover`)
        for (let i = 0; i < beatCdnUrls.length; i++) {
          console.log(`story_asset_ready storyId=${storyId} asset=scene_${i + 1}`)
        }
        
        // Update asset generation jobs
        await supabase
          .from('asset_generation_jobs')
          .update({ status: 'ready', completed_at: new Date().toISOString() })
          .eq('story_id', storyId)
          .in('asset_type', ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4'])
          .in('status', ['queued', 'generating']);
        
        console.log('[Content Agent] Story images generated and saved', { storyId, coverUrl: coverCdnUrl, beatCount: beatCdnUrls.length });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              storyId,
              coverUrl: coverCdnUrl,
              beatUrls: beatCdnUrls,
              message: 'Story images generated successfully'
            }
          })
        };
      } catch (error) {
        console.error('[Content Agent] Story image generation failed', { storyId, error });
        
        // Update story status to failed
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
          );
          
          // Update with individual beat statuses for failure
          const failedStatus = {
            overall: 'failed',
            assets: {
              cover: { status: 'failed', progress: 0 },
              scene_1: { status: 'failed', progress: 0 },
              scene_2: { status: 'failed', progress: 0 },
              scene_3: { status: 'failed', progress: 0 },
              scene_4: { status: 'failed', progress: 0 }
            }
          };

          await supabase
            .from('stories')
            .update({
              asset_generation_status: failedStatus,
              status: 'failed'
            })
            .eq('id', storyId);
          
          // Update jobs to failed
          await supabase
            .from('asset_generation_jobs')
            .update({ 
              status: 'failed', 
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('story_id', storyId)
            .in('asset_type', ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4'])
            .in('status', ['queued', 'generating']);
        } catch (updateErr) {
          console.error('[Content Agent] Failed to update story status to failed', { storyId, error: updateErr });
        }
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: `Story image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        };
      }
    }
    
    // Generate asset (audio, cover, scenes, PDF, activities)
    if (action === 'generate_asset') {
      const { storyId, assetType, jobId, story, metadata } = body;
      
      if (!storyId || !assetType || !jobId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: storyId, assetType, jobId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        let result: any;
        
        switch (assetType) {
          case 'audio': {
            // Generate audio narration with word-level timestamps
            // Parse story content to extract beats
            const parsedStoryContent = typeof story.content === 'string' 
              ? JSON.parse(story.content) 
              : story.content;
            
            // Ensure story content has beats array
            if (!parsedStoryContent || !parsedStoryContent.beats || !Array.isArray(parsedStoryContent.beats)) {
              throw new Error('Story content must have a beats array');
            }

            // Generate audio with timestamps
            const audioResult = await agent.generateAudioNarrationWithTimestamps({
              beats: parsedStoryContent.beats.map((beat: any, index: number) => ({
                id: beat.id || `beat-${index + 1}`,
                content: beat.content || ''
              }))
            });

            // Re-host audio under assets.storytailor.dev (no public S3 bucket URLs)
            // Download the generated audio (typically an S3 URL) and upload to our assets bucket.
            const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
            const bucketName = getAssetBucketName();

            let hostedAudioUrl = audioResult.audioUrl;
            if (typeof audioResult.audioUrl === 'string' && audioResult.audioUrl.length > 0 && !audioResult.audioUrl.includes('assets.storytailor.dev')) {
              const audioResp = await fetch(audioResult.audioUrl);
              if (!audioResp.ok) {
                throw new Error(`Failed to download audio: ${audioResp.status}`);
              }
              const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
              const audioKey = `stories/${storyId}/audio-${Date.now()}.mp3`;
              await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: audioKey,
                Body: audioBuffer,
                ContentType: 'audio/mpeg',
                CacheControl: 'public, max-age=31536000'
              }));
              hostedAudioUrl = getCdnUrl(audioKey);
            }

            // Update story with CDN audio URL + word timestamps + HTML blocks
            await supabase
              .from('stories')
              .update({
                audio_url: hostedAudioUrl,
                audio_words: audioResult.words,
                audio_blocks: audioResult.blocks
              })
              .eq('id', storyId);

            console.log(`story_asset_ready storyId=${storyId} asset=audio`)

            result = { 
              url: hostedAudioUrl, 
              words: audioResult.words,
              blocks: audioResult.blocks,
              cost: 0.05 
            };
            break;
          }

          case 'qr': {
            // Generate QR code image locally (NO third-party QR service).
            // Upload PNG to our assets bucket so the public URL is assets.storytailor.dev/...
            const publicUrl = `https://storytailor.com/s/${storyId}`;
            const pngBuffer: Buffer = await QRCode.toBuffer(publicUrl, {
              type: 'png',
              margin: 2,
              scale: 8,
              errorCorrectionLevel: 'M'
            });

            const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
            const bucketName = getAssetBucketName();
            const qrKey = `stories/${storyId}/qr-${Date.now()}.png`;

            await s3Client.send(new PutObjectCommand({
              Bucket: bucketName,
              Key: qrKey,
              Body: pngBuffer,
              ContentType: 'image/png',
              CacheControl: 'public, max-age=31536000'
            }));

            const qrCodeUrl = getCdnUrl(qrKey);

            await supabase
              .from('stories')
              .update({
                qr_code_url: qrCodeUrl,
                qr_public_url: publicUrl
              })
              .eq('id', storyId);

            console.log(`story_asset_ready storyId=${storyId} asset=qr`)

            result = { url: qrCodeUrl, publicUrl, cost: 0 };
            break;
          }
            
          case 'cover':
            // Generate cover art
            // IMPORTANT: Do NOT rely on non-existent story fields like story.user_id, story.character_name, story.story_type
            // Use schema-truth: creator_user_id, story_type_id, and character relationship/metadata.
            const effectiveUserId = story.creator_user_id || body.creatorUserId || body.userId || 'system';

            // Resolve story type from story_types table (schema-truth)
            let resolvedStoryType = 'adventure';
            if (story.story_type_id) {
              const { data: storyTypeRow } = await supabase
                .from('story_types')
                .select('type_id, type_name')
                .eq('id', story.story_type_id)
                .maybeSingle();
              resolvedStoryType = (storyTypeRow?.type_id || storyTypeRow?.type_name || resolvedStoryType).toString();
            }

            // Resolve character from metadata->primaryCharacterId/character_id OR library fallback
            const storyMetadata = (story.metadata && typeof story.metadata === 'object') ? story.metadata : {};
            const metadataCharacterId =
              (storyMetadata as any).primaryCharacterId ||
              (storyMetadata as any).character_id ||
              (storyMetadata as any).characterId;

            const { data: coverCharacter } = metadataCharacterId
              ? await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('id', metadataCharacterId)
                  .maybeSingle()
              : await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('library_id', story.library_id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

            const resolvedCharacterName = coverCharacter?.name || 'our hero';

            const coverResult = await agent.generateStory({
              userId: effectiveUserId,
              sessionId: `asset_${Date.now()}`,
              characterName: resolvedCharacterName,
              characterTraits: coverCharacter?.traits || {},
              storyType: resolvedStoryType,
              userAge: story.age_rating || 7,
              storyId,
              conversationPhase: 'cover_generation'
            });
            if (coverResult.coverImageUrl) {
              console.log('[Content Agent] Updating stories.cover_art_url from cover job', {
                storyId,
                assetType,
                userId: effectiveUserId,
                storyType: resolvedStoryType,
                characterId: coverCharacter?.id || null
              });

              const { data: currentStoryForCover } = await supabase
                .from('stories')
                .select('asset_generation_status')
                .eq('id', storyId)
                .single();

              const existingStatus = (currentStoryForCover as any)?.asset_generation_status || {};
              const existingAssets = existingStatus.assets || {};

              await supabase
                .from('stories')
                .update({
                  cover_art_url: coverResult.coverImageUrl,
                  asset_generation_status: {
                    ...existingStatus,
                    overall: existingStatus.overall || 'generating',
                    assets: {
                      ...existingAssets,
                      cover: { status: 'ready', progress: 100, url: coverResult.coverImageUrl }
                    }
                  }
                })
                .eq('id', storyId);
            }
            result = { url: coverResult.coverImageUrl, cost: 0.04 };
            break;
            
          case 'scene_1':
          case 'scene_2':
          case 'scene_3':
          case 'scene_4':
            const beatNum = parseInt(assetType.split('_')[1]);
            console.log(`scene_job_start storyId=${storyId} jobId=${jobId} asset=${assetType}`);
            // Resolve canonical context (same rules as cover)
            const effectiveUserIdForBeat = story.creator_user_id || body.creatorUserId || body.userId || 'system';
            let resolvedStoryTypeForBeat = 'adventure';
            if (story.story_type_id) {
              const { data: storyTypeRow } = await supabase
                .from('story_types')
                .select('type_id, type_name')
                .eq('id', story.story_type_id)
                .maybeSingle();
              resolvedStoryTypeForBeat = (storyTypeRow?.type_id || storyTypeRow?.type_name || resolvedStoryTypeForBeat).toString();
            }

            const storyMetadataForBeat = (story.metadata && typeof story.metadata === 'object') ? story.metadata : {};
            const metadataCharacterIdForBeat =
              (storyMetadataForBeat as any).primaryCharacterId ||
              (storyMetadataForBeat as any).character_id ||
              (storyMetadataForBeat as any).characterId;

            const { data: beatCharacter } = metadataCharacterIdForBeat
              ? await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('id', metadataCharacterIdForBeat)
                  .maybeSingle()
              : await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('library_id', story.library_id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

            const resolvedBeatCharacterName = beatCharacter?.name || 'our hero';

            // Generate beat image
            const beatResult = await agent.generateStory({
              userId: effectiveUserIdForBeat,
              sessionId: `asset_${Date.now()}`,
              characterName: resolvedBeatCharacterName,
              characterTraits: beatCharacter?.traits || {},
              storyType: resolvedStoryTypeForBeat,
              userAge: story.age_rating || 7,
              storyId,
              beatNumber: beatNum,
              conversationPhase: 'beat_confirmed'
            });

            const beatImagesAny = Array.isArray((beatResult as any).beatImages) ? (beatResult as any).beatImages : [];
            const beatImageObj = beatImagesAny.find((b: any) => b && (b.beatNumber === beatNum || b.beat_number === beatNum));
            const beatUrl: string | null =
              typeof beatImageObj?.imageUrl === 'string' ? beatImageObj.imageUrl :
              typeof beatImagesAny?.[beatNum - 1] === 'string' ? beatImagesAny[beatNum - 1] :
              null;

            if (!beatUrl) {
              console.error(`scene_writeback_failed storyId=${storyId} index=${beatNum - 1} reason=SCENE_URL_EMPTY jobId=${jobId}`);

              await supabase
                .from('asset_generation_jobs')
                .update({
                  status: 'failed',
                  error_message: 'SCENE_URL_EMPTY',
                  completed_at: new Date().toISOString()
                })
                .eq('id', jobId);

              const { data: currentStoryForScene } = await supabase
                .from('stories')
                .select('scene_art_urls, asset_generation_status')
                .eq('id', storyId)
                .single();

              const existingSceneUrls: string[] = Array.isArray((currentStoryForScene as any)?.scene_art_urls)
                ? (currentStoryForScene as any).scene_art_urls
                : [];
              const existingStatus = (currentStoryForScene as any)?.asset_generation_status || {};
              const existingAssets = existingStatus.assets || {};
              const key = `scene_${beatNum}`;

              const updatedAssets = {
                ...existingAssets,
                [key]: { status: 'failed', progress: 0, error: 'SCENE_URL_EMPTY' }
              };
              const assetStatuses = Object.values(updatedAssets);
              let overall = 'generating';
              if (assetStatuses.every((a: any) => a.status === 'ready')) overall = 'ready';
              else if (assetStatuses.some((a: any) => a.status === 'failed') && !assetStatuses.some((a: any) => a.status === 'generating')) {
                overall = 'failed';
              }

              await supabase
                .from('stories')
                .update({
                  scene_art_urls: existingSceneUrls,
                  asset_generation_status: {
                    ...existingStatus,
                    assets: updatedAssets,
                    overall
                  }
                })
                .eq('id', storyId);

              throw new Error('SCENE_URL_EMPTY');
            }

            const { data: currentStoryForScene } = await supabase
              .from('stories')
              .select('scene_art_urls, asset_generation_status')
              .eq('id', storyId)
              .single();

            const existingSceneUrls: string[] = Array.isArray((currentStoryForScene as any)?.scene_art_urls)
              ? (currentStoryForScene as any).scene_art_urls
              : [];

            const nextSceneUrls = [...existingSceneUrls];
            while (nextSceneUrls.length < 4) nextSceneUrls.push('');
            nextSceneUrls[beatNum - 1] = beatUrl;

            const existingStatus = (currentStoryForScene as any)?.asset_generation_status || {};
            const existingAssets = existingStatus.assets || {};
            const key = `scene_${beatNum}`;

            console.log(`scene_writeback storyId=${storyId} index=${beatNum - 1} url=${beatUrl}`);
            await supabase
              .from('stories')
              .update({
                scene_art_urls: nextSceneUrls,
                asset_generation_status: {
                  ...existingStatus,
                  overall: existingStatus.overall || 'generating',
                  assets: {
                    ...existingAssets,
                    [key]: { status: 'ready', progress: 100, url: beatUrl }
                  }
                }
              })
              .eq('id', storyId);

            result = { url: beatUrl, cost: 0.04 };
            break;
            
          case 'activities':
            // Generate activities using ActivityGenerationService
            const { ActivityGenerationService } = await import('./services/ActivityGenerationService');
            // ActivityGenerationService requires Redis but may not use it - create a mock
            const mockRedis = {} as any;
            const activitiesService = new ActivityGenerationService(
              process.env.SUPABASE_URL || '',
              process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
              null, // EventBridge (not needed for direct generation)
              mockRedis, // Mock Redis (service may not actually use it)
              console as any // Logger
            );
            
            // Get character for the story
            const { data: character } = await supabase
              .from('characters')
              .select('*')
              .eq('library_id', story.library_id)
              .limit(1)
              .single();
            
            const activitiesResult = await activitiesService.generateActivities({
              story: {
                id: story.id,
                title: story.title,
                content: story.content
              },
              character: character || { name: 'Character', traits: {} },
              targetAge: story.age_rating || 7
            });
            
            // Save activities to story
            await supabase
              .from('stories')
              .update({ activities: activitiesResult.activities })
              .eq('id', storyId);
            
            result = { activities: activitiesResult.activities, cost: 0.02 };
            break;
            
          case 'pdf':
            // Generate PDF using PDFGenerationService
            const { PDFGenerationService } = await import('./services/PDFGenerationService');
            const pdfService = new PDFGenerationService({
              outputDirectory: '/tmp',
              fonts: { title: 'Helvetica-Bold', body: 'Helvetica', caption: 'Helvetica-Oblique' },
              layout: { pageWidth: 612, pageHeight: 792, margins: { top: 72, bottom: 72, left: 72, right: 72 } },
              colors: { primary: '#4A90E2', secondary: '#F5A623', text: '#333333', background: '#FFFFFF' }
            });
            
            // Get character and art for the story
            const { data: pdfCharacter } = await supabase
              .from('characters')
              .select('*')
              .eq('library_id', story.library_id)
              .limit(1)
              .single();
            
            // Get art URLs from story
            const storyContent = typeof story.content === 'string'
              ? (() => { try { return JSON.parse(story.content) } catch { return { text: story.content } } })()
              : (story.content as any);

            // PDFGenerationService expects `story.content.beats` to be an array.
            // Our schema stores `content.text` + (sometimes) `content.beats`. Ensure it exists.
            const beats = Array.isArray(storyContent?.beats)
              ? storyContent.beats
              : Array.isArray(storyContent?.metadata?.keyBeats)
                ? storyContent.metadata.keyBeats.map((b: any, idx: number) => ({ id: `beat-${idx + 1}`, content: String(b?.description || '') }))
                : [{ id: 'beat-1', content: String(storyContent?.text || storyContent || '') }];

            const normalizedStoryContentForPdf = {
              ...storyContent,
              text: String(storyContent?.text || storyContent || ''),
              beats
            };

            const coverArtUrl = storyContent?.coverImageUrl || story.cover_art_url;
            const sceneArtUrls = storyContent?.beatImages || story.scene_art_urls || [];
            
            // Generate PDF
            const pdfResult = await pdfService.generateStoryPDF({
              story: {
                id: story.id,
                title: story.title,
                content: normalizedStoryContentForPdf
              },
              character: pdfCharacter || { name: 'Character', traits: {} },
              generatedArt: {
                coverArt: {
                  url: coverArtUrl || '',
                  prompt: '',
                  moment: { beatId: '', description: '', visualKineticScore: 0, plotShiftingScore: 0, combinedScore: 0 }
                },
                bodyIllustrations: sceneArtUrls.map((url: string, idx: number) => ({
                  url,
                  prompt: '',
                  illustration: { sequence: idx + 1, beatId: '', description: '', cameraAngle: '', depthDirective: '', prompt: '' }
                })),
                characterArt: {
                  headshot: { url: '', prompt: '' },
                  bodyshot: { url: '', prompt: '' }
                }
              },
              activities: story.activities || undefined,
              includeActivities: !!story.activities
            });
            
            // Upload PDF to S3 if available
            let pdfUrl = null;
            const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
            const s3Bucket = getAssetBucketName();
            const s3Region = process.env.AWS_REGION || 'us-east-1';
            if (pdfResult.filePath) {
              try {
                const fs = await import('fs');
                const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
                const s3Client = new S3Client({ region: s3Region });
                const pdfBuffer = fs.readFileSync(pdfResult.filePath);
                const pdfKey = `pdfs/${storyId}/${pdfResult.fileName}`;
                
                await s3Client.send(new PutObjectCommand({
                  Bucket: s3Bucket,
                  Key: pdfKey,
                  Body: pdfBuffer,
                  ContentType: 'application/pdf'
                }));
                
                // Return CDN URL instead of direct S3 URL
                pdfUrl = getCdnUrl(pdfKey);
              } catch (s3Error) {
                console.warn('Failed to upload PDF to S3, using local path', s3Error);
                pdfUrl = pdfResult.filePath; // Fallback to local path
              }
            }
            
            // Update story with PDF URL
            if (pdfUrl) {
              await supabase
                .from('stories')
                .update({
                  pdf_url: pdfUrl,
                  pdf_pages: pdfResult.pageCount,
                  pdf_file_size: pdfResult.fileSize
                })
                .eq('id', storyId);

              console.log(`story_asset_ready storyId=${storyId} asset=pdf`)
            }
            
            result = { url: pdfUrl, pageCount: pdfResult.pageCount, fileSize: pdfResult.fileSize, cost: 0.01 };
            break;
            
          default:
            throw new Error(`Unknown asset type: ${assetType}`);
        }
        
        // Mark job as complete
        await supabase
          .from('asset_generation_jobs')
          .update({
            status: 'ready',
            completed_at: new Date().toISOString(),
            cost: result.cost || 0
          })
          .eq('id', jobId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, result })
        };
        
      } catch (error) {
        console.error('[Content Agent] Asset generation failed:', error);
        
        // Mark job as failed
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        await supabase
          .from('asset_generation_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Asset generation failed'
          })
        };
      }
    }
    
    // Generate activities for story
    if (action === 'generate_activities') {
      const { storyId, story, character, targetAge, preferredTypes, availableMaterials, timeConstraints, specialConsiderations } = body;
      
      if (!storyId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: storyId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        const { ActivityGenerationService } = await import('./services/ActivityGenerationService');
        const winston = await import('winston');
        
        // Create proper winston logger
        const logger = winston.createLogger({
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          transports: [
            new winston.transports.Console({
              format: winston.format.simple()
            })
          ]
        });
        
        // ActivityGenerationService accepts null for Redis (it's optional)
        const activitiesService = new ActivityGenerationService(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
          null, // eventBridge (not used)
          null, // redis (optional, not used)
          logger
        );
        
        // Create proper Character object with all required fields
        const characterObj = character ? {
          id: character.id || `temp_${Date.now()}`,
          libraryId: character.libraryId || story.library_id || '',
          name: character.name || 'Character',
          traits: character.traits || {},
          createdAt: character.createdAt || new Date().toISOString(),
          updatedAt: character.updatedAt || new Date().toISOString()
        } : {
          id: `temp_${Date.now()}`,
          libraryId: story.library_id || '',
          name: 'Character',
          traits: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Ensure story content has proper structure (StoryContent with beats array)
        const storyContent = story.content || {};
        const storyObj = {
          id: story.id,
          title: story.title,
          content: storyContent // Pass full content structure (should have beats array)
        };
        
        const activitiesResult = await activitiesService.generateActivities({
          story: storyObj,
          character: characterObj,
          targetAge: targetAge || 7,
          preferredTypes,
          availableMaterials,
          timeConstraints,
          specialConsiderations
        });
        
        // Save activities to story
        await supabase
          .from('stories')
          .update({ activities: activitiesResult.activities })
          .eq('id', storyId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            activities: activitiesResult.activities,
            metadata: activitiesResult.metadata
          })
        };
      } catch (error) {
        console.error('[Content Agent] Activities generation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Activities generation failed'
          })
        };
      }
    }
    
    // Generate PDF for story
    if (action === 'generate_pdf') {
      const { storyId, story, character, includeActivities, activities, customization } = body;
      
      if (!storyId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: storyId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        const { PDFGenerationService } = await import('./services/PDFGenerationService');
        const pdfService = new PDFGenerationService({
          outputDirectory: '/tmp',
          fonts: { title: 'Helvetica-Bold', body: 'Helvetica', caption: 'Helvetica-Oblique' },
          layout: { pageWidth: 612, pageHeight: 792, margins: { top: 72, bottom: 72, left: 72, right: 72 } },
          colors: { primary: '#4A90E2', secondary: '#F5A623', text: '#333333', background: '#FFFFFF' }
        });
        
        // Get story with art URLs
        const { data: fullStory } = await supabase
          .from('stories')
          .select('*')
          .eq('id', storyId)
          .single();
        
        // Extract story content properly - StoryContent has beats array, not text property
        const storyContent = fullStory?.content as any || story.content;
        
        // Ensure story content has beats array (PDFGenerationService expects story.content.beats)
        // If content is a string or doesn't have beats, create a minimal structure
        let storyContentWithBeats: any;
        if (storyContent?.beats && Array.isArray(storyContent.beats)) {
          // Already has proper structure
          storyContentWithBeats = storyContent;
        } else if (typeof storyContent === 'string') {
          // Convert string to beats array structure
          storyContentWithBeats = {
            beats: [{ id: '1', sequence: 1, content: storyContent, emotionalTone: 'neutral' }]
          };
        } else {
          // Try to extract beats or create minimal structure
          storyContentWithBeats = {
            beats: storyContent?.beats || [{ id: '1', sequence: 1, content: JSON.stringify(storyContent), emotionalTone: 'neutral' }]
          };
        }
        
        // Extract art URLs from actual story data (not placeholders)
        const coverArtUrl = fullStory?.cover_art_url || '';
        const sceneArtUrls = Array.isArray(fullStory?.scene_art_urls) ? fullStory.scene_art_urls : [];
        
        // Create proper Character object with all required fields
        const characterObj = character ? {
          id: character.id || `temp_${Date.now()}`,
          libraryId: character.libraryId || story.library_id || '',
          name: character.name || 'Character',
          traits: character.traits || {},
          createdAt: character.createdAt || new Date().toISOString(),
          updatedAt: character.updatedAt || new Date().toISOString()
        } : {
          id: `temp_${Date.now()}`,
          libraryId: story.library_id || '',
          name: 'Character',
          traits: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Create proper GeneratedArt structure from actual story data
        const generatedArt = {
          coverArt: {
            url: coverArtUrl,
            prompt: '', // Not available from story record
            moment: { beatId: '', description: '', visualKineticScore: 0, plotShiftingScore: 0, combinedScore: 0 }
          },
          bodyIllustrations: sceneArtUrls.map((url: string, idx: number) => ({
            url,
            prompt: '', // Not available from story record
            illustration: { sequence: idx + 1, beatId: '', description: '', cameraAngle: '', depthDirective: '', prompt: '' }
          })),
          characterArt: {
            headshot: { url: '', prompt: '' }, // Not available from story record
            bodyshot: { url: '', prompt: '' } // Not available from story record
          }
        };
        
        // PDFGenerationService expects story.content.beats array (line 301 of PDFGenerationService.ts)
        // Pass full Story object with proper StoryContent structure
        const storyObj = {
          id: story.id,
          title: story.title,
          content: storyContentWithBeats // Content structure with beats array
        };
        
        // Normalize activities format - handle both array and GeneratedActivities structure
        let normalizedActivities: any = undefined;
        if (includeActivities) {
          const rawActivities = activities || fullStory?.activities;
          if (Array.isArray(rawActivities)) {
            // If it's already an array, wrap it in GeneratedActivities structure
            normalizedActivities = { activities: rawActivities };
          } else if (rawActivities && typeof rawActivities === 'object' && 'activities' in rawActivities) {
            // Already in GeneratedActivities format
            normalizedActivities = rawActivities;
          } else if (rawActivities) {
            // Try to extract activities array or create empty structure
            normalizedActivities = { activities: Array.isArray(rawActivities.activities) ? rawActivities.activities : [] };
          }
        }
        
        const pdfResult = await pdfService.generateStoryPDF({
          story: storyObj,
          character: characterObj,
          generatedArt,
          activities: normalizedActivities,
          includeActivities: includeActivities !== false,
          customization
        });
        
        // Upload PDF to S3
        // Use production pattern: ASSET_BUCKET or fallback to storytailor-assets-production
        let pdfUrl = null;
        const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
        const s3Bucket = getAssetBucketName();
        const s3Region = process.env.AWS_REGION || 'us-east-1';
        if (pdfResult.filePath) {
          try {
            const fs = await import('fs');
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: s3Region });
            const pdfBuffer = fs.readFileSync(pdfResult.filePath);
            const pdfKey = `pdfs/${storyId}/${pdfResult.fileName}`;
            
            await s3Client.send(new PutObjectCommand({
              Bucket: s3Bucket,
              Key: pdfKey,
              Body: pdfBuffer,
              ContentType: 'application/pdf'
            }));
            
            // Return CDN URL instead of direct S3 URL
            pdfUrl = getCdnUrl(pdfKey);
          } catch (s3Error) {
            console.warn('Failed to upload PDF to S3', s3Error);
          }
        }
        
        // Update story with PDF URL
        if (pdfUrl) {
          await supabase
            .from('stories')
            .update({
              pdf_url: pdfUrl,
              pdf_pages: pdfResult.pageCount,
              pdf_file_size: pdfResult.fileSize
            })
            .eq('id', storyId);
        }
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            pdfUrl,
            pageCount: pdfResult.pageCount,
            fileSize: pdfResult.fileSize
          })
        };
      } catch (error) {
        console.error('[Content Agent] PDF generation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'PDF generation failed'
          })
        };
      }
    }
    
    // Continue story (sequel/next chapter)
    if (action === 'continue_story') {
      const { parentStoryId, parentStory, continuationType, userDirection, themes, generateAssets } = body;
      
      if (!parentStoryId || !parentStory) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: parentStoryId, parentStory'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        
        // Generate sequel story
        const result = await agent.generateStory({
          userId: parentStory.user_id || 'system',
          sessionId: `sequel_${Date.now()}`,
          characterName: parentStory.character_name || 'our hero',
          characterTraits: parentStory.character_traits || {},
          storyType: continuationType || parentStory.story_type || 'adventure',
          userAge: parentStory.age_rating || 7,
          storyId: parentStoryId, // Link to parent
          // Note: RealContentAgent.generateStory may not support all these params yet
        });
        
        // Create sequel story record
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        const { data: sequelStory, error: sequelError } = await supabase
          .from('stories')
          .insert({
            library_id: parentStory.library_id,
            title: `${parentStory.title} - Part 2`,
            content: result.story?.content || {},
            status: 'draft',
            age_rating: parentStory.age_rating || 0,
            parent_story_id: parentStoryId
          })
          .select()
          .single();
        
        if (sequelError) throw sequelError;
        
        // Create asset jobs if requested
        if (generateAssets && sequelStory) {
          // NEW ORDER (V3): Cover → Scenes → Activities → Audio → PDF
          // Rationale: Visual assets appear first, activities while audio renders, PDF last with all assets
          const assetTypes = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'activities', 'audio', 'pdf'];
          for (const assetType of assetTypes) {
            await supabase
              .from('asset_generation_jobs')
              .insert({
                story_id: sequelStory.id,
                asset_type: assetType,
                status: 'queued',
                metadata: {}
              });
          }
        }
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: sequelStory
          })
        };
      } catch (error) {
        console.error('[Content Agent] Story continuation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Story continuation failed'
          })
        };
      }
    }
    
    // Unknown action
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        agentName: 'content',
        success: false,
        error: `Unknown action: ${action || body.intent?.type || 'none'}`
      })
    };

  } catch (error) {
    console.error('[Content Agent] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'content',
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        data: {
          details: error instanceof Error ? error.stack : undefined
        }
      })
    };
  }
};


async function handleFinalizationQueueEvent(event: any): Promise<any> {
  const records: any[] = Array.isArray(event.Records) ? event.Records : []
  const agent = await getContentAgent()

  const failures: Array<{ itemIdentifier: string }> = []

  for (const record of records) {
    const messageId = record.messageId || record.messageID || 'unknown'
    try {
      const correlationId =
        record.messageAttributes?.correlationId?.stringValue ||
        record.messageAttributes?.correlationId?.StringValue
      const rawBody = typeof record.body === 'string' ? record.body : JSON.stringify(record.body)
      const payload = parseFinalizationJobPayload(rawBody)
      console.log('[Finalization Worker] Start', { messageId, correlationId, storyId: payload.storyId })
      await runFinalizationJob(agent, payload)
    } catch (error) {
      console.error('[Finalization Worker] Failed record', { messageId, error })
      failures.push({ itemIdentifier: messageId })
    }
  }

  return { batchItemFailures: failures }
}


/**
 * Handle async job execution (triggered by AsyncJobManager)
 */
async function handleAsyncJob(event: any): Promise<any> {
  const { jobId, message, platform, userId, sessionId } = event;
  
  console.log('[Async Job] Processing', { jobId });

  try {
    const agent = await getContentAgent();
    const result = await agent.generateStory({
      userId: userId || 'anonymous',
      sessionId: sessionId || `session_${Date.now()}`,
      characterName: event.character?.name,
      characterTraits: event.character?.traits,
      storyType: event.storyType || 'adventure',
      userAge: event.userAge || 7
    });

    await updateJobStatus(jobId, 'completed', result);
    console.log('[Async Job] Completed', { jobId });
    return { statusCode: 200, body: JSON.stringify({ success: true, jobId }) };
  } catch (error) {
    console.error('[Async Job] Failed', { jobId, error });
    await updateJobStatus(jobId, 'failed', null, error instanceof Error ? error.message : String(error));
    return { statusCode: 500, body: JSON.stringify({ success: false, jobId }) };
  }
}

async function updateJobStatus(jobId: string, status: string, result?: any, error?: string): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('async_jobs').update({
      status,
      result_data: result,
      error_message: error,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('job_id', jobId);
  } catch (err) {
    console.error('[Async Job] Update failed', { jobId, error: err });
  }
}

export const __test__ = {
  classifyReviewOutcome,
  summarizeValidation,
  pickUserBanner,
  createImageAttempt,
  getNextAttemptIndex
}
