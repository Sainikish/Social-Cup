import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

// iOS uses shadow* props, Android uses elevation - Platform.select keeps
// every call site from having to know that.
function shadow(elevation: number): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.08 + elevation * 0.01,
      shadowRadius: elevation,
    },
    android: {
      elevation,
    },
    default: {},
  }) as ViewStyle;
}

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(2),
  md: shadow(4),
  lg: shadow(8),
} as const;
