-- Migration for localization and cultural adaptation features
-- This migration adds tables and functions to support multi-language and cultural adaptation

-- Cultural contexts table for storing user cultural preferences
CREATE TABLE cultural_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  primary_language TEXT NOT NULL DEFAULT 'en',
  secondary_languages TEXT[] DEFAULT '{}',
  cultural_background TEXT[] DEFAULT '{}',
  religious_considerations TEXT[] DEFAULT '{}',
  family_structure JSONB DEFAULT '{}',
  celebrations_and_holidays TEXT[] DEFAULT '{}',
  storytelling_traditions TEXT[] DEFAULT '{}',
  taboo_topics TEXT[] DEFAULT '{}',
  preferred_narrative_styles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Storytelling traditions table for cultural storytelling patterns
CREATE TABLE storytelling_traditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cultural_origin TEXT[] NOT NULL,
  narrative_structure TEXT NOT NULL,
  common_themes TEXT[] DEFAULT '{}',
  character_archetypes TEXT[] DEFAULT '{}',
  moral_framework TEXT NOT NULL,
  adaptation_guidelines TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- Cultural sensitivity filters table
CREATE TABLE cultural_sensitivity_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultural_context TEXT NOT NULL,
  sensitive_topics TEXT[] DEFAULT '{}',
  appropriate_alternatives JSONB DEFAULT '{}',
  respectful_language JSONB DEFAULT '{}',
  avoidance_patterns TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cultural_context)
);

-- Language profiles table for supported languages
CREATE TABLE language_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL, -- ISO 639-1 language code
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  rtl BOOLEAN DEFAULT FALSE, -- Right-to-left writing system
  formality TEXT CHECK (formality IN ('formal', 'informal', 'mixed')) DEFAULT 'mixed',
  dialect_variant TEXT,
  proficiency_level TEXT CHECK (proficiency_level IN ('native', 'fluent', 'intermediate', 'beginner')) DEFAULT 'native',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, dialect_variant)
);

-- Cultural character traits table for culturally-aware character generation
CREATE TABLE cultural_character_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trait TEXT NOT NULL,
  cultural_variations JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trait)
);

-- Localization cache table for storing translated content
CREATE TABLE localization_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL, -- SHA-256 hash of original content
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  cultural_context_hash TEXT NOT NULL, -- Hash of cultural context
  localized_content TEXT NOT NULL,
  cultural_adaptations TEXT[] DEFAULT '{}',
  language_notes TEXT[] DEFAULT '{}',
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1) DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- Cache expiration
  UNIQUE(content_hash, source_language, target_language, cultural_context_hash)
);

-- Religious sensitivity guidelines table
CREATE TABLE religious_sensitivity_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  religion TEXT NOT NULL,
  sensitive_topics TEXT[] DEFAULT '{}',
  appropriate_alternatives JSONB DEFAULT '{}',
  respectful_language TEXT[] DEFAULT '{}',
  celebrations_to_include TEXT[] DEFAULT '{}',
  celebrations_to_avoid TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(religion)
);

-- Family structure templates table
CREATE TABLE family_structure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_type TEXT NOT NULL,
  description TEXT NOT NULL,
  common_terms JSONB NOT NULL DEFAULT '{}',
  cultural_considerations TEXT[] DEFAULT '{}',
  storytelling_approaches TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(structure_type)
);

-- RLS Policies
ALTER TABLE cultural_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storytelling_traditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_sensitivity_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_character_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE localization_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE religious_sensitivity_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_structure_templates ENABLE ROW LEVEL SECURITY;

-- Cultural contexts - users can only access their own
CREATE POLICY cultural_contexts_policy ON cultural_contexts
  FOR ALL USING (user_id = auth.uid());

-- Storytelling traditions - read-only for all authenticated users
CREATE POLICY storytelling_traditions_policy ON storytelling_traditions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Cultural sensitivity filters - read-only for all authenticated users
CREATE POLICY cultural_sensitivity_filters_policy ON cultural_sensitivity_filters
  FOR SELECT USING (auth.role() = 'authenticated');

