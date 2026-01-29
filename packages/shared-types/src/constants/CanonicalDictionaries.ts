export type CanonicalTraitCategory =
  | 'mobility'
  | 'neurodiversity'
  | 'sensory'
  | 'medical'
  | 'skin'
  | 'physical'
  | 'family'
  | 'emotional'
  | 'cultural'

export type CanonicalDictionaryEntry = {
  key: string
  label: string
  aliases?: readonly string[]
}

export type CanonicalTraitEntry = {
  id: string
  label: string
  category: CanonicalTraitCategory
  aliases?: readonly string[]
}

const EMPTY_INPUT_TOKENS = new Set([
  '',
  'none',
  'no',
  'n/a',
  'na',
  'not applicable',
  'not_applicable',
  'null',
  'undefined'
])

const normalizeToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/['".]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export const isEmptyLike = (value?: string | null): boolean => {
  if (!value) return true
  const normalized = normalizeToken(String(value))
  return EMPTY_INPUT_TOKENS.has(normalized)
}

export const CANONICAL_DICTIONARIES = {
  inclusivityTraits: [
    { id: 'wheelchair_manual', label: 'Manual Wheelchair User', category: 'mobility', aliases: ['wheelchair', 'manual_wheelchair'] },
    { id: 'wheelchair_power', label: 'Power Wheelchair User', category: 'mobility', aliases: ['power_wheelchair', 'electric_wheelchair'] },
    { id: 'prosthetic_leg', label: 'Prosthetic Leg', category: 'mobility', aliases: ['leg_prosthetic', 'prosthetic_leg'] },
    { id: 'prosthetic_arm', label: 'Prosthetic Arm', category: 'mobility', aliases: ['arm_prosthetic', 'prosthetic_arm', 'prosthetic_hand'] },
    { id: 'limb_difference_arm_missing', label: 'Limb Difference - Missing Arm', category: 'physical', aliases: ['missing_arm', 'arm_missing'] },
    { id: 'crutches', label: 'Crutches User', category: 'mobility', aliases: ['crutch'] },
    { id: 'walker', label: 'Walker User', category: 'mobility', aliases: ['walking_frame'] },
    { id: 'cerebral_palsy', label: 'Cerebral Palsy', category: 'physical', aliases: ['cp'] },
    { id: 'down_syndrome', label: 'Down Syndrome', category: 'neurodiversity', aliases: ['down syndrome', 'downsyndrome', 'trisomy_21'] },
    { id: 'autism', label: 'Autism Spectrum Disorder', category: 'neurodiversity', aliases: ['asd', 'autism spectrum'] },
    { id: 'adhd', label: 'ADHD', category: 'neurodiversity', aliases: ['add', 'attention_deficit'] },
    { id: 'dyslexia', label: 'Dyslexia', category: 'neurodiversity' },
    { id: 'intellectual_disability', label: 'Intellectual Disability (Mild)', category: 'neurodiversity', aliases: ['intellectual_disability_mild', 'intellectual disability'] },
    { id: 'deaf', label: 'Deaf / Hard of Hearing', category: 'sensory', aliases: ['hard_of_hearing', 'deaf'] },
    { id: 'hearing_aids', label: 'Hearing Aids', category: 'sensory', aliases: ['hearing_aid'] },
    { id: 'visual_impairment', label: 'Visual Impairment / Blind', category: 'sensory', aliases: ['blind', 'vision_loss', 'visual_impairment'] },
    { id: 'vitiligo', label: 'Vitiligo', category: 'skin' },
    { id: 'albinism', label: 'Albinism', category: 'skin' },
    { id: 'cleft_lip', label: 'Cleft Lip or Palate', category: 'medical', aliases: ['cleft', 'cleft_lip_palate'] },
    { id: 'birthmark_large', label: 'Large Birthmark', category: 'skin', aliases: ['birthmark', 'port_wine_stain'] },
    { id: 'dwarfism', label: 'Dwarfism / Achondroplasia', category: 'physical', aliases: ['short_stature', 'achondroplasia'] },
    { id: 'scoliosis_brace', label: 'Scoliosis with Back Brace', category: 'physical', aliases: ['scoliosis', 'back_brace'] },
    { id: 'orthotic_devices', label: 'Orthotic Devices (AFO Braces, Splints)', category: 'physical', aliases: ['orthotics', 'afo', 'brace'] },
    { id: 'burn_scars', label: 'Burn Scars (Visible)', category: 'skin', aliases: ['burns', 'scars'] },
    { id: 'limb_length_discrepancy', label: 'Limb Length Discrepancy', category: 'physical', aliases: ['limb_length_difference'] },
    { id: 'facial_differences', label: 'Facial Differences / Asymmetry', category: 'physical', aliases: ['facial_asymmetry', 'facial_difference'] },
    { id: 'childhood_cancer', label: 'Childhood Cancer (Active Treatment)', category: 'medical', aliases: ['cancer', 'childhood_cancer'] },
    { id: 'type1_diabetes', label: 'Type 1 Diabetes', category: 'medical', aliases: ['diabetes', 't1d'] },
    { id: 'asthma', label: 'Asthma', category: 'medical' },
    { id: 'halo_cervical_orthosis', label: 'Halo Cervical Orthosis (Halo Device)', category: 'medical', aliases: ['halo', 'halo_device', 'halo_brace', 'cervical_orthosis'] },
    { id: 'port_a_cath', label: 'Port-a-Cath (Chemotherapy Port)', category: 'medical', aliases: ['portacath', 'chemo_port'] },
    { id: 'tracheostomy', label: 'Tracheostomy', category: 'medical', aliases: ['trach', 'tracheostomy_tube'] },
    { id: 'feeding_tube_gtube', label: 'Feeding Tube (G-tube)', category: 'medical', aliases: ['g_tube', 'feeding_tube'] },
    { id: 'oxygen_cannula', label: 'Oxygen Therapy (Nasal Cannula)', category: 'medical', aliases: ['nasal_cannula', 'oxygen_tube'] },
    { id: 'iv_picc_line', label: 'IV/PICC Line', category: 'medical', aliases: ['iv_line', 'picc'] },
    { id: 'cochlear_implant_external', label: 'Cochlear Implant (External Processor)', category: 'sensory', aliases: ['cochlear_implant'] },
    { id: 'cranial_helmet', label: 'Cranial Shaping Helmet', category: 'medical', aliases: ['cranial_helmet', 'helmet'] },
    { id: 'dialysis_access', label: 'Dialysis Access (Fistula/Catheter)', category: 'medical', aliases: ['dialysis', 'fistula'] },
    { id: 'medical_alert_symbol', label: 'Medical Alert Bracelet/Symbol', category: 'medical', aliases: ['medical_alert', 'alert_bracelet'] }
  ] as const,
  species: [
    { key: 'human', label: 'Human', aliases: ['person', 'people'] },
    { key: 'animal', label: 'Animal', aliases: ['pet', 'creature'] },
    { key: 'robot', label: 'Robot', aliases: ['android', 'machine'] },
    { key: 'superhero', label: 'Superhero', aliases: ['hero', 'super'] },
    { key: 'alien', label: 'Alien', aliases: ['extraterrestrial', 'space_being'] },
    { key: 'dinosaur', label: 'Dinosaur', aliases: ['dino'] },
    { key: 'monster', label: 'Monster', aliases: ['creature'] },
    { key: 'spooky', label: 'Spooky', aliases: ['ghost', 'spirit'] },
    { key: 'made_up', label: 'Made-up', aliases: ['made-up', 'custom', 'original'] },
    { key: 'fantasy_being', label: 'Fantasy Being', aliases: ['fantasy', 'magical_creature', 'dragon', 'unicorn', 'fairy', 'wizard'] },
    { key: 'elemental', label: 'Elemental', aliases: ['element', 'elemental_being'] }
  ] as const,
  genders: [
    { key: 'male', label: 'Male', aliases: ['boy', 'man'] },
    { key: 'female', label: 'Female', aliases: ['girl', 'woman'] },
    { key: 'non-binary', label: 'Non-binary', aliases: ['nonbinary', 'nb'] },
    { key: 'gender-fluid', label: 'Gender-fluid', aliases: ['genderfluid'] },
    { key: 'other', label: 'Other' },
    { key: 'prefer-not-to-specify', label: 'Prefer not to specify', aliases: ['prefer_not_to_specify', 'not_applicable', 'not applicable'] }
  ] as const,
  ethnicities: [
    { key: 'African American/Black', label: 'African American/Black', aliases: ['African American', 'Black'] },
    { key: 'Hispanic/Latino', label: 'Hispanic/Latino', aliases: ['Hispanic', 'Latino'] },
    { key: 'Hispanic/Latino Mexican', label: 'Hispanic/Latino Mexican', aliases: ['Mexican', 'Mexican/Hispanic'] },
    { key: 'Asian/Chinese', label: 'Asian/Chinese', aliases: ['Chinese', 'Chinese/East Asian'] },
    { key: 'Asian/Korean', label: 'Asian/Korean', aliases: ['Korean'] },
    { key: 'Asian/Filipino', label: 'Asian/Filipino', aliases: ['Filipino'] },
    { key: 'South Asian/Indian', label: 'South Asian/Indian', aliases: ['South Asian', 'Indian', 'Asian Indian', 'Indian/South Asian'] },
    { key: 'Pacific Islander/Samoan', label: 'Pacific Islander/Samoan', aliases: ['Pacific Islander', 'Samoan', 'Samoan/Pacific Islander'] },
    { key: 'Middle Eastern/Arab', label: 'Middle Eastern/Arab', aliases: ['Middle Eastern', 'Arab', 'Arab/North African'] },
    { key: 'Native American/Indigenous', label: 'Native American/Indigenous', aliases: ['Native American', 'Indigenous'] },
    { key: 'Mixed/Brazilian', label: 'Mixed/Brazilian', aliases: ['Brazilian', 'Brazilian/Mixed'] },
    { key: 'Multiracial/Mixed', label: 'Multiracial/Mixed', aliases: ['Mixed', 'Multiracial'] },
    { key: 'African/Nigerian', label: 'African/Nigerian', aliases: ['Nigerian'] },
    { key: 'Caribbean/Jamaican', label: 'Caribbean/Jamaican', aliases: ['Caribbean', 'Jamaican'] },
    { key: 'European/Italian', label: 'European/Italian', aliases: ['Italian'] },
    { key: 'White/Caucasian', label: 'White/Caucasian', aliases: ['White', 'Caucasian'] },
    { key: 'Japanese', label: 'Japanese' },
    { key: 'Irish', label: 'Irish' }
  ] as const,
  languages: [
    { key: 'en-US', label: 'English (US)', aliases: ['en', 'english', 'english_us'] },
    { key: 'en-GB', label: 'English (UK)', aliases: ['en-gb', 'english_uk'] },
    { key: 'es-ES', label: 'Spanish (Spain)', aliases: ['es', 'spanish', 'spanish_spain', 'es-es'] },
    { key: 'es-MX', label: 'Spanish (Mexico)', aliases: ['es-mx', 'spanish_mexico'] },
    { key: 'fr-FR', label: 'French', aliases: ['fr', 'french', 'fr-fr'] },
    { key: 'de-DE', label: 'German', aliases: ['de', 'german', 'de-de'] },
    { key: 'it-IT', label: 'Italian', aliases: ['it', 'italian', 'it-it'] },
    { key: 'pt-BR', label: 'Portuguese (Brazil)', aliases: ['pt', 'portuguese', 'pt-br', 'portuguese_brazil'] },
    { key: 'ja-JP', label: 'Japanese', aliases: ['ja', 'japanese', 'ja-jp'] },
    { key: 'ko-KR', label: 'Korean', aliases: ['ko', 'korean', 'ko-kr'] },
    { key: 'zh-CN', label: 'Chinese (Simplified)', aliases: ['zh', 'chinese', 'zh-cn'] },
    { key: 'ar-SA', label: 'Arabic', aliases: ['ar', 'arabic', 'ar-sa'] },
    { key: 'hi-IN', label: 'Hindi', aliases: ['hi', 'hindi', 'hi-in'] },
    { key: 'nl-NL', label: 'Dutch', aliases: ['nl', 'dutch', 'nl-nl'] },
    { key: 'pl-PL', label: 'Polish', aliases: ['pl', 'polish', 'pl-pl'] },
    { key: 'ru-RU', label: 'Russian', aliases: ['ru', 'russian', 'ru-ru'] },
    { key: 'sv-SE', label: 'Swedish', aliases: ['sv', 'swedish', 'sv-se'] },
    { key: 'tr-TR', label: 'Turkish', aliases: ['tr', 'turkish', 'tr-tr'] }
  ] as const,
  personalityTraits: [
    { key: 'brave', label: 'Brave', aliases: ['courageous'] },
    { key: 'strong-willed', label: 'Strong-willed', aliases: ['strong_willed', 'determined'] },
    { key: 'kind', label: 'Kind', aliases: ['caring', 'compassionate'] },
    { key: 'curious', label: 'Curious', aliases: ['inquisitive'] },
    { key: 'creative', label: 'Creative', aliases: ['imaginative', 'artistic'] },
    { key: 'funny', label: 'Funny', aliases: ['humorous'] },
    { key: 'thoughtful', label: 'Thoughtful', aliases: ['considerate'] },
    { key: 'adventurous', label: 'Adventurous', aliases: ['bold'] },
    { key: 'resilient', label: 'Resilient', aliases: ['strong'] },
    { key: 'imaginative', label: 'Imaginative', aliases: ['creative'] }
  ] as const,
  ageBuckets: [
    { key: '3_and_under', label: '3 and under', aliases: ['3', '3_and_under', '3_and_below', '3_or_under'] },
    { key: '4', label: '4', aliases: ['4_years', '4_year_old'] },
    { key: '5', label: '5', aliases: ['5_years', '5_year_old'] },
    { key: '6', label: '6', aliases: ['6_years', '6_year_old'] },
    { key: '7', label: '7', aliases: ['7_years', '7_year_old'] },
    { key: '8', label: '8', aliases: ['8_years', '8_year_old'] },
    { key: '9', label: '9', aliases: ['9_years', '9_year_old'] },
    { key: '10', label: '10', aliases: ['10_years', '10_year_old'] },
    { key: '10_plus', label: '10+', aliases: ['10+', '10_plus', '10_or_more', '10_and_up'] }
  ] as const
} as const

