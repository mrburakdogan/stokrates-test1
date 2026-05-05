import { Platform } from 'react-native';

// Glassmorphism Design Tokens
export const GLASS = {
  // Blur intensities - reduced on Android for performance
  blur: Platform.OS === 'android' ? 25 : 40,
  blurLight: Platform.OS === 'android' ? 15 : 25,
  blurHeavy: Platform.OS === 'android' ? 35 : 60,

  // Card backgrounds (rgba for semi-transparency)
  cardBg: 'rgba(255, 255, 255, 0.12)',
  cardBgDark: 'rgba(15, 23, 42, 0.45)',

  // Borders
  border: 'rgba(255, 255, 255, 0.18)',
  borderDark: 'rgba(255, 255, 255, 0.08)',

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.15)',
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },

  // Border radius
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 24,
  radiusXl: 32,
} as const;

// Background gradients (underneath the glass)
export const GRADIENTS = {
  primary: ['#667eea', '#764ba2'] as const,
  sunset: ['#f093fb', '#f5576c'] as const,
  ocean: ['#4facfe', '#00f2fe'] as const,
  forest: ['#43e97b', '#38f9d7'] as const,
  fire: ['#fa709a', '#fee140'] as const,
  night: ['#0f172a', '#1e293b', '#334155'] as const,
  nightAccent: ['#1e1b4b', '#312e81', '#4338ca'] as const,

  // App background gradients
  bgLight: ['#e0e7ff', '#c7d2fe', '#a5b4fc'] as const,
  bgDark: ['#0f172a', '#1e1b4b', '#0f172a'] as const,
} as const;

// Color palette
export type ColorPalette = {
  text: string;
  textSecondary: string;
  textMuted: string;
  background: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryDark: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  input: string;
  inputBorder: string;
  tabBar: string;
  tabBarBorder: string;
};

export const COLORS: { light: ColorPalette; dark: ColorPalette } = {
  light: {
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    background: '#f8fafc',
    card: 'rgba(255, 255, 255, 0.7)',
    cardBorder: 'rgba(255, 255, 255, 0.8)',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    input: 'rgba(255, 255, 255, 0.6)',
    inputBorder: 'rgba(148, 163, 184, 0.3)',
    tabBar: 'rgba(255, 255, 255, 0.85)',
    tabBarBorder: 'rgba(148, 163, 184, 0.2)',
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    background: '#0f172a',
    card: 'rgba(30, 41, 59, 0.6)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    primary: '#818cf8',
    primaryDark: '#6366f1',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',
    input: 'rgba(30, 41, 59, 0.7)',
    inputBorder: 'rgba(100, 116, 139, 0.3)',
    tabBar: 'rgba(15, 23, 42, 0.9)',
    tabBarBorder: 'rgba(51, 65, 85, 0.5)',
  },
} as const;

// Typography
export const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 11, fontWeight: '500' as const },
} as const;

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
