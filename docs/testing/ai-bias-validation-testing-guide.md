# AI Bias Validation Testing Guide

## Purpose

This guide provides comprehensive testing procedures for validating that AI bias mitigation is working and inclusivity traits are accurately represented in generated images.

## Test Environment Setup

### Prerequisites

```bash
# Set OpenAI API key
export OPENAI_API_KEY=your-key-here

# Navigate to content agent
cd lambda-deployments/content-agent

# Install dependencies if needed
npm install
```

### Test Data

Create test characters covering all Week 1 traits (20 total) in staging environment.

## Automated Test Suite

### Location
`lambda-deployments/content-agent/src/__tests__/ImageQualityAndBiasValidation.test.ts`

### Running Tests

```bash
# Run AI bias validation tests
npm test ImageQualityAndBiasValidation.test.ts

# Run with coverage
npm test -- --coverage ImageQualityAndBiasValidation.test.ts
```

### Test Cases Included

1. **Down Syndrome:** Validates almond eyes, flat bridge, rounded features visible
2. **Missing Arm:** Validates limb clearly missing (not added by AI)
3. **Dark Skin Tone:** Validates hex accuracy (not lightened)
4. **Wheelchair User:** Validates character seated in chair (not standing)
5. **Vitiligo:** Validates patches visible (not smoothed)
6. **Prosthetic Leg:** Validates prosthetic distinct from biological

## Manual Testing Procedures

### Test 1: Character Reference Generation

**For Each Week 1 Trait:**

```typescript
// 1. Define character
const traits = {
  name: '[Name]',
  age: [age],
  species: 'human',
  ethnicity: ['[ethnicity]'],
  inclusivityTraits: [{ type: '[trait_id]', description: '[description]' }]
};

// 2. Generate references
const references = await charService.generateReferenceImagesWithValidation(traits, characterId);

// 3. Check validation results
console.log('Headshot validated:', references.headshot.traitsValidated);
console.log('Bodyshot validated:', references.bodyshot.traitsValidated);

// 4. Visual inspection
// Open images, verify traits actually visible
// Document any AI bias cases
```

**Success Criteria:**
- [ ] Both headshot and bodyshot generated
- [ ] `traitsValidated: true` for both images
- [ ] Visual inspection confirms trait visible
- [ ] Medical accuracy maintained
- [ ] Dignified portrayal

### Test 2: Story Image Generation

**Test Batch Mode:**

```typescript
const result = await contentAgent.generateStoryImages(
  story,
  characterName,
  characterTraits,
  characterId,
  'batch'
);

// Validate
expect(result.coverImageUrl).toBeDefined();
expect(result.beatImages.length).toBe(4);
expect(result.beatImages.every(b => b.traitsValidated)).toBe(true);
```

**Test Progressive Mode:**

```typescript
// Generate cover first
const result1 = await contentAgent.generateStoryImages(
  { ...story, keyBeats: [story.keyBeats[0]] },
  characterName,
  characterTraits,
  characterId,
  'progressive',
  []
);

// Add beat 2
const result2 = await contentAgent.generateStoryImages(
  { ...story, keyBeats: [story.keyBeats[1]] },
  characterName,
  characterTraits,
  characterId,
  'progressive',
  [{ beatNumber: 1, imageUrl: result1.coverImageUrl }]
);

// Verify progressive accumulation
expect(result2.beatImages.length).toBe(2);
```

**Success Criteria:**
- [ ] All 5 images generated
- [ ] Visual consistency across images
- [ ] Character appearance matches references
- [ ] Traits visible in all images
- [ ] Poses vary (not repetitive)
- [ ] Alt text generated for all images

### Test 3: AI Bias Detection

**Test Difficult Traits:**

For traits AI typically fails on:
- Down syndrome (smoothes features)
- Missing limbs (adds limbs)
- Dark skin (lightens)
- Wheelchair (shows standing)

**Procedure:**
1. Generate character with trait
2. Check `traitsValidated` flag
3. If false: Document AI bias case
4. Visual inspection: Confirm trait visible or missing
5. Review suggested retry prompt
6. Test retry logic

**Document Results:**

```markdown
| Trait | Attempt 1 Success | Retry Needed | Final Validated | AI Bias Pattern |
|-------|------------------|--------------|-----------------|-----------------|
| Down syndrome | false | yes | true | Features smoothed on first attempt |
| Missing arm | false | yes | true | AI added both arms |
| Dark skin | true | no | true | Hex enforced correctly |
```

### Test 4: Visual Consistency

