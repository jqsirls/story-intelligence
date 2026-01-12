import { Database } from '@alexa-multi-agent/shared-types';
import { LibraryService } from './services/LibraryService';
import { PermissionService } from './services/PermissionService';
import { StoryService } from './services/StoryService';
import { CharacterService } from './services/CharacterService';
import { InsightsService } from './services/InsightsService';
import { EmotionalInsightsService } from './services/EmotionalInsightsService';
import {
  LibraryAgentConfig,
  LibraryOperationContext,
  Library,
  LibraryCreateRequest,
  LibraryUpdateRequest,
  LibrarySearchFilters,
  PermissionGrantRequest,
  PermissionUpdateRequest,
  StoryTransferRequest,
  StoryTransferResponse,
  CharacterShareRequest,
  LibraryError,
  LibrarySupabaseClient
} from './types';
import { DatabaseStory, DatabaseCharacter } from './types';
import { createLibraryClient } from './db/client';

export class LibraryAgent {
  private supabase: LibrarySupabaseClient;
  private libraryService: LibraryService;
  private permissionService: PermissionService;
  private storyService: StoryService;
  private characterService: CharacterService;
  private insightsService: InsightsService;
  private emotionalInsightsService: EmotionalInsightsService;

  constructor(private config: LibraryAgentConfig) {
    this.supabase = createLibraryClient(config.supabaseUrl, config.supabaseKey);
    
    // Initialize services
    this.libraryService = new LibraryService(this.supabase);
    this.permissionService = new PermissionService(this.supabase);
    this.storyService = new StoryService(
      this.supabase, 
      this.permissionService, 
      this.config.emailService,
      this.config.logger
    );
    this.characterService = new CharacterService(this.supabase, this.permissionService);
    this.insightsService = new InsightsService(this.supabase);
    this.emotionalInsightsService = new EmotionalInsightsService(this.supabase);

    // Start insights update interval if enabled
    if (config.enableInsights) {
      this.startInsightsUpdateInterval();
    }
  }

  // Library CRUD Operations (Task 7.1)
  async createLibrary(
    request: LibraryCreateRequest,
    context: LibraryOperationContext
  ): Promise<Library> {
    try {
      return await this.libraryService.createLibrary(request, context);
    } catch (error) {
      throw this.handleError(error, 'createLibrary');
    }
  }

  async getLibrary(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<Library> {
    try {
      return await this.libraryService.getLibrary(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getLibrary');
    }
  }

  async updateLibrary(
    libraryId: string,
    request: LibraryUpdateRequest,
    context: LibraryOperationContext
  ): Promise<Library> {
    try {
      return await this.libraryService.updateLibrary(libraryId, request, context);
    } catch (error) {
      throw this.handleError(error, 'updateLibrary');
    }
  }

  async deleteLibrary(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.libraryService.deleteLibrary(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'deleteLibrary');
    }
  }

  async searchLibraries(
    filters: LibrarySearchFilters,
    context: LibraryOperationContext
  ): Promise<Library[]> {
    try {
      return await this.libraryService.searchLibraries(filters, context);
    } catch (error) {
      throw this.handleError(error, 'searchLibraries');
    }
  }

  async getUserLibraries(
    context: LibraryOperationContext
  ): Promise<Library[]> {
    try {
      return await this.libraryService.getUserLibraries(context);
    } catch (error) {
      throw this.handleError(error, 'getUserLibraries');
    }
  }

  // Sub-library Operations (Task 7.2)
  async createSubLibrary(
    parentLibraryId: string,
    request: LibraryCreateRequest,
    context: LibraryOperationContext
  ): Promise<Library> {
    try {
      return await this.libraryService.createSubLibrary(parentLibraryId, request, context);
    } catch (error) {
      throw this.handleError(error, 'createSubLibrary');
    }
  }

  async getSubLibraries(
    parentLibraryId: string,
    context: LibraryOperationContext
  ): Promise<Library[]> {
    try {
      return await this.libraryService.getSubLibraries(parentLibraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getSubLibraries');
    }
  }

  // Permission Management (Task 7.3)
  async grantPermission(
    libraryId: string,
    request: PermissionGrantRequest,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.permissionService.grantPermission(libraryId, request, context);
    } catch (error) {
      throw this.handleError(error, 'grantPermission');
    }
  }

  async updatePermission(
    libraryId: string,
    userId: string,
    request: PermissionUpdateRequest,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.permissionService.updatePermission(libraryId, userId, request, context);
    } catch (error) {
      throw this.handleError(error, 'updatePermission');
    }
  }

