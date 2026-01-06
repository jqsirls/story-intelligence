# @storytailor/ui-tokens

Design tokens and theme system for Storytailor platform consistency.

## Overview

This package provides a comprehensive design system for the Storytailor platform, ensuring visual consistency across all user interfaces. Powered by Story Intelligence™, these tokens support both light and dark themes, responsive design, and brand-compliant styling.

## Installation

```bash
npm install @storytailor/ui-tokens
```

## Usage

### TypeScript/JavaScript

```typescript
import tokens, { brand, colors, typography, spacing } from '@storytailor/ui-tokens';

// Brand colors
const primaryColor = brand.storytailor.primary; // '#6366F1'
const gradient = brand.storyIntelligence.gradient.primary;

// Color palette
const textColor = colors.neutral[900];
const successColor = colors.semantic.success;

// Typography
const headingFont = typography.fontFamily.heading;
const baseSize = typography.fontSize.base;

// Spacing
const padding = spacing[4]; // '1rem'
```

### CSS/SCSS

```css
/* Import generated CSS variables */
@import '@storytailor/ui-tokens/dist/tokens.css';

.button {
  background-color: var(--color-brand-primary);
  color: var(--color-neutral-50);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-primary);
}
```

### React/CSS-in-JS

```jsx
import { brand, spacing, typography } from '@storytailor/ui-tokens';

const Button = styled.button`
  background: ${brand.storytailor.primary};
  padding: ${spacing[3]} ${spacing[6]};
  font-family: ${typography.fontFamily.primary};
`;
```

## Token Categories

### Brand Colors
- **Primary**: Trustworthy indigo `#6366F1`
- **Secondary**: Creative pink `#EC4899`
- **Accent**: Energetic amber `#F59E0B`

### Story Intelligence™ Branding
- **Gradient**: Primary brand gradient
- **Messaging**: Consistent brand language
- **Trademark**: Proper Story Intelligence™ usage

### Color Palette
- **Neutral**: 10-step grayscale (50-900)
- **Semantic**: Success, error, warning, info

### Typography
- **Primary**: Inter font family
- **Heading**: Poppins for headers
- **Mono**: JetBrains Mono for code
- **Scale**: 8 sizes from xs (12px) to 4xl (36px)

### Spacing
- **Scale**: Consistent 0-24 spacing scale
- **Base**: 4px (0.25rem) unit

### Border Radius
- **Range**: From none to full (circle)
- **Default**: 4px for standard elements

### Shadows
- **Elevation**: 5 levels of depth
- **Consistent**: Matches platform standards

### Animation
- **Duration**: Fast (150ms), normal (300ms), slow (500ms)
- **Easing**: Standard CSS timing functions

### Z-Index
- **Layered**: Consistent stacking order
- **Semantic**: Named layers (dropdown, modal, etc.)

### Breakpoints
- **Responsive**: Mobile-first breakpoints
- **Standard**: Tailwind-inspired sizes

## Build Output

The package generates multiple output formats:

- **TypeScript**: Full type definitions
- **CSS**: CSS custom properties
- **SCSS**: Sass variables  
- **JSON**: Raw token data
- **JS**: ES modules

## Brand Guidelines

### Story Intelligence™ Usage

```typescript
import { storyIntelligence } from '@storytailor/ui-tokens';

// Correct branding
const poweredBy = storyIntelligence.branding.poweredBy; // "Powered by Story Intelligence™"

// Brand differentiation
const messaging = storyIntelligence.messaging.differentiation; // "Not AI-powered - powered by Story Intelligence™"
```

### Design Principles

1. **Consistency**: Use tokens instead of hard-coded values
2. **Accessibility**: WCAG 2.1 AA compliant color contrasts
3. **Scalability**: Responsive and flexible system
4. **Brand Integrity**: Proper Story Intelligence™ attribution

## Development

```bash
# Install dependencies
npm install

# Build tokens
npm run build

# Type check
npm run type-check
```

## Contributing

When adding new tokens:

1. Update `tokens/design-tokens.json`
2. Add TypeScript definitions to `src/index.ts`
3. Update documentation
4. Test across all output formats

## License

Part of the Storytailor platform. All rights reserved.

---

**Powered by Story Intelligence™**
 
 
 