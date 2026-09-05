import { fireEvent, render, screen } from '@testing-library/react-native';

import { RatingList } from '../../../src/features/ratings/components/RatingList';
import type { DrinkRatingResponse } from '../../../src/features/ratings/types';

function rating(id: string, authorId = 'member-2'): DrinkRatingResponse {
  return {
    id,
    drinkId: 'drink-1',
    rating: 4,
    note: 'Good',
    author: { id: authorId, firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const noop = () => {};

const baseProps = {
  isLoading: false,
  isError: false,
  onRetry: noop,
  hasNextPage: false,
  isFetchingNextPage: false,
  onLoadMore: noop,
  emptyTitle: 'No ratings yet',
};

describe('RatingList', () => {
  it('shows a loading indicator on initial load', () => {
    render(<RatingList {...baseProps} ratings={[]} isLoading />);
    expect(screen.getByText('Loading ratings...')).toBeTruthy();
  });

  it('renders zero ratings as the empty state, not an error', () => {
    render(<RatingList {...baseProps} ratings={[]} emptyDescription="Be the first to rate this drink." />);
    expect(screen.getByText('No ratings yet')).toBeTruthy();
    expect(screen.getByText('Be the first to rate this drink.')).toBeTruthy();
  });

  it('renders multiple ratings', () => {
    render(<RatingList {...baseProps} ratings={[rating('r1'), rating('r2')]} />);
    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(2);
  });

  it('shows the error state with a working retry action', () => {
    const onRetry = jest.fn();
    render(<RatingList {...baseProps} ratings={[]} isError errorMessage="Network error" onRetry={onRetry} />);

    expect(screen.getByText('Network error')).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a "Load more ratings" action when there is a next page', () => {
    const onLoadMore = jest.fn();
    render(<RatingList {...baseProps} ratings={[rating('r1')]} hasNextPage onLoadMore={onLoadMore} />);

    fireEvent.press(screen.getByLabelText('Load more ratings'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows a footer spinner instead of the load-more action while fetching the next page', () => {
    render(<RatingList {...baseProps} ratings={[rating('r1')]} hasNextPage isFetchingNextPage />);
    expect(screen.queryByLabelText('Load more ratings')).toBeNull();
  });

  it("badges the current user's own rating and no one else's", () => {
    render(
      <RatingList
        {...baseProps}
        ratings={[rating('r1', 'member-1'), rating('r2', 'member-2')]}
        currentUserId="member-1"
      />
    );
    expect(screen.getAllByText('Your rating')).toHaveLength(1);
  });

  it('badges nothing when there is no authenticated user', () => {
    render(<RatingList {...baseProps} ratings={[rating('r1', 'member-1')]} />);
    expect(screen.queryByText('Your rating')).toBeNull();
  });
});
