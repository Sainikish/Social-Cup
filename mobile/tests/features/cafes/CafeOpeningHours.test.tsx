import { render, screen } from '@testing-library/react-native';

import { CafeOpeningHours } from '../../../src/features/cafes/components/CafeOpeningHours';
import type { CafeHoursDto } from '../../../src/features/cafes/types';

describe('CafeOpeningHours', () => {
  it('renders open hours for a day that has them', () => {
    const hours: CafeHoursDto[] = [
      { dayOfWeek: 'MONDAY', openTime: '09:00:00', closeTime: '17:00:00', isClosed: false },
    ];
    render(<CafeOpeningHours openingHours={hours} />);
    expect(screen.getByText('9:00 AM – 5:00 PM')).toBeTruthy();
  });

  it('renders "Closed" for a day explicitly marked closed', () => {
    const hours: CafeHoursDto[] = [{ dayOfWeek: 'SUNDAY', openTime: null, closeTime: null, isClosed: true }];
    render(<CafeOpeningHours openingHours={hours} />);
    expect(screen.getByText('Closed')).toBeTruthy();
  });

  it('renders "Hours not available" rather than inventing a time for a day with no data at all', () => {
    // No entry provided for any day.
    render(<CafeOpeningHours openingHours={[]} />);
    const notAvailable = screen.getAllByText('Hours not available');
    // All 7 days should fall back, since none were provided.
    expect(notAvailable).toHaveLength(7);
  });

  it('renders all seven days even when the backend only returns some of them', () => {
    const hours: CafeHoursDto[] = [
      { dayOfWeek: 'MONDAY', openTime: '09:00:00', closeTime: '17:00:00', isClosed: false },
    ];
    render(<CafeOpeningHours openingHours={hours} />);

    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.getByText('Sunday')).toBeTruthy();
    expect(screen.getAllByText('Hours not available')).toHaveLength(6);
  });
});
