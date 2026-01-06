/**
 * Character Birth Certificate Service
 * 
 * Generates official-looking Birth Certificates for characters complete with:
 * - Character headshot image
 * - Character details (name, species, personality, abilities)
 * - Official Storytailor seal/branding
 * - PDF generation for download/sharing
 * 
 * Integrates with asset pipeline to notify users when certificate is ready.
 */

import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from 'winston';
import axios from 'axios';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CharacterDetails {
  id: string;
  name: string;
  species: string;
  personality_traits: string[];
  special_abilities?: string[];
  age?: string;
  origin_story?: string;
  headshot_url: string;
  created_at: Date;
  created_by_user_id: string;
}

export interface BirthCertificate {
  characterId: string;
  pdfUrl: string; // S3 URL
  presignedUrl: string; // For temporary access
  generatedAt: Date;
}

// ============================================================================
// Character Birth Certificate Service
// ============================================================================

export class CharacterBirthCertificateService {
  private s3Client: S3Client;
  private bucketName: string;
  
  constructor(
    private logger: Logger,
    region: string = 'us-east-1'
  ) {
    this.s3Client = new S3Client({ region });
    this.bucketName = process.env.S3_BUCKET_NAME || 'storytailor-assets';
  }
  
  /**
   * Generate Birth Certificate PDF for character
   */
  async generateBirthCertificate(character: CharacterDetails): Promise<BirthCertificate> {
    try {
      this.logger.info('Generating birth certificate', {
        characterId: character.id,
        characterName: character.name
      });
      
      // Download character headshot
      const headshotBuffer = await this.downloadImage(character.headshot_url);
      
      // Generate PDF
      const pdfBuffer = await this.createPDF(character, headshotBuffer);
      
      // Upload to S3
      const s3Key = `characters/${character.id}/birth-certificate.pdf`;
      const pdfUrl = await this.uploadToS3(pdfBuffer, s3Key, 'application/pdf');
      
      // Generate presigned URL for immediate access
      const presignedUrl = await this.generatePresignedUrl(s3Key);
      
      this.logger.info('Birth certificate generated', {
        characterId: character.id,
        pdfUrl,
        size: pdfBuffer.length
      });
      
      return {
        characterId: character.id,
        pdfUrl,
        presignedUrl,
        generatedAt: new Date()
      };
      
    } catch (error) {
      this.logger.error('Failed to generate birth certificate', {
        error: error instanceof Error ? error.message : String(error),
        characterId: character.id
      });
      throw error;
    }
  }
  
