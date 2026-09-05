// Warm, neutral coffee-shop palette - a premium/quiet feel rather than a
// bright consumer-app one. Semantic names only; screens should never
// reference a raw hex value directly.
export const colors = {
  background: '#FBF7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F3ECE4',
  border: '#E8DED2',

  textPrimary: '#241812',
  textSecondary: '#6F6259',
  textInverse: '#FFFFFF',
  textMuted: '#A69A8E',

  primary: '#4A2E1F',
  primaryMuted: '#7A5A45',
  onPrimary: '#FFFFFF',

  accent: '#C97C3D',
  onAccent: '#FFFFFF',

  success: '#2F9E5B',
  danger: '#C74B3F',
  warning: '#D69A3A',
} as const;

export type ColorToken = keyof typeof colors;
