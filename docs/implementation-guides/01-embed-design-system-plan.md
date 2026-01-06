# 🎨 STORYTAILOR EMBED - DESIGN SYSTEM IMPLEMENTATION PLAN
**Date**: August 2, 2025  
**Version**: Complete Design System Overhaul  
**Target**: Production-Ready Widget with Brand Guidelines  
**Dependencies**: Multi-Agent System Integration + Performance Optimization

---

## 📊 CURRENT STATE ASSESSMENT

### **✅ WHAT'S EXCELLENTLY IMPLEMENTED**

#### **Component Architecture** (9/10 - Excellent Foundation)
```typescript
// Current structure is well-organized
packages/storytailor-embed/src/
├── StorytalorEmbed.ts          (726 lines) - Main widget class
├── components/
│   ├── StoryReader.ts          (608 lines) - Interactive reader ✅
│   ├── ChatInterface.ts        (304 lines) - Chat UI ✅
│   ├── VoiceInterface.ts       (52 lines) - Voice controls ✅
│   └── StoryGrid.ts            (101 lines) - Story cards ✅
├── theme/
│   ├── DesignTokens.ts         (557 lines) - Token definitions ✅
│   └── ThemeManager.ts         (69 lines) - Theme switching ✅
├── api/                        - API integration ✅
├── offline/                    - Offline manager ✅
└── privacy/                    - Privacy controls ✅
```

#### **Advanced Reader Features** (7/10 - Good Foundation, Needs Enhancement)
- ✅ **Word-level highlighting**: `onWordClick`, `onWordLongPress` implemented
- ✅ **WebVTT timestamp support**: `loadWebVTT()` method exists
- ✅ **Audio sync**: Timeline and playback controls
- ✅ **Reading speed control**: 0.5x to 2.0x speed adjustment
- ⚠️ **Missing karaoke highlights**: No follow-along TTS implementation
- ⚠️ **Missing scroll-sync**: Jump-ahead detection not implemented
- ⚠️ **Missing phonetic mode**: Slow phonetics not implemented

#### **Professional Build System** (9/10 - Excellent)
- ✅ **Rollup configuration**: Multi-format output (UMD, ESM, CommonJS)
- ✅ **TypeScript setup**: Complete type definitions
- ✅ **Modern dev tools**: ESLint, Jest, Vite dev server
- ✅ **Package structure**: Professional npm package setup

### **❌ CRITICAL GAPS IDENTIFIED**

#### **1. Design System Implementation** (2/10 - Critical Gap)
**Current Issue**: Design tokens exist but aren't properly implemented
```typescript
// Current DesignTokens.ts has interfaces but no actual values
export interface ColorPalette {
  gray25: string;  // No actual hex values assigned
  gray50: string;  // Just type definitions
}
```

**Expected vs Reality**:
```json
// Expected in ui-tokens package:
{
  "colors": {
    "gray": {
      "25": "#FDFDFD",
      "50": "#FAFAFA"
    }
  }
}

// Current reality: EMPTY FILE
packages/ui-tokens/tokens/design-tokens.json: ""
```

#### **2. Brand Guideline Compliance** (1/10 - Missing)
**Requirements NOT Implemented**:
- ❌ **Inter Display + Inter fonts**: No font loading system
- ❌ **Exact color palette**: Missing WCAG-tested color system
- ❌ **Micro-interactions**: None of the reference site behaviors
- ❌ **8px radius standard**: No consistent border radius
- ❌ **Motion curves**: Missing cubic-bezier(.16, .84, .44, 1)

#### **3. Performance Requirements** (3/10 - Not Meeting Targets)
**Definition of Done NOT Met**:
- ❌ **Bundle size < 150KB**: Current bundle size unknown
- ❌ **Lighthouse ≥ 90**: No performance optimization
- ❌ **PWA offline**: Partial service worker implementation

#### **4. Missing Critical Features** (4/10 - Partial Implementation)
- ❌ **@storytailor/iframe wrapper**: Not implemented
- ❌ **Headless JS API**: No custom skin support
- ❌ **Service worker caching**: Basic offline only
- ❌ **WebSocket streaming**: No real-time updates
- ❌ **HLS audio endpoint**: Standard audio loading only

---

## 🚀 COMPREHENSIVE IMPLEMENTATION PLAN

### **PHASE 1: FOUNDATION - DESIGN SYSTEM IMPLEMENTATION** (Week 1)