**Generate Complete Story:**
1. Create character with trait
2. Generate complete story (5 images)
3. Review all 5 images side-by-side
4. Validate:
   - [ ] Same character appearance across all images
   - [ ] Trait visible in all images
   - [ ] Poses vary appropriately
   - [ ] Artistic style consistent
   - [ ] Quality matches Buildship

### Test 5: Performance & Timing

**Character Creation:**
- Measure: Time from start to references stored
- Target: 25-40 seconds
- Record: Retry rate, validation success

**Story Generation (Batch):**
- Measure: Time for all 5 images
- Target: 55-110 seconds
- Record: Reference usage, validation success

**Story Generation (Progressive):**
- Measure: Time to first beat text, image stream timing
- Target: Text at 4s, images progressive
- Record: User perception (does it feel fast?)

## Results Documentation

### Success Rate Tracking

Track in production/staging database:

```sql
-- Overall validation success rate
SELECT 
  COUNT(*) as total_characters,
  SUM(CASE WHEN EXISTS (
    SELECT 1 FROM jsonb_array_elements(reference_images) AS img 
    WHERE (img->>'traitsValidated')::boolean = true
  ) THEN 1 ELSE 0 END) as validated,
  ROUND(100.0 * SUM(CASE WHEN EXISTS (
    SELECT 1 FROM jsonb_array_elements(reference_images) AS img 
    WHERE (img->>'traitsValidated')::boolean = true
  ) THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct
FROM user_characters
WHERE reference_images IS NOT NULL AND reference_images != '[]'::jsonb;

-- By trait type
SELECT 
  (traits->'inclusivityTraits'->0->>'type') as trait_type,
  COUNT(*) as count,
  AVG(CASE WHEN EXISTS (
    SELECT 1 FROM jsonb_array_elements(reference_images) AS img 
    WHERE (img->>'traitsValidated')::boolean = true
  ) THEN 1 ELSE 0 END) as validation_rate
FROM user_characters
WHERE reference_images IS NOT NULL
GROUP BY trait_type
ORDER BY validation_rate ASC;
```

### AI Bias Cases

Document every trait validation failure:

```markdown
## AI Bias Case Log

### Case #1
- **Date:** 2025-12-18
- **Trait:** Down syndrome
- **Character:** Test character "Aria"
- **Issue:** Almond eyes not visible on first attempt
- **Retry Success:** Yes, attempt 2
- **Prompt Refinement:** Added "REJECT if eyes typical"

### Case #2
[Document as discovered]
```

## Acceptance Criteria

### Before Staging Approval
- [ ] All 20 Week 1 traits tested
- [ ] ≥85% validation success rate
- [ ] <30% retry rate
- [ ] Zero safety failures
- [ ] All automated tests passing

### Before Production Deployment
- [ ] ≥90% validation success rate in staging
- [ ] <20% retry rate
- [ ] Family beta feedback positive
- [ ] Cost within +50% budget
- [ ] Performance metrics acceptable
- [ ] Monitoring dashboards configured

## Troubleshooting

### High Retry Rate (>30%)
- Review trait prompts for insufficient MANDATORY language
- Check vision model (GPT-5.1) is being used
- Verify reference images high quality
- Consider adding more specific visual requirements

### Trait Consistently Fails Validation
- Test trait manually with OpenAI Playground
- Add more forceful MANDATORY language
- Expand negative prompt
- Consider if trait is visually detectable
- May need manual artist review for some traits

### Performance Issues
- Check retry rates causing delays
- Verify graceful degradation working
- Monitor vision API latency
- Consider reducing retries for non-critical images

## Family Feedback Collection

### Survey Questions

After character creation:
1. "Does this character look like your child?" (1-5 scale)
2. "Are the [trait] features accurately shown?" (yes/no)
3. "Do you feel this representation is dignified?" (1-5)
4. "Would you like any changes?" (open text)

Target Scores:
- Accuracy: ≥4.5/5
- Dignity: ≥4.7/5
- "Yes" on accurate features: ≥95%

## Continuous Improvement

### Weekly Review
- Analyze trait validation rates
- Identify traits with <90% success
- Refine prompts for problematic traits
- Deploy refinements to staging
- Measure improvement

### Monthly Assessment
- Review family feedback
- Identify new trait requests
- Prioritize next batch of traits
- Plan implementation sprints

### Quarterly Goals
- Add 30 new traits per quarter
- Maintain ≥95% validation rate
- Reduce retry rate by 5% per quarter
- Improve family satisfaction scores

## Related Documentation

- **Implementation:** `docs/development/image-generation-with-ai-bias-mitigation.md`
- **API Usage:** See Content Agent code examples
- **Trait Database:** `lambda-deployments/content-agent/src/constants/ComprehensiveInclusivityDatabase.ts`