  /**
   * Create PDF document with official styling
   */
  private async createPDF(character: CharacterDetails, headshotBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        
        // Add decorative border
        doc.lineWidth(3)
           .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
           .stroke('#4A5568');
        
        doc.lineWidth(1)
           .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
           .stroke('#CBD5E0');
        
        // Header: "Official Character Birth Certificate"
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor('#2D3748')
           .text('Official Character Birth Certificate', 50, 60, {
             align: 'center',
             width: doc.page.width - 100
           });
        
        // Storytailor branding
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#718096')
           .text('Storytailor® Character Registry', 50, 95, {
             align: 'center',
             width: doc.page.width - 100
           });
        
        // Horizontal line
        doc.moveTo(100, 120)
           .lineTo(doc.page.width - 100, 120)
           .stroke('#E2E8F0');
        
        // Character headshot (centered)
        try {
          doc.image(headshotBuffer, (doc.page.width - 150) / 2, 140, {
            width: 150,
            height: 150,
            fit: [150, 150],
            align: 'center'
          });
        } catch (error) {
          this.logger.warn('Failed to embed headshot image', { error });
          // Continue without image
        }
        
        // Character details section
        const detailsY = 320;
        const leftX = 100;
        const rightX = 350;
        
        // Character Name
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#2D3748')
           .text(character.name, leftX, detailsY, {
             align: 'center',
             width: doc.page.width - 200
           });
        
        // Species
        doc.fontSize(14)
           .font('Helvetica')
           .fillColor('#4A5568')
           .text('Species:', leftX, detailsY + 40, { continued: true })
           .font('Helvetica-Bold')
           .text(` ${this.capitalizeWords(character.species)}`, { continued: false });
        
        // Personality Traits
        if (character.personality_traits && character.personality_traits.length > 0) {
          doc.fontSize(14)
             .font('Helvetica')
             .fillColor('#4A5568')
             .text('Personality:', leftX, detailsY + 65);
          
          character.personality_traits.slice(0, 3).forEach((trait, index) => {
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#718096')
               .text(`• ${this.capitalizeWords(trait)}`, leftX + 20, detailsY + 88 + (index * 20));
          });
        }
        
        // Special Abilities
        if (character.special_abilities && character.special_abilities.length > 0) {
          const abilitiesY = detailsY + 150;
          doc.fontSize(14)
             .font('Helvetica')
             .fillColor('#4A5568')
             .text('Special Abilities:', leftX, abilitiesY);
          
          character.special_abilities.slice(0, 3).forEach((ability, index) => {
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#718096')
               .text(`• ${ability}`, leftX + 20, abilitiesY + 23 + (index * 20));
          });
        }
        
        // Birth Date (creation date)
        const birthDateY = doc.page.height - 180;
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#4A5568')
           .text('Birth Date:', leftX, birthDateY, { continued: true })
           .font('Helvetica-Bold')
           .text(` ${character.created_at.toLocaleDateString('en-US', {
             month: 'long',
             day: 'numeric',
             year: 'numeric'
           })}`, { continued: false });
        
        // Certificate Number
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#A0AEC0')
           .text(`Certificate No: ${character.id.substring(0, 8).toUpperCase()}`, leftX, birthDateY + 25);
        
        // Official Seal/Signature Line
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .fillColor('#718096')
           .text('This certifies that the above character has been officially registered', 50, doc.page.height - 120, {
             align: 'center',
             width: doc.page.width - 100
           })
           .text('in the Storytailor® Character Universe', 50, doc.page.height - 105, {
             align: 'center',
             width: doc.page.width - 100
           });
        
        // Signature line
        doc.moveTo(doc.page.width / 2 - 100, doc.page.height - 70)
           .lineTo(doc.page.width / 2 + 100, doc.page.height - 70)
           .stroke('#CBD5E0');
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#A0AEC0')
           .text('Story Intelligence™ Director', 50, doc.page.height - 60, {
             align: 'center',
             width: doc.page.width - 100
           });
        
        // Footer
        doc.fontSize(8)
           .fillColor('#CBD5E0')
           .text('storytailor.com', 50, doc.page.height - 35, {
             align: 'center',
             width: doc.page.width - 100
           });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return Buffer.from(response.data);
      
    } catch (error) {
      this.logger.error('Failed to download image', {
        error: error instanceof Error ? error.message : String(error),
        url
      });
      throw new Error(`Failed to download image from ${url}`);
    }
  }
  
  /**
   * Upload PDF to S3 and return CDN URL
   */
  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000' // 1 year
      });
      
      await this.s3Client.send(command);
      
      // Return CDN URL instead of direct S3 URL
      const { getCdnUrl } = await import('../utils/cdnUrl');
      const cdnUrl = getCdnUrl(key);
      
      this.logger.info('File uploaded to S3', {
        s3Key: key,
        cdnUrl: cdnUrl.substring(0, 80),
        contentType
      });
      
      return cdnUrl;
      
    } catch (error) {
      this.logger.error('Failed to upload to S3', {
        error: error instanceof Error ? error.message : String(error),
        key
      });
      throw error;
    }
  }
  
  /**
   * Generate presigned URL for temporary access
   */
  private async generatePresignedUrl(key: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const presignedUrl = await getSignedUrl(this.s3Client, command as any, {
        expiresIn: 7 * 24 * 60 * 60 // 7 days
      });
      
      return presignedUrl;
      
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', {
        error: error instanceof Error ? error.message : String(error),
        key
      });
      throw error;
    }
  }
  
  /**
   * Helper: Capitalize words
   */
  private capitalizeWords(str: string): string {
    return str
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

