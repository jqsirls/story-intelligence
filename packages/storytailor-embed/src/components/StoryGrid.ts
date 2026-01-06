/**
 * Story Grid Component
 * Displays a grid of available stories
 */

export interface Story {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  characters: string[];
  mood: string;
  ageRange: string;
  createdAt: string;
  tags: string[];
}

export interface StoryGridConfig {
  onStorySelect: (storyId: string) => void;
  onBackToChat: () => void;
}

export class StoryGrid {
  private container: HTMLElement;
  private config: StoryGridConfig;

  constructor(container: HTMLElement, config: StoryGridConfig) {
    this.container = container;
    this.config = config;
    this.init();
  }

  private init(): void {
    this.container.innerHTML = `
      <div class="st-story-grid">
        <div class="st-story-grid-header">
          <button class="st-btn st-btn-back" data-action="back">← Back to Chat</button>
          <h2>Your Stories</h2>
        </div>
        <div class="st-story-grid-content">
          <div class="st-story-grid-loading">Loading stories...</div>
        </div>
      </div>
    `;

    this.container.addEventListener('click', this.handleClick.bind(this));
  }

  displayStories(stories: Story[]): void {
    const content = this.container.querySelector('.st-story-grid-content')!;
    
    if (stories.length === 0) {
      content.innerHTML = `
        <div class="st-story-grid-empty">
          <div class="st-story-grid-empty-icon">📚</div>
          <h3>No stories yet</h3>
          <p>Start chatting to create your first story!</p>
        </div>
      `;
      return;
    }

    content.innerHTML = stories.map(story => `
      <div class="st-story-card" data-story-id="${story.id}">
        <div class="st-story-card-thumbnail">
          ${story.thumbnailUrl ? 
            `<img src="${story.thumbnailUrl}" alt="${story.title}">` :
            '<div class="st-story-card-placeholder">📖</div>'
          }
        </div>
        <div class="st-story-card-content">
          <h3 class="st-story-card-title">${story.title}</h3>
          <p class="st-story-card-preview">${story.content.substring(0, 100)}...</p>
          <div class="st-story-card-meta">
            <span class="st-story-card-characters">${story.characters.join(', ')}</span>
            <span class="st-story-card-date">${new Date(story.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target.matches('[data-action="back"]')) {
      this.config.onBackToChat();
      return;
    }

    const storyCard = target.closest('.st-story-card') as HTMLElement;
    if (storyCard) {
      const storyId = storyCard.dataset.storyId!;
      this.config.onStorySelect(storyId);
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}