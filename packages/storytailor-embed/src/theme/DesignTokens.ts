/**
 * Design Tokens for Storytailor Embed
 * Based on the brand design system specification
 */

export interface ColorPalette {
  // Neutrals (Gray - Light Mode)
  gray25: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
  gray950: string;
}

export interface BrandColors {
  // Brand Blue
  blue25: string;
  blue50: string;
  blue100: string;
  blue200: string;
  blue300: string;
  blue400: string;
  blue500: string;
  blue600: string;
  blue700: string;
  blue800: string;
  blue900: string;
  blue950: string;
}

export interface SemanticColors {
  // Error
  error25: string;
  error50: string;
  error100: string;
  error200: string;
  error300: string;
  error400: string;
  error500: string;
  error600: string;
  error700: string;
  error800: string;
  error900: string;
  error950: string;
  
  // Warning
  warning25: string;
  warning50: string;
  warning100: string;
  warning200: string;
  warning300: string;
  warning400: string;
  warning500: string;
  warning600: string;
  warning700: string;
  warning800: string;
  warning900: string;
  warning950: string;
  
  // Success
  success25: string;
  success50: string;
  success100: string;
  success200: string;
  success300: string;
  success400: string;
  success500: string;
  success600: string;
  success700: string;
  success800: string;
  success900: string;
  success950: string;
}

export interface Typography {
  // Font Families
  fontDisplay: string;
  fontBody: string;
  
  // Display Sizes
  displayXl: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  displayLg: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  displayMd: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  displaySm: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  displayXs: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  
  // Text Sizes
  textXl: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  textLg: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  textMd: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  textSm: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  textXs: {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    fontWeight: {
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
}

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export interface Shadows {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

export interface Motion {
  // Easing curves
  easeOut: string;
  easeIn: string;
  easeInOut: string;
  mercuryOS: string; // cubic-bezier(.16, .84, .44, 1)
  
  // Durations
  fast: string;
  normal: string;
  slow: string;
}

export const designTokens = {
  // Color Palettes
  colors: {
    // Neutrals (Light Mode)
    gray: {
      25: '#FDFDFD',
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E8EAEB',
      300: '#D5D7DA',
      400: '#A4AAAE',
      500: '#778680',
      600: '#535B62',
      700: '#414651',
      800: '#252B37',
      900: '#1B1D27',
      950: '#0A0D12'
    } as ColorPalette,
    
    // Brand Blue
    blue: {
      25: '#F5F9FF',
      50: '#E4F4FF',
      100: '#D0E1FF',
      200: '#B2CCFF',
      300: '#A8D4FF',
      400: '#258BFF',
      500: '#2970FF',
      600: '#1E5EEF',
      700: '#004EEB',
      800: '#0040C1',
      900: '#0039EE',
      950: '#002266'
    } as BrandColors,
    
    // Semantic Colors
    error: {
      25: '#FFF8FA',
      50: '#FFE3F2',
      100: '#FEE4E2',
      200: '#FDECCA',
      300: '#FDA29B',
      400: '#F97066',
      500: '#FF4438',
      600: '#D92D20',
      700: '#B42318',
      800: '#912018',
      900: '#721817',
      950: '#55100C'
    },
    
    warning: {
      25: '#FFFCF5',
      50: '#FFF7E5',
      100: '#FEF0C7',
      200: '#FDE4B9',
      300: '#FEC84B',
      400: '#FDB022',
      500: '#FF9009',
      600: '#DC6803',
      700: '#B54708',
      800: '#93370D',
      900: '#7A2E0E',
      950: '#4E0D09'
    },
    
    success: {
      25: '#F6FEF9',
      50: '#ECFDF3',
      100: '#D1FADF',
      200: '#ABEFC6',
      300: '#75E0A7',
      400: '#3CCB7F',
      500: '#17B26A',
      600: '#079455',
      700: '#067647',
      800: '#085D3A',
      900: '#074D31',
      950: '#053321'
    }
  },
  
  // Typography
  typography: {
    fontDisplay: '"Inter Display", system-ui, -apple-system, sans-serif',
    fontBody: '"Inter", system-ui, -apple-system, sans-serif',
    
    // Display sizes
    displayXl: {
      fontSize: '60px',
      lineHeight: '72px',
      letterSpacing: '-2%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    displayLg: {
      fontSize: '48px',
      lineHeight: '60px',
      letterSpacing: '-2%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    displayMd: {
      fontSize: '32px',
      lineHeight: '44px',
      letterSpacing: '-2%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    displaySm: {
      fontSize: '30px',
      lineHeight: '38px',
      letterSpacing: '-2%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    displayXs: {
      fontSize: '24px',
      lineHeight: '32px',
      letterSpacing: '-2%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    
    // Text sizes
    textXl: {
      fontSize: '20px',
      lineHeight: '28px',
      letterSpacing: '-1%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    textLg: {
      fontSize: '18px',
      lineHeight: '26px',
      letterSpacing: '-1%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    textMd: {
      fontSize: '16px',
      lineHeight: '24px',
      letterSpacing: '0%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    textSm: {
      fontSize: '14px',
      lineHeight: '20px',
      letterSpacing: '0%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    textXs: {
      fontSize: '12px',
      lineHeight: '18px',
      letterSpacing: '0%',
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    }
  } as Typography,
  
  // Spacing
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '2.5rem',  // 40px
    '3xl': '3rem',    // 48px
    '4xl': '4rem',    // 64px
    '5xl': '5rem',    // 80px
    '6xl': '6rem'     // 96px
  } as Spacing,
  
  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px'
  } as BorderRadius,
  
  // Shadows (Tatem-inspired)
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  } as Shadows,
  
  // Motion (Mercury OS-inspired)
  motion: {
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    mercuryOS: 'cubic-bezier(0.16, 0.84, 0.44, 1)',
    
    fast: '150ms',
    normal: '300ms',
    slow: '500ms'
  } as Motion
};

// Theme-specific token overrides
export const themeTokens = {
  'child-friendly': {
    colors: {
      primary: designTokens.colors.blue[500],
      accent: designTokens.colors.error[500],
      background: designTokens.colors.gray[25],
      surface: designTokens.colors.gray[50],
      text: designTokens.colors.gray[900]
    },
    typography: {
      fontFamily: '"Comic Sans MS", cursive, system-ui',
      fontDisplay: '"Comic Sans MS", cursive, system-ui'
    },
    borderRadius: {
      default: designTokens.borderRadius['2xl'],
      button: designTokens.borderRadius.full
    }
  },
  
  'magical': {
    colors: {
      primary: '#667eea',
      accent: '#764ba2',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      surface: 'rgba(255, 255, 255, 0.9)',
      text: designTokens.colors.gray[900]
    },
    effects: {
      sparkles: true,
      gradients: true,
      animations: true
    }
  },
  
  'educational': {
    colors: {
      primary: designTokens.colors.blue[600],
      accent: designTokens.colors.success[500],
      background: designTokens.colors.gray[25],
      surface: designTokens.colors.gray[50],
      text: designTokens.colors.gray[800]
    },
    typography: {
      fontFamily: designTokens.typography.fontBody,
      fontDisplay: designTokens.typography.fontDisplay
    },
    spacing: {
      generous: true // More whitespace
    }
  }
};

export type ThemeName = keyof typeof themeTokens;

// Export the main design tokens object
export const DesignTokens = designTokens;