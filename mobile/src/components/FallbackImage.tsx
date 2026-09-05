import { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import type { ReactNode } from 'react';

import { colors } from '../theme';

export interface FallbackImageProps {
  /** The image URL, or null/undefined when there is none to try. */
  uri: string | null | undefined;
  /** Sizing/shape (width, height, borderRadius) - applied to whichever branch renders. */
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  /** Rendered instead of the image when there is no uri, or it fails to load. */
  children: ReactNode;
}

// One place for "show the image, or a placeholder if there is none, or the
// same placeholder if the URL turns out to be broken" - previously
// reimplemented separately (and inconsistently - CafeCard had no error
// fallback at all) across DrinkPhoto, CafePhotoGallery, and CafeCard.
export function FallbackImage({ uri, style, accessibilityLabel, children }: FallbackImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, style]} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