-- Language profiles - read-only for all authenticated users
CREATE POLICY language_profiles_policy ON language_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Cultural character traits - read-only for all authenticated users
CREATE POLICY cultural_character_traits_policy ON cultural_character_traits
  FOR SELECT USING (auth.role() = 'authenticated');

-- Localization cache - users can access cache for their requests
CREATE POLICY localization_cache_policy ON localization_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Religious sensitivity guidelines - read-only for all authenticated users
CREATE POLICY religious_sensitivity_guidelines_policy ON religious_sensitivity_guidelines
  FOR SELECT USING (auth.role() = 'authenticated');

-- Family structure templates - read-only for all authenticated users
CREATE POLICY family_structure_templates_policy ON family_structure_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_cultural_contexts_user_id ON cultural_contexts(user_id);
CREATE INDEX idx_storytelling_traditions_cultural_origin ON storytelling_traditions USING GIN(cultural_origin);
CREATE INDEX idx_cultural_sensitivity_filters_context ON cultural_sensitivity_filters(cultural_context);
CREATE INDEX idx_language_profiles_code ON language_profiles(code);
CREATE INDEX idx_localization_cache_hash ON localization_cache(content_hash, source_language, target_language);
CREATE INDEX idx_localization_cache_expires ON localization_cache(expires_at);
CREATE INDEX idx_religious_guidelines_religion ON religious_sensitivity_guidelines(religion);
CREATE INDEX idx_family_structure_type ON family_structure_templates(structure_type);