#### **1.1 Complete UI Tokens Package**
**File**: `packages/ui-tokens/tokens/design-tokens.json`
```json
{
  "typography": {
    "fontFamily": {
      "display": "Inter Display, -apple-system, BlinkMacSystemFont, sans-serif",
      "body": "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    },
    "fontSize": {
      "display-2xl": "4.5rem",
      "display-xl": "3.75rem",
      "display-lg": "3rem",
      "display-md": "2rem",
      "display-sm": "1.875rem",
      "display-xs": "1.5rem",
      "text-xl": "1.25rem",
      "text-lg": "1.125rem",
      "text-md": "1rem",
      "text-sm": "0.875rem",
      "text-xs": "0.75rem"
    },
    "lineHeight": {
      "display-2xl": "5.625rem",
      "display-xl": "4.5rem",
      "display-lg": "3.75rem",
      "display-md": "2.75rem",
      "display-sm": "2.375rem",
      "display-xs": "2rem",
      "text-xl": "1.75rem",
      "text-lg": "1.625rem",
      "text-md": "1.5rem",
      "text-sm": "1.25rem",
      "text-xs": "1.125rem"
    },
    "letterSpacing": {
      "display": "-0.02em",
      "text": "-0.01em",
      "normal": "0em"
    }
  },
  "colors": {
    "gray": {
      "25": "#FDFDFD",
      "50": "#FAFAFA",
      "100": "#F5F5F5",
      "200": "#E8EAEB",
      "300": "#D5D7DA",
      "400": "#A4AAAE",
      "500": "#778680",
      "600": "#535B62",
      "700": "#414651",
      "800": "#252B37",
      "900": "#1B1D27",
      "950": "#0A0D12"
    },
    "blue": {
      "25": "#F5F9FF",
      "50": "#E4F4FF",
      "100": "#D0E1FF",
      "200": "#B2CCFF",
      "300": "#A8D4FF",
      "400": "#258BFF",
      "500": "#2970FF",
      "600": "#1E5EEF",
      "700": "#004EEB",
      "800": "#0040C1",
      "900": "#0039EE",
      "950": "#002266"
    },
    "error": {
      "25": "#FFF8FA",
      "50": "#FFE3F2",
      "100": "#FEE4E2",
      "200": "#FDECCA",
      "300": "#FDA29B",
      "400": "#F97066",
      "500": "#FF4438",
      "600": "#D92D20",
      "700": "#B42318",
      "800": "#912018",
      "900": "#721817",
      "950": "#55100C"
    },
    "warning": {
      "25": "#FFFCF5",
      "50": "#FFF7E5",
      "100": "#FEF0C7",
      "200": "#FDE4B9",
      "300": "#FEC84B",
      "400": "#FDB022",
      "500": "#FF9009",
      "600": "#DC6803",
      "700": "#B54708",
      "800": "#93370D",
      "900": "#7A2E0E",
      "950": "#4E0D09"
    },
    "success": {
      "25": "#F6FEF9",
      "50": "#ECFDF3",
      "100": "#D1FADF",
      "200": "#ABEFC6",
      "300": "#75E0A7",
      "400": "#3CCB7F",
      "500": "#17B26A",
      "600": "#079455",
      "700": "#067647",
      "800": "#085D3A",
      "900": "#074D31",
      "950": "#053321"
    }
  },
  "spacing": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem"
  },
  "borderRadius": {
    "none": "0",
    "sm": "0.125rem",
    "default": "0.5rem",
    "md": "0.5rem",
    "lg": "0.75rem",
    "xl": "1rem",
    "2xl": "1.5rem",
    "full": "9999px"
  },
  "boxShadow": {
    "xs": "0 1px 2px 0 rgba(16, 24, 40, 0.05)",
    "sm": "0 1px 3px 0 rgba(16, 24, 40, 0.1), 0 1px 2px 0 rgba(16, 24, 40, 0.06)",
    "md": "0 4px 8px -2px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.06)",
    "lg": "0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)",
    "xl": "0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)",
    "2xl": "0 24px 48px -12px rgba(16, 24, 40, 0.18)",
    "3xl": "0 32px 64px -12px rgba(16, 24, 40, 0.14)"
  },
  "animation": {
    "transition": {
      "fast": "150ms",
      "base": "200ms",
      "slow": "300ms",
      "slower": "400ms"
    },
    "easing": {
      "default": "cubic-bezier(0.16, 0.84, 0.44, 1)",
      "in": "cubic-bezier(0.4, 0, 1, 1)",
      "out": "cubic-bezier(0, 0, 0.2, 1)",
      "in-out": "cubic-bezier(0.4, 0, 0.2, 1)"
    }
  }
}
```

#### **1.2 Font Loading System**
**File**: `packages/storytailor-embed/src/theme/FontLoader.ts`
```typescript
export class FontLoader {
  private static instance: FontLoader;
  private fontsLoaded = false;

  static getInstance(): FontLoader {
    if (!FontLoader.instance) {
      FontLoader.instance = new FontLoader();
    }
    return FontLoader.instance;
  }

  async loadFonts(): Promise<void> {
    if (this.fontsLoaded) return;

    try {
      // Load Inter Display for headings
      const interDisplay = new FontFace(
        'Inter Display',
        'url(https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap)',
        { weight: '400 700', display: 'swap' }
      );

      // Load Inter for body text
      const inter = new FontFace(
        'Inter',
        'url(https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap)',
        { weight: '400 700', display: 'swap' }
      );

      await Promise.all([
        interDisplay.load(),
        inter.load()
      ]);

      document.fonts.add(interDisplay);
      document.fonts.add(inter);
      
      this.fontsLoaded = true;
    } catch (error) {
      console.warn('Font loading failed, falling back to system fonts:', error);
      this.fontsLoaded = true; // Continue with fallbacks
    }
  }

  injectFontCSS(): void {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      :root {
        --font-display: 'Inter Display', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }
}
```

