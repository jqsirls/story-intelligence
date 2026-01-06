// Temporary stub to satisfy unit tests during Phase-4 hardening
export class StoryGenerationService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // Mock generate method used by tests
  async generate(): Promise<any> {
    return {
      story: 'Once upon a time...'
    };
  }
}
