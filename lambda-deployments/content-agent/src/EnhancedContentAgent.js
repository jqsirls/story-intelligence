/**
 * Enhanced Content Agent with Character Image Analysis and Consistency
 * Supports GPT-Image-1 for generation and GPT-4 Vision for analysis
 */

class EnhancedContentAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.characterDatabase = new Map(); // Store character references
  }

  /**
   * Generate character headshot and bodyshot images
   */
  async generateCharacterImages(characterDescription) {
    try {
      console.log('Generating character images', { description: characterDescription.substring(0, 100) });

      // Generate headshot
      const headshotPrompt = `Create a detailed headshot portrait of: ${characterDescription}. 
        High quality, professional character design, clear facial features, appropriate for children's story.`;
      
      const headshotResponse = await this.generateImage(headshotPrompt);
      
      // Generate bodyshot
      const bodyshotPrompt = `Create a full-body character image of: ${characterDescription}. 
        Same character as headshot, full body view, appropriate pose, children's story style.`;
      
      const bodyshotResponse = await this.generateImage(bodyshotPrompt);

      // Analyze both images for character consistency and safety
      const characterAnalysis = await this.analyzeCharacterImages({
        headshot: headshotResponse,
        bodyshot: bodyshotResponse,
        originalDescription: characterDescription
      });

      return {
        headshot: headshotResponse,
        bodyshot: bodyshotResponse,
        analysis: characterAnalysis,
        characterId: this.generateCharacterId(characterDescription)
      };

    } catch (error) {
      console.error('Character image generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze character images for consistency, safety, and accuracy
   */
  async analyzeCharacterImages({ headshot, bodyshot, originalDescription }) {
    try {
      console.log('Analyzing character images for consistency and safety');

      const analysisPrompt = `
        Analyze these two character images (headshot and bodyshot) and provide a comprehensive assessment:

        1. CHARACTER CONSISTENCY:
        - Do both images depict the same character?
        - Are facial features consistent between headshot and bodyshot?
        - Are clothing/accessories consistent?

        2. DESCRIPTION ACCURACY:
        - Does the character match the original description: "${originalDescription}"?
        - Are all requested physical features present?
        - Are any requested accessories or clothing items visible?

        3. SAFETY & APPROPRIATENESS:
        - Is the content appropriate for children under 10?
        - Are there any concerning elements?
        - Does the character appear friendly and approachable?

        4. QUALITY ASSESSMENT:
        - Are the images clear and well-composed?
        - Is the character design suitable for a children's story?
        - Are there any technical issues?

        Please provide a detailed analysis in JSON format with scores (1-10) for each category.
      `;

      const analysisResponse = await this.analyzeImageWithGPT4Vision([
        { type: "text", text: analysisPrompt },
        { type: "image_url", image_url: { url: headshot } },
        { type: "image_url", image_url: { url: bodyshot } }
      ]);

      return JSON.parse(analysisResponse);

    } catch (error) {
      console.error('Character image analysis failed', { error: error.message });
      return {
        consistency: { score: 5, issues: ['Analysis failed'] },
        accuracy: { score: 5, issues: ['Analysis failed'] },
        safety: { score: 5, issues: ['Analysis failed'] },
        quality: { score: 5, issues: ['Analysis failed'] }
      };
    }
  }

  /**
   * Generate story illustrations with character consistency
   */
  async generateStoryIllustrations(storyData, characterImages) {
    try {
      console.log('Generating story illustrations with character consistency');

      const illustrations = {};

      // Cover image
      illustrations.cover = await this.generateCoverImage(storyData, characterImages);

      // Beat illustrations (A, B, C, D)
      for (const beat of ['A', 'B', 'C', 'D']) {
        if (storyData.beats && storyData.beats[beat]) {
          illustrations[`beat${beat}`] = await this.generateBeatImage(
            storyData.beats[beat], 
            characterImages, 
            beat
          );
        }
      }

      // Verify consistency across all illustrations
      const consistencyCheck = await this.verifyIllustrationConsistency(illustrations, characterImages);

      return {
        illustrations,
        consistencyCheck,
        characterReference: characterImages.characterId
      };

    } catch (error) {
      console.error('Story illustration generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate cover image with character
   */
  async generateCoverImage(storyData, characterImages) {
    const coverPrompt = `
      Create a children's story cover illustration featuring the character from the reference images.
      Story: "${storyData.title}"
      Description: "${storyData.description}"
      
      Include the main character prominently in the scene, maintaining their appearance from the reference images.
      Style: Children's book illustration, colorful, engaging, appropriate for ages 3-10.
    `;

    return await this.generateImage(coverPrompt);
  }

  /**
   * Generate beat-specific illustration
   */
  async generateBeatImage(beatData, characterImages, beatLetter) {
    const beatPrompt = `
      Create an illustration for story beat ${beatLetter}: "${beatData.title}"
      Scene: "${beatData.description}"
      
      Feature the main character from the reference images in this scene.
      Maintain character consistency with previous illustrations.
      Style: Children's book illustration, engaging and age-appropriate.
    `;

    return await this.generateImage(beatPrompt);
  }

  /**
   * Verify consistency across all story illustrations
   */
  async verifyIllustrationConsistency(illustrations, characterImages) {
    try {
      const imagesToAnalyze = Object.values(illustrations);
      
      const consistencyPrompt = `
        Analyze these story illustrations for character consistency:
        
        1. Does the main character appear consistently across all images?
        2. Are facial features, clothing, and accessories maintained?
        3. Is the character's age and appearance appropriate throughout?
        4. Are there any inconsistencies that would confuse young readers?
        
        Provide a consistency score (1-10) and list any issues found.
      `;

      const analysisResponse = await this.analyzeImageWithGPT4Vision([
        { type: "text", text: consistencyPrompt },
        ...imagesToAnalyze.map(url => ({ type: "image_url", image_url: { url } }))
      ]);

      return JSON.parse(analysisResponse);

    } catch (error) {
      console.error('Consistency verification failed', { error: error.message });
      return { score: 5, issues: ['Verification failed'] };
    }
  }

  /**
   * Generate image using GPT-Image-1
   */
  async generateImage(prompt) {
    try {
      console.log('Generating image with GPT-Image-1', { prompt: prompt.substring(0, 100) });
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'high'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GPT-Image-1 API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        });
        throw new Error(`GPT-Image-1 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle GPT-Image-1 response format
      let imageUrl;
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.b64_json) {
        const base64Data = data.data[0].b64_json;
        imageUrl = `data:image/png;base64,${base64Data}`;
      } else {
        console.error('No image data in GPT-Image-1 response', { data });
        throw new Error('No image data in GPT-Image-1 response');
      }

      console.log('Image generated successfully', { imageUrl: imageUrl.substring(0, 60) });
      return imageUrl;

    } catch (error) {
      console.error('Image generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze images using GPT-4 Vision
   */
  async analyzeImageWithGPT4Vision(messages) {
    try {
      console.log('Analyzing images with GPT-4 Vision');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // GPT-4 Vision model
          messages: [{ role: 'user', content: messages }],
          max_tokens: 1000,
          temperature: 0.3 // Lower temperature for more consistent analysis
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GPT-4 Vision API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`GPT-4 Vision API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content;

      if (!analysis) {
        console.error('No analysis content in GPT-4 Vision response', { data });
        throw new Error('No analysis content in GPT-4 Vision response');
      }

      console.log('Image analysis completed successfully');
      return analysis;

    } catch (error) {
      console.error('Image analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate character ID for tracking
   */
  generateCharacterId(description) {
    return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store character reference for future use
   */
  storeCharacterReference(characterId, characterData) {
    this.characterDatabase.set(characterId, {
      ...characterData,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    });
  }

  /**
   * Retrieve character reference
   */
  getCharacterReference(characterId) {
    const character = this.characterDatabase.get(characterId);
    if (character) {
      character.lastUsed = new Date().toISOString();
    }
    return character;
  }
}

// Export for use in Lambda handler
module.exports = { EnhancedContentAgent };
