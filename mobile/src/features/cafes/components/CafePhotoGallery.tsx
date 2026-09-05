import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FallbackImage } from '../../../components';
import type { CafePhotoDto } from '../types';

export interface CafePhotoGalleryProps {
  photos: CafePhotoDto[];
}

const GALLERY_HEIGHT = 220;

// Deliberately narrower than ImageStyle (the only thing callers below ever
// vary is width, and FallbackImage forwards this style to both its image
// and placeholder branches).
interface WidthStyle {
  width?: number;
}

function GalleryPhoto({ photo, style }: { photo: CafePhotoDto; style?: WidthStyle }) {
  return (
    <FallbackImage
      uri={photo.photoUrl}
      style={[styles.image, style]}
      accessibilityLabel={photo.caption ?? undefined}
    >
      <Text style={styles.placeholderText}>☕</Text>
    </FallbackImage>
  );
}

export function CafePhotoGallery({ photos }: CafePhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <View style={styles.container}>
        <FallbackImage uri={null} style={styles.image}>
          <Text style={styles.placeholderText}>☕</Text>
        </FallbackImage>
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
  placeholderText: {
    fontSize: 48,
  },
});
