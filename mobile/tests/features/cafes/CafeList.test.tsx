import { fireEvent, render, screen } from '@testing-library/react-native';

import { CafeList } from '../../../src/features/cafes/components/CafeList';
import type { CafeSummaryResponse } from '../../../src/features/cafes/types';

function cafe(id: string, name: string): CafeSummaryResponse {
  return {
    id,
    name,
    address: '1 Main St',
    neighbourhood: 'Downtown',
    latitude: null,
    longitude: null,
    featured: false,
    status: 'ACTIVE',
    vibeTags: null,
    primaryPhotoUrl: null,
    distanceKm: null,
  };
}

const noop = () => {};

const baseProps = {
  isLoading: false,
  isError: false,
  onRetry: noop,
  isRefreshing: false,
  onRefresh: noop,
  hasNextPage: false,
  isFetchingNextPage: false,
  onEndReached: noop,
  onCafePress: noop,
  emptyTitle: 'No cafes available',
};

describe('CafeList', () => {
  it('shows a loading indicator on initial load', () => {
    render(<CafeList {...baseProps} cafes={[]} isLoading />);
    expect(screen.getByText('Loading cafes...')).toBeTruthy();
  });

  it('renders the list of cafes', () => {
    const cafes = [cafe('1', 'Blue Bottle Coffee'), cafe('2', 'Corner Cafe')];
    render(<CafeList {...baseProps} cafes={cafes} />);
    expect(screen.getByText('Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByText('Corner Cafe')).toBeTruthy();
  });

  it('shows the empty state for zero cafes', () => {
    render(<CafeList {...baseProps} cafes={[]} emptyDescription="Try again later." />);
    expect(screen.getByText('No cafes available')).toBeTruthy();
    expect(screen.getByText('Try again later.')).toBeTruthy();
  });

  it('renders a single cafe correctly', () => {
    render(<CafeList {...baseProps} cafes={[cafe('1', 'Only Cafe')]} />);
    expect(screen.getByText('Only Cafe')).toBeTruthy();
  });

  it('shows the error state with a working retry action', () => {
    const onRetry = jest.fn();
    render(<CafeList {...baseProps} cafes={[]} isError errorMessage="Network error" onRetry={onRetry} />);

    expect(screen.getByText('Network error')).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps existing cafes visible and shows only a small footer indicator while fetching the next page', () => {
    render(
      <CafeList {...baseProps} cafes={[cafe('1', 'Blue Bottle Coffee')]} hasNextPage isFetchingNextPage />
    );

    expect(screen.getByText('Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByLabelText('Load more cafes')).toBeTruthy();
    // Pagination must never replace the list with the full-screen loading view.
    expect(screen.queryByText('Loading cafes...')).toBeNull();
  });

  it('calls onEndReached only when not already fetching the next page', () => {
    const onEndReached = jest.fn();
    render(
      <CafeList
        {...baseProps}
        cafes={[cafe('1', 'Blue Bottle Coffee')]}
        hasNextPage
        isFetchingNextPage
        onEndReached={onEndReached}
      />
    );

    fireEvent(screen.getByTestId('cafe-list'), 'onEndReached');
    expect(onEndReached).not.toHaveBeenCalled();
  });

  it('calls onEndReached when there is a next page and none is currently in flight', () => {
    const onEndReached = jest.fn();
    render(
      <CafeList
        {...baseProps}
        cafes={[cafe('1', 'Blue Bottle Coffee')]}
        hasNextPage
        isFetchingNextPage={false}
        onEndReached={onEndReached}
      />
    );

    fireEvent(screen.getByTestId('cafe-list'), 'onEndReached');
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it('invokes onRefresh on pull-to-refresh', () => {
    const onRefresh = jest.fn();
    render(
      <CafeList {...baseProps} cafes={[cafe('1', 'Blue Bottle Coffee')]} isRefreshing onRefresh={onRefresh} />
    );

    const list = screen.getByTestId('cafe-list');
    list.props.refreshControl.props.onRefresh();

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
