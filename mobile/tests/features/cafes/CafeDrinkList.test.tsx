import { fireEvent, render, screen } from '@testing-library/react-native';

import { CafeDrinkList } from '../../../src/features/cafes/components/CafeDrinkList';
import type { DrinkResponse } from '../../../src/features/cafes/types';

function drink(overrides: Partial<DrinkResponse>): DrinkResponse {
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

const noop = () => {};

describe('CafeDrinkList', () => {
  it('shows an empty state for a cafe with no drinks', () => {
    render(<CafeDrinkList drinks={[]} onDrinkPress={noop} />);
    expect(screen.getByText('No drinks listed yet')).toBeTruthy();
  });

  it('renders every drink for a cafe with multiple drinks', () => {
    const drinks = [
      drink({ id: 'd1', name: 'Cortado' }),
      drink({ id: 'd2', name: 'Cold Brew', signature: true }),
    ];
    render(<CafeDrinkList drinks={drinks} onDrinkPress={noop} />);

    expect(screen.getByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Cold Brew')).toBeTruthy();
    expect(screen.getByText('★ Signature')).toBeTruthy();
  });

  it('formats retail price and credit price', () => {
    render(<CafeDrinkList drinks={[drink({ retailPrice: 4.5, creditPrice: 1 })]} onDrinkPress={noop} />);
    expect(screen.getByText('$4.50')).toBeTruthy();
    expect(screen.getByText('1 credit')).toBeTruthy();
  });

  it('navigates to drink detail with the correct drink id when a row is pressed (Phase 7.4)', () => {
    const onDrinkPress = jest.fn();
    const drinks = [drink({ id: 'd1', name: 'Cortado' }), drink({ id: 'd2', name: 'Cold Brew' })];
    render(<CafeDrinkList drinks={drinks} onDrinkPress={onDrinkPress} />);

    fireEvent.press(screen.getByLabelText('Open Cold Brew details'));

    expect(onDrinkPress).toHaveBeenCalledWith('d2');
    expect(onDrinkPress).toHaveBeenCalledTimes(1);
  });
});
