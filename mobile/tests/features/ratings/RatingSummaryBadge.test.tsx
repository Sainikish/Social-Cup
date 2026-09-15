import { render, screen } from '@testing-library/react-native';

import { RatingSummaryBadge } from '../../../src/features/ratings/components/RatingSummaryBadge';

describe('RatingSummaryBadge', () => {
  it('shows a "New" badge when averageRating is null', () => {
    render(<RatingSummaryBadge averageRating={null} ratingCount={0} />);
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('shows the same "New" badge when averageRating is undefined (field absent)', () => {
    render(<RatingSummaryBadge averageRating={undefined} />);
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('shows the rating and count when both are present', () => {
    render(<RatingSummaryBadge averageRating={4.567} ratingCount={9} />);
    expect(screen.getByText('4.6 (9)')).toBeTruthy();
  });

  it('shows only the rounded rating when ratingCount is absent', () => {
    render(<RatingSummaryBadge averageRating={3} />);
    expect(screen.getByText('3.0')).toBeTruthy();
  });

  it('never shows the count when it is zero, even with a real average', () => {
    render(<RatingSummaryBadge averageRating={5} ratingCount={0} />);
    expect(screen.getByText('5.0')).toBeTruthy();
  });
});
