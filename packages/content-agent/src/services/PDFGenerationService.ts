import { Story, Character } from '@storytailor/shared-types';
import { GeneratedArt } from './ArtGenerationService';
import { GeneratedActivities } from './EducationalActivitiesService';
import fs from 'fs';
import path from 'path';

// Dynamic imports for optional dependencies
let PDFDocument: any;
let fetch: any;

try {
  PDFDocument = require('pdfkit');
} catch (error) {
  console.warn('PDFKit not available, PDF generation will be disabled');
}

try {
  fetch = require('node-fetch');
} catch (error) {
  console.warn('node-fetch not available, image downloads will be disabled');
}

export interface PDFGenerationConfig {
  outputDirectory: string;
  fonts: {
    title: string;
    body: string;
    caption: string;
  };
  layout: {
    pageWidth: number;
    pageHeight: number;
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
}

export interface PDFGenerationRequest {
  story: Story;
  character: Character;
  generatedArt: GeneratedArt;
  activities?: GeneratedActivities;
  includeActivities: boolean;
  customization?: {
    coverStyle?: 'classic' | 'modern' | 'playful';
    textSize?: 'small' | 'medium' | 'large';
    imageLayout?: 'full_page' | 'text_wrap' | 'side_by_side';
  };
}

export interface GeneratedPDF {
  filePath: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  metadata: {
    storyId: string;
    characterId: string;
    generatedAt: string;
    includesActivities: boolean;
    customization: any;
  };
}

export interface PDFRegenerationRequest {
  originalPDF: GeneratedPDF;
  updatedStory?: Story;
  updatedArt?: GeneratedArt;
  updatedActivities?: GeneratedActivities;
  changedElements?: string[];
}

export class PDFGenerationService {
  private config: PDFGenerationConfig;

  constructor(config: PDFGenerationConfig) {
    this.config = config;
    this.ensureOutputDirectory();
  }