-- Function to clean up expired localization cache
CREATE OR REPLACE FUNCTION cleanup_expired_localization_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM localization_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get cultural context with defaults
CREATE OR REPLACE FUNCTION get_cultural_context_with_defaults(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  context JSONB;
BEGIN
  SELECT to_jsonb(cc.*) INTO context
  FROM cultural_contexts cc
  WHERE cc.user_id = p_user_id;
  
  -- If no context exists, return default
  IF context IS NULL THEN
    context := jsonb_build_object(
      'primary_language', 'en',
      'secondary_languages', '[]'::jsonb,
      'cultural_background', '[]'::jsonb,
      'religious_considerations', '[]'::jsonb,
      'family_structure', jsonb_build_object(
        'type', 'nuclear',
        'parentTerms', jsonb_build_object(
          'mother', '["mom", "mama", "mother", "mommy"]'::jsonb,
          'father', '["dad", "papa", "father", "daddy"]'::jsonb,
          'parent', '["parent", "guardian"]'::jsonb
        ),
        'siblingTerms', jsonb_build_object(
          'brother', '["brother", "bro"]'::jsonb,
          'sister', '["sister", "sis"]'::jsonb,
          'sibling', '["sibling", "brother or sister"]'::jsonb
        ),
        'extendedFamilyTerms', jsonb_build_object(
          'grandmother', '["grandma", "grandmother", "nana"]'::jsonb,
          'grandfather', '["grandpa", "grandfather", "papa"]'::jsonb,
          'aunt', '["aunt", "auntie"]'::jsonb,
          'uncle', '["uncle"]'::jsonb,
          'cousin', '["cousin"]'::jsonb
        )
      ),
      'celebrations_and_holidays', '[]'::jsonb,
      'storytelling_traditions', '[]'::jsonb,
      'taboo_topics', '[]'::jsonb,
      'preferred_narrative_styles', '[]'::jsonb
    );
  END IF;
  
  RETURN context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cultural context with validation
CREATE OR REPLACE FUNCTION update_cultural_context(
  p_user_id UUID,
  p_primary_language TEXT DEFAULT NULL,
  p_secondary_languages TEXT[] DEFAULT NULL,
  p_cultural_background TEXT[] DEFAULT NULL,
  p_religious_considerations TEXT[] DEFAULT NULL,
  p_family_structure JSONB DEFAULT NULL,
  p_celebrations_and_holidays TEXT[] DEFAULT NULL,
  p_storytelling_traditions TEXT[] DEFAULT NULL,
  p_taboo_topics TEXT[] DEFAULT NULL,
  p_preferred_narrative_styles TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  updated_context JSONB;
BEGIN
  -- Upsert cultural context
  INSERT INTO cultural_contexts (
    user_id,
    primary_language,
    secondary_languages,
    cultural_background,
    religious_considerations,
    family_structure,
    celebrations_and_holidays,
    storytelling_traditions,
    taboo_topics,
    preferred_narrative_styles,
    updated_at
  ) VALUES (
    p_user_id,
    COALESCE(p_primary_language, 'en'),
    COALESCE(p_secondary_languages, '{}'),
    COALESCE(p_cultural_background, '{}'),
    COALESCE(p_religious_considerations, '{}'),
    COALESCE(p_family_structure, '{}'),
    COALESCE(p_celebrations_and_holidays, '{}'),
    COALESCE(p_storytelling_traditions, '{}'),
    COALESCE(p_taboo_topics, '{}'),
    COALESCE(p_preferred_narrative_styles, '{}'),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    primary_language = COALESCE(p_primary_language, cultural_contexts.primary_language),
    secondary_languages = COALESCE(p_secondary_languages, cultural_contexts.secondary_languages),
    cultural_background = COALESCE(p_cultural_background, cultural_contexts.cultural_background),
    religious_considerations = COALESCE(p_religious_considerations, cultural_contexts.religious_considerations),
    family_structure = COALESCE(p_family_structure, cultural_contexts.family_structure),
    celebrations_and_holidays = COALESCE(p_celebrations_and_holidays, cultural_contexts.celebrations_and_holidays),
    storytelling_traditions = COALESCE(p_storytelling_traditions, cultural_contexts.storytelling_traditions),
    taboo_topics = COALESCE(p_taboo_topics, cultural_contexts.taboo_topics),
    preferred_narrative_styles = COALESCE(p_preferred_narrative_styles, cultural_contexts.preferred_narrative_styles),
    updated_at = NOW()
  RETURNING to_jsonb(cultural_contexts.*) INTO updated_context;
  
  RETURN updated_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default language profiles
INSERT INTO language_profiles (code, name, native_name, rtl, formality) VALUES
  ('en', 'English', 'English', false, 'mixed'),
  ('es', 'Spanish', 'Español', false, 'mixed'),
  ('fr', 'French', 'Français', false, 'formal'),
  ('de', 'German', 'Deutsch', false, 'formal'),
  ('it', 'Italian', 'Italiano', false, 'mixed'),
  ('pt', 'Portuguese', 'Português', false, 'mixed'),
  ('ru', 'Russian', 'Русский', false, 'formal'),
  ('ja', 'Japanese', '日本語', false, 'formal'),
  ('ko', 'Korean', '한국어', false, 'formal'),
  ('zh', 'Chinese', '中文', false, 'formal'),
  ('ar', 'Arabic', 'العربية', true, 'formal'),
  ('hi', 'Hindi', 'हिन्दी', false, 'formal'),
  ('bn', 'Bengali', 'বাংলা', false, 'mixed'),
  ('ur', 'Urdu', 'اردو', true, 'formal'),
  ('tr', 'Turkish', 'Türkçe', false, 'mixed'),
  ('nl', 'Dutch', 'Nederlands', false, 'mixed'),
  ('sv', 'Swedish', 'Svenska', false, 'mixed'),
  ('no', 'Norwegian', 'Norsk', false, 'mixed'),
  ('da', 'Danish', 'Dansk', false, 'mixed'),
  ('fi', 'Finnish', 'Suomi', false, 'mixed')
ON CONFLICT (code, dialect_variant) DO NOTHING;

-- Insert default storytelling traditions
INSERT INTO storytelling_traditions (name, cultural_origin, narrative_structure, common_themes, character_archetypes, moral_framework, adaptation_guidelines) VALUES
  ('Western Storytelling', ARRAY['European', 'American'], 'Three-act structure with hero''s journey', ARRAY['good vs evil', 'personal growth', 'friendship', 'courage'], ARRAY['hero', 'mentor', 'villain', 'sidekick'], 'Individual responsibility and moral choice', ARRAY['Focus on individual agency', 'Clear moral distinctions', 'Happy endings preferred']),
  ('East Asian Storytelling', ARRAY['Chinese', 'Japanese', 'Korean'], 'Cyclical narrative with emphasis on harmony', ARRAY['harmony', 'respect for elders', 'collective good', 'balance'], ARRAY['wise elder', 'dutiful child', 'harmonious community'], 'Collective responsibility and social harmony', ARRAY['Emphasize community over individual', 'Respect for tradition', 'Subtle moral lessons']),
  ('African Storytelling', ARRAY['Various African cultures'], 'Oral tradition with call-and-response elements', ARRAY['community wisdom', 'connection to nature', 'ancestral guidance', 'survival'], ARRAY['wise griot', 'trickster', 'community elder', 'animal spirits'], 'Community wisdom and ancestral guidance', ARRAY['Include community participation', 'Nature as teacher', 'Oral storytelling elements']),
  ('Indigenous Storytelling', ARRAY['Native American', 'Aboriginal', 'First Nations'], 'Circular narrative with spiritual elements', ARRAY['connection to land', 'spiritual guidance', 'respect for all beings', 'traditional knowledge'], ARRAY['spirit guide', 'animal teacher', 'wise elder', 'nature guardian'], 'Respect for all living beings and natural balance', ARRAY['Honor spiritual elements', 'Respect for nature', 'Traditional knowledge preservation']),
  ('Middle Eastern Storytelling', ARRAY['Arabic', 'Persian', 'Turkish'], 'Nested narratives with moral lessons', ARRAY['hospitality', 'wisdom', 'divine providence', 'family honor'], ARRAY['wise sultan', 'clever merchant', 'devoted family member', 'divine messenger'], 'Divine guidance and family honor', ARRAY['Emphasize hospitality', 'Respect for wisdom', 'Family-centered values'])
ON CONFLICT (name) DO NOTHING;

-- Insert default family structure templates
INSERT INTO family_structure_templates (structure_type, description, common_terms, cultural_considerations, storytelling_approaches) VALUES
  ('nuclear', 'Traditional two-parent household with children', '{"type": "nuclear", "parentTerms": {"mother": ["mom", "mama", "mother", "mommy"], "father": ["dad", "papa", "father", "daddy"], "parent": ["parent", "guardian"]}, "siblingTerms": {"brother": ["brother", "bro"], "sister": ["sister", "sis"], "sibling": ["sibling", "brother or sister"]}, "extendedFamilyTerms": {"grandmother": ["grandma", "grandmother", "nana"], "grandfather": ["grandpa", "grandfather", "papa"], "aunt": ["aunt", "auntie"], "uncle": ["uncle"], "cousin": ["cousin"]}}', ARRAY['Most common in Western cultures', 'May not reflect all family realities'], ARRAY['Include both parents in decision-making', 'Show balanced parental roles']),
  ('single_parent', 'One parent raising children', '{"type": "single_parent", "parentTerms": {"mother": ["mom", "mama", "mother", "mommy"], "father": ["dad", "papa", "father", "daddy"], "parent": ["parent", "guardian", "my grown-up"]}, "siblingTerms": {"brother": ["brother", "bro"], "sister": ["sister", "sis"], "sibling": ["sibling", "brother or sister"]}, "extendedFamilyTerms": {"grandmother": ["grandma", "grandmother", "nana"], "grandfather": ["grandpa", "grandfather", "papa"], "aunt": ["aunt", "auntie"], "uncle": ["uncle"], "cousin": ["cousin"]}}', ARRAY['Increasingly common across cultures', 'May involve extended family support'], ARRAY['Show strength and resilience', 'Include supportive community', 'Avoid pity narratives']),
  ('blended', 'Families formed through remarriage with children from previous relationships', '{"type": "blended", "parentTerms": {"mother": ["mom", "mama", "stepmom", "bonus mom"], "father": ["dad", "papa", "stepdad", "bonus dad"], "parent": ["parent", "step-parent", "bonus parent"]}, "siblingTerms": {"brother": ["brother", "stepbrother", "half-brother"], "sister": ["sister", "stepsister", "half-sister"], "sibling": ["sibling", "step-sibling", "bonus sibling"]}, "extendedFamilyTerms": {"grandmother": ["grandma", "step-grandma", "bonus grandma"], "grandfather": ["grandpa", "step-grandpa", "bonus grandpa"], "aunt": ["aunt", "step-aunt"], "uncle": ["uncle", "step-uncle"], "cousin": ["cousin", "step-cousin"]}}', ARRAY['Complex relationships require sensitivity', 'Multiple households may be involved'], ARRAY['Celebrate expanded family', 'Address adjustment challenges positively', 'Show love in different forms']),
  ('multigenerational', 'Multiple generations living together', '{"type": "multigenerational", "parentTerms": {"mother": ["mom", "mama", "mother"], "father": ["dad", "papa", "father"], "parent": ["parent", "guardian"]}, "siblingTerms": {"brother": ["brother", "bro"], "sister": ["sister", "sis"], "sibling": ["sibling"]}, "extendedFamilyTerms": {"grandmother": ["grandma", "nana", "abuela", "nonna"], "grandfather": ["grandpa", "abuelo", "nonno"], "aunt": ["aunt", "tia"], "uncle": ["uncle", "tio"], "cousin": ["cousin", "primo", "prima"]}}', ARRAY['Common in many cultures worldwide', 'Respect for elders is important'], ARRAY['Show wisdom of elders', 'Include cultural traditions', 'Demonstrate intergenerational bonds']),
  ('chosen_family', 'Non-biological family bonds formed by choice', '{"type": "chosen_family", "parentTerms": {"mother": ["mom", "chosen mom", "family mom"], "father": ["dad", "chosen dad", "family dad"], "parent": ["parent", "guardian", "family grown-up"]}, "siblingTerms": {"brother": ["brother", "chosen brother", "family brother"], "sister": ["sister", "chosen sister", "family sister"], "sibling": ["sibling", "family sibling"]}, "extendedFamilyTerms": {"grandmother": ["grandma", "chosen grandma", "family grandma"], "grandfather": ["grandpa", "chosen grandpa", "family grandpa"], "aunt": ["aunt", "family aunt"], "uncle": ["uncle", "family uncle"], "cousin": ["cousin", "family cousin"]}}', ARRAY['Important in LGBTQ+ communities', 'May include close friends as family'], ARRAY['Emphasize love over biology', 'Show strength of chosen bonds', 'Include diverse relationship types']),
  ('extended', 'Includes aunts, uncles, cousins as primary caregivers', '{"type": "extended", "parentTerms": {"mother": ["mom", "mama", "aunt-mom", "tia"], "father": ["dad", "papa", "uncle-dad", "tio"], "parent": ["parent", "guardian", "family caregiver"]}, "siblingTerms": {"brother": ["brother", "cousin-brother"], "sister": ["sister", "cousin-sister"], "sibling": ["sibling", "family sibling"]}, "extendedFamilyTerms": {"grandmother": ["grandma", "abuela", "nana"], "grandfather": ["grandpa", "abuelo", "papa"], "aunt": ["aunt", "tia", "auntie"], "uncle": ["uncle", "tio"], "cousin": ["cousin", "primo", "prima"]}}', ARRAY['Common in many cultures', 'Strong community bonds'], ARRAY['Show community support', 'Include cultural traditions', 'Demonstrate extended family love'])
ON CONFLICT (structure_type) DO NOTHING;

-- Create a scheduled job to clean up expired cache (if pg_cron is available)
-- SELECT cron.schedule('cleanup-localization-cache', '0 2 * * *', 'SELECT cleanup_expired_localization_cache();');

COMMENT ON TABLE cultural_contexts IS 'Stores cultural preferences and context for users to enable culturally-aware storytelling';
COMMENT ON TABLE storytelling_traditions IS 'Defines storytelling patterns and traditions from different cultures';
COMMENT ON TABLE cultural_sensitivity_filters IS 'Contains cultural sensitivity guidelines and filters';
COMMENT ON TABLE language_profiles IS 'Supported languages with their characteristics';
COMMENT ON TABLE cultural_character_traits IS 'Cultural variations for character traits';
COMMENT ON TABLE localization_cache IS 'Cache for translated and culturally adapted content';
COMMENT ON TABLE religious_sensitivity_guidelines IS 'Guidelines for religious sensitivity in content';
COMMENT ON TABLE family_structure_templates IS 'Templates for different family structures';