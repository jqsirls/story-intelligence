/**
 * Library Manager
 * Complete library management with stories and characters
 */

export interface LibraryManagerConfig {
  onReadStory: (storyId: string) => void;
  onShareStory: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onEditCharacter: (characterId: string) => void;
  onDeleteCharacter: (characterId: string) => void;
}

export class LibraryManager {
  private container: HTMLElement;
  private config: LibraryManagerConfig;
  private currentFilter: 'all' | 'recent' | 'favorites' | 'shared' = 'all';

  constructor(container: HTMLElement, config: LibraryManagerConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * Render library with stories and characters
   */
  render(stories: any[], characters: any[]): void {
    this.container.innerHTML = `
      <div class="st-library-manager">
        ${this.renderStoriesSection(stories)}
        ${this.renderCharactersSection(characters)}
      </div>
    `;

    this.setupEventListeners();
  }

  private renderStoriesSection(stories: any[]): string {
    return `
      <div class="st-library-section">
        <div class="st-section-header">
          <h2>Your Stories</h2>
          <div class="st-library-filters">
            <button class="st-filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="st-filter-btn ${this.currentFilter === 'recent' ? 'active' : ''}" data-filter="recent">Recent</button>
            <button class="st-filter-btn ${this.currentFilter === 'favorites' ? 'active' : ''}" data-filter="favorites">Favorites</button>
            <button class="st-filter-btn ${this.currentFilter === 'shared' ? 'active' : ''}" data-filter="shared">Shared</button>
          </div>
        </div>
        
        <div class="st-story-grid">
          ${stories.length > 0 ? 
            stories.map(story => this.renderStoryCard(story)).join('') :
            '<div class="st-empty-state"><p>No stories yet. Create your first story!</p></div>'
          }
        </div>
      </div>
    `;
  }

  private renderStoryCard(story: any): string {
    return `
      <div class="st-story-card-full" data-story-id="${story.id}">
        <div class="st-story-thumbnail">
          ${story.thumbnailUrl ? 
            `<img src="${story.thumbnailUrl}" alt="${story.title}" />` :
            '<div class="st-thumbnail-placeholder">📖</div>'
          }
        </div>
        <div class="st-story-info">
          <h3>${story.title}</h3>
          <div class="st-story-meta">
            <span>${new Date(story.createdAt).toLocaleDateString()}</span>
            ${story.readCount ? `<span>• ${story.readCount} reads</span>` : ''}
          </div>
        </div>
        <div class="st-story-actions">
          <button class="st-action-btn" data-action="read" data-story-id="${story.id}" title="Read">
            📖
          </button>
          <button class="st-action-btn" data-action="share" data-story-id="${story.id}" title="Share">
            📤
          </button>
          <button class="st-action-btn danger" data-action="delete" data-story-id="${story.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  private renderCharactersSection(characters: any[]): string {
    return `
      <div class="st-library-section">
        <div class="st-section-header">
          <h2>Your Characters</h2>
        </div>
        
        <div class="st-character-grid">
          ${characters.length > 0 ?
            characters.map(char => this.renderCharacterCard(char)).join('') :
            '<div class="st-empty-state"><p>No characters yet. Create one during your next story!</p></div>'
          }
        </div>
      </div>
    `;
  }

  private renderCharacterCard(character: any): string {
    return `
      <div class="st-character-card-full" data-character-id="${character.id}">
        <div class="st-character-image">
          ${character.headshotUrl ?
            `<img src="${character.headshotUrl}" alt="${character.name}" />` :
            '<div class="st-character-placeholder">🎭</div>'
          }
        </div>
        <div class="st-character-info">
          <h3>${character.name}</h3>
          <div class="st-character-meta">
            <span>${character.usageCount || 0} stories</span>
          </div>
        </div>
        <div class="st-character-actions">
          <button class="st-action-btn" data-action="edit" data-character-id="${character.id}" title="Edit">
            ✏️
          </button>
          <button class="st-action-btn danger" data-action="delete" data-character-id="${character.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const storyId = btn.getAttribute('data-story-id');
      const characterId = btn.getAttribute('data-character-id');

      switch (action) {
        case 'read':
          if (storyId) this.config.onReadStory(storyId);
          break;
        case 'share':
          if (storyId) this.config.onShareStory(storyId);
          break;
        case 'delete':
          if (storyId) this.config.onDeleteStory(storyId);
          if (characterId) this.config.onDeleteCharacter(characterId);
          break;
        case 'edit':
          if (characterId) this.config.onEditCharacter(characterId);
          break;
      }
    });
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}

