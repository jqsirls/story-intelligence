#!/bin/bash
# Phase 5: Integration Hardening - Replace Mocks with Live Integrations
# Swap out stubbed endpoints for live OpenAI, ElevenLabs, Stripe, Philips Hue

set -e

echo "🔗 PHASE 5.1: LIVE INTEGRATIONS"
echo "==============================="

# 1. Replace OpenAI mock with live integration
echo "1. Implementing live OpenAI integration..."
cat > packages/content-agent/src/integrations/LiveOpenAIClient.ts << 'EOF'
import OpenAI from 'openai';
import { secretManager } from '@storytailor/shared-utils/secrets/SSMSecretManager';

export class LiveOpenAIClient {
  private client: OpenAI | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const apiKey = await secretManager.getSecret('openai/api-key');
      this.client = new OpenAI({ apiKey });
      
      // Test connection
      await this.client.models.list();
      console.log('✅ OpenAI client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      throw new Error('OpenAI initialization failed');
    }
  }

  async generateStoryContent(prompt: string, options: any = {}): Promise<string> {
    await this.initialize();
    
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly storytelling assistant for children.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Story generation failed');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.client) return false;
      
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const liveOpenAIClient = new LiveOpenAIClient();
EOF# 
2. Replace ElevenLabs mock with live integration
echo "2. Implementing live ElevenLabs integration..."
cat > packages/voice-synthesis/src/clients/LiveElevenLabsClient.ts << 'EOF'
import axios from 'axios';
import { secretManager } from '@storytailor/shared-utils/secrets/SSMSecretManager';

export class LiveElevenLabsClient {
  private apiKey: string | null = null;
  private baseURL = 'https://api.elevenlabs.io/v1';
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      this.apiKey = await secretManager.getSecret('elevenlabs/api-key');
      
      // Test connection
      await this.getVoices();
      console.log('✅ ElevenLabs client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ElevenLabs client:', error);
      throw new Error('ElevenLabs initialization failed');
    }
  }

  async synthesizeVoice(text: string, voiceId: string = 'default'): Promise<Buffer> {
    await this.initialize();
    
    try {
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs API error:', error);
      throw new Error('Voice synthesis failed');
    }
  }

  async getVoices(): Promise<any[]> {
    await this.initialize();
    
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: { 'xi-api-key': this.apiKey }
      });
      
      return response.data.voices || [];
    } catch (error) {
      console.error('ElevenLabs voices API error:', error);
      throw new Error('Failed to fetch voices');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      await this.getVoices();
      return true;
    } catch {
      return false;
    }
  }
}

export const liveElevenLabsClient = new LiveElevenLabsClient();
EOF

# 3. Replace Stripe mock with live integration
echo "3. Implementing live Stripe integration..."
cat > packages/auth-agent/src/integrations/LiveStripeClient.ts << 'EOF'
import Stripe from 'stripe';
import { secretManager } from '@storytailor/shared-utils/secrets/SSMSecretManager';

export class LiveStripeClient {
  private stripe: Stripe | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const secretKey = await secretManager.getSecret('stripe/secret-key');
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16'
      });
      
      // Test connection
      await this.stripe.accounts.retrieve();
      console.log('✅ Stripe client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe client:', error);
      throw new Error('Stripe initialization failed');
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<Stripe.PaymentIntent> {
    await this.initialize();
    
    if (!this.stripe) {
      throw new Error('Stripe client not initialized');
    }

    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          service: 'storytailor',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new Error('Payment intent creation failed');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.stripe) return false;
      
      await this.stripe.accounts.retrieve();
      return true;
    } catch {
      return false;
    }
  }
}

export const liveStripeClient = new LiveStripeClient();
EOF

# 4. Replace Philips Hue mock with live integration
echo "4. Implementing live Philips Hue integration..."
cat > packages/smart-home-agent/src/integrations/LivePhilipsHueClient.ts << 'EOF'
import axios from 'axios';
import { secretManager } from '@storytailor/shared-utils/secrets/SSMSecretManager';

export class LivePhilipsHueClient {
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private accessToken: string | null = null;
  private bridgeIP: string | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const secrets = await secretManager.getSecrets([
        'philips-hue/client-id',
        'philips-hue/client-secret'
      ]);
      
      this.clientId = secrets['philips-hue/client-id'];
      this.clientSecret = secrets['philips-hue/client-secret'];
      
      // Discover bridge
      await this.discoverBridge();
      console.log('✅ Philips Hue client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Philips Hue client:', error);
      throw new Error('Philips Hue initialization failed');
    }
  }

  private async discoverBridge(): Promise<void> {
    try {
      const response = await axios.get('https://discovery.meethue.com/');
      const bridges = response.data;
      
      if (bridges.length > 0) {
        this.bridgeIP = bridges[0].internalipaddress;
      } else {
        throw new Error('No Hue bridges found');
      }
    } catch (error) {
      console.error('Bridge discovery failed:', error);
      throw error;
    }
  }

  async setLightColor(lightId: string, color: { r: number; g: number; b: number }): Promise<void> {
    await this.initialize();
    
    if (!this.bridgeIP || !this.accessToken) {
      throw new Error('Hue bridge not connected');
    }

    try {
      // Convert RGB to XY color space (simplified)
      const xy = this.rgbToXY(color.r, color.g, color.b);
      
      await axios.put(
        `http://${this.bridgeIP}/api/${this.accessToken}/lights/${lightId}/state`,
        {
          on: true,
          xy: [xy.x, xy.y],
          bri: 254
        }
      );
    } catch (error) {
      console.error('Hue light control error:', error);
      throw new Error('Light control failed');
    }
  }

  private rgbToXY(r: number, g: number, b: number): { x: number; y: number } {
    // Simplified RGB to XY conversion for Hue lights
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    
    const X = red * 0.649926 + green * 0.103455 + blue * 0.197109;
    const Y = red * 0.234327 + green * 0.743075 + blue * 0.022598;
    const Z = red * 0.0000000 + green * 0.053077 + blue * 1.035763;
    
    const x = X / (X + Y + Z);
    const y = Y / (X + Y + Z);
    
    return { x, y };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      return this.bridgeIP !== null;
    } catch {
      return false;
    }
  }
}

export const livePhilipsHueClient = new LivePhilipsHueClient();
EOF

# 5. Create integration health checker
echo "5. Creating integration health checker..."
cat > packages/shared-utils/src/health/IntegrationHealthChecker.ts << 'EOF'
import { liveOpenAIClient } from '@storytailor/content-agent/integrations/LiveOpenAIClient';
import { liveElevenLabsClient } from '@storytailor/voice-synthesis/clients/LiveElevenLabsClient';
import { liveStripeClient } from '@storytailor/auth-agent/integrations/LiveStripeClient';
import { livePhilipsHueClient } from '@storytailor/smart-home-agent/integrations/LivePhilipsHueClient';

export interface HealthStatus {
  service: string;
  healthy: boolean;
  lastCheck: Date;
  error?: string;
  responseTime?: number;
}

export class IntegrationHealthChecker {
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  async checkAllIntegrations(): Promise<HealthStatus[]> {
    const integrations = [
      { name: 'openai', client: liveOpenAIClient },
      { name: 'elevenlabs', client: liveElevenLabsClient },
      { name: 'stripe', client: liveStripeClient },
      { name: 'philips-hue', client: livePhilipsHueClient }
    ];

    const results = await Promise.allSettled(
      integrations.map(async (integration) => {
        const startTime = Date.now();
        try {
          const healthy = await integration.client.healthCheck();
          const responseTime = Date.now() - startTime;
          
          const status: HealthStatus = {
            service: integration.name,
            healthy,
            lastCheck: new Date(),
            responseTime
          };
          
          this.healthStatuses.set(integration.name, status);
          return status;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          const status: HealthStatus = {
            service: integration.name,
            healthy: false,
            lastCheck: new Date(),
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          
          this.healthStatuses.set(integration.name, status);
          return status;
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        service: 'unknown',
        healthy: false,
        lastCheck: new Date(),
        error: 'Health check failed'
      }
    );
  }

  startPeriodicHealthChecks(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllIntegrations();
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, intervalMs);
  }

  stopPeriodicHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getHealthStatus(service: string): HealthStatus | undefined {
    return this.healthStatuses.get(service);
  }

  getAllHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  isAllHealthy(): boolean {
    return Array.from(this.healthStatuses.values()).every(status => status.healthy);
  }
}

export const integrationHealthChecker = new IntegrationHealthChecker();
EOF

echo "✅ Phase 5.1 Complete: Live Integrations Implemented"
echo "🔗 Live integrations configured:"
echo "   - OpenAI GPT-4 for story generation"
echo "   - ElevenLabs for voice synthesis"
echo "   - Stripe for payment processing"
echo "   - Philips Hue for smart home integration"
echo "   - Health checking for all integrations"
echo ""
echo "📋 Next: Verify environment parity and connection health"