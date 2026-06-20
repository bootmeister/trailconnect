export const COLORS = {
  primary: '#2D5016',
  primaryLight: '#4A7C28',
  primaryDark: '#1A3009',
  secondary: '#8B6914',
  secondaryLight: '#B8942E',
  accent: '#D4A84B',
  background: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0EB',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textLight: '#9A9A9A',
  border: '#E0E0DB',
  error: '#C62828',
  warning: '#F57C00',
  success: '#2E7D32',
  info: '#0277BD',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
  trail: {
    easy: '#4CAF50',
    moderate: '#FF9800',
    hard: '#F44336',
    expert: '#9C27B0',
  },
} as const

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const TYPOGRAPHY = {
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
} as const

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const