  /**
   * Generate a complete story PDF with text and illustrations
   */
  async generateStoryPDF(request: PDFGenerationRequest): Promise<GeneratedPDF> {
    if (!PDFDocument) {
      throw new Error('PDFKit is not available. Please install pdfkit to use PDF generation.');
    }
    
    try {
      const fileName = this.generateFileName(request.story, request.character);
      const filePath = path.join(this.config.outputDirectory, fileName);
      
      // Create PDF document
      const doc = new PDFDocument({
        size: [this.config.layout.pageWidth, this.config.layout.pageHeight],
        margins: this.config.layout.margins,
        info: {
          Title: request.story.title,
          Author: 'Storytailor',
          Subject: `A ${request.story.content.type} story featuring ${request.character.name}`,
          Keywords: `children's book, ${request.story.content.type}, ${request.story.content.theme}`,
          Creator: 'Storytailor PDF Generator',
          Producer: 'Storytailor'
        }
      });

      // Pipe to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Generate PDF content
      await this.generateCoverPage(doc, request);
      await this.generateStoryPages(doc, request);
      
      if (request.includeActivities && request.activities) {
        await this.generateActivitiesPages(doc, request.activities);
      }
      
      await this.generateBackMatter(doc, request);

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // Get file stats
      const stats = fs.statSync(filePath);
      const pageCount = this.estimatePageCount(request);

      return {
        filePath,
        fileName,
        fileSize: stats.size,
        pageCount,
        metadata: {
          storyId: request.story.id,
          characterId: request.character.id,
          generatedAt: new Date().toISOString(),
          includesActivities: request.includeActivities,
          customization: request.customization || {}
        }
      };

    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Regenerate PDF when story or art changes
   */
  async regeneratePDF(request: PDFRegenerationRequest): Promise<GeneratedPDF> {
    try {
      // If major elements changed, regenerate completely
      if (this.requiresFullRegeneration(request.changedElements)) {
        if (!request.updatedStory) {
          throw new Error('Updated story required for full regeneration');
        }

        const character: Character = {
          id: request.originalPDF.metadata.characterId,
          libraryId: '',
          name: '',
          traits: { name: '', species: 'human', appearance: {} },
          createdAt: '',
          updatedAt: ''
        };

        return this.generateStoryPDF({
          story: request.updatedStory,
          character,
          generatedArt: request.updatedArt || {} as GeneratedArt,
          activities: request.updatedActivities,
          includeActivities: request.originalPDF.metadata.includesActivities,
          customization: request.originalPDF.metadata.customization
        });
      }

      // For minor changes, update specific sections
      // This is a simplified approach - in production, you might want more granular updates
      return this.generateStoryPDF({
        story: request.updatedStory || {} as Story,
        character: {} as Character,
        generatedArt: request.updatedArt || {} as GeneratedArt,
        activities: request.updatedActivities,
        includeActivities: request.originalPDF.metadata.includesActivities,
        customization: request.originalPDF.metadata.customization
      });

    } catch (error) {
      throw new Error(`Failed to regenerate PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get PDF generation options and templates
   */
  getGenerationOptions(): {
    coverStyles: { id: string; name: string; description: string }[];
    textSizes: { id: string; name: string; description: string }[];
    imageLayouts: { id: string; name: string; description: string }[];
    pageFormats: { id: string; name: string; dimensions: string }[];
  } {
    return {
      coverStyles: [
        { id: 'classic', name: 'Classic', description: 'Traditional children\'s book cover with title and character' },
        { id: 'modern', name: 'Modern', description: 'Clean, contemporary design with bold typography' },
        { id: 'playful', name: 'Playful', description: 'Fun, colorful design with decorative elements' }
      ],
      textSizes: [
        { id: 'small', name: 'Small', description: 'Compact text for older children (10-12pt)' },
        { id: 'medium', name: 'Medium', description: 'Standard reading size (14-16pt)' },
        { id: 'large', name: 'Large', description: 'Large text for early readers (18-20pt)' }
      ],
      imageLayouts: [
        { id: 'full_page', name: 'Full Page', description: 'Images take up entire page with text overlay' },
        { id: 'text_wrap', name: 'Text Wrap', description: 'Text flows around images' },
        { id: 'side_by_side', name: 'Side by Side', description: 'Text and images in separate columns' }
      ],
      pageFormats: [
        { id: 'standard', name: 'Standard (8.5" x 11")', dimensions: '612 x 792 pts' },
        { id: 'picture_book', name: 'Picture Book (8" x 10")', dimensions: '576 x 720 pts' },
        { id: 'square', name: 'Square (8" x 8")', dimensions: '576 x 576 pts' }
      ]
    };
  }

  // Private helper methods

  private async generateCoverPage(doc: PDFDocument, request: PDFGenerationRequest): Promise<void> {
    const { story, character, generatedArt } = request;
    const customization = request.customization || {};

    // Add cover art if available
    if (generatedArt.coverArt?.url) {
      try {
        const imageBuffer = await this.downloadImage(generatedArt.coverArt.url);
        doc.image(imageBuffer, 0, 0, {
          width: this.config.layout.pageWidth,
          height: this.config.layout.pageHeight,
          fit: [this.config.layout.pageWidth, this.config.layout.pageHeight]
        });
      } catch (error) {
        console.warn('Failed to load cover art, using text-only cover');
      }
    }

    // Add title overlay
    const titleY = this.config.layout.pageHeight * 0.1;
    doc.fontSize(this.getTitleFontSize(customization.coverStyle))
       .fillColor(this.config.colors.primary)
       .text(story.title, this.config.layout.margins.left, titleY, {
         width: this.config.layout.pageWidth - (this.config.layout.margins.left + this.config.layout.margins.right),
         align: 'center'
       });

    // Add character name
    const characterY = titleY + 80;
    doc.fontSize(16)
       .fillColor(this.config.colors.secondary)
       .text(`Featuring ${character.name}`, this.config.layout.margins.left, characterY, {
         width: this.config.layout.pageWidth - (this.config.layout.margins.left + this.config.layout.margins.right),
         align: 'center'
       });

    // Add story type and age rating
    const metaY = this.config.layout.pageHeight - 100;
    doc.fontSize(12)
       .fillColor(this.config.colors.text)
       .text(`${story.content.type} Story • Ages ${story.ageRating}+`, this.config.layout.margins.left, metaY, {
         width: this.config.layout.pageWidth - (this.config.layout.margins.left + this.config.layout.margins.right),
         align: 'center'
       });

    doc.addPage();
  }

  private async generateStoryPages(doc: PDFDocument, request: PDFGenerationRequest): Promise<void> {
    const { story, generatedArt } = request;
    const customization = request.customization || {};
    const textSize = this.getTextSize(customization.textSize);
    const imageLayout = customization.imageLayout || 'side_by_side';

    // Title page
    doc.fontSize(24)
       .fillColor(this.config.colors.primary)
       .text(story.title, { align: 'center' });
    
    doc.moveDown(2);

    // Story content
    for (let i = 0; i < story.content.beats.length; i++) {
      const beat = story.content.beats[i];
      const illustration = generatedArt.bodyIllustrations?.[i];

      if (imageLayout === 'full_page' && illustration?.url) {
        // Full page image with text overlay
        try {
          const imageBuffer = await this.downloadImage(illustration.url);
          doc.addPage();
          doc.image(imageBuffer, 0, 0, {
            width: this.config.layout.pageWidth,
            height: this.config.layout.pageHeight,
            fit: [this.config.layout.pageWidth, this.config.layout.pageHeight]
          });
          
          // Add text overlay with background
          const textY = this.config.layout.pageHeight - 150;
          doc.rect(0, textY - 20, this.config.layout.pageWidth, 150)
             .fillColor(this.config.colors.background)
             .fillOpacity(0.8)
             .fill();
          
          doc.fillColor(this.config.colors.text)
             .fillOpacity(1)
             .fontSize(textSize)
             .text(beat.content, this.config.layout.margins.left, textY, {
               width: this.config.layout.pageWidth - (this.config.layout.margins.left + this.config.layout.margins.right),
               align: 'center'
             });
        } catch (error) {
          // Fallback to text only
          this.addTextOnlyBeat(doc, beat, textSize);
        }
      } else if (imageLayout === 'side_by_side' && illustration?.url) {
        // Side by side layout
        try {
          const imageBuffer = await this.downloadImage(illustration.url);
          const imageWidth = (this.config.layout.pageWidth - this.config.layout.margins.left - this.config.layout.margins.right) * 0.4;
          const textWidth = (this.config.layout.pageWidth - this.config.layout.margins.left - this.config.layout.margins.right) * 0.55;
          
          // Add image
          doc.image(imageBuffer, this.config.layout.margins.left, doc.y, {
            width: imageWidth,
            fit: [imageWidth, 300]
          });
          
          // Add text beside image
          const textX = this.config.layout.margins.left + imageWidth + 20;
          doc.fontSize(textSize)
             .fillColor(this.config.colors.text)
             .text(beat.content, textX, doc.y - 300, {
               width: textWidth,
               align: 'left'
             });
        } catch (error) {
          this.addTextOnlyBeat(doc, beat, textSize);
        }
      } else {
        // Text only or text wrap
        this.addTextOnlyBeat(doc, beat, textSize);
      }

      doc.moveDown(1);
      
      // Add page break if needed
      if (doc.y > this.config.layout.pageHeight - 100) {
        doc.addPage();
      }
    }
  }

  private async generateActivitiesPages(doc: PDFDocument, activities: GeneratedActivities): Promise<void> {
    doc.addPage();
    
    // Activities section header
    doc.fontSize(20)
       .fillColor(this.config.colors.primary)
       .text('Fun Activities to Try!', { align: 'center' });
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .fillColor(this.config.colors.text)
       .text('Here are some fun activities you can do with an adult to extend your story experience:', { align: 'center' });
    
    doc.moveDown(2);

    // Add each activity
    for (const activity of activities.activities) {
      // Activity title
      doc.fontSize(16)
         .fillColor(this.config.colors.secondary)
         .text(activity.title);
      
      doc.moveDown(0.5);
      
      // Activity description
      doc.fontSize(12)
         .fillColor(this.config.colors.text)
         .text(activity.description);
      
      doc.moveDown(0.5);
      
      // Duration and age range
      doc.fontSize(10)
         .fillColor(this.config.colors.text)
         .text(`Duration: ${activity.duration} | Ages: ${activity.ageRange.min}-${activity.ageRange.max}`);
      
      doc.moveDown(0.5);
      
      // Materials needed
      if (activity.materials.length > 0) {
        doc.fontSize(12)
           .fillColor(this.config.colors.secondary)
           .text('Materials needed:');
        
        activity.materials.forEach(material => {
          doc.fontSize(10)
             .fillColor(this.config.colors.text)
             .text(`• ${material}`, { indent: 20 });
        });
        
        doc.moveDown(0.5);
      }
      
      // Instructions
      if (activity.instructions.length > 0) {
        doc.fontSize(12)
           .fillColor(this.config.colors.secondary)
           .text('Instructions:');
        
        activity.instructions.forEach((instruction, index) => {
          doc.fontSize(10)
             .fillColor(this.config.colors.text)
             .text(`${index + 1}. ${instruction}`, { indent: 20 });
        });
        
        doc.moveDown(0.5);
      }
      
      // Parent tips
      if (activity.parentTips.length > 0) {
        doc.fontSize(11)
           .fillColor(this.config.colors.secondary)
           .text('Parent Tips:');
        
        activity.parentTips.forEach(tip => {
          doc.fontSize(9)
             .fillColor(this.config.colors.text)
             .text(`💡 ${tip}`, { indent: 20 });
        });
      }
      
      doc.moveDown(1.5);
      
      // Add page break if needed
      if (doc.y > this.config.layout.pageHeight - 150) {
        doc.addPage();
      }
    }
  }

  private async generateBackMatter(doc: PDFDocument, request: PDFGenerationRequest): Promise<void> {
    doc.addPage();
    
    // About this story
    doc.fontSize(16)
       .fillColor(this.config.colors.primary)
       .text('About This Story', { align: 'center' });
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .fillColor(this.config.colors.text)
       .text(`This ${request.story.content.type.toLowerCase()} story was created especially for ${request.character.name} using Storytailor's SI Powered storytelling platform.`);
    
    doc.moveDown(1);
    
    // Story details
    const details = [
      `Story Type: ${request.story.content.type}`,
      `Theme: ${request.story.content.theme}`,
      `Setting: ${request.story.content.setting}`,
      `Mood: ${request.story.content.mood}`,
      `Age Rating: ${request.story.ageRating}+`,
      `Created: ${new Date(request.story.createdAt).toLocaleDateString()}`
    ];
    
    details.forEach(detail => {
      doc.fontSize(10)
         .fillColor(this.config.colors.text)
         .text(detail);
    });
    
    doc.moveDown(2);
    
    // Storytailor branding
    doc.fontSize(10)
       .fillColor(this.config.colors.secondary)
       .text('Created with ❤️ by Storytailor', { align: 'center' });
    
    doc.fontSize(8)
       .fillColor(this.config.colors.text)
       .text('Stories tailored for you that grow with your child', { align: 'center' });
  }

  private addTextOnlyBeat(doc: PDFDocument, beat: any, textSize: number): void {
    doc.fontSize(textSize)
       .fillColor(this.config.colors.text)
       .text(beat.content, {
         width: this.config.layout.pageWidth - (this.config.layout.margins.left + this.config.layout.margins.right),
         align: 'left'
       });
  }

  private async downloadImage(url: string): Promise<Buffer> {
    if (!fetch) {
      throw new Error('node-fetch is not available. Please install node-fetch to download images.');
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private generateFileName(story: Story, character: Character): string {
    const sanitizedTitle = story.title.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedCharacter = character.name.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}_${sanitizedCharacter}_${timestamp}.pdf`;
  }

  private getTitleFontSize(coverStyle?: string): number {
    const sizeMap: Record<string, number> = {
      'classic': 28,
      'modern': 32,
      'playful': 36
    };
    return sizeMap[coverStyle || 'classic'];
  }

  private getTextSize(textSize?: string): number {
    const sizeMap: Record<string, number> = {
      'small': 12,
      'medium': 16,
      'large': 20
    };
    return sizeMap[textSize || 'medium'];
  }

  private estimatePageCount(request: PDFGenerationRequest): number {
    let pages = 1; // Cover page
    pages += 1; // Title page
    pages += Math.ceil(request.story.content.beats.length / 2); // Story pages (assuming 2 beats per page)
    
    if (request.includeActivities && request.activities) {
      pages += Math.ceil(request.activities.activities.length / 2); // Activities pages
    }
    
    pages += 1; // Back matter
    
    return pages;
  }

  private requiresFullRegeneration(changedElements?: string[]): boolean {
    if (!changedElements) return true;
    
    const majorElements = ['title', 'content', 'art', 'activities', 'layout'];
    return changedElements.some(element => majorElements.includes(element));
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDirectory)) {
      fs.mkdirSync(this.config.outputDirectory, { recursive: true });
    }
  }
}