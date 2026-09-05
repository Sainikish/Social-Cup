import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image, Text } from 'react-native';

import { FallbackImage } from '../../src/components/FallbackImage';

describe('FallbackImage', () => {
  it('renders the placeholder children when there is no uri', () => {
    render(
      <FallbackImage uri={null}>
        <Text>placeholder</Text>
      </FallbackImage>
    );

    expect(screen.getByText('placeholder')).toBeTruthy();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('renders the image when a valid uri is given', () => {
    render(
      <FallbackImage uri="https://example.com/photo.jpg" accessibilityLabel="A photo">
        <Text>placeholder</Text>
      </FallbackImage>
    );

    expect(screen.getByLabelText('A photo')).toBeTruthy();
    expect(screen.queryByText('placeholder')).toBeNull();
  });

  it('falls back to the placeholder when the image fails to load', () => {
    render(
      <FallbackImage uri="https://example.com/broken.jpg">
        <Text>placeholder</Text>
      </FallbackImage>
    );

    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('placeholder')).toBeTruthy();
  });
});
