import { fireEvent, render, screen } from '@testing-library/react-native';

import { CafeCard } from '../../../src/features/cafes/components/CafeCard';
import type { CafeSummaryResponse } from '../../../src/features/cafes/types';

function cafe(overrides: Partial<CafeSummaryResponse> = {}): CafeSummaryResponse {
  return {
    id: 'cafe-1',
    name: 'Blue Bottle Coffee',
    address: '300 Main St',
    neighbourhood: 'Downtown',
    latitude: null,
    longitude: null,
    featured: false,
    status: 'ACTIVE',
    vibeTags: null,
    primaryPhotoUrl: null,
    distanceKm: null,
    ...overrides,
  };
}

describe('CafeCard', () => {
  it('navigates with the cafe id when pressed', () => {
    const onPress = jest.fn();
    render(<CafeCard cafe={cafe()} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText('Open Blue Bottle Coffee cafe'));

    expect(onPress).toHaveBeenCalledWith('cafe-1');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a featured badge only when the cafe is featured', () => {
    render(<CafeCard cafe={cafe({ featured: true })} onPress={() => {}} />);
    expect(screen.getByText('Featured')).toBeTruthy();
  });

  it('does not show a featured badge for a non-featured cafe', () => {
    render(<CafeCard cafe={cafe({ featured: false })} onPress={() => {}} />);
    expect(screen.queryByText('Featured')).toBeNull();
  });

  it('shows a placeholder when there is no primary photo', () => {
    render(<CafeCard cafe={cafe({ primaryPhotoUrl: null })} onPress={() => {}} />);
    expect(screen.getByText('☕')).toBeTruthy();
  });

  it('shows distance only when present', () => {
    render(<CafeCard cafe={cafe({ distanceKm: 2.34 })} onPress={() => {}} />);
    expect(screen.getByText('2.3 km')).toBeTruthy();
  });
});
