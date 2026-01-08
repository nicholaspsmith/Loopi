/**
 * Loopi Brand Colors & Design Tokens
 *
 * A playful, vibrant color palette that represents:
 * - Learning & intelligence (purple)
 * - Energy & creativity (pink/coral)
 * - Clarity & growth (teal)
 * - Optimism & memory (yellow)
 */

export const brand = {
  colors: {
    // Primary palette - Purple to Pink gradient
    primary: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7', // Main primary
      600: '#9333EA',
      700: '#7C3AED', // Logo primary
      800: '#6B21A8',
      900: '#581C87',
    },

    // Secondary palette - Pink/Coral
    secondary: {
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#EC4899', // Main secondary
      600: '#DB2777',
      700: '#BE185D',
      800: '#9D174D',
      900: '#831843',
    },

    // Accent palette - Teal/Cyan (loop color)
    accent: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6', // Main accent
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },

    // Highlight palette - Yellow/Orange (sparks)
    highlight: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24', // Main highlight
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },

    // Warm accent - Orange
    warm: {
      400: '#FB923C',
      500: '#F97316', // Logo warm accent
      600: '#EA580C',
    },

    // Neutral palette
    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },

    // Deep indigo for dark backgrounds
    deep: {
      800: '#1E1B4B',
      900: '#0F0D2E',
    },
  },

  // Gradient definitions for use in CSS
  gradients: {
    // Main brand gradient (purple → pink → orange)
    brand: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F97316 100%)',

    // Loop gradient (teal → cyan)
    loop: 'linear-gradient(90deg, #14B8A6 0%, #06B6D4 100%)',

    // Subtle background gradient
    background: 'linear-gradient(180deg, #FAF5FF 0%, #F0FDFA 100%)',

    // Dark mode background
    backgroundDark: 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)',

    // Button hover gradient
    buttonHover: 'linear-gradient(135deg, #9333EA 0%, #DB2777 100%)',
  },

  // Semantic colors
  semantic: {
    success: '#22C55E',
    warning: '#FBBF24',
    error: '#EF4444',
    info: '#06B6D4',
  },
} as const

// CSS custom properties for easy usage
export const brandCSSVariables = `
  :root {
    --color-primary: ${brand.colors.primary[500]};
    --color-primary-dark: ${brand.colors.primary[700]};
    --color-secondary: ${brand.colors.secondary[500]};
    --color-accent: ${brand.colors.accent[500]};
    --color-highlight: ${brand.colors.highlight[400]};
    --color-warm: ${brand.colors.warm[500]};

    --gradient-brand: ${brand.gradients.brand};
    --gradient-loop: ${brand.gradients.loop};
  }
`

export type BrandColors = typeof brand.colors
