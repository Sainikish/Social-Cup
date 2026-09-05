import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';

import { DrinkCard } from '../../../src/features/drinks/components/DrinkCard';
import type { DrinkResponse } from '../../../src/features/drinks/types';

function drink(overrides: Partial<DrinkResponse> = {}): DrinkResponse {
  return {
    id: 'drink-1',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    name: 'Cortado',
    type: 'Espresso',
    description: null,
    retailPrice: 4.5,
    creditPrice: 4,
    photoUrl: null,
    signature: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('DrinkCard', () => {
  it('renders name, type, and cafe name', () => {
    render(<DrinkCard drink={drink()} onPress={() => {}} />);
    expect(screen.getByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Espresso')).toBeTruthy();
    expect(screen.getByText('Blue Bottle Coffee')).toBeTruthy();
  });

  it('renders retail price and credit price when available', () => {
    render(<DrinkCard drink={drink({ retailPrice: 4.5, creditPrice: 4 })} onPress={() => {}} />);
    expect(screen.getByText('$4.50')).toBeTruthy();
    expect(screen.getByText('4 credits')).toBeTruthy();
  });

  it('omits retail price when null but still shows credit price', () => {
    render(<DrinkCard drink={drink({ retailPrice: null, creditPrice: 2 })} onPress={() => {}} />);
    expect(screen.queryByText(/^\$/)).toBeNull();
    expect(screen.getByText('2 credits')).toBeTruthy();
  });

  it('shows a signature indicator only for signature drinks', () => {
    render(<DrinkCard drink={drink({ signature: true })} onPress={() => {}} />);
    expect(screen.getByText('★ Signature')).toBeTruthy();
  });

  it('does not show a signature indicator for a non-signature drink', () => {
    render(<DrinkCard drink={drink({ signature: false })} onPress={() => {}} />);
    expect(screen.queryByText('★ Signature')).toBeNull();
  });

  it('shows a placeholder when there is no photo', () => {
    render(<DrinkCard drink={drink({ photoUrl: null })} onPress={() => {}} />);
    expect(screen.getByText('🥤')).toBeTruthy();
  });

  it('falls back to the placeholder when the photo URL fails to load', () => {
    render(<DrinkCard drink={drink({ photoUrl: 'https://example.com/broken.jpg' })} onPress={() => {}} />);
    expect(screen.queryByText('🥤')).toBeNull();

    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('🥤')).toBeTruthy();
  });

  it('has a useful accessibility label and calls onPress with the drink id', () => {
    const onPress = jest.fn();
    render(<DrinkCard drink={drink({ id: 'd42', name: 'Cold Brew' })} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText('Open Cold Brew details'));

    expect(onPress).toHaveBeenCalledWith('d42');
  });
});
