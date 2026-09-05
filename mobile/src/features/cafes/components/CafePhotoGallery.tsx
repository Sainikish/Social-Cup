import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../../theme';
import type { CafePhotoDto } from '../types';

export interface CafePhotoGalleryProps {
  photos: CafePhotoDto[];
}

const GALLERY_HEIGHT = 220;

// Deliberately narrower than ViewStyle/ImageStyle (which disagree on some
// properties, e.g. `overflow`) - the only thing callers below ever vary is
// width, and that's valid on both View and Image.
interface WidthStyle {
  width?: number;
}

function PlaceholderPhoto({ style }: { style?: WidthStyle }) {
  return (
    <View style={[styles.image, styles.placeholder, style]}>
      <Text style={styles.placeholderText}>☕</Text>
    </View>
  );
}

// Tracks its own load failure so one broken/invalid URL falls back to the
// placeholder without affecting the rest of the gallery.
function GalleryPhoto({ photo, style }: { photo: CafePhotoDto; style?: WidthStyle }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <PlaceholderPhoto style={style} />;
  }

  return (
    <Image
      source={{ uri: photo.photoUrl }}
      style={[styles.image, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={photo.caption ?? undefined}
      accessibilityIgnoresInvertColors
    />
  );
}

export function CafePhotoGallery({ photos }: CafePhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <View style={styles.container}>
        <PlaceholderPhoto />
      </View>
    );
  }

  const sortedPhotos = [...photos].sort((a, b) => a.displayOrder - b.displayOrder);

  if (sortedPhotos.length === 1) {
    return (
      <View style={styles.container}>
        <GalleryPhoto photo={sortedPhotos[0]} />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      accessibilityLabel="Cafe photo gallery"
    >
      {sortedPhotos.map((photo) => (
        <GalleryPhoto key={photo.id} photo={photo} style={styles.pagedImage} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: GALLERY_HEIGHT,
  },
  image: {
    width: '100%',
    height: GALLERY_HEIGHT,
  },
  pagedImage: {
    width: 360,
  },
  placeholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  placeholderText: {
    fontSize: 48,
  },
});