export type CanonicalInclusivityTraitId =
  typeof CANONICAL_DICTIONARIES.inclusivityTraits[number]['id']
export type CanonicalSpeciesKey =
  typeof CANONICAL_DICTIONARIES.species[number]['key']
export type CanonicalGenderKey =
  typeof CANONICAL_DICTIONARIES.genders[number]['key']
export type CanonicalEthnicityKey =
  typeof CANONICAL_DICTIONARIES.ethnicities[number]['key']
export type CanonicalLanguageKey =
  typeof CANONICAL_DICTIONARIES.languages[number]['key']
export type CanonicalPersonalityTraitKey =
  typeof CANONICAL_DICTIONARIES.personalityTraits[number]['key']
export type CanonicalAgeBucketKey =
  typeof CANONICAL_DICTIONARIES.ageBuckets[number]['key']

type ResolveResult = {
  value: string | null
  normalized: string | null
  isAlias: boolean
}

const buildAliasMap = (
  entries: ReadonlyArray<CanonicalDictionaryEntry | CanonicalTraitEntry>,
  keyField: 'key' | 'id'
): Map<string, string> => {
  const map = new Map<string, string>()
  entries.forEach(entry => {
    const keyValue = (entry as any)[keyField]
    if (!keyValue) return
    const key = String(keyValue)
    const normalizedKey = normalizeToken(key)
    map.set(normalizedKey, key)
    const aliases = (entry as any).aliases || []
    aliases.forEach((alias: string) => {
      const normalizedAlias = normalizeToken(alias)
      if (!map.has(normalizedAlias)) {
        map.set(normalizedAlias, key)
      }
    })
  })
  return map
}