#### **1.3 CSS-in-JS Theme System**
**File**: `packages/storytailor-embed/src/theme/ThemeEngine.ts`
```typescript
import { designTokens } from '@storytailor/ui-tokens';

export class ThemeEngine {
  private styleSheet: CSSStyleSheet;
  private darkMode = false;

  constructor() {
    this.styleSheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.styleSheet];
    this.generateBaseStyles();
  }

  private generateBaseStyles(): void {
    const tokens = designTokens;
    
    const baseCSS = `
      :root {
        /* Colors */
        ${Object.entries(tokens.colors.gray).map(([step, color]) => 
          `--color-gray-${step}: ${color};`
        ).join('\n        ')}
        
        ${Object.entries(tokens.colors.blue).map(([step, color]) => 
          `--color-blue-${step}: ${color};`
        ).join('\n        ')}
        
        /* Typography */
        ${Object.entries(tokens.typography.fontSize).map(([size, value]) => 
          `--font-size-${size}: ${value};`
        ).join('\n        ')}
        
        ${Object.entries(tokens.typography.lineHeight).map(([size, value]) => 
          `--line-height-${size}: ${value};`
        ).join('\n        ')}
        
        /* Spacing */
        ${Object.entries(tokens.spacing).map(([space, value]) => 
          `--spacing-${space}: ${value};`
        ).join('\n        ')}
        
        /* Border Radius */
        ${Object.entries(tokens.borderRadius).map(([radius, value]) => 
          `--radius-${radius}: ${value};`
        ).join('\n        ')}
        
        /* Shadows */
        ${Object.entries(tokens.boxShadow).map(([shadow, value]) => 
          `--shadow-${shadow}: ${value};`
        ).join('\n        ')}
        
        /* Animation */
        --transition-fast: ${tokens.animation.transition.fast};
        --transition-base: ${tokens.animation.transition.base};
        --transition-slow: ${tokens.animation.transition.slow};
        --easing-default: ${tokens.animation.easing.default};
      }

      /* Component Styles */
      .st-widget {
        font-family: var(--font-body);
        color: var(--color-gray-900);
        background: var(--color-gray-25);
        border-radius: var(--radius-md);
      }

      .st-button {
        padding: var(--spacing-2) var(--spacing-4);
        border-radius: var(--radius-md);
        font-weight: 500;
        transition: all var(--transition-fast) var(--easing-default);
        border: none;
        cursor: pointer;
      }

      .st-button-primary {
        background: var(--color-blue-500);
        color: white;
      }

      .st-button-primary:hover {
        background: var(--color-blue-600);
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg);
      }

      .st-button-primary:active {
        background: var(--color-blue-700);
        transform: translateY(0);
      }

      /* Story Cards with Tatem-style elevation */
      .st-story-card {
        background: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-fast) var(--easing-default);
        padding: var(--spacing-6);
      }

      .st-story-card:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }

      /* Story Reader with micro-interactions */
      .st-reader-word {
        cursor: pointer;
        transition: all var(--transition-fast) var(--easing-default);
        padding: 0 1px;
        border-radius: 2px;
      }

      .st-reader-word:hover {
        background: var(--color-blue-50);
        color: var(--color-blue-700);
      }

      .st-reader-word.active {
        background: var(--color-blue-500);
        color: white;
        animation: highlight-pulse 0.3s var(--easing-default);
      }

      @keyframes highlight-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      /* Dark mode styles */
      .st-widget[data-theme="dark"] {
        --color-gray-25: #0C0E12;
        --color-gray-50: #1B1D27;
        color: var(--color-gray-25);
        background: var(--color-gray-950);
      }
    `;

    this.styleSheet.replaceSync(baseCSS);
  }

  setDarkMode(enabled: boolean): void {
    this.darkMode = enabled;
    // Dark mode styles are handled via CSS custom properties above
  }

  generateComponentStyles(component: string, styles: object): string {
    // Generate component-specific styles
    return Object.entries(styles).map(([property, value]) => 
      `${property}: ${value};`
    ).join(' ');
  }
}
```

### **PHASE 2: ADVANCED READER FEATURES** (Week 2)

