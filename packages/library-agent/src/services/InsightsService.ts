import { Database } from '@alexa-multi-agent/shared-types';
import {
  LibraryInsights,
  EmotionalPattern,
  UsageStatistics,
  LibraryOperationContext,
  LibraryError,
  PermissionError
} from '../types';
import { LibrarySupabaseClient } from '../db/client';

export class InsightsService {
  constructor(private supabase: LibrarySupabaseClient) {}

  async getLibraryInsights(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<LibraryInsights> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to library insights');
    }

    // Get or create insights
    let insights = await this.getExistingInsights(libraryId);
    if (!insights) {
      insights = await this.generateLibraryInsights(libraryId);
    }

    return insights;
  }

  async updateLibraryInsights(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    // Check permission
    const hasPermission = await this.checkLibraryPermission(libraryId, 'Viewer', context.user_id);
    if (!hasPermission) {
      throw new PermissionError('Access denied to library insights');
    }

    await this.generateLibraryInsights(libraryId);
  }

  async updateAllLibraryInsights(): Promise<void> {
    // Get all libraries that need insights updates
    const { data: libraries, error } = await this.supabase
      .from('libraries')
      .select('id')
      .order('created_at', { ascending: false });

    if (error) {
      throw new LibraryError(`Failed to get libraries for insights update: ${error.message}`, 'UPDATE_FAILED');
    }

    // Update insights for each library
    for (const library of libraries || []) {
      try {
        await this.generateLibraryInsights(library.id);
      } catch (error) {
        console.error(`Failed to update insights for library ${library.id}:`, error);
        // Continue with other libraries
      }
    }
  }

  private async getExistingInsights(libraryId: string): Promise<LibraryInsights | null> {
    // Check if we have a library_insights table (we'll need to create it)
    // For now, we'll generate insights on-demand
    return null;
  }

  private async generateLibraryInsights(libraryId: string): Promise<LibraryInsights> {
    try {
      // Get basic library statistics
      const [
        storyStats,
        characterStats,
        userActivity,
        emotionalPatterns,
        usageStats
      ] = await Promise.all([
        this.getStoryStatistics(libraryId),
        this.getCharacterStatistics(libraryId),
        this.getUserActivityStatistics(libraryId),
        this.getEmotionalPatterns(libraryId),
        this.getUsageStatistics(libraryId)
      ]);

      const insights: LibraryInsights = {
        id: `insights_${libraryId}`,
        library_id: libraryId,
        total_stories: storyStats.total,
        total_characters: characterStats.total,
        most_active_user: userActivity.mostActiveUser,
        story_completion_rate: storyStats.completionRate,
        average_story_rating: storyStats.averageRating,
        popular_story_types: storyStats.popularTypes,
        emotional_patterns: emotionalPatterns,
        usage_statistics: usageStats,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store insights (we'd need to create a library_insights table)
      await this.storeInsights(insights);

      return insights;
    } catch (error) {
      throw new LibraryError(`Failed to generate library insights: ${error}`, 'INSIGHTS_GENERATION_FAILED');
    }
  }

  private async getStoryStatistics(libraryId: string) {
    // Get story count and completion rate
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id, status, content')
      .eq('library_id', libraryId);

    if (storiesError) {
      throw new LibraryError(`Failed to get story statistics: ${storiesError.message}`, 'STATS_FAILED');
    }

    const total = stories?.length || 0;
    const completed = stories?.filter(s => s.status === 'final').length || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Extract story types from content
    const storyTypes: { [key: string]: number } = {};
    stories?.forEach(story => {
      const storyType =
        story.content && typeof story.content === 'object' && 'story_type' in story.content
          ? (story.content as any).story_type ?? 'unknown'
          : 'unknown';
      storyTypes[storyType] = (storyTypes[storyType] || 0) + 1;
    });

    const popularTypes = Object.entries(storyTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    return {
      total,
      completionRate,
      averageRating: null, // Would need ratings system
      popularTypes
    };
  }

  private async getCharacterStatistics(libraryId: string) {
    // First get story IDs for this library
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .eq('library_id', libraryId);

    if (storiesError) {
      throw new LibraryError(`Failed to get library stories: ${storiesError.message}`, 'STATS_FAILED');
    }

    if (!stories || stories.length === 0) {
      return { total: 0 };
    }

    const storyIds = stories.map(s => s.id);

    // Get character count across all stories in library
    const { data: characters, error } = await this.supabase
      .from('characters')
      .select('id')
      .in('story_id', storyIds);

    if (error) {
      throw new LibraryError(`Failed to get character statistics: ${error.message}`, 'STATS_FAILED');
    }

    return {
      total: characters?.length || 0
    };
  }

  private async getUserActivityStatistics(libraryId: string) {
    // First get story IDs for this library
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .eq('library_id', libraryId);

    if (storiesError) {
      throw new LibraryError(`Failed to get library stories: ${storiesError.message}`, 'STATS_FAILED');
    }

    if (!stories || stories.length === 0) {
      return { mostActiveUser: null };
    }

    const storyIds = stories.map(s => s.id);

    // Get user activity from story interactions
    const { data: interactions, error } = await this.supabase
      .from('story_interactions')
      .select('user_id, created_at')
      .in('story_id', storyIds);

    if (error) {
      throw new LibraryError(`Failed to get user activity: ${error.message}`, 'STATS_FAILED');
    }

    // Find most active user
    const userCounts: { [userId: string]: number } = {};
    interactions?.forEach(interaction => {
      userCounts[interaction.user_id] = (userCounts[interaction.user_id] || 0) + 1;
    });

    const mostActiveUser = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      mostActiveUser
    };
  }

  private async getEmotionalPatterns(libraryId: string): Promise<EmotionalPattern[]> {
    // Get emotional data for this library
    const { data: emotions, error } = await this.supabase
      .from('emotions')
      .select('mood, created_at, confidence')
      .eq('library_id', libraryId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (error) {
      throw new LibraryError(`Failed to get emotional patterns: ${error.message}`, 'STATS_FAILED');
    }

    // Analyze mood patterns
    const moodCounts: { [mood: string]: number } = {};
    emotions?.forEach(emotion => {
      moodCounts[emotion.mood] = (moodCounts[emotion.mood] || 0) + 1;
    });

    const totalEmotions = emotions?.length || 0;
    const patterns: EmotionalPattern[] = Object.entries(moodCounts).map(([mood, count]) => ({
      mood,
      frequency: totalEmotions > 0 ? (count / totalEmotions) * 100 : 0,
      trend: 'stable' as const, // Would need historical data for trend analysis
      time_period: 'last_30_days'
    }));

    return patterns;
  }

  private async getUsageStatistics(libraryId: string): Promise<UsageStatistics> {
    // Get usage statistics from story interactions
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyUsers, weeklyUsers, monthlyUsers] = await Promise.all([
      this.getActiveUsers(libraryId, oneDayAgo),
      this.getActiveUsers(libraryId, oneWeekAgo),
      this.getActiveUsers(libraryId, oneMonthAgo)
    ]);

    // Get peak usage hours (simplified)
    const peakHours = await this.getPeakUsageHours(libraryId);

    return {
      daily_active_users: dailyUsers,
      weekly_active_users: weeklyUsers,
      monthly_active_users: monthlyUsers,
      peak_usage_hours: peakHours,
      average_session_duration: 0 // Would need session tracking
    };
  }

  private async getActiveUsers(libraryId: string, since: Date): Promise<number> {
    // First get story IDs for this library
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .eq('library_id', libraryId);

    if (storiesError || !stories || stories.length === 0) {
      return 0;
    }

    const storyIds = stories.map(s => s.id);

    const { data: users, error } = await this.supabase
      .from('story_interactions')
      .select('user_id')
      .in('story_id', storyIds)
      .gte('created_at', since.toISOString());

    if (error) {
      return 0;
    }

    const uniqueUsers = new Set(users?.map(u => u.user_id) || []);
    return uniqueUsers.size;
  }

  private async getPeakUsageHours(libraryId: string): Promise<number[]> {
    // First get story IDs for this library
    const { data: stories, error: storiesError } = await this.supabase
      .from('stories')
      .select('id')
      .eq('library_id', libraryId);

    if (storiesError || !stories || stories.length === 0) {
      return [];
    }

    const storyIds = stories.map(s => s.id);

    const { data: interactions, error } = await this.supabase
      .from('story_interactions')
      .select('created_at')
      .in('story_id', storyIds)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !interactions) {
      return [];
    }

    // Count interactions by hour
    const hourCounts: { [hour: number]: number } = {};
    interactions.forEach(interaction => {
      if (!interaction.created_at) return;
      const hour = new Date(interaction.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Return top 3 peak hours
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private async storeInsights(insights: LibraryInsights): Promise<void> {
    // For now, we'll store insights in a simple way
    // In a real implementation, we'd have a dedicated library_insights table
    try {
      // Store as metadata or in a dedicated insights table
      console.log('Storing insights for library:', insights.library_id);
      // This would be implemented with a proper insights storage mechanism
    } catch (error) {
      console.error('Failed to store insights:', error);
    }
  }

  private async checkLibraryPermission(
    libraryId: string,
    requiredRole: string,
    userId: string
  ): Promise<boolean> {
    const { data: hasPermission, error } = await this.supabase
      .rpc('check_library_permission_with_coppa', {
        lib_id: libraryId,
        required_role: requiredRole
      });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return hasPermission || false;
  }
}