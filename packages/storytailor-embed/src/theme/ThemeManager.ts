/**
 * Theme Manager
 * Handles theme application and dark mode toggling
 */

export interface BrandingConfig {
  logo?: string;
  name?: string;
  colors?: {
    primary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
}

export class ThemeManager {
  private container: HTMLElement;
  private isDarkMode = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.detectSystemTheme();
  }

  applyTheme(theme: string, branding?: BrandingConfig): void {
    // Remove existing theme classes
    this.container.classList.remove('st-theme-child-friendly', 'st-theme-educational', 'st-theme-magical', 'st-theme-custom');
    
    // Apply new theme
    this.container.classList.add(`st-theme-${theme}`);
    
    // Apply custom branding colors
    if (branding?.colors) {
      const root = this.container;
      if (branding.colors.primary) {
        root.style.setProperty('--st-color-primary', branding.colors.primary);
      }
      if (branding.colors.accent) {
        root.style.setProperty('--st-color-accent', branding.colors.accent);
      }
      if (branding.colors.background) {
        root.style.setProperty('--st-color-background', branding.colors.background);
      }
      if (branding.colors.text) {
        root.style.setProperty('--st-color-text', branding.colors.text);
      }
    }
  }

  toggleDarkMode(): boolean {
    this.isDarkMode = !this.isDarkMode;
    this.container.classList.toggle('st-dark-mode', this.isDarkMode);
    return this.isDarkMode;
  }

  private detectSystemTheme(): void {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.isDarkMode = true;
      this.container.classList.add('st-dark-mode');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode = e.matches;
      this.container.classList.toggle('st-dark-mode', this.isDarkMode);
    });
  }
}