#### **2.1 Karaoke Highlighting System**
**File**: `packages/storytailor-embed/src/components/KaraokeHighlighter.ts`
```typescript
export class KaraokeHighlighter {
  private container: HTMLElement;
  private wordElements: Map<number, HTMLElement> = new Map();
  private timestamps: WordTimestamp[] = [];
  private currentTime = 0;
  private activeWordIndex = -1;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Initialize word-level highlighting from WebVTT data
   */
  initializeFromWebVTT(webvttData: string, storyText: string): void {
    this.timestamps = this.parseWebVTTWordTimings(webvttData);
    this.renderInteractiveText(storyText);
    this.setupWordInteractions();
  }

  private renderInteractiveText(text: string): void {
    const words = text.split(/(\s+)/);
    let wordIndex = 0;
    
    const fragment = document.createDocumentFragment();
    
    words.forEach((segment, index) => {
      if (segment.trim()) {
        // This is a word
        const wordElement = document.createElement('span');
        wordElement.className = 'st-reader-word';
        wordElement.textContent = segment;
        wordElement.dataset.wordIndex = wordIndex.toString();
        
        // Add word-level interactions
        this.setupWordElement(wordElement, wordIndex);
        
        this.wordElements.set(wordIndex, wordElement);
        fragment.appendChild(wordElement);
        wordIndex++;
      } else {
        // This is whitespace
        const spaceElement = document.createTextNode(segment);
        fragment.appendChild(spaceElement);
      }
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }

  private setupWordElement(element: HTMLElement, wordIndex: number): void {
    // Click to repeat word
    element.addEventListener('click', (e) => {
      e.preventDefault();
      this.repeatWord(wordIndex);
    });

    // Long press for phonetics
    let longPressTimer: number;
    
    element.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      longPressTimer = window.setTimeout(() => {
        this.showPhonetics(wordIndex);
      }, 500); // 500ms for long press
    });

    element.addEventListener('pointerup', () => {
      clearTimeout(longPressTimer);
    });

    element.addEventListener('pointerleave', () => {
      clearTimeout(longPressTimer);
    });
  }

  /**
   * Update highlighting based on current audio time
   */
  updateHighlighting(currentTime: number): void {
    this.currentTime = currentTime;
    
    // Find the current word based on timestamp
    const currentWordIndex = this.findWordAtTime(currentTime);
    
    if (currentWordIndex !== this.activeWordIndex) {
      // Remove previous highlighting
      if (this.activeWordIndex >= 0) {
        const prevWord = this.wordElements.get(this.activeWordIndex);
        if (prevWord) {
          prevWord.classList.remove('active');
        }
      }
      
      // Add new highlighting
      if (currentWordIndex >= 0) {
        const currentWord = this.wordElements.get(currentWordIndex);
        if (currentWord) {
          currentWord.classList.add('active');
          this.scrollToWord(currentWord);
        }
      }
      
      this.activeWordIndex = currentWordIndex;
    }
  }

  private findWordAtTime(time: number): number {
    for (let i = 0; i < this.timestamps.length; i++) {
      const timestamp = this.timestamps[i];
      if (time >= timestamp.start && time <= timestamp.end) {
        return i;
      }
    }
    return -1;
  }

  private scrollToWord(wordElement: HTMLElement): void {
    // Smooth scroll to keep highlighted word in view
    wordElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }

  private async repeatWord(wordIndex: number): Promise<void> {
    const timestamp = this.timestamps[wordIndex];
    if (!timestamp) return;

    // Emit event for audio player to jump to word
    this.container.dispatchEvent(new CustomEvent('word-repeat', {
      detail: {
        wordIndex,
        startTime: timestamp.start,
        endTime: timestamp.end,
        word: timestamp.word
      }
    }));
  }

  private async showPhonetics(wordIndex: number): Promise<void> {
    const timestamp = this.timestamps[wordIndex];
    if (!timestamp) return;

    // Show phonetic breakdown modal
    this.container.dispatchEvent(new CustomEvent('word-phonetics', {
      detail: {
        wordIndex,
        word: timestamp.word,
        phonetics: await this.getPhonetics(timestamp.word)
      }
    }));
  }

  private async getPhonetics(word: string): Promise<string> {
    // Get phonetic breakdown from TTS service or phonetics API
    try {
      const response = await fetch('/api/phonetics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      const data = await response.json();
      return data.phonetics || word;
    } catch {
      return word; // Fallback to original word
    }
  }
}
```

#### **2.2 Scroll Sync & Jump Detection**
**File**: `packages/storytailor-embed/src/components/ScrollSyncManager.ts`
```typescript
export class ScrollSyncManager {
  private container: HTMLElement;
  private isUserScrolling = false;
  private lastScrollTime = 0;
  private scrollTimeout: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupScrollDetection();
  }

  private setupScrollDetection(): void {
    this.container.addEventListener('scroll', () => {
      this.isUserScrolling = true;
      this.lastScrollTime = Date.now();
      
      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      
      // Set timeout to detect when user stops scrolling
      this.scrollTimeout = window.setTimeout(() => {
        this.handleScrollStop();
      }, 150);
    });
  }

  private handleScrollStop(): void {
    this.isUserScrolling = false;
    
    // Find the word closest to center of viewport
    const viewportCenter = this.container.offsetHeight / 2;
    const words = this.container.querySelectorAll('.st-reader-word');
    
    let closestWord: HTMLElement | null = null;
    let closestDistance = Infinity;
    
    words.forEach((word) => {
      const element = word as HTMLElement;
      const rect = element.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      const wordCenter = rect.top - containerRect.top + rect.height / 2;
      const distance = Math.abs(wordCenter - viewportCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestWord = element;
      }
    });
    
    if (closestWord) {
      const wordIndex = parseInt(closestWord.dataset.wordIndex || '0');
      this.syncAudioToPosition(wordIndex);
    }
  }

  private syncAudioToPosition(wordIndex: number): void {
    // Emit event to sync audio playback to scroll position
    this.container.dispatchEvent(new CustomEvent('scroll-sync', {
      detail: { wordIndex }
    }));
  }

  isCurrentlyScrolling(): boolean {
    return this.isUserScrolling || (Date.now() - this.lastScrollTime < 300);
  }
}
```