const buildCanonicalSet = (
  entries: ReadonlyArray<CanonicalDictionaryEntry | CanonicalTraitEntry>,
  keyField: 'key' | 'id'
): Set<string> => new Set(entries.map(entry => String((entry as any)[keyField])))

const buildNormalizedKeySet = (
  entries: ReadonlyArray<CanonicalDictionaryEntry | CanonicalTraitEntry>,
  keyField: 'key' | 'id'
): Set<string> => new Set(entries.map(entry => normalizeToken(String((entry as any)[keyField]))))

const inclusivityAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.inclusivityTraits, 'id')
const speciesAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.species, 'key')
const genderAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.genders, 'key')
const ethnicityAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.ethnicities, 'key')
const languageAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.languages, 'key')
const personalityAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.personalityTraits, 'key')
const ageBucketAliasMap = buildAliasMap(CANONICAL_DICTIONARIES.ageBuckets, 'key')

export const CANONICAL_SETS = {
  inclusivityTraits: buildCanonicalSet(CANONICAL_DICTIONARIES.inclusivityTraits, 'id'),
  species: buildCanonicalSet(CANONICAL_DICTIONARIES.species, 'key'),
  genders: buildCanonicalSet(CANONICAL_DICTIONARIES.genders, 'key'),
  ethnicities: buildCanonicalSet(CANONICAL_DICTIONARIES.ethnicities, 'key'),
  languages: buildCanonicalSet(CANONICAL_DICTIONARIES.languages, 'key'),
  personalityTraits: buildCanonicalSet(CANONICAL_DICTIONARIES.personalityTraits, 'key'),
  ageBuckets: buildCanonicalSet(CANONICAL_DICTIONARIES.ageBuckets, 'key')
}

export const CANONICAL_NORMALIZED_SETS = {
  inclusivityTraits: buildNormalizedKeySet(CANONICAL_DICTIONARIES.inclusivityTraits, 'id'),
  species: buildNormalizedKeySet(CANONICAL_DICTIONARIES.species, 'key'),
  genders: buildNormalizedKeySet(CANONICAL_DICTIONARIES.genders, 'key'),
  ethnicities: buildNormalizedKeySet(CANONICAL_DICTIONARIES.ethnicities, 'key'),
  languages: buildNormalizedKeySet(CANONICAL_DICTIONARIES.languages, 'key'),
  personalityTraits: buildNormalizedKeySet(CANONICAL_DICTIONARIES.personalityTraits, 'key'),
  ageBuckets: buildNormalizedKeySet(CANONICAL_DICTIONARIES.ageBuckets, 'key')
}

const resolveFromAliasMap = (aliasMap: Map<string, string>, value?: string | null): ResolveResult => {
  if (!value || isEmptyLike(value)) return { value: null, normalized: null, isAlias: false }
  const normalized = normalizeToken(String(value))
  const resolved = aliasMap.get(normalized) || null
  if (!resolved) return { value: null, normalized, isAlias: false }
  const isAlias = normalizeToken(resolved) !== normalized
  return { value: resolved, normalized, isAlias }
}

