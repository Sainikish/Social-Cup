import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';

import { Avatar } from '../../src/components/Avatar';

describe('Avatar', () => {
  it('renders the image with an accessible label when avatarUrl is present', () => {
    render(<Avatar avatarUrl="https://example.com/ada.jpg" name="Ada Lovelace" />);

    expect(screen.getByLabelText('Ada Lovelace avatar')).toBeTruthy();
  });

  it('shows an initial-letter fallback when there is no avatarUrl', () => {
    render(<Avatar avatarUrl={null} name="Ada Lovelace" />);

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to the initial letter when the avatar URL fails to load', () => {
    render(<Avatar avatarUrl="https://example.com/broken.jpg" name="Ada Lovelace" />);

    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to "?" for a blank name rather than crashing', () => {
    render(<Avatar avatarUrl={null} name="" />);

    expect(screen.getByText('?')).toBeTruthy();
  });
});
