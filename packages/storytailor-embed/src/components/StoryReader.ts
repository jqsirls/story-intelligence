/**
 * Story Reader Component
 * Interactive story reader with word-level highlighting, audio sync, and accessibility features
 */

import { Story } from '../StorytalorEmbed';

export interface StoryReaderConfig {
  onClose: () => void;
  onWordClick: (word: string, timestamp: number) => void;
  onWordLongPress: (word: string) => void;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  index: number;
}

export class StoryReader {
  private container: HTMLElement;
  private config: StoryReaderConfig;
  private currentStory: Story | null = null;
  private wordTimestamps: WordTimestamp[] = [];
  private currentWordIndex = -1;
  private isPlaying = false;
  private readingSpeed = 1.0;
  private audio: HTMLAudioElement | null = null;
  private longPressTimer: number | null = null;
  private readerContainer: HTMLElement;
  private controlsContainer: HTMLElement;

  constructor(container: HTMLElement, config: StoryReaderConfig) {
    this.container = container;
    this.config = config;
    this.createInterface();
    this.setupEventListeners();
  }

  /**
   * Load a story into the reader
   */
  async loadStory(story: Story): Promise<void> {
    this.currentStory = story;
    
    try {
      // Load WebVTT timestamps if available
      if (story.webvttUrl) {
        await this.loadWebVTT(story.webvttUrl);
      } else {
        // Generate estimated timestamps
        this.generateEstimatedTimestamps(story.content);
      }
      
      // Render story content
      this.renderStoryContent();
      
      // Load audio if available
      if (story.audioUrl) {
        await this.loadAudio(story.audioUrl);
      }
      
    } catch (error) {
      console.error('Failed to load story:', error);
      this.showError('Failed to load story content');
    }
  }

  /**
   * Set reading speed (0.5x to 2.0x)
   */
  setReadingSpeed(speed: number): void {
    this.readingSpeed = Math.max(0.5, Math.min(2.0, speed));
    
    if (this.audio) {
      this.audio.playbackRate = this.readingSpeed;
    }
    
    this.updateSpeedDisplay();
  }

  /**
   * Start/stop audio playback
   */
  async togglePlayback(): Promise<void> {
    if (!this.audio) return;
    
    try {
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        await this.audio.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
      this.showError('Audio playback failed');
    }
  }

  /**
   * Jump to specific word
   */
  jumpToWord(wordIndex: number): void {
    if (wordIndex < 0 || wordIndex >= this.wordTimestamps.length) return;
    
    const timestamp = this.wordTimestamps[wordIndex];
    
    if (this.audio) {
      this.audio.currentTime = timestamp.start;
    }
    
    this.highlightWord(wordIndex);
    this.scrollToWord(wordIndex);
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    
    this.container.innerHTML = '';
  }

  // Private methods

