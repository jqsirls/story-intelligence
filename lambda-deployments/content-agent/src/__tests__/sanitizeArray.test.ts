import { sanitizeArray } from '../lambda'

describe('sanitizeArray', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

  afterEach(() => {
    warnSpy.mockClear()
  })

  afterAll(() => {
    warnSpy.mockRestore()
  })

  it('sanitizes array input', () => {
    const result = sanitizeArray(['  hello  ', '', 'world'])
    expect(result).toEqual(['hello', 'world'])
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('returns empty array for null/undefined', () => {
    expect(sanitizeArray(null)).toEqual([])
    expect(sanitizeArray(undefined)).toEqual([])
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('coerces string input to array', () => {
    const result = sanitizeArray('  hi  ', { label: 'traits.ethnicity' })
    expect(result).toEqual(['hi'])
    expect(warnSpy).toHaveBeenCalled()
  })

  it('drops object input by default', () => {
    const result = sanitizeArray({ value: 'x' }, { label: 'traits.ethnicity' })
    expect(result).toEqual([])
    expect(warnSpy).toHaveBeenCalled()
  })

  it('keeps object input when allowObject is true', () => {
    const payload = { id: 'trait_object' }
    const result = sanitizeArray(payload, { label: 'traits.inclusivityTraits', allowObject: true })
    expect(result).toEqual([payload])
    expect(warnSpy).toHaveBeenCalled()
  })

  it('drops non-string primitive input', () => {
    expect(sanitizeArray(42, { label: 'traits.personalityTraits' })).toEqual([])
    expect(sanitizeArray(true, { label: 'traits.personalityTraits' })).toEqual([])
    expect(warnSpy).toHaveBeenCalled()
  })
})
