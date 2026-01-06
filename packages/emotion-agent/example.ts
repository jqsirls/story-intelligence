import { EmotionAgent } from './src/EmotionAgent';
import { createLogger, format, transports } from 'winston';

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

async function main() {
  // Initialize EmotionAgent
  const emotionAgent = new EmotionAgent({
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    logLevel: 'info'
  }, logger);

  try {
    console.log('🎭 EmotionAgent Example Usage\n');

    // Example 1: Daily Check-in
    console.log('1. Performing daily emotional check-in...');
    const checkinResult = await emotionAgent.performDailyCheckin({
      userId: 'user-123',
      libraryId: 'lib-456',
      sessionId: 'session-789',
      responses: [
        {
          question: 'How are you feeling today?',
          answer: 'I feel really happy! I had a great day at school.'
        },
        {
          question: 'What made you smile today?',
          answer: 'My friend shared their lunch with me and we played together.'
        }
      ]
    });

    console.log('Check-in result:', {
      success: checkinResult.success,
      mood: checkinResult.emotion.mood,
      confidence: checkinResult.emotion.confidence,
      alreadyCompleted: checkinResult.alreadyCompletedToday
    });

    // Example 2: Laughter Detection
    console.log('\n2. Detecting laughter from audio...');
    const mockAudioData = {
      buffer: Buffer.from('mock-audio-data'),
      format: 'wav' as const,
      sampleRate: 16000,
      duration: 2.1
    };

    const laughterResult = await emotionAgent.detectLaughter({
      audioData: mockAudioData,
      userId: 'user-123',
      sessionId: 'session-789',
      context: { storyPhase: 'character_creation' }
    });

    console.log('Laughter detection result:', {
      detected: laughterResult.detected,
      mood: laughterResult.mood,
      confidence: laughterResult.confidence
    });

    // Example 3: Update Emotional State
    console.log('\n3. Updating emotional state...');
    const updatedEmotion = await emotionAgent.updateEmotionalState({
      userId: 'user-123',
      libraryId: 'lib-456',
      mood: 'happy',
      confidence: 0.85,
      context: {
        type: 'story_completion',
        storyTitle: 'The Magical Adventure',
        userReaction: 'loved_the_ending'
      },
      sessionId: 'session-789'
    });

    console.log('Updated emotion:', {
      mood: updatedEmotion.mood,
      confidence: updatedEmotion.confidence,
      timestamp: updatedEmotion.createdAt
    });

    // Example 4: Analyze Emotion Patterns
    console.log('\n4. Analyzing emotion patterns...');
    const patterns = await emotionAgent.analyzeEmotionPatterns({
      userId: 'user-123',
      libraryId: 'lib-456',
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        end: new Date().toISOString()
      }
    });

    if (patterns.length > 0) {
      console.log('Emotion patterns:', {
        dominantMood: patterns[0].dominantMood,
        moodDistribution: patterns[0].moodDistribution,
        trendsCount: patterns[0].trends.length,
        insights: patterns[0].insights
      });
    }

    // Example 5: Generate Parental Report
    console.log('\n5. Generating parental report...');
    const parentalReport = await emotionAgent.generateParentalReport(
      'user-123',
      'lib-456',
      {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        end: new Date().toISOString()
      }
    );

    console.log('Parental report:', {
      childId: parentalReport.childId,
      trendsCount: parentalReport.emotionalTrends.length,
      insightsCount: parentalReport.insights.length,
      recommendations: parentalReport.recommendations.slice(0, 3), // First 3 recommendations
      privacyCompliant: parentalReport.privacyCompliant
    });

    // Example 6: Get Story Recommendation Influence
    console.log('\n6. Getting story recommendation influence...');
    const storyInfluence = await emotionAgent.getStoryRecommendationInfluence('user-123', 'lib-456');

    console.log('Story recommendation influence:', {
      currentMood: storyInfluence.currentMood,
      recommendedTone: storyInfluence.recommendedTone,
      storyTypes: storyInfluence.storyTypes,
      reasoning: storyInfluence.reasoning
    });

    // Example 7: Sentiment Analysis
    console.log('\n7. Analyzing sentiment from transcript...');
    const transcript = "I love this story! It's so exciting and fun. The character is amazing and I want to hear more adventures!";
    const sentimentResult = await emotionAgent.analyzeSentiment(transcript);

    console.log('Sentiment analysis:', {
      sentiment: sentimentResult.sentiment,
      confidence: sentimentResult.confidence,
      emotions: sentimentResult.emotions
    });

    // Example 8: Check Daily Check-in Status
    console.log('\n8. Checking daily check-in status...');
    const hasCompleted = await emotionAgent.hasCompletedDailyCheckin('user-123', 'lib-456');
    console.log('Has completed daily check-in today:', hasCompleted);

    // Example 9: Get Recent Emotions
    console.log('\n9. Getting recent emotions...');
    const recentEmotions = await emotionAgent.getRecentEmotions('user-123', 'lib-456', 5);
    console.log('Recent emotions:', recentEmotions.map(e => ({
      mood: e.mood,
      confidence: e.confidence,
      createdAt: e.createdAt
    })));

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error running examples:', error);
  } finally {
    // Clean up
    await emotionAgent.close();
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runEmotionAgentExamples };