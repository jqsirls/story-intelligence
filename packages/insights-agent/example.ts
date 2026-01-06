import { InsightsAgent } from './src/InsightsAgent';
import { createInsightsConfig } from './src/config';
import { PatternAnalysisRequest } from './src/types';

async function main() {
  // Create configuration
  const config = createInsightsConfig({
    database: {
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      apiKey: process.env.SUPABASE_ANON_KEY || 'your-supabase-key'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: 'insights'
    },
    analysis: {
      defaultTimeRange: 30, // 30 days
      minDataPoints: 5,
      confidenceThreshold: 0.3
    }
  });

  // Initialize the InsightsAgent
  const insightsAgent = new InsightsAgent(config);
  
  try {
    await insightsAgent.initialize();
    console.log('InsightsAgent initialized successfully');

    // Example 1: Comprehensive analysis for a user
    console.log('\n=== Comprehensive Analysis ===');
    const comprehensiveAnalysis = await insightsAgent.getComprehensiveAnalysis(
      'user-123',
      'library-456'
    );
    
    console.log('Analysis Results:');
    console.log(`- Confidence: ${comprehensiveAnalysis.confidence}`);
    console.log(`- Emotional Patterns: ${comprehensiveAnalysis.emotionalPatterns.length}`);
    console.log(`- Interest Patterns: ${comprehensiveAnalysis.interestPatterns.length}`);
    console.log(`- Behavioral Patterns: ${comprehensiveAnalysis.behavioralPatterns.length}`);
    console.log(`- Story Preferences: ${comprehensiveAnalysis.storyPreferences.length}`);
    console.log(`- Reading Habits: ${comprehensiveAnalysis.readingHabits.length}`);

    // Example 2: Specific analysis request
    console.log('\n=== Specific Analysis Request ===');
    const specificRequest: PatternAnalysisRequest = {
      userId: 'user-123',
      libraryId: 'library-456',
      timeRange: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z'
      },
      analysisTypes: ['emotional', 'interests', 'behavioral']
    };

    const specificAnalysis = await insightsAgent.analyzePatterns(specificRequest);
    
    console.log('Specific Analysis Results:');
    console.log(`- Time Range: ${specificAnalysis.timeRange.start} to ${specificAnalysis.timeRange.end}`);
    console.log(`- Analysis Types: ${specificRequest.analysisTypes.join(', ')}`);
    console.log(`- Confidence: ${specificAnalysis.confidence}`);

    // Example 3: Display emotional patterns
    if (specificAnalysis.emotionalPatterns.length > 0) {
      console.log('\n=== Emotional Patterns ===');
      for (const pattern of specificAnalysis.emotionalPatterns) {
        console.log(`Pattern for ${pattern.pattern.dominantMood}:`);
        console.log(`- Insights: ${pattern.insights.join(', ')}`);
        console.log(`- Risk Factors: ${pattern.riskFactors.length}`);
        console.log(`- Recommendations: ${pattern.recommendations.length}`);
      }
    }

    // Example 4: Display interest patterns
    if (specificAnalysis.interestPatterns.length > 0) {
      console.log('\n=== Interest Patterns ===');
      for (const interest of specificAnalysis.interestPatterns.slice(0, 5)) {
        console.log(`${interest.category} (${interest.strength}):`);
        console.log(`- Confidence: ${interest.confidence.toFixed(2)}`);
        console.log(`- Keywords: ${interest.keywords.slice(0, 3).join(', ')}`);
        console.log(`- Frequency: ${interest.frequency}`);
      }
    }

    // Example 5: Display behavioral patterns
    if (specificAnalysis.behavioralPatterns.length > 0) {
      console.log('\n=== Behavioral Patterns ===');
      for (const behavior of specificAnalysis.behavioralPatterns) {
        console.log(`${behavior.type} (${behavior.severity}):`);
        console.log(`- Description: ${behavior.description}`);
        console.log(`- Confidence: ${behavior.confidence.toFixed(2)}`);
        console.log(`- Indicators: ${behavior.indicators.length}`);
        console.log(`- Recommendations: ${behavior.recommendations.length}`);
      }
    }

    // Example 6: Library-specific analysis
    console.log('\n=== Library-Specific Analysis ===');
    const libraryAnalysis = await insightsAgent.getLibraryAnalysis(
      'user-123',
      'library-456'
    );

    if (libraryAnalysis.readingHabits.length > 0) {
      const habits = libraryAnalysis.readingHabits[0];
      console.log('Reading Habits:');
      console.log(`- Total Sessions: ${habits.totalSessions}`);
      console.log(`- Average Session Duration: ${habits.averageSessionDuration.toFixed(1)} minutes`);
      console.log(`- Preferred Time: ${habits.preferredTimeOfDay[0]?.timeSlot || 'N/A'}`);
      console.log(`- Attention Span: ${habits.attentionSpan.averageMinutes.toFixed(1)} minutes`);
      console.log(`- Participation Level: ${habits.interactionStyle.participationLevel}`);
    }

    // Example 7: Story preference analysis
    if (libraryAnalysis.storyPreferences.length > 0) {
      console.log('\n=== Story Preferences ===');
      for (const pref of libraryAnalysis.storyPreferences.slice(0, 3)) {
        console.log(`${pref.storyType} (${pref.preference}):`);
        console.log(`- Engagement Score: ${pref.engagementScore.toFixed(2)}`);
        console.log(`- Completion Rate: ${(pref.completionRate * 100).toFixed(1)}%`);
        console.log(`- Frequency: ${pref.frequency}`);
        
        if (pref.themes.length > 0) {
          console.log(`- Top Themes: ${pref.themes.slice(0, 2).map(t => t.theme).join(', ')}`);
        }
      }
    }

    // Example 8: External recommendations
    console.log('\n=== External Recommendations ===');
    const recommendations = await insightsAgent.generateExternalRecommendations(
      'user-123',
      specificAnalysis.interestPatterns,
      8, // Age 8
      {
        minRelevanceScore: 0.5,
        maxPrice: 50,
        categories: ['animals', 'science', 'art'],
        sources: ['amazon', 'educational_sites']
      }
    );

    console.log(`Generated ${recommendations.length} recommendations:`);
    for (const rec of recommendations.slice(0, 5)) {
      console.log(`${rec.title} (${rec.type}):`);
      console.log(`- Source: ${rec.source}`);
      console.log(`- Relevance: ${rec.relevanceScore.toFixed(2)}`);
      console.log(`- Based on: ${rec.basedOnInterests.join(', ')}`);
      if (rec.price) console.log(`- Price: $${rec.price}`);
      if (rec.url) console.log(`- URL: ${rec.url}`);
    }

    // Example 9: Comprehensive analysis with recommendations
    console.log('\n=== Comprehensive Analysis with Recommendations ===');
    const fullAnalysis = await insightsAgent.getComprehensiveAnalysisWithRecommendations(
      'user-123',
      'library-456',
      undefined, // Use default time range
      { minRelevanceScore: 0.6 }
    );

    console.log('Full Analysis Summary:');
    console.log(`- Analysis Confidence: ${fullAnalysis.analysis.confidence}`);
    console.log(`- Total Recommendations: ${fullAnalysis.recommendations.length}`);
    console.log(`- Top Recommendation: ${fullAnalysis.recommendations[0]?.title || 'None'}`);

    // Example 10: Parental notification (demo)
    console.log('\n=== Parental Notification Demo ===');
    await insightsAgent.sendParentalNotification(
      'user-123',
      'library-456',
      'interest_emergence',
      'New Interest Detected',
      'Your child is showing strong interest in science topics.',
      ['Increased engagement with science-themed stories', 'High completion rate for educational content'],
      ['Consider science experiment kits', 'Visit local science museum', 'Explore nature documentaries'],
      'info'
    );
    console.log('Demo notification sent successfully');

  } catch (error) {
    console.error('Error running InsightsAgent example:', error);
  } finally {
    await insightsAgent.shutdown();
    console.log('\nInsightsAgent shutdown complete');
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };