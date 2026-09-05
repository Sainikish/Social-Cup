import { colors } from './colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';

export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  typography: { fontFamily, fontSize, fontWeight, lineHeight },
} as const;

export type Theme = typeof theme;

export { colors, spacing, radius, shadows, fontFamily, fontSize, fontWeight, lineHeight };