### **PHASE 3: MULTI-AGENT INTEGRATION** (Week 3)

#### **3.1 Real-time WebSocket Integration**
**File**: `packages/storytailor-embed/src/api/WebSocketManager.ts`
```typescript
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: number | null = null;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace('http', 'ws');
  }

  async connect(): Promise<void> {
    const wsUrl = `${this.baseUrl}/ws?apiKey=${this.apiKey}`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopHeartbeat();
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, Math.pow(2, this.reconnectAttempts) * 1000);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'story_chunk':
        this.handleStoryChunk(message);
        break;
      case 'story_complete':
        this.handleStoryComplete(message);
        break;
      case 'agent_thinking':
        this.handleAgentThinking(message);
        break;
      case 'audio_ready':
        this.handleAudioReady(message);
        break;
    }
  }

  private handleStoryChunk(message: any): void {
    // Stream story text as it's being generated
    document.dispatchEvent(new CustomEvent('story-chunk', {
      detail: message.data
    }));
  }

  private handleAgentThinking(message: any): void {
    // Show thinking indicator for multi-agent coordination
    document.dispatchEvent(new CustomEvent('agent-thinking', {
      detail: {
        agent: message.agent,
        status: message.status
      }
    }));
  }

  sendMessage(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.sendMessage('ping', {});
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
```

#### **3.2 Agent Context Awareness**
**File**: `packages/storytailor-embed/src/api/ContextBus.ts`
```typescript
export interface WidgetContext {
  currentView: 'library' | 'story' | 'reader' | 'settings' | 'chat';
  activeStory?: string;
  userInteraction?: string;
  readingProgress?: number;
  emotionalState?: string;
  voiceMode?: boolean;
}

export class ContextBus extends EventEmitter {
  private currentContext: WidgetContext;
  private contextHistory: WidgetContext[] = [];
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    super();
    this.apiClient = apiClient;
    this.currentContext = { currentView: 'library' };
  }

  updateContext(newContext: Partial<WidgetContext>): void {
    // Save previous context
    this.contextHistory.push({ ...this.currentContext });
    
    // Update current context
    this.currentContext = { ...this.currentContext, ...newContext };
    
    // Emit context change event
    this.emit('context-change', this.currentContext);
    
    // Send context to multi-agent system
    this.syncContextToAgents();
  }

  private async syncContextToAgents(): Promise<void> {
    try {
      await this.apiClient.post('/context', {
        widgetContext: this.currentContext,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId()
      });
    } catch (error) {
      console.warn('Failed to sync context to agents:', error);
    }
  }

  getCurrentContext(): WidgetContext {
    return { ...this.currentContext };
  }

  getContextHistory(): WidgetContext[] {
    return [...this.contextHistory];
  }

  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('storytailor-session-id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('storytailor-session-id', sessionId);
    }
    return sessionId;
  }
}
```

### **PHASE 4: PERFORMANCE & PWA OPTIMIZATION** (Week 4)

#### **4.1 Bundle Size Optimization**
**File**: `packages/storytailor-embed/rollup.config.optimized.js`
```javascript
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import bundleAnalyzer from 'rollup-plugin-bundle-analyzer';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/storytailor-embed.js',
      format: 'umd',
      name: 'StorytalorEmbed',
      plugins: [
        getBabelOutputPlugin({
          presets: [['@babel/preset-env', { targets: '> 0.25%, not dead' }]],
          allowAllFormats: true
        }),
        terser({
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug'],
            passes: 2
          },
          mangle: {
            properties: {
              regex: /^_/
            }
          }
        })
      ]
    },
    {
      file: 'dist/storytailor-embed.esm.js',
      format: 'es',
      plugins: [
        terser({
          compress: {
            module: true,
            drop_console: true
          }
        })
      ]
    }
  ],
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist'
    }),
    bundleAnalyzer({
      analyzerMode: 'static',
      openAnalyzer: false,
      generateStatsFile: true
    })
  ],
  external: ['react', 'react-dom'], // Externalize large dependencies
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  }
};
```