export const resolveCanonicalInclusivityTrait = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(inclusivityAliasMap, value)

export const resolveCanonicalSpecies = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(speciesAliasMap, value)

export const resolveCanonicalGender = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(genderAliasMap, value)

export const resolveCanonicalEthnicity = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(ethnicityAliasMap, value)

export const resolveCanonicalLanguage = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(languageAliasMap, value)

export const resolveCanonicalPersonalityTrait = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(personalityAliasMap, value)

export const resolveCanonicalAgeBucket = (value?: string | null): ResolveResult =>
  resolveFromAliasMap(ageBucketAliasMap, value)

export const listCanonicalKeys = (
  entries: ReadonlyArray<CanonicalDictionaryEntry | CanonicalTraitEntry>,
  keyField: 'key' | 'id'
): string[] => entries.map(entry => String((entry as any)[keyField]))

export const getClosestMatches = (value: string, candidates: string[], maxMatches: number = 5): string[] => {
  const normalizedValue = normalizeToken(value)
  const scored = candidates
    .map(candidate => {
      const normalizedCandidate = normalizeToken(candidate)
      const score = levenshteinDistance(normalizedValue, normalizedCandidate)
      return { candidate, score }
    })
    .sort((a, b) => a.score - b.score)
  return scored.slice(0, maxMatches).map(entry => entry.candidate)
}

const levenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[a.length][b.length]
}
