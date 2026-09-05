import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../../theme';

export interface DrinkPhotoProps {
  photoUrl: string | null;
  size: number;
  accessibilityLabel?: string;
}

// Shared by DrinkCard (small thumbnail) and the drink detail screen (large
// hero) - both need identical "show the photo, or a placeholder if there is
// none, or the same placeholder if the URL turns out to be broken" handling,
// so this exists once rather than being duplicated per size/context.
export function DrinkPhoto({ photoUrl, size, accessibilityLabel }: DrinkPhotoProps) {
  const [failed, setFailed] = useState(false);
  const dimensionStyle = { width: size, height: size };

  if (!photoUrl || failed) {
    return (
      <View style={[styles.placeholder, dimensionStyle]}>
        <Text style={{ fontSize: size * 0.4 }}>🥤</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: photoUrl }}
      style={[styles.image, dimensionStyle]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: radius.md,
  },
  placeholder: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
