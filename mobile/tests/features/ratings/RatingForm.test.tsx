import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { RatingForm } from '../../../src/features/ratings/components/RatingForm';
import * as ratingsApi from '../../../src/features/ratings/api';

jest.mock('../../../src/features/ratings/api');

const mockCreateRating = ratingsApi.createRating as jest.MockedFunction<typeof ratingsApi.createRating>;
const mockUpdateRating = ratingsApi.updateRating as jest.MockedFunction<typeof ratingsApi.updateRating>;

function renderForm(props: Partial<ComponentProps<typeof RatingForm>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RatingForm drinkId="drink-1" mode="create" {...props} />
    </QueryClientProvider>
  );
}

function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: { field: string; message: string }[]
) {
  return {
    response: {
      status,
      data: {
        timestamp: new Date().toISOString(),
        status,
        error: 'Error',
        code,
        message,
        path: '/drinks/drink-1/ratings',
        requestId: 'req-1',
        fieldErrors,
      },
    },
    isAxiosError: true,
    toJSON: () => ({}),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RatingForm (create mode)', () => {
  it('shows "Rate this drink" as the heading and "Submit rating" as the action', () => {
    renderForm({ mode: 'create' });
    expect(screen.getByText('Rate this drink')).toBeTruthy();
    expect(screen.getByText('Submit rating')).toBeTruthy();
  });

  it('requires a star rating before submitting', () => {
    renderForm();
    fireEvent.press(screen.getByText('Submit rating'));

    expect(screen.getByText('Select a rating from 1 to 5 stars')).toBeTruthy();
    expect(mockCreateRating).not.toHaveBeenCalled();
  });

  it('rejects a note longer than 140 characters', () => {
    renderForm();
    fireEvent.press(screen.getByLabelText('Rate 4 stars'));
    fireEvent.changeText(screen.getByLabelText('Rating note'), 'x'.repeat(141));
    fireEvent.press(screen.getByText('Submit rating'));

    expect(screen.getByText('Note must not exceed 140 characters')).toBeTruthy();
    expect(mockCreateRating).not.toHaveBeenCalled();
  });

  it('submits the selected rating and trimmed note', async () => {
    mockCreateRating.mockResolvedValue({
      id: 'r1',
      drinkId: 'drink-1',
      drinkName: 'Cortado',
      cafeId: 'cafe-1',
      cafeName: 'Blue Bottle Coffee',
      rating: 5,
      note: 'Loved it',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const onSuccess = jest.fn();
    renderForm({ onSuccess });

    fireEvent.press(screen.getByLabelText('Rate 5 stars'));
    fireEvent.changeText(screen.getByLabelText('Rating note'), '  Loved it  ');
    fireEvent.press(screen.getByText('Submit rating'));

    await waitFor(() =>
      expect(mockCreateRating).toHaveBeenCalledWith('drink-1', { rating: 5, note: 'Loved it' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('disables the submit button while the mutation is in flight', async () => {
    let resolveCreate: (() => void) | undefined;
    mockCreateRating.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = () =>
            resolve({
              id: 'r1',
              drinkId: 'drink-1',
              drinkName: 'Cortado',
              cafeId: 'cafe-1',
              cafeName: 'Blue Bottle Coffee',
              rating: 5,
              note: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        })
    );
    renderForm();

    fireEvent.press(screen.getByLabelText('Rate 5 stars'));
    fireEvent.press(screen.getByTestId('rating-submit-button'));

    await waitFor(() =>
      expect(screen.getByTestId('rating-submit-button').props.accessibilityState.busy).toBe(true)
    );
    expect(screen.getByTestId('rating-submit-button').props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText('Submit rating')).toBeNull();

    resolveCreate?.();
    await waitFor(() =>
      expect(screen.getByTestId('rating-submit-button').props.accessibilityState.busy).toBe(false)
    );
  });

  it('shows the specific conflict message on a 409 and never the raw backend code/message', async () => {
    mockCreateRating.mockRejectedValue(apiError(409, 'CONFLICT', 'Duplicate rating for member/drink'));
    renderForm();

    fireEvent.press(screen.getByLabelText('Rate 3 stars'));
    fireEvent.press(screen.getByText('Submit rating'));

    expect(
      await screen.findByText('You already rated this drink. You can edit your existing rating.')
    ).toBeTruthy();
    expect(screen.queryByText('CONFLICT')).toBeNull();
    expect(screen.queryByText('Duplicate rating for member/drink')).toBeNull();
  });

  it('merges server-side field errors (VALIDATION_ERROR) into the form', async () => {
    mockCreateRating.mockRejectedValue(
      apiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
        { field: 'note', message: 'Note must not exceed 140 characters' },
      ])
    );
    renderForm();

    fireEvent.press(screen.getByLabelText('Rate 3 stars'));
    fireEvent.press(screen.getByText('Submit rating'));

    expect(await screen.findByText('Note must not exceed 140 characters')).toBeTruthy();
  });

  it('shows a generic message for an unmapped error code', async () => {
    mockCreateRating.mockRejectedValue(apiError(500, 'INTERNAL_ERROR', 'boom'));
    renderForm();

    fireEvent.press(screen.getByLabelText('Rate 3 stars'));
    fireEvent.press(screen.getByText('Submit rating'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
  });
});

describe('RatingForm (edit mode)', () => {
  it('shows "Update your rating" as the heading and label, prefilled from initialValue', () => {
    renderForm({ mode: 'edit', initialValue: { rating: 4, note: 'Previously noted' } });

    expect(screen.getByText('Update your rating')).toBeTruthy();
    expect(screen.getByText('Update rating')).toBeTruthy();
    expect(screen.getByDisplayValue('Previously noted')).toBeTruthy();
    expect(screen.getByLabelText('Rate 4 stars').props.accessibilityState.selected).toBe(true);
  });

  it('calls updateRating (not createRating) on submit', async () => {
    mockUpdateRating.mockResolvedValue({
      id: 'r1',
      drinkId: 'drink-1',
      drinkName: 'Cortado',
      cafeId: 'cafe-1',
      cafeName: 'Blue Bottle Coffee',
      rating: 2,
      note: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    renderForm({ mode: 'edit', initialValue: { rating: 4, note: null } });

    fireEvent.press(screen.getByLabelText('Rate 2 stars'));
    fireEvent.press(screen.getByText('Update rating'));

    await waitFor(() =>
      expect(mockUpdateRating).toHaveBeenCalledWith('drink-1', { rating: 2, note: undefined })
    );
    expect(mockCreateRating).not.toHaveBeenCalled();
  });

  it('never renders memberId/userId inputs - identity comes from the session', () => {
    renderForm({ mode: 'edit', initialValue: { rating: 4, note: null } });

    expect(screen.queryByLabelText('Member ID')).toBeNull();
    expect(screen.queryByLabelText('User ID')).toBeNull();
  });
});