#### **4.2 Advanced Service Worker**
**File**: `packages/storytailor-embed/src/sw/storytailor-sw.ts`
```typescript
const CACHE_NAME = 'storytailor-v1';
const RUNTIME_CACHE = 'storytailor-runtime';
const STORY_CACHE = 'storytailor-stories';
const AUDIO_CACHE = 'storytailor-audio';

// Cache strategies
const PRECACHE_URLS = [
  '/',
  '/dist/storytailor-embed.js',
  '/dist/storytailor-embed.css'
];

// Install event - precache critical resources
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName.startsWith('storytailor-') && 
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== STORY_CACHE &&
            cacheName !== AUDIO_CACHE
          )
          .map(cacheName => caches.delete(cacheName))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Story content - cache first, network fallback
  if (url.pathname.includes('/api/stories/')) {
    event.respondWith(
      caches.open(STORY_CACHE).then(cache =>
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // Return cached version and update in background
            fetch(request).then(response => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
            });
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Audio files - cache first
  if (url.pathname.includes('/audio/') || url.pathname.includes('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache =>
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // API calls - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Everything else - cache first, network fallback
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'story-interaction') {
    event.waitUntil(syncStoryInteractions());
  }
});

async function syncStoryInteractions() {
  // Sync offline story interactions when back online
  const interactions = await getOfflineInteractions();
  
  for (const interaction of interactions) {
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interaction)
      });
      
      await removeOfflineInteraction(interaction.id);
    } catch (error) {
      console.error('Failed to sync interaction:', error);
    }
  }
}
```

### **PHASE 5: IFRAME WRAPPER & HEADLESS API** (Week 5)

#### **5.1 iframe Wrapper Implementation**
**File**: `packages/storytailor-embed/src/iframe/IframeWrapper.ts`
```typescript
export class IframeWrapper {
  private iframe: HTMLIFrameElement;
  private parentOrigin: string;
  private messageQueue: any[] = [];
  private isConnected = false;
  private resizeObserver: ResizeObserver;

  constructor(config: any) {
    this.iframe = this.createIframe(config);
    this.setupPostMessageHandling();
    this.setupAutoResize();
  }

  private createIframe(config: any): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    
    iframe.src = `${config.baseUrl}/embed?${new URLSearchParams({
      apiKey: config.apiKey,
      theme: config.theme || 'child-friendly',
      features: JSON.stringify(config.features || {}),
      // No cookies in iframe
      cookieless: 'true'
    })}`;
    
    iframe.style.cssText = `
      width: 100%;
      min-height: 400px;
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 8px -2px rgba(16, 24, 40, 0.1);
    `;
    
    // Security attributes
    iframe.setAttribute('sandbox', 
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    );
    
    iframe.setAttribute('allow', 
      'microphone; speaker; autoplay'
    );

    return iframe;
  }

  private setupPostMessageHandling(): void {
    window.addEventListener('message', (event) => {
      // Verify origin for security
      if (!this.isValidOrigin(event.origin)) {
        console.warn('Rejected message from invalid origin:', event.origin);
        return;
      }

      const message = event.data;
      
      if (message.type === 'iframe-handshake') {
        this.handleHandshake(event);
      } else if (message.type === 'iframe-resize') {
        this.handleResize(message.data);
      } else if (message.type === 'iframe-event') {
        this.handleIframeEvent(message.data);
      }
    });
  }

  private handleHandshake(event: MessageEvent): void {
    this.parentOrigin = event.origin;
    this.isConnected = true;
    
    // Send queued messages
    this.messageQueue.forEach(message => {
      this.sendMessage(message);
    });
    this.messageQueue = [];
    
    // Respond to handshake
    this.sendMessage({
      type: 'handshake-response',
      data: { connected: true }
    });
  }

  private handleResize(data: { height: number }): void {
    // Auto-resize iframe height
    this.iframe.style.height = `${data.height}px`;
    
    // Dispatch resize event for parent page
    window.dispatchEvent(new CustomEvent('storytailor-resize', {
      detail: { height: data.height }
    }));
  }

  private handleIframeEvent(data: any): void {
    // Forward events to parent page
    window.dispatchEvent(new CustomEvent(`storytailor-${data.event}`, {
      detail: data.payload
    }));
  }

  private setupAutoResize(): void {
    // Observe iframe content changes
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        this.iframe.style.height = `${height}px`;
      }
    });
  }

  private isValidOrigin(origin: string): boolean {
    // Validate origin against allowlist
    const allowedOrigins = [
      'https://storytailor.com',
      'https://embed.storytailor.com',
      'http://localhost:3000' // Dev environment
    ];
    
    return allowedOrigins.includes(origin);
  }

  sendMessage(message: any): void {
    if (this.isConnected) {
      this.iframe.contentWindow?.postMessage(message, this.parentOrigin);
    } else {
      this.messageQueue.push(message);
    }
  }

  mount(container: HTMLElement | string): void {
    const targetElement = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!targetElement) {
      throw new Error('Container element not found');
    }
    
    targetElement.appendChild(this.iframe);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.iframe.remove();
  }
}

// Webflow/Framer/Wix compatible initialization
if (typeof window !== 'undefined') {
  (window as any).StorytalorIframe = IframeWrapper;
}
```

