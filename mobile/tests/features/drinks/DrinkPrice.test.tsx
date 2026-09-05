import { render, screen } from '@testing-library/react-native';

import { DrinkPrice } from '../../../src/features/drinks/components/DrinkPrice';

describe('DrinkPrice', () => {
  it('renders retail price and pluralizes credits', () => {
    render(<DrinkPrice retailPrice={4.5} creditPrice={4} />);
    expect(screen.getByText('$4.50')).toBeTruthy();
    expect(screen.getByText('4 credits')).toBeTruthy();
  });

  it('uses the singular "credit" for exactly one credit', () => {
    render(<DrinkPrice retailPrice={3} creditPrice={1} />);
    expect(screen.getByText('1 credit')).toBeTruthy();
  });

  it('omits the retail price line when null', () => {
    render(<DrinkPrice retailPrice={null} creditPrice={2} />);
    expect(screen.queryByText(/^\$/)).toBeNull();
    expect(screen.getByText('2 credits')).toBeTruthy();
  });
});
