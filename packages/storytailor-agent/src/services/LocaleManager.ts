import { SupportedLocale, LocaleConfig, CulturalContext } from '../types/alexa';
import { createLogger } from '../utils/logger';

export class LocaleManager {
  private logger = createLogger('locale-manager');
  private localeConfigs: Map<SupportedLocale, LocaleConfig>;
  private defaultLocale: SupportedLocale = 'en-US';

  constructor() {
    this.localeConfigs = new Map();
    this.initializeLocaleConfigs();
  }

  /**
   * Initializes supported locale configurations
   */
  private initializeLocaleConfigs(): void {
    const configs: LocaleConfig[] = [
      {
        locale: 'en-US',
        fallbackLocale: 'en-US',
        voiceId: 'en-US-AriaNeural',
        culturalContext: {
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currency: 'USD',
          measurementSystem: 'imperial',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'en-GB',
        fallbackLocale: 'en-US',
        voiceId: 'en-GB-SoniaNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'GBP',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'en-CA',
        fallbackLocale: 'en-US',
        voiceId: 'en-CA-ClaraNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          currency: 'CAD',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'en-AU',
        fallbackLocale: 'en-US',
        voiceId: 'en-AU-NatashaNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          currency: 'AUD',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'es-US',
        fallbackLocale: 'en-US',
        voiceId: 'es-US-PalomaNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          currency: 'USD',
          measurementSystem: 'imperial',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'es-ES',
        fallbackLocale: 'es-US',
        voiceId: 'es-ES-ElviraNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'EUR',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'fr-FR',
        fallbackLocale: 'en-US',
        voiceId: 'fr-FR-DeniseNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'EUR',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'de-DE',
        fallbackLocale: 'en-US',
        voiceId: 'de-DE-KatjaNeural',
        culturalContext: {
          dateFormat: 'DD.MM.YYYY',
          timeFormat: '24h',
          currency: 'EUR',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'it-IT',
        fallbackLocale: 'en-US',
        voiceId: 'it-IT-ElsaNeural',
        culturalContext: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'EUR',
          measurementSystem: 'metric',
          storytellingStyle: 'western'
        }
      },
      {
        locale: 'ja-JP',
        fallbackLocale: 'en-US',
        voiceId: 'ja-JP-NanamiNeural',
        culturalContext: {
          dateFormat: 'YYYY/MM/DD',
          timeFormat: '24h',
          currency: 'JPY',
          measurementSystem: 'metric',
          storytellingStyle: 'eastern'
        }
      }
    ];

    configs.forEach(config => {
      this.localeConfigs.set(config.locale, config);
    });

    this.logger.info('Initialized locale configurations', {
      supportedLocales: Array.from(this.localeConfigs.keys()),
      defaultLocale: this.defaultLocale
    });
  }

  /**
   * Checks if a locale is supported
   */
  isSupported(locale: SupportedLocale): boolean {
    return this.localeConfigs.has(locale);
  }

  /**
   * Gets locale configuration with fallback handling
   */
  getLocaleConfig(locale: SupportedLocale): LocaleConfig {
    const config = this.localeConfigs.get(locale);
    
    if (config) {
      return config;
    }

    // Try fallback locale
    const fallbackConfig = this.localeConfigs.get(this.defaultLocale);
    if (fallbackConfig) {
      this.logger.warn('Using fallback locale configuration', {
        requestedLocale: locale,
        fallbackLocale: this.defaultLocale
      });
      return fallbackConfig;
    }

    // This should never happen if default locale is properly configured
    throw new Error(`No configuration found for locale ${locale} or fallback ${this.defaultLocale}`);
  }

  /**
   * Gets appropriate voice ID for locale
   */
  getVoiceId(locale: SupportedLocale): string {
    const config = this.getLocaleConfig(locale);
    return config.voiceId;
  }

  /**
   * Gets cultural context for locale
   */
  getCulturalContext(locale: SupportedLocale): CulturalContext {
    const config = this.getLocaleConfig(locale);
    return config.culturalContext;
  }

  /**
   * Formats date according to locale preferences
   */
  formatDate(date: Date, locale: SupportedLocale): string {
    const context = this.getCulturalContext(locale);
    
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (error) {
      this.logger.warn('Failed to format date with Intl, using fallback', {
        locale,
        error: error.message
      });
      
      // Fallback formatting
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      switch (context.dateFormat) {
        case 'DD/MM/YYYY':
        case 'DD.MM.YYYY':
          return context.dateFormat.replace('DD', day).replace('MM', month).replace('YYYY', year.toString());
        case 'YYYY/MM/DD':
          return `${year}/${month}/${day}`;
        default:
          return `${month}/${day}/${year}`;
      }
    }
  }

  /**
   * Formats time according to locale preferences
   */
  formatTime(date: Date, locale: SupportedLocale): string {
    const context = this.getCulturalContext(locale);
    
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: context.timeFormat === '12h'
      }).format(date);
    } catch (error) {
      this.logger.warn('Failed to format time with Intl, using fallback', {
        locale,
        error: error.message
      });
      
      // Fallback formatting
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      if (context.timeFormat === '12h') {
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${displayHours}:${minutes} ${ampm}`;
      } else {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
  }

  /**
   * Gets localized storytelling prompts and responses
   */
  getLocalizedPrompts(locale: SupportedLocale): Record<string, string> {
    // This would typically load from localization files
    // For now, returning basic prompts for supported locales
    
    const prompts: Record<SupportedLocale, Record<string, string>> = {
      'en-US': {
        greeting: "Hi there! I'm excited to create an amazing story with you!",
        characterName: "What would you like to name your character?",
        characterSpecies: "Is your character a human, animal, robot, or something magical?",
        storyBegin: "Great! Let's start your story.",
        storyComplete: "Your wonderful story is complete!",
        error: "I'm having trouble right now, but let's keep going with your story."
      },
      'en-GB': {
        greeting: "Hello! I'm delighted to create a brilliant story with you!",
        characterName: "What would you like to call your character?",
        characterSpecies: "Is your character a person, animal, robot, or perhaps something magical?",
        storyBegin: "Brilliant! Let's begin your story.",
        storyComplete: "Your marvellous story is finished!",
        error: "I'm having a spot of trouble, but let's carry on with your story."
      },
      'es-US': {
        greeting: "¡Hola! ¡Estoy emocionado de crear una historia increíble contigo!",
        characterName: "¿Cómo te gustaría llamar a tu personaje?",
        characterSpecies: "¿Tu personaje es humano, animal, robot, o algo mágico?",
        storyBegin: "¡Genial! Comencemos tu historia.",
        storyComplete: "¡Tu historia maravillosa está completa!",
        error: "Tengo problemas ahora, pero sigamos con tu historia."
      },
      'fr-FR': {
        greeting: "Bonjour ! Je suis ravi de créer une histoire formidable avec toi !",
        characterName: "Comment aimerais-tu appeler ton personnage ?",
        characterSpecies: "Ton personnage est-il humain, animal, robot, ou quelque chose de magique ?",
        storyBegin: "Génial ! Commençons ton histoire.",
        storyComplete: "Ton histoire merveilleuse est terminée !",
        error: "J'ai des difficultés maintenant, mais continuons avec ton histoire."
      },
      'de-DE': {
        greeting: "Hallo! Ich freue mich darauf, eine tolle Geschichte mit dir zu erschaffen!",
        characterName: "Wie möchtest du deinen Charakter nennen?",
        characterSpecies: "Ist dein Charakter ein Mensch, Tier, Roboter oder etwas Magisches?",
        storyBegin: "Großartig! Lass uns deine Geschichte beginnen.",
        storyComplete: "Deine wunderbare Geschichte ist fertig!",
        error: "Ich habe gerade Probleme, aber lass uns mit deiner Geschichte weitermachen."
      },
      'it-IT': {
        greeting: "Ciao! Sono entusiasta di creare una storia fantastica con te!",
        characterName: "Come vorresti chiamare il tuo personaggio?",
        characterSpecies: "Il tuo personaggio è umano, animale, robot, o qualcosa di magico?",
        storyBegin: "Fantastico! Iniziamo la tua storia.",
        storyComplete: "La tua storia meravigliosa è completa!",
        error: "Sto avendo problemi ora, ma continuiamo con la tua storia."
      },
      'ja-JP': {
        greeting: "こんにちは！あなたと一緒に素晴らしい物語を作ることにワクワクしています！",
        characterName: "キャラクターにどんな名前をつけたいですか？",
        characterSpecies: "あなたのキャラクターは人間、動物、ロボット、それとも魔法の存在ですか？",
        storyBegin: "素晴らしい！あなたの物語を始めましょう。",
        storyComplete: "あなたの素晴らしい物語が完成しました！",
        error: "今問題が発生していますが、あなたの物語を続けましょう。"
      }
    };

    return prompts[locale] || prompts[this.defaultLocale];
  }

  /**
   * Detects locale from user input or device settings
   */
  detectLocale(input: string, deviceLocale?: string): SupportedLocale {
    // Try device locale first
    if (deviceLocale && this.isSupported(deviceLocale as SupportedLocale)) {
      return deviceLocale as SupportedLocale;
    }

    // Basic language detection from input (this would be more sophisticated in production)
    const languagePatterns: Record<string, RegExp[]> = {
      'es-US': [/\b(hola|gracias|por favor|historia|cuento)\b/i],
      'fr-FR': [/\b(bonjour|merci|s'il vous plaît|histoire|conte)\b/i],
      'de-DE': [/\b(hallo|danke|bitte|geschichte|märchen)\b/i],
      'it-IT': [/\b(ciao|grazie|per favore|storia|racconto)\b/i],
      'ja-JP': [/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/]
    };

    for (const [locale, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(input))) {
        return locale as SupportedLocale;
      }
    }

    return this.defaultLocale;
  }

  /**
   * Gets all supported locales
   */
  getSupportedLocales(): SupportedLocale[] {
    return Array.from(this.localeConfigs.keys());
  }

  /**
   * Gets fallback locale for a given locale
   */
  getFallbackLocale(locale: SupportedLocale): SupportedLocale {
    const config = this.localeConfigs.get(locale);
    return config?.fallbackLocale || this.defaultLocale;
  }

  /**
   * Validates locale configuration
   */
  validateLocaleConfig(locale: SupportedLocale): boolean {
    const config = this.localeConfigs.get(locale);
    
    if (!config) {
      return false;
    }

    const hasRequiredFields = !!(
      config.locale &&
      config.fallbackLocale &&
      config.voiceId &&
      config.culturalContext
    );

    const hasValidCulturalContext = !!(
      config.culturalContext.dateFormat &&
      config.culturalContext.timeFormat &&
      config.culturalContext.currency &&
      config.culturalContext.measurementSystem &&
      config.culturalContext.storytellingStyle
    );

    return hasRequiredFields && hasValidCulturalContext;
  }
}