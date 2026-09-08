import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RedeemScreen from '../../app/(app)/drinks/redeem';
import * as redemptionApi from '../../src/features/redemption/api';
import type { RedemptionCodeResponse } from '../../src/features/redemption/types';

let mockSearchParams: { drinkId?: string } = { drinkId: 'drink-1' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  Stack: { Screen: () => null },
}));

jest.mock('../../src/features/redemption/api');

const mockCreateRedemptionCode = redemptionApi.createRedemptionCode as jest.MockedFunction<
  typeof redemptionApi.createRedemptionCode
>;

function redemption(overrides: Partial<RedemptionCodeResponse> = {}): RedemptionCodeResponse {
  return {
    code: 'sJ3f9x2k',
    backupCode: '004821',
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    drinkId: 'drink-1',
    drinkName: 'Cortado',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    creditPrice: 4,
    ...overrides,
  };
}

function insufficientCreditsError() {
  return {
    isAxiosError: true,
    response: { status: 409, data: { code: 'INSUFFICIENT_CREDITS', message: 'insufficient credits' } },
    toJSON: () => ({}),
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RedeemScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = { drinkId: 'drink-1' };
});

describe('RedeemScreen', () => {
  it('shows the generate button in a loading state while the mutation is pending', async () => {
    mockCreateRedemptionCode.mockReturnValue(new Promise(() => {}));

    renderScreen();
    fireEvent.press(screen.getByTestId('generate-code-button'));

    // TanStack Query's notifyManager batches the observer notification onto
    // a deferred timer, so `isPending` (and the button's busy state) can lag
    // a tick behind the synchronous fireEvent.press call - findByTestId only
    // waits for the node to appear (it already exists), not for this prop to
    // change, so this needs an explicit waitFor.
    await waitFor(() => {
      expect(screen.getByTestId('generate-code-button').props.accessibilityState.busy).toBe(true);
    });
  });

  it('generates a code and displays it via RedemptionCodeDisplay', async () => {
    mockCreateRedemptionCode.mockResolvedValue(redemption());

    renderScreen();
    fireEvent.press(screen.getByTestId('generate-code-button'));

    expect(await screen.findByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByText('sJ3f9x2k')).toBeTruthy();
    expect(screen.getByText('004821')).toBeTruthy();
    expect(mockCreateRedemptionCode).toHaveBeenCalledWith('drink-1');
  });

  it('shows a mapped error message (not a raw backend/network message) for a generic failure', async () => {
    mockCreateRedemptionCode.mockRejectedValue({
      isAxiosError: true,
      code: 'ERR_NETWORK',
      message: 'Network Error',
      toJSON: () => ({}),
    });

    renderScreen();
    fireEvent.press(screen.getByTestId('generate-code-button'));

    expect(
      await screen.findByText('Could not reach the server. Check your connection and try again.')
    ).toBeTruthy();
    expect(screen.queryByText('Network Error')).toBeNull();
  });

  it('shows the insufficient-credits message when the backend returns 409 INSUFFICIENT_CREDITS', async () => {
    mockCreateRedemptionCode.mockRejectedValue(insufficientCreditsError());

    renderScreen();
    fireEvent.press(screen.getByTestId('generate-code-button'));

    expect(await screen.findByText("You don't have enough credits for this drink.")).toBeTruthy();
  });

  it('shows the expired state (via RedemptionCodeDisplay) once the generated code has already expired', async () => {
    mockCreateRedemptionCode.mockResolvedValue(
      redemption({ validUntil: new Date(Date.now() - 1000).toISOString() })
    );

    renderScreen();
    fireEvent.press(screen.getByTestId('generate-code-button'));

    expect(await screen.findByText('This code has expired.')).toBeTruthy();
    expect(screen.getByText('Generate new code')).toBeTruthy();
  });

  it('regenerates a code for the same drink when "Generate new code" is pressed after expiry', async () => {
    mockCreateRedemptionCode
      .mockResolvedValueOnce(
        redemption({ code: 'OLD_CODE', validUntil: new Date(Date.now() - 1000).toISOString() })
      )
      .mockResolvedValueOnce(
        redemption({ code: 'NEW_CODE', validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString() })
      );

    renderScreen();
    fireEvent.press(screen.getByTestId('generate-code-button'));
    await screen.findByText('This code has expired.');

    fireEvent.press(screen.getByTestId('regenerate-code-button'));

    expect(await screen.findByText('NEW_CODE')).toBeTruthy();
    expect(mockCreateRedemptionCode).toHaveBeenCalledTimes(2);
    expect(mockCreateRedemptionCode).toHaveBeenNthCalledWith(2, 'drink-1');
  });

  it('disables the generate button and never calls the backend when drinkId is missing', () => {
    mockSearchParams = { drinkId: undefined };

    renderScreen();

    expect(screen.getByTestId('generate-code-button').props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('generate-code-button'));
    expect(mockCreateRedemptionCode).not.toHaveBeenCalled();
  });
});
