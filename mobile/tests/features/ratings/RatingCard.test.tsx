import { render, screen } from '@testing-library/react-native';

import { RatingCard, formatRatingDate } from '../../../src/features/ratings/components/RatingCard';
import type { DrinkRatingResponse } from '../../../src/features/ratings/types';

function rating(overrides: Partial<DrinkRatingResponse> = {}): DrinkRatingResponse {
  return {
    id: 'rating-1',
    drinkId: 'drink-1',
    rating: 4,
    note: 'Really smooth.',
    author: { id: 'member-1', firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('RatingCard', () => {
  it('renders the author name, rating, note, and date', () => {
    render(<RatingCard rating={rating()} />);

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Really smooth.')).toBeTruthy();
    expect(screen.getByLabelText('Rated 4 out of 5 stars')).toBeTruthy();
    expect(screen.getByText(formatRatingDate('2026-01-15T10:00:00.000Z'))).toBeTruthy();
  });

  it('omits the note when there is none', () => {
    render(<RatingCard rating={rating({ note: null })} />);
    expect(screen.queryByText('Really smooth.')).toBeNull();
  });

  it('falls back to "Anonymous" when the author is null', () => {
    render(<RatingCard rating={rating({ author: null })} />);
    expect(screen.getByText('Anonymous')).toBeTruthy();
  });

  it('falls back to "Anonymous" when the author has no first or last name', () => {
    render(
      <RatingCard
        rating={rating({ author: { id: 'm2', firstName: null, lastName: null, avatarUrl: null } })}
      />
    );
    expect(screen.getByText('Anonymous')).toBeTruthy();
  });

  it('never renders the author email, roles, or any other private member field', () => {
    render(<RatingCard rating={rating()} />);

    // RatingAuthorResponse never carries these fields to begin with (see
    // src/features/ratings/types.ts), so this asserts none leaked in some
    // other way (e.g. a stray prop spread).
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByText('MEMBER')).toBeNull();
  });

  it('shows a "Your rating" badge only when isOwnRating is true', () => {
    render(<RatingCard rating={rating()} isOwnRating />);
    expect(screen.getByText('Your rating')).toBeTruthy();
  });

  it('does not show a "Your rating" badge for someone else\'s rating', () => {
    render(<RatingCard rating={rating()} />);
    expect(screen.queryByText('Your rating')).toBeNull();
  });
});
