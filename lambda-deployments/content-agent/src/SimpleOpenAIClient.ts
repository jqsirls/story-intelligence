const { Logger } = require('winston');

export class SimpleOpenAIClient {
  private apiKey: string;
  private logger: any;

  constructor(apiKey: string, logger: any) {
    this.apiKey = apiKey;
    this.logger = logger;
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      this.logger.info('Generating image with OpenAI API', { prompt: prompt.substring(0, 100) });
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('OpenAI API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        });
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const imageUrl = data.data?.[0]?.url;
      
      if (!imageUrl) {
        this.logger.error('No image URL in OpenAI response', { data });
        throw new Error('No image URL in OpenAI response');
      }

      this.logger.info('Image generated successfully', { imageUrl: imageUrl.substring(0, 60) });
      return imageUrl;

    } catch (error: any) {
      this.logger.error('Image generation failed', { error: error.message });
      throw error;
    }
  }

  async generateText(messages: any[], model: string = 'gpt-4'): Promise<string> {
    try {
      this.logger.info('Generating text with OpenAI API', { model, messageCount: messages.length });
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('OpenAI API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        });
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        this.logger.error('No content in OpenAI response', { data });
        throw new Error('No content in OpenAI response');
      }

      this.logger.info('Text generated successfully', { contentLength: content.length });
      return content;

    } catch (error: any) {
      this.logger.error('Text generation failed', { error: error.message });
      throw error;
    }
  }
}
