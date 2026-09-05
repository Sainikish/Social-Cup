import { Text } from 'react-native';

import { FallbackImage } from '../../../components';
import { radius } from '../../../theme';

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
  const dimensionStyle = { width: size, height: size, borderRadius: radius.md };

  return (
    <FallbackImage uri={photoUrl} style={dimensionStyle} accessibilityLabel={accessibilityLabel}>
      <Text style={{ fontSize: size * 0.4 }}>🥤</Text>
    </FallbackImage>
  );
}
