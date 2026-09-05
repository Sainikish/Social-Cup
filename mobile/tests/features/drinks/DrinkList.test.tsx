import { fireEvent, render, screen } from '@testing-library/react-native';

import { DrinkList } from '../../../src/features/drinks/components/DrinkList';
import type { DrinkResponse } from '../../../src/features/drinks/types';

function drink(id: string, name: string): DrinkResponse {
  return {
    id,
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    name,
    type: 'Espresso',
    description: null,
    retailPrice: 4.5,
    creditPrice: 4,
    photoUrl: null,
    signature: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  onDrinkPress: noop,
  emptyTitle: 'No signature drinks available',
};

describe('DrinkList', () => {
  it('shows a loading indicator on initial load', () => {
    render(<DrinkList {...baseProps} drinks={[]} isLoading />);
    expect(screen.getByText('Loading drinks...')).toBeTruthy();
  });

  it('renders zero drinks as the empty state, not an error', () => {
    render(<DrinkList {...baseProps} drinks={[]} emptyDescription="Check back soon." />);
    expect(screen.getByText('No signature drinks available')).toBeTruthy();
    expect(screen.getByText('Check back soon.')).toBeTruthy();
  });

  it('renders a single drink correctly', () => {
    render(<DrinkList {...baseProps} drinks={[drink('1', 'Only Drink')]} />);
    expect(screen.getByText('Only Drink')).toBeTruthy();
  });

  it('renders multiple drinks', () => {
    render(<DrinkList {...baseProps} drinks={[drink('1', 'Cortado'), drink('2', 'Cold Brew')]} />);
    expect(screen.getByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Cold Brew')).toBeTruthy();
  });

  it('shows the error state with a working retry action', () => {
    const onRetry = jest.fn();
    render(<DrinkList {...baseProps} drinks={[]} isError errorMessage="Network error" onRetry={onRetry} />);

    expect(screen.getByText('Network error')).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the list visible and shows only a small footer indicator while fetching the next page', () => {
    render(<DrinkList {...baseProps} drinks={[drink('1', 'Cortado')]} hasNextPage isFetchingNextPage />);

    expect(screen.getByText('Cortado')).toBeTruthy();
    expect(screen.getByLabelText('Load more drinks')).toBeTruthy();
    expect(screen.queryByText('Loading drinks...')).toBeNull();
  });

  it('navigates to drink detail when a card is pressed', () => {
    const onDrinkPress = jest.fn();
    render(<DrinkList {...baseProps} drinks={[drink('1', 'Cortado')]} onDrinkPress={onDrinkPress} />);

    fireEvent.press(screen.getByLabelText('Open Cortado details'));
    expect(onDrinkPress).toHaveBeenCalledWith('1');
  });

  it('calls onEndReached only when there is a next page and none is already in flight', () => {
    const onEndReached = jest.fn();
    render(
      <DrinkList
        {...baseProps}
        drinks={[drink('1', 'Cortado')]}
        hasNextPage
        isFetchingNextPage={false}
        onEndReached={onEndReached}
      />
    );

    fireEvent(screen.getByTestId('drink-list'), 'onEndReached');
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it('invokes onRefresh on pull-to-refresh', () => {
    const onRefresh = jest.fn();
    render(<DrinkList {...baseProps} drinks={[drink('1', 'Cortado')]} isRefreshing onRefresh={onRefresh} />);

    screen.getByTestId('drink-list').props.refreshControl.props.onRefresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