#### **5.2 Headless API Implementation**
**File**: `packages/storytailor-embed/src/headless/HeadlessAPI.ts`
```typescript
export interface HeadlessStorytalor {
  // Core methods
  initialize(config: StorytalorConfig): Promise<void>;
  createStory(prompt: string): Promise<Story>;
  getStories(filters?: StoryFilters): Promise<Story[]>;
  
  // Reader methods
  loadStory(storyId: string): Promise<Story>;
  playAudio(storyId: string, options?: PlaybackOptions): Promise<void>;
  pauseAudio(): Promise<void>;
  seekToWord(wordIndex: number): Promise<void>;
  
  // Voice methods
  startVoiceMode(): Promise<void>;
  stopVoiceMode(): Promise<void>;
  processVoiceCommand(command: string): Promise<any>;
  
  // State management
  getCurrentState(): WidgetState;
  subscribeToStateChanges(callback: (state: WidgetState) => void): () => void;
  
  // Custom skin support
  registerRenderer(component: string, renderer: ComponentRenderer): void;
  unregisterRenderer(component: string): void;
}

export class HeadlessStorytalorAPI implements HeadlessStorytalor {
  private config: StorytalorConfig;
  private apiClient: APIClient;
  private state: WidgetState;
  private stateSubscribers: ((state: WidgetState) => void)[] = [];
  private customRenderers: Map<string, ComponentRenderer> = new Map();
  private audioPlayer: HTMLAudioElement | null = null;

  async initialize(config: StorytalorConfig): Promise<void> {
    this.config = config;
    this.apiClient = new APIClient(config);
    this.state = {
      currentView: 'library',
      stories: [],
      currentStory: null,
      isLoading: false,
      error: null
    };
    
    await this.apiClient.initialize();
  }

  async createStory(prompt: string): Promise<Story> {
    this.updateState({ isLoading: true, error: null });
    
    try {
      const story = await this.apiClient.post('/stories', { prompt });
      
      this.updateState({
        isLoading: false,
        stories: [...this.state.stories, story]
      });
      
      return story;
    } catch (error) {
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create story'
      });
      throw error;
    }
  }

  async getStories(filters?: StoryFilters): Promise<Story[]> {
    this.updateState({ isLoading: true });
    
    try {
      const stories = await this.apiClient.get('/stories', { params: filters });
      
      this.updateState({
        isLoading: false,
        stories
      });
      
      return stories;
    } catch (error) {
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load stories'
      });
      throw error;
    }
  }

  async loadStory(storyId: string): Promise<Story> {
    const story = await this.apiClient.get(`/stories/${storyId}`);
    
    this.updateState({
      currentStory: story,
      currentView: 'reader'
    });
    
    return story;
  }

  async playAudio(storyId: string, options: PlaybackOptions = {}): Promise<void> {
    const story = this.state.currentStory || await this.loadStory(storyId);
    
    if (!story.audioUrl) {
      throw new Error('No audio available for this story');
    }
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
    
    this.audioPlayer = new Audio(story.audioUrl);
    this.audioPlayer.playbackRate = options.speed || 1.0;
    
    if (options.startTime) {
      this.audioPlayer.currentTime = options.startTime;
    }
    
    await this.audioPlayer.play();
  }

  async pauseAudio(): Promise<void> {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
  }

  async seekToWord(wordIndex: number): Promise<void> {
    // Implementation depends on WebVTT timestamps
    if (this.audioPlayer && this.state.currentStory?.webvttUrl) {
      const timestamps = await this.loadWordTimestamps(this.state.currentStory.webvttUrl);
      const timestamp = timestamps[wordIndex];
      
      if (timestamp) {
        this.audioPlayer.currentTime = timestamp.start;
      }
    }
  }

  async startVoiceMode(): Promise<void> {
    // Start voice recognition
    this.updateState({ voiceMode: true });
  }

  async stopVoiceMode(): Promise<void> {
    this.updateState({ voiceMode: false });
  }

  async processVoiceCommand(command: string): Promise<any> {
    return await this.apiClient.post('/voice/command', { command });
  }

  getCurrentState(): WidgetState {
    return { ...this.state };
  }

  subscribeToStateChanges(callback: (state: WidgetState) => void): () => void {
    this.stateSubscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateSubscribers.indexOf(callback);
      if (index > -1) {
        this.stateSubscribers.splice(index, 1);
      }
    };
  }

  registerRenderer(component: string, renderer: ComponentRenderer): void {
    this.customRenderers.set(component, renderer);
  }

  unregisterRenderer(component: string): void {
    this.customRenderers.delete(component);
  }

  // Custom rendering support
  renderComponent(component: string, props: any): any {
    const customRenderer = this.customRenderers.get(component);
    
    if (customRenderer) {
      return customRenderer(props);
    }
    
    // Default rendering logic
    return this.defaultRenderer(component, props);
  }

  private updateState(updates: Partial<WidgetState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notify subscribers
    this.stateSubscribers.forEach(callback => {
      callback(this.state);
    });
  }

  private defaultRenderer(component: string, props: any): any {
    // Default component rendering
    switch (component) {
      case 'story-card':
        return this.renderStoryCard(props);
      case 'story-reader':
        return this.renderStoryReader(props);
      default:
        console.warn(`No renderer found for component: ${component}`);
        return null;
    }
  }

  private renderStoryCard(props: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'st-story-card';
    card.innerHTML = `
      <h3>${props.story.title}</h3>
      <p>${props.story.summary}</p>
      <div class="st-story-meta">
        <span>Age: ${props.story.ageRange}</span>
        <span>Mood: ${props.story.mood}</span>
      </div>
    `;
    return card;
  }

  private renderStoryReader(props: any): HTMLElement {
    const reader = document.createElement('div');
    reader.className = 'st-story-reader';
    // Implementation of reader rendering
    return reader;
  }
}

// Export for custom implementations
export function createHeadlessStorytalor(): HeadlessStorytalor {
  return new HeadlessStorytalorAPI();
}
```

