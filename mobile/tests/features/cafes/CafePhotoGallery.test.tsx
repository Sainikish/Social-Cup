import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';

import { CafePhotoGallery } from '../../../src/features/cafes/components/CafePhotoGallery';
import type { CafePhotoDto } from '../../../src/features/cafes/types';

function photo(overrides: Partial<CafePhotoDto>): CafePhotoDto {
  return {
    id: 'photo-1',
    photoUrl: 'https://example.com/photo.jpg',
    caption: null,
    displayOrder: 0,
    isPrimary: false,
    ...overrides,
  };
}

describe('CafePhotoGallery', () => {
  it('shows a placeholder when there are no photos', () => {
    render(<CafePhotoGallery photos={[]} />);
    expect(screen.getByText('☕')).toBeTruthy();
  });

  it('renders a single photo without a horizontal gallery', () => {
    render(<CafePhotoGallery photos={[photo({ id: 'p1' })]} />);
    expect(screen.queryByLabelText('Cafe photo gallery')).toBeNull();
  });

  it('renders a horizontal gallery for multiple photos, ordered by displayOrder', () => {
    const photos = [
      photo({ id: 'p2', displayOrder: 1, caption: 'Second' }),
      photo({ id: 'p1', displayOrder: 0, caption: 'First' }),
    ];
    render(<CafePhotoGallery photos={photos} />);

    expect(screen.getByLabelText('Cafe photo gallery')).toBeTruthy();
    const images = screen.UNSAFE_getAllByType(Image) as { props: { accessibilityLabel?: string } }[];
    expect(images.map((image) => image.props.accessibilityLabel)).toEqual(['First', 'Second']);
  });

  it('falls back to the placeholder when a photo URL fails to load', () => {
    render(<CafePhotoGallery photos={[photo({ id: 'p1', photoUrl: 'https://example.com/broken.jpg' })]} />);

    expect(screen.queryByText('☕')).toBeNull();
    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('☕')).toBeTruthy();
  });
});