  private createInterface(): void {
    this.container.innerHTML = `
      <div class="st-story-reader">
        <div class="st-reader-header">
          <button class="st-btn st-btn-icon st-btn-close" id="st-reader-close">
            <span class="st-icon-close"></span>
          </button>
          <div class="st-reader-title" id="st-reader-title">
            Loading story...
          </div>
          <div class="st-reader-actions">
            <button class="st-btn st-btn-icon" id="st-reader-settings">
              <span class="st-icon-settings"></span>
            </button>
          </div>
        </div>
        
        <div class="st-reader-content" id="st-reader-content">
          <div class="st-story-text" id="st-story-text">
            <!-- Story content will be rendered here -->
          </div>
        </div>
        
        <div class="st-reader-controls" id="st-reader-controls">
          <div class="st-audio-controls">
            <button class="st-btn st-btn-icon" id="st-play-pause">
              <span class="st-icon-play"></span>
            </button>
            <div class="st-progress-container">
              <div class="st-progress-bar" id="st-progress-bar">
                <div class="st-progress-fill" id="st-progress-fill"></div>
                <div class="st-progress-handle" id="st-progress-handle"></div>
              </div>
              <div class="st-time-display">
                <span id="st-current-time">0:00</span>
                <span>/</span>
                <span id="st-total-time">0:00</span>
              </div>
            </div>
            <div class="st-speed-control">
              <button class="st-btn st-btn-sm" id="st-speed-down">
                <span class="st-icon-minus"></span>
              </button>
              <span class="st-speed-display" id="st-speed-display">1.0x</span>
              <button class="st-btn st-btn-sm" id="st-speed-up">
                <span class="st-icon-plus"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Get references
    this.readerContainer = this.container.querySelector('#st-story-text')!;
    this.controlsContainer = this.container.querySelector('#st-reader-controls')!;
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container.querySelector('#st-reader-close');
    closeBtn?.addEventListener('click', () => {
      this.config.onClose();
    });
    
    // Play/pause button
    const playPauseBtn = this.container.querySelector('#st-play-pause');
    playPauseBtn?.addEventListener('click', () => {
      this.togglePlayback();
    });
    
    // Speed controls
    const speedDownBtn = this.container.querySelector('#st-speed-down');
    const speedUpBtn = this.container.querySelector('#st-speed-up');
    
    speedDownBtn?.addEventListener('click', () => {
      this.setReadingSpeed(this.readingSpeed - 0.1);
    });
    
    speedUpBtn?.addEventListener('click', () => {
      this.setReadingSpeed(this.readingSpeed + 0.1);
    });
    
    // Progress bar interaction
    const progressBar = this.container.querySelector('#st-progress-bar');
    progressBar?.addEventListener('click', (e) => {
      this.handleProgressClick(e as MouseEvent);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.container.contains(document.activeElement)) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.togglePlayback();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.jumpToPreviousWord();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.jumpToNextWord();
          break;
        case '-':
          e.preventDefault();
          this.setReadingSpeed(this.readingSpeed - 0.1);
          break;
        case '+':
        case '=':
          e.preventDefault();
          this.setReadingSpeed(this.readingSpeed + 0.1);
          break;
      }
    });
  }

  private async loadWebVTT(webvttUrl: string): Promise<void> {
    try {
      const response = await fetch(webvttUrl);
      const webvttText = await response.text();
      this.parseWebVTT(webvttText);
    } catch (error) {
      console.error('Failed to load WebVTT:', error);
      // Fall back to estimated timestamps
      if (this.currentStory) {
        this.generateEstimatedTimestamps(this.currentStory.content);
      }
    }
  }

  private parseWebVTT(webvttText: string): void {
    const lines = webvttText.split('\n');
    const timestamps: WordTimestamp[] = [];
    let wordIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for timestamp lines
      if (line.includes('-->')) {
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        const start = this.parseTimeToSeconds(startTime);
        const end = this.parseTimeToSeconds(endTime);
        
        // Get the next line which should contain the word
        const wordLine = lines[i + 1]?.trim();
        if (wordLine) {
          // Extract word from WebVTT markup (e.g., <c.word-0>Once</c>)
          const wordMatch = wordLine.match(/>([^<]+)</);
          const word = wordMatch ? wordMatch[1] : wordLine;
          
          timestamps.push({
            word,
            start,
            end,
            index: wordIndex++
          });
        }
      }
    }
    
    this.wordTimestamps = timestamps;
  }

  private generateEstimatedTimestamps(content: string): void {
    const words = content.split(/\s+/);
    const averageWordsPerMinute = 150; // Reading speed
    const secondsPerWord = 60 / averageWordsPerMinute;
    
    this.wordTimestamps = words.map((word, index) => ({
      word: word.replace(/[^\w]/g, ''), // Remove punctuation for matching
      start: index * secondsPerWord,
      end: (index + 1) * secondsPerWord,
      index
    }));
  }

  private renderStoryContent(): void {
    if (!this.currentStory) return;
    
    const titleEl = this.container.querySelector('#st-reader-title');
    if (titleEl) {
      titleEl.textContent = this.currentStory.title;
    }
    
    // Split content into words and create interactive elements
    const words = this.currentStory.content.split(/(\s+)/);
    let wordIndex = 0;
    
    const contentHTML = words.map(segment => {
      if (segment.trim()) {
        // This is a word
        const cleanWord = segment.replace(/[^\w]/g, '');
        const timestamp = this.wordTimestamps.find(t => t.word === cleanWord);
        
        return `<span 
          class="st-story-word" 
          data-word-index="${wordIndex++}"
          data-word="${cleanWord}"
          data-start="${timestamp?.start || 0}"
        >${segment}</span>`;
      } else {
        // This is whitespace
        return segment;
      }
    }).join('');
    
    this.readerContainer.innerHTML = contentHTML;
    
    // Add word interaction listeners
    this.setupWordInteractions();
  }

  private setupWordInteractions(): void {
    const words = this.readerContainer.querySelectorAll('.st-story-word');
    
    words.forEach((wordEl, index) => {
      const element = wordEl as HTMLElement;
      
      // Click to repeat word
      element.addEventListener('click', () => {
        const word = element.dataset.word!;
        const start = parseFloat(element.dataset.start!);
        this.config.onWordClick(word, start);
        this.highlightWord(index);
        
        // Play word audio if available
        if (this.audio) {
          this.audio.currentTime = start;
          this.audio.play();
        }
      });
      
      // Long press for phonetic breakdown
      element.addEventListener('mousedown', () => {
        this.longPressTimer = window.setTimeout(() => {
          const word = element.dataset.word!;
          this.config.onWordLongPress(word);
          this.showPhoneticBreakdown(word, element);
        }, 500);
      });
      
      element.addEventListener('mouseup', () => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      });
      
      element.addEventListener('mouseleave', () => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      });
    });
  }

  private async loadAudio(audioUrl: string): Promise<void> {
    this.audio = new Audio(audioUrl);
    this.audio.playbackRate = this.readingSpeed;
    
    // Audio event listeners
    this.audio.addEventListener('loadedmetadata', () => {
      this.updateTotalTime();
    });
    
    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.updateCurrentWordHighlight();
    });
    
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
    });
    
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });
    
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayButton();
      this.currentWordIndex = -1;
      this.clearWordHighlights();
    });
  }

  private highlightWord(wordIndex: number): void {
    // Clear previous highlights
    this.clearWordHighlights();
    
    // Highlight current word
    const words = this.readerContainer.querySelectorAll('.st-story-word');
    if (words[wordIndex]) {
      words[wordIndex].classList.add('st-word-highlighted');
      this.currentWordIndex = wordIndex;
    }
  }

  private clearWordHighlights(): void {
    const highlighted = this.readerContainer.querySelectorAll('.st-word-highlighted');
    highlighted.forEach(el => el.classList.remove('st-word-highlighted'));
  }

  private scrollToWord(wordIndex: number): void {
    const words = this.readerContainer.querySelectorAll('.st-story-word');
    const wordEl = words[wordIndex] as HTMLElement;
    
    if (wordEl) {
      wordEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  private updateCurrentWordHighlight(): void {
    if (!this.audio || this.wordTimestamps.length === 0) return;
    
    const currentTime = this.audio.currentTime;
    
    // Find the current word based on timestamp
    const currentWordIndex = this.wordTimestamps.findIndex(
      timestamp => currentTime >= timestamp.start && currentTime < timestamp.end
    );
    
    if (currentWordIndex !== -1 && currentWordIndex !== this.currentWordIndex) {
      this.highlightWord(currentWordIndex);
    }
  }

  private updateProgress(): void {
    if (!this.audio) return;
    
    const progress = (this.audio.currentTime / this.audio.duration) * 100;
    const progressFill = this.container.querySelector('#st-progress-fill') as HTMLElement;
    const progressHandle = this.container.querySelector('#st-progress-handle') as HTMLElement;
    const currentTimeEl = this.container.querySelector('#st-current-time');
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    if (progressHandle) {
      progressHandle.style.left = `${progress}%`;
    }
    
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
  }

  private updateTotalTime(): void {
    if (!this.audio) return;
    
    const totalTimeEl = this.container.querySelector('#st-total-time');
    if (totalTimeEl) {
      totalTimeEl.textContent = this.formatTime(this.audio.duration);
    }
  }

  private updatePlayButton(): void {
    const playPauseBtn = this.container.querySelector('#st-play-pause span');
    if (playPauseBtn) {
      playPauseBtn.className = this.isPlaying ? 'st-icon-pause' : 'st-icon-play';
    }
  }

  private updateSpeedDisplay(): void {
    const speedDisplay = this.container.querySelector('#st-speed-display');
    if (speedDisplay) {
      speedDisplay.textContent = `${this.readingSpeed.toFixed(1)}x`;
    }
  }

  private handleProgressClick(e: MouseEvent): void {
    if (!this.audio) return;
    
    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * this.audio.duration;
    
    this.audio.currentTime = newTime;
  }

  private jumpToPreviousWord(): void {
    if (this.currentWordIndex > 0) {
      this.jumpToWord(this.currentWordIndex - 1);
    }
  }

  private jumpToNextWord(): void {
    if (this.currentWordIndex < this.wordTimestamps.length - 1) {
      this.jumpToWord(this.currentWordIndex + 1);
    }
  }

  private showPhoneticBreakdown(word: string, element: HTMLElement): void {
    // Create phonetic breakdown tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'st-phonetic-tooltip';
    tooltip.innerHTML = `
      <div class="st-phonetic-word">${word}</div>
      <div class="st-phonetic-breakdown">${this.getPhoneticBreakdown(word)}</div>
      <div class="st-phonetic-audio">
        <button class="st-btn st-btn-sm" onclick="this.closest('.st-phonetic-tooltip').remove()">
          🔊 Play Slowly
        </button>
      </div>
    `;
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.bottom + 10}px`;
    tooltip.style.left = `${rect.left}px`;
    
    document.body.appendChild(tooltip);
    
    // Remove tooltip after 5 seconds
    setTimeout(() => {
      tooltip.remove();
    }, 5000);
  }

  private getPhoneticBreakdown(word: string): string {
    // Simple phonetic breakdown - in a real implementation,
    // this would use a proper phonetic dictionary
    const phonetics: { [key: string]: string } = {
      'cat': 'k-æ-t',
      'dog': 'd-ɔ-g',
      'house': 'h-aʊ-s',
      'tree': 't-r-i',
      'book': 'b-ʊ-k'
    };
    
    return phonetics[word.toLowerCase()] || word.split('').join('-');
  }

  private parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':');
    const seconds = parseFloat(parts[parts.length - 1]);
    const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2]) : 0;
    const hours = parts.length > 2 ? parseInt(parts[parts.length - 3]) : 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private showError(message: string): void {
    const errorEl = document.createElement('div');
    errorEl.className = 'st-reader-error';
    errorEl.textContent = message;
    
    this.readerContainer.appendChild(errorEl);
    
    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }
}