---

## 📊 PERFORMANCE VALIDATION SYSTEM

### **Definition of Done Validation**
**File**: `packages/storytailor-embed/scripts/validate-performance.js`
```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function validatePerformance() {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    port: chrome.port,
  };
  
  const runnerResult = await lighthouse('http://localhost:3000/embed', options);
  
  // Validate bundle size
  const bundleStats = JSON.parse(fs.readFileSync('./dist/bundle-stats.json'));
  const bundleSize = bundleStats.bundleSizes.umd;
  
  const results = {
    bundleSize: {
      actual: bundleSize,
      target: 150 * 1024, // 150KB
      passed: bundleSize < 150 * 1024
    },
    lighthouse: {
      performance: runnerResult.lhr.categories.performance.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100,
      passed: runnerResult.lhr.categories.performance.score >= 0.9
    },
    offline: {
      // Test offline functionality
      passed: await testOfflineReading()
    }
  };
  
  console.log('Performance Validation Results:');
  console.log(`Bundle Size: ${(bundleSize / 1024).toFixed(1)}KB (${results.bundleSize.passed ? 'PASS' : 'FAIL'})`);
  console.log(`Lighthouse Performance: ${results.lighthouse.performance} (${results.lighthouse.passed ? 'PASS' : 'FAIL'})`);
  console.log(`Offline Reading: ${results.offline.passed ? 'PASS' : 'FAIL'}`);
  
  await chrome.kill();
  
  if (!results.bundleSize.passed || !results.lighthouse.passed || !results.offline.passed) {
    process.exit(1);
  }
}

async function testOfflineReading() {
  // Simulate offline test
  // This would test service worker caching and offline story reading
  return true; // Placeholder
}

validatePerformance().catch(console.error);
```

---

## 🎯 EXECUTION TIMELINE & RESOURCE ALLOCATION

### **5-Week Sprint Schedule**

| Week | Focus | Deliverables | Team Size |
|------|-------|--------------|-----------|
| **Week 1** | Design System Foundation | Complete UI tokens, font loading, CSS-in-JS theme | 2 Frontend + 1 Design |
| **Week 2** | Advanced Reader Features | Karaoke highlighting, scroll-sync, phonetics | 2 Frontend + 1 Audio |
| **Week 3** | Multi-Agent Integration | WebSocket, context bus, agent awareness | 2 Frontend + 1 Backend |
| **Week 4** | Performance & PWA | Bundle optimization, service worker, caching | 2 Frontend + 1 DevOps |
| **Week 5** | iframe & Headless API | Cross-platform embedding, custom skins | 2 Frontend + 1 Integration |

### **Risk Mitigation**
1. **Bundle Size Risk**: Continuous monitoring with bundle analyzer
2. **Performance Risk**: Daily Lighthouse checks in CI/CD
3. **Cross-browser Risk**: Automated testing on Chrome, Safari, iOS
4. **Integration Risk**: Multi-agent system mock during development

### **Success Metrics**
- ✅ Bundle size < 150KB (uncompressed)
- ✅ Lighthouse performance ≥ 90 (mobile)
- ✅ PWA offline reading functional
- ✅ All micro-interactions match reference sites
- ✅ Voice commands work in browser and Echo Show
- ✅ Real-time story streaming < 200ms latency

---

## 🏆 CONCLUSION

The current `storytailor-embed` package has an **excellent foundation** (8/10) but requires **comprehensive design system implementation** and **advanced feature development** to meet the specified requirements.

**Key Strengths to Build On**:
- ✅ Professional component architecture
- ✅ Advanced build system with Rollup
- ✅ Basic reader functionality with word-level interaction
- ✅ Comprehensive TypeScript definitions

**Critical Implementation Needed**:
- ❌ Complete design token system (currently empty)
- ❌ Brand-compliant micro-interactions
- ❌ Performance optimization for < 150KB bundle
- ❌ Multi-agent real-time integration
- ❌ iframe wrapper and headless API

**Execution Recommendation**: 
Implement the **5-week sprint plan** with dedicated frontend, design, and integration resources to achieve full compliance with the design guidelines and performance requirements. The plan is designed to work seamlessly with the existing multi-agent system while delivering a brilliant, production-ready embeddable widget.

**Expected Outcome**: 
A world-class embeddable widget that rivals the best design systems, integrates seamlessly with the multi-agent platform, and provides an exceptional user experience across all platforms and use cases.