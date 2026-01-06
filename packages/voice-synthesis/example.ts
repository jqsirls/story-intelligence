/**
 * Voice Synthesis Example
 * Demonstrates real-time empathetic storytelling with studio-quality narration
 */

import { VoiceService, createDefaultConfig, VoiceSynthesisRequest, AudioChunk } from './src';
import * as winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

async function main() {
  console.log('🎙️  Voice Synthesis Example - Storytailor Multi-Agent Platform\n');

  try {
    // Load configuration
    const config = createDefaultConfig();
    
    // Create voice service
    const voiceService = new VoiceService(config, logger);

    // Initialize the service
    console.log('Initializing voice service...');
    await voiceService.initialize();
    console.log('✅ Voice service initialized successfully\n');

    // Example 1: Real-time streaming for short interactions
    console.log('📡 Example 1: Real-time Streaming (< 400 chars)');
    console.log('=' .repeat(50));
    
    const shortRequest: VoiceSynthesisRequest = {
      text: "Once upon a time, in a magical forest, there lived a brave little rabbit named Luna who loved to explore.",
      language: 'en-US',
      emotion: 'excited',
      streaming: true,
      format: 'pcm',
      sampleRate: 16000,
      priority: 'high',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'story_session_001',
    };

    const audioChunks: AudioChunk[] = [];
    const onChunk = (chunk: AudioChunk) => {
      audioChunks.push(chunk);
      console.log(`📦 Received chunk ${chunk.sequenceNumber} (${chunk.data.length} bytes) ${chunk.isLast ? '[FINAL]' : ''}`);
    };

    const streamResult = await voiceService.stream(shortRequest, onChunk);
    
    console.log('📊 Streaming Result:');
    console.log(`   Success: ${streamResult.success}`);
    console.log(`   Engine: ${streamResult.engine}`);
    console.log(`   Latency: ${streamResult.latency}ms`);
    console.log(`   Duration: ${streamResult.duration?.toFixed(2)}s`);
    console.log(`   Cost: $${streamResult.cost?.toFixed(4)}`);
    console.log(`   Chunks received: ${audioChunks.length}\n`);

    // Example 2: Long-form generation for complete stories
    console.log('📚 Example 2: Long-form Generation (Async)');
    console.log('=' .repeat(50));

    const longStory = `
      In the heart of the Whispering Woods, where ancient trees touched the clouds and magical creatures roamed freely, 
      there lived a young fox named Ember who possessed a very special gift. Unlike other foxes who were known for their 
      cunning and stealth, Ember could understand the language of all living things - from the tiniest ant to the mightiest 
      oak tree. This extraordinary ability made her the bridge between different worlds in the forest.

      One crisp autumn morning, as golden leaves danced in the gentle breeze, Ember heard a desperate cry echoing through 
      the woods. It was coming from the Crystal Lake, where the water sprites lived in harmony with the fish and water plants. 
      Racing through the undergrowth, her red fur gleaming in the dappled sunlight, Ember discovered that the lake was slowly 
      turning gray, and all the magical creatures were falling into a deep, unnatural sleep.

      The wise old turtle, Sage, who had lived by the lake for over a hundred years, whispered weakly to Ember, "The Shadow 
      of Silence has returned. It feeds on the joy and laughter of our world, turning everything gray and lifeless. Only the 
      Song of Unity, sung by representatives of all forest creatures together, can banish it forever."

      And so began Ember's greatest adventure - a quest to unite the forest and save her magical home.
    `;

    const longFormRequest: VoiceSynthesisRequest = {
      text: longStory,
      language: 'en-US',
      emotion: 'dramatic',
      streaming: false,
      format: 'mp3',
      sampleRate: 22050,
      priority: 'normal',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'longform_story_001',
    };

    const longFormResult = await voiceService.generateLongForm(longFormRequest);
    
    console.log('📊 Long-form Result:');
    console.log(`   Success: ${longFormResult.success}`);
    console.log(`   Engine: ${longFormResult.engine}`);
    console.log(`   Latency: ${longFormResult.latency}ms`);
    console.log(`   Duration: ${longFormResult.duration?.toFixed(2)}s`);
    console.log(`   Cost: $${longFormResult.cost?.toFixed(4)}`);
    console.log(`   Audio URL: ${longFormResult.audioUrl || 'N/A'}\n`);

    // Example 3: Voice cloning with parental consent
    console.log('🎭 Example 3: Voice Cloning Management');
    console.log('=' .repeat(50));

    const voiceCloneManager = voiceService.getVoiceCloneManager();
    
    // Check if user has parental consent
    const hasConsent = await voiceCloneManager.hasParentalConsent('123e4567-e89b-12d3-a456-426614174000');
    console.log(`   Parental consent status: ${hasConsent ? '✅ Approved' : '❌ Required'}`);

    // List existing voice clones
    const existingClones = await voiceCloneManager.listVoiceClones('123e4567-e89b-12d3-a456-426614174000');
    console.log(`   Existing voice clones: ${existingClones.length}`);

    if (existingClones.length > 0) {
      existingClones.forEach((clone, index) => {
        console.log(`     ${index + 1}. ${clone.name} (${clone.status}) - Created: ${clone.createdAt.toLocaleDateString()}`);
      });
    }

    // Example 4: Performance metrics and monitoring
    console.log('\n📈 Example 4: Performance Metrics');
    console.log('=' .repeat(50));

    const metrics = await voiceService.getMetrics(3600000); // Last hour
    console.log(`   Total requests (last hour): ${metrics.length}`);

    if (metrics.length > 0) {
      const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
      const successRate = metrics.filter(m => m.success).length / metrics.length;
      const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

      console.log(`   Average latency: ${avgLatency.toFixed(0)}ms`);
      console.log(`   Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`   Total cost: $${totalCost.toFixed(4)}`);
    }

    // Cost metrics
    const costMetrics = await voiceService.getCostMetrics();
    console.log(`   Daily budget utilization: ${(costMetrics.budgetUtilization * 100).toFixed(1)}%`);
    console.log(`   ElevenLabs cost: $${costMetrics.engineBreakdown.elevenlabs.toFixed(4)}`);
    console.log(`   Polly cost: $${costMetrics.engineBreakdown.polly.toFixed(4)}`);

    // Example 5: Health check and system status
    console.log('\n🏥 Example 5: Health Check');
    console.log('=' .repeat(50));

    const health = await voiceService.healthCheck();
    console.log(`   Overall status: ${getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);
    console.log(`   ElevenLabs: ${getStatusEmoji(health.engines.elevenlabs)} ${health.engines.elevenlabs}`);
    console.log(`   Polly: ${getStatusEmoji(health.engines.polly)} ${health.engines.polly}`);
    console.log(`   Average latency: ${health.metrics.avgLatency.toFixed(0)}ms`);
    console.log(`   Success rate: ${(health.metrics.successRate * 100).toFixed(1)}%`);
    console.log(`   Daily cost: $${health.metrics.dailyCost.toFixed(2)}`);

    // Example 6: Event handling
    console.log('\n📡 Example 6: Event Monitoring');
    console.log('=' .repeat(50));

    voiceService.on('synthesis_completed', (response) => {
      console.log(`✅ Synthesis completed: ${response.engine} (${response.latency}ms)`);
    });

    voiceService.on('synthesis_failed', (response) => {
      console.log(`❌ Synthesis failed: ${response.error}`);
    });

    voiceService.on('engine_switched', (data) => {
      console.log(`🔄 Engine switched: ${data.from} → ${data.to} (${data.reason})`);
    });

    voiceService.on('failover_success', (data) => {
      console.log(`🛡️  Failover successful for session: ${data.sessionId}`);
    });

    console.log('   Event listeners registered for real-time monitoring');

    // Shutdown gracefully
    console.log('\n🔄 Shutting down voice service...');
    await voiceService.shutdown();
    console.log('✅ Voice service shutdown completed');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'up':
    case 'healthy':
      return '🟢';
    case 'degraded':
      return '🟡';
    case 'down':
    case 'unhealthy':
      return '🔴';
    default:
      return '⚪';
  }
}

// Example of handling different device types
async function deviceSpecificExamples() {
  console.log('\n📱 Device-Specific Examples');
  console.log('=' .repeat(50));

  const config = createDefaultConfig();
  const voiceService = new VoiceService(config, logger);
  await voiceService.initialize();

  // Alexa voice device (optimized for < 800ms)
  const alexaRequest: VoiceSynthesisRequest = {
    text: "Welcome to Storytailor! Let's create an amazing adventure together.",
    language: 'en-US',
    emotion: 'excited',
    streaming: true,
    format: 'pcm',
    sampleRate: 16000,
    priority: 'high',
    sessionId: 'alexa_session_001',
  };

  console.log('🗣️  Alexa Voice Device:');
  const alexaChunks: AudioChunk[] = [];
  const alexaResult = await voiceService.stream(alexaRequest, (chunk) => {
    alexaChunks.push(chunk);
    if (chunk.sequenceNumber === 0) {
      console.log(`   First chunk received in: ${Date.now() - parseInt(alexaRequest.sessionId?.split('_')[2] || '0')}ms`);
    }
  });
  console.log(`   Total latency: ${alexaResult.latency}ms (Target: <800ms)`);

  // Echo Show screen device (with visual elements)
  const echoShowRequest: VoiceSynthesisRequest = {
    text: "Look at this beautiful illustration while I tell you about Luna the rabbit!",
    language: 'en-US',
    emotion: 'calm',
    streaming: true,
    format: 'pcm',
    sampleRate: 16000,
    priority: 'normal',
    sessionId: 'echo_show_001',
  };

  console.log('📺 Echo Show Device:');
  const echoShowResult = await voiceService.stream(echoShowRequest, () => {});
  console.log(`   Latency: ${echoShowResult.latency}ms`);
  console.log(`   Engine: ${echoShowResult.engine}`);

  // Mobile app (with offline capability consideration)
  const mobileRequest: VoiceSynthesisRequest = {
    text: "Your story has been saved and you can listen to it anytime, even offline!",
    language: 'en-US',
    emotion: 'happy',
    streaming: false, // Generate complete audio for offline use
    format: 'mp3',
    sampleRate: 22050,
    priority: 'normal',
    sessionId: 'mobile_app_001',
  };

  console.log('📱 Mobile App:');
  const mobileResult = await voiceService.generateLongForm(mobileRequest);
  console.log(`   Audio URL: ${mobileResult.audioUrl}`);
  console.log(`   Duration: ${mobileResult.duration?.toFixed(2)}s`);

  await voiceService.shutdown();
}

// Run examples
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 All examples completed successfully!');
      return deviceSpecificExamples();
    })
    .then(() => {
      console.log('\n✨ Voice synthesis examples finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { main, deviceSpecificExamples };