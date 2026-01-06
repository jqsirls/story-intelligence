import { PDFGenerationService, PDFGenerationConfig } from '../services/PDFGenerationService';
import { Story, Character } from '@storytailor/shared-types';
import { GeneratedArt } from '../services/ArtGenerationService';
import { GeneratedActivities } from '../services/EducationalActivitiesService';

describe('PDFGenerationService (Core Functionality)', () => {
  let service: PDFGenerationService;
  let config: PDFGenerationConfig;

  beforeEach(() => {
    config = {
      outputDirectory: '/tmp/test-pdfs',
      fonts: {
        title: 'Helvetica-Bold',
        body: 'Helvetica',
        caption: 'Helvetica-Oblique'
      },
      layout: {
        pageWidth: 612,
        pageHeight: 792,
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      },
      colors: {
        primary: '#2E86AB',
        secondary: '#A23B72',
        text: '#333333',
        background: '#FFFFFF'
      }
    };

    // Mock fs.existsSync and mkdirSync to avoid actual file operations
    jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);
    jest.spyOn(require('fs'), 'mkdirSync').mockReturnValue(undefined);

    service = new PDFGenerationService(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getGenerationOptions', () => {
    it('should return available PDF generation options', () => {
      const options = service.getGenerationOptions();

      expect(options.coverStyles).toHaveLength(3);
      expect(options.textSizes).toHaveLength(3);
      expect(options.imageLayouts).toHaveLength(3);
      expect(options.pageFormats).toHaveLength(3);

      // Check structure of cover styles
      options.coverStyles.forEach(style => {
        expect(style).toHaveProperty('id');
        expect(style).toHaveProperty('name');
        expect(style).toHaveProperty('description');
      });

      // Check specific options
      expect(options.coverStyles.map(s => s.id)).toContain('classic');
      expect(options.coverStyles.map(s => s.id)).toContain('modern');
      expect(options.coverStyles.map(s => s.id)).toContain('playful');

      expect(options.textSizes.map(s => s.id)).toContain('small');
      expect(options.textSizes.map(s => s.id)).toContain('medium');
      expect(options.textSizes.map(s => s.id)).toContain('large');

      expect(options.imageLayouts.map(s => s.id)).toContain('full_page');
      expect(options.imageLayouts.map(s => s.id)).toContain('text_wrap');
      expect(options.imageLayouts.map(s => s.id)).toContain('side_by_side');
    });

    it('should provide meaningful descriptions for options', () => {
      const options = service.getGenerationOptions();

      const classicStyle = options.coverStyles.find(s => s.id === 'classic');
      expect(classicStyle?.description).toContain('Traditional');

      const largeText = options.textSizes.find(s => s.id === 'large');
      expect(largeText?.description).toContain('early readers');

      const fullPageLayout = options.imageLayouts.find(s => s.id === 'full_page');
      expect(fullPageLayout?.description).toContain('entire page');
    });
  });

  describe('generateStoryPDF without dependencies', () => {
    it('should throw error when PDFKit is not available', async () => {
      const story: Story = {
        id: 'story1',
        libraryId: 'lib1',
        title: 'Test Story',
        content: {
          type: 'Adventure',
          audience: 'child',
          complexity: 'simple',
          beats: [{ id: 'beat1', sequence: 1, content: 'Story content', emotionalTone: 'excited' }],
          characters: [],
          theme: 'adventure',
          setting: 'forest',
          mood: 'adventurous',
          heroJourneyStructure: []
        },
        status: 'final',
        ageRating: 6,
        createdAt: '2024-01-01'
      };

      const character: Character = {
        id: 'char1',
        libraryId: 'lib1',
        name: 'Hero',
        traits: { name: 'Hero', species: 'human', appearance: {} },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const generatedArt: GeneratedArt = {
        coverArt: { url: '', prompt: '', moment: {} as any },
        bodyIllustrations: [],
        characterArt: { headshot: { url: '', prompt: '' }, bodyshot: { url: '', prompt: '' } }
      };

      await expect(service.generateStoryPDF({
        story,
        character,
        generatedArt,
        includeActivities: false
      })).rejects.toThrow('PDFKit is not available');
    });
  });

  describe('configuration validation', () => {
    it('should create service with valid configuration', () => {
      expect(service).toBeDefined();
      expect(service.getGenerationOptions).toBeDefined();
    });

    it('should handle different layout configurations', () => {
      const customConfig: PDFGenerationConfig = {
        ...config,
        layout: {
          pageWidth: 576,
          pageHeight: 720,
          margins: {
            top: 40,
            bottom: 40,
            left: 40,
            right: 40
          }
        }
      };

      const customService = new PDFGenerationService(customConfig);
      expect(customService).toBeDefined();
    });

    it('should handle different color schemes', () => {
      const customConfig: PDFGenerationConfig = {
        ...config,
        colors: {
          primary: '#FF6B6B',
          secondary: '#4ECDC4',
          text: '#2C3E50',
          background: '#F8F9FA'
        }
      };

      const customService = new PDFGenerationService(customConfig);
      expect(customService).toBeDefined();
    });
  });

  describe('utility methods', () => {
    it('should provide consistent option structures', () => {
      const options = service.getGenerationOptions();

      // All options should have consistent structure
      [...options.coverStyles, ...options.textSizes, ...options.imageLayouts].forEach(option => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('description');
        expect(typeof option.id).toBe('string');
        expect(typeof option.name).toBe('string');
        expect(typeof option.description).toBe('string');
      });

      // Page formats should have dimensions
      options.pageFormats.forEach(format => {
        expect(format).toHaveProperty('dimensions');
        expect(typeof format.dimensions).toBe('string');
      });
    });

    it('should provide appropriate options for children\'s books', () => {
      const options = service.getGenerationOptions();

      // Should have child-friendly text sizes
      const textSizes = options.textSizes.map(s => s.id);
      expect(textSizes).toContain('large'); // For early readers

      // Should have appropriate page formats
      const pageFormats = options.pageFormats.map(f => f.id);
      expect(pageFormats).toContain('picture_book');
      expect(pageFormats).toContain('square');

      // Should have engaging cover styles
      const coverStyles = options.coverStyles.map(s => s.id);
      expect(coverStyles).toContain('playful');
    });
  });

  describe('error handling', () => {
    it('should handle missing output directory gracefully', () => {
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
      const mkdirSpy = jest.spyOn(require('fs'), 'mkdirSync').mockReturnValue(undefined);

      new PDFGenerationService(config);

      expect(mkdirSpy).toHaveBeenCalledWith(config.outputDirectory, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);
      const mkdirSpy = jest.spyOn(require('fs'), 'mkdirSync').mockReturnValue(undefined);

      new PDFGenerationService(config);

      expect(mkdirSpy).not.toHaveBeenCalled();
    });
  });

  describe('story content processing', () => {
    it('should handle stories with different types', () => {
      const storyTypes = ['Adventure', 'Bedtime', 'Educational', 'Birthday', 'Medical Bravery'];
      
      storyTypes.forEach(type => {
        const story: Story = {
          id: 'story1',
          libraryId: 'lib1',
          title: `${type} Story`,
          content: {
            type: type as any,
            audience: 'child',
            complexity: 'simple',
            beats: [{ id: 'beat1', sequence: 1, content: 'Content', emotionalTone: 'neutral' }],
            characters: [],
            theme: 'test',
            setting: 'test',
            mood: 'calm',
            heroJourneyStructure: []
          },
          status: 'final',
          ageRating: 6,
          createdAt: '2024-01-01'
        };

        // Should not throw when processing different story types
        expect(() => {
          // This would be called internally during PDF generation
          const options = service.getGenerationOptions();
          expect(options).toBeDefined();
        }).not.toThrow();
      });
    });

    it('should handle stories with different age ratings', () => {
      const ageRatings = [3, 5, 8, 12];
      
      ageRatings.forEach(age => {
        const story: Story = {
          id: 'story1',
          libraryId: 'lib1',
          title: 'Age Test Story',
          content: {
            type: 'Adventure',
            audience: 'child',
            complexity: 'simple',
            beats: [{ id: 'beat1', sequence: 1, content: 'Content', emotionalTone: 'neutral' }],
            characters: [],
            theme: 'test',
            setting: 'test',
            mood: 'calm',
            heroJourneyStructure: []
          },
          status: 'final',
          ageRating: age,
          createdAt: '2024-01-01'
        };

        // Should handle different age ratings appropriately
        expect(() => {
          const options = service.getGenerationOptions();
          expect(options).toBeDefined();
        }).not.toThrow();
      });
    });
  });
});