  async revokePermission(
    libraryId: string,
    userId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.permissionService.revokePermission(libraryId, userId, context);
    } catch (error) {
      throw this.handleError(error, 'revokePermission');
    }
  }

  async transferOwnership(
    libraryId: string,
    newOwnerId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.permissionService.transferOwnership(libraryId, newOwnerId, context);
    } catch (error) {
      throw this.handleError(error, 'transferOwnership');
    }
  }

  async getLibraryPermissions(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    try {
      return await this.permissionService.getLibraryPermissions(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getLibraryPermissions');
    }
  }

  // Story Management (Task 7.4)
  async getLibraryStories(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseStory[]> {
    try {
      return await this.storyService.getLibraryStories(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getLibraryStories');
    }
  }

  async getStory(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseStory> {
    try {
      return await this.storyService.getStory(storyId, context);
    } catch (error) {
      throw this.handleError(error, 'getStory');
    }
  }

  async updateStory(
    storyId: string,
    updates: Partial<DatabaseStory>,
    context: LibraryOperationContext
  ): Promise<DatabaseStory> {
    try {
      return await this.storyService.updateStory(storyId, updates, context);
    } catch (error) {
      throw this.handleError(error, 'updateStory');
    }
  }

  async deleteStory(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.storyService.deleteStory(storyId, context);
    } catch (error) {
      throw this.handleError(error, 'deleteStory');
    }
  }

  async transferStory(
    request: StoryTransferRequest,
    context: LibraryOperationContext
  ): Promise<StoryTransferResponse> {
    try {
      return await this.storyService.transferStory(request, context);
    } catch (error) {
      throw this.handleError(error, 'transferStory');
    }
  }

  async respondToStoryTransfer(
    transferId: string,
    response: 'accepted' | 'rejected',
    context: LibraryOperationContext,
    responseMessage?: string
  ): Promise<void> {
    try {
      await this.storyService.respondToStoryTransfer(transferId, response, context, responseMessage);
    } catch (error) {
      throw this.handleError(error, 'respondToStoryTransfer');
    }
  }

  async getStoryTransferRequests(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    try {
      return await this.storyService.getStoryTransferRequests(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getStoryTransferRequests');
    }
  }

  async searchStories(
    query: string,
    libraryIds: string[],
    context: LibraryOperationContext
  ): Promise<DatabaseStory[]> {
    try {
      return await this.storyService.searchStories(query, libraryIds, context);
    } catch (error) {
      throw this.handleError(error, 'searchStories');
    }
  }

  // Character Management (Task 7.4)
  async getStoryCharacters(
    storyId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter[]> {
    try {
      return await this.characterService.getStoryCharacters(storyId, context);
    } catch (error) {
      throw this.handleError(error, 'getStoryCharacters');
    }
  }

  async getCharacter(
    characterId: string,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter> {
    try {
      return await this.characterService.getCharacter(characterId, context);
    } catch (error) {
      throw this.handleError(error, 'getCharacter');
    }
  }

  async updateCharacter(
    characterId: string,
    updates: Partial<DatabaseCharacter>,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter> {
    try {
      return await this.characterService.updateCharacter(characterId, updates, context);
    } catch (error) {
      throw this.handleError(error, 'updateCharacter');
    }
  }

  async deleteCharacter(
    characterId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.characterService.deleteCharacter(characterId, context);
    } catch (error) {
      throw this.handleError(error, 'deleteCharacter');
    }
  }

  async shareCharacter(
    request: CharacterShareRequest,
    context: LibraryOperationContext
  ): Promise<DatabaseCharacter> {
    try {
      return await this.characterService.shareCharacter(request, context);
    } catch (error) {
      throw this.handleError(error, 'shareCharacter');
    }
  }

  // Insights Operations (Task 7.1)
  async getLibraryInsights(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any> {
    try {
      return await this.insightsService.getLibraryInsights(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getLibraryInsights');
    }
  }

  async updateLibraryInsights(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.insightsService.updateLibraryInsights(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'updateLibraryInsights');
    }
  }

  // Sub-library Avatar Operations (Task 7.2)
  async setSubLibraryAvatar(
    libraryId: string,
    avatarType: string,
    avatarData: any,
    context: LibraryOperationContext
  ): Promise<void> {
    try {
      await this.libraryService.setSubLibraryAvatar(libraryId, avatarType, avatarData, context);
    } catch (error) {
      throw this.handleError(error, 'setSubLibraryAvatar');
    }
  }

  async getSubLibraryAvatar(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any> {
    try {
      return await this.libraryService.getSubLibraryAvatar(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getSubLibraryAvatar');
    }
  }

  async getHierarchicalLibraryStories(
    libraryId: string,
    context: LibraryOperationContext
  ): Promise<any[]> {
    try {
      return await this.libraryService.getHierarchicalLibraryStories(libraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getHierarchicalLibraryStories');
    }
  }

  // Emotional Check-in Operations (Task 7.2)
  async recordEmotionalCheckin(
    subLibraryId: string,
    mood: any,
    confidence: number,
    context: LibraryOperationContext,
    checkinContext?: any
  ): Promise<any> {
    try {
      return await this.emotionalInsightsService.recordEmotionalCheckin(
        subLibraryId,
        mood,
        confidence,
        checkinContext || {},
        context
      );
    } catch (error) {
      throw this.handleError(error, 'recordEmotionalCheckin');
    }
  }

  async getSubLibraryEmotionalPatterns(
    subLibraryId: string,
    daysBack: number = 30,
    context: LibraryOperationContext
  ): Promise<any[]> {
    try {
      return await this.emotionalInsightsService.getSubLibraryEmotionalPatterns(
        subLibraryId,
        daysBack,
        context
      );
    } catch (error) {
      throw this.handleError(error, 'getSubLibraryEmotionalPatterns');
    }
  }

  async getSubLibraryMoodSummary(
    subLibraryId: string,
    context: LibraryOperationContext
  ): Promise<any> {
    try {
      return await this.emotionalInsightsService.getSubLibraryMoodSummary(subLibraryId, context);
    } catch (error) {
      throw this.handleError(error, 'getSubLibraryMoodSummary');
    }
  }

  async compareSubLibraryEmotions(
    subLibraryIds: string[],
    context: LibraryOperationContext
  ): Promise<any> {
    try {
      return await this.emotionalInsightsService.compareSubLibraryEmotions(subLibraryIds, context);
    } catch (error) {
      throw this.handleError(error, 'compareSubLibraryEmotions');
    }
  }

  // Private methods
  private startInsightsUpdateInterval(): void {
    setInterval(async () => {
      try {
        await this.insightsService.updateAllLibraryInsights();
      } catch (error) {
        console.error('Error updating library insights:', error);
      }
    }, this.config.insightsUpdateInterval * 60 * 1000);
  }

  private handleError(error: any, operation: string): LibraryError {
    if (error instanceof LibraryError) {
      return error;
    }

    console.error(`LibraryAgent.${operation} error:`, error);
    
    return new LibraryError(
      `Internal error in ${operation}`,
      'INTERNAL_ERROR',
      500
    );
  }
}