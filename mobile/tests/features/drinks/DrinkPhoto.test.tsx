import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';

import { DrinkPhoto } from '../../../src/features/drinks/components/DrinkPhoto';

describe('DrinkPhoto', () => {
  it('shows a placeholder when there is no photo URL', () => {
    render(<DrinkPhoto photoUrl={null} size={64} />);
    expect(screen.getByText('🥤')).toBeTruthy();
  });

  it('renders the image when a valid photo URL is given', () => {
    render(<DrinkPhoto photoUrl="https://example.com/photo.jpg" size={64} accessibilityLabel="Cortado" />);
    expect(screen.getByLabelText('Cortado')).toBeTruthy();
    expect(screen.queryByText('🥤')).toBeNull();
  });

  it('falls back to the placeholder when the image fails to load', () => {
    render(<DrinkPhoto photoUrl="https://example.com/broken.jpg" size={64} />);

    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('🥤')).toBeTruthy();
  });
});
