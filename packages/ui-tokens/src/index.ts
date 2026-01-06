/**
 * @storytailor/ui-tokens
 * Design tokens and theme system for Storytailor platform consistency
 * Powered by Story Intelligence™
 */

import designTokens from '../tokens/design-tokens.json';

// Brand Colors
export const brand = {
  storytailor: {
    primary: '#6366F1',
    secondary: '#EC4899', 
    accent: '#F59E0B'
  },
  storyIntelligence: {
    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
      subtle: 'linear-gradient(135deg, #EEF2FF 0%, #FDF2F8 100%)'
    }
  }
} as const;

// Color Palette
export const colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5', 
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  },
  semantic: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  }
} as const;

// Typography Scale
export const typography = {
  fontFamily: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: 'Poppins, Inter, sans-serif',
    mono: 'JetBrains Mono, Consolas, "Liberation Mono", Menlo, monospace'
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px  
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem'  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500', 
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
} as const;

// Spacing Scale
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem'        // 96px
} as const;

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  default: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px'
} as const;

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
} as const;

// Animation Durations
export const duration = {
  fast: '150ms',
  normal: '300ms', 
  slow: '500ms'
} as const;

// Easing Functions
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out'
} as const;

// Z-Index Scale
export const zIndex = {
  auto: 'auto',
  base: '0',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  overlay: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
  max: '9999'
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Story Intelligence™ Specific Tokens
export const storyIntelligence = {
  branding: {
    poweredBy: 'Powered by Story Intelligence™',
    trademark: 'Story Intelligence™',
    tagline: 'Revolutionary technology for award-caliber personal storytelling'
  },
  messaging: {
    differentiation: 'Not AI-powered - powered by Story Intelligence™',
    category: 'Creates new category alongside books and traditional publishing',
    focus: 'Story creation + off-screen activities',
    privacy: 'Personal and private - not for commercialization'
  }
} as const;

// Raw design tokens (for build tools)
export const rawTokens = designTokens;

// Default export with all tokens
export default {
  brand,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  duration,
  easing,
  zIndex,
  breakpoints,
  storyIntelligence,
  rawTokens
} as const;

// Type definitions
export type BrandColors = typeof brand;
export type ColorPalette = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Duration = typeof duration;
export type Easing = typeof easing;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type StoryIntelligence = typeof storyIntelligence;
 
 
 