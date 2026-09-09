import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import SubscriptionScreen from '../../app/(app)/profile/subscription';
import { useAuth } from '../../src/features/auth';
import * as subscriptionApi from '../../src/features/subscription/api';
import type { SubscriptionResponse } from '../../src/features/subscription/types';
import type { MemberDto } from '../../src/types/auth';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
}));

jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

jest.mock('../../src/features/subscription/api');

// A publishable key must be present for the screen to render the real
// SubscribePanel/CardField path rather than its "temporarily unavailable"
// fallback (see subscription.tsx's SubscribePanel).
jest.mock('../../src/config/env', () => ({
  config: { environment: 'development', apiBaseUrl: 'http://localhost:8080/api', stripePublishableKey: 'pk_test_123' },
}));

// Stripe's own shipped jest mock (@stripe/stripe-react-native/jest/mock)
// renders StripeProvider as a childless string, which would hide everything
// this screen actually needs to interact with (CardField, the Subscribe
// button). This local mock instead renders children through, and represents
// CardField as a plain View that forwards onCardChange as a normal prop, so
// fireEvent(cardField, 'cardChange', details) can simulate the member
// completing card entry without any native module.
const mockCreatePaymentMethod = jest.fn();
jest.mock('@stripe/stripe-react-native', () => {
  // require()'d lazily inside the factory: jest.mock() factories cannot
  // reference values imported at module scope (Jest hoists jest.mock calls
  // above imports), only jest.* helpers and locals prefixed with "mock".
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    StripeProvider: ({ children }: { children: ReactNode }) => children,
    CardField: (props: { onCardChange?: (details: unknown) => void; accessibilityLabel?: string }) => (
      <View
        testID="card-field"
        accessibilityLabel={props.accessibilityLabel}
        onCardChange={props.onCardChange}
      />
    ),
    useStripe: () => ({ createPaymentMethod: mockCreatePaymentMethod }),
  };
});

const mockGetMySubscription = subscriptionApi.getMySubscription as jest.MockedFunction<
  typeof subscriptionApi.getMySubscription
>;
const mockSubscribe = subscriptionApi.subscribe as jest.MockedFunction<typeof subscriptionApi.subscribe>;
const mockCancelSubscription = subscriptionApi.cancelSubscription as jest.MockedFunction<
  typeof subscriptionApi.cancelSubscription
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const AUTHENTICATED_USER: MemberDto = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: new Date().toISOString(),
};

function subscription(overrides: Partial<SubscriptionResponse> = {}): SubscriptionResponse {
  return {
    status: 'ACTIVE',
    currentPeriodStart: '2026-01-01',
    currentPeriodEnd: '2026-02-01',
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function notFoundError() {
  return {
    isAxiosError: true,
    response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'No subscription found' } },
    toJSON: () => ({}),
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SubscriptionScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user: AUTHENTICATED_USER,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    deleteAccount: jest.fn(),
    initializeAuth: jest.fn(),
  });
});

describe('SubscriptionScreen', () => {
  it('shows a loading state before the subscription resolves', () => {
    mockGetMySubscription.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Loading membership...')).toBeTruthy();
  });

  it('shows the "not subscribed" explainer and a disabled Subscribe button when the backend returns 404', async () => {
    mockGetMySubscription.mockRejectedValue(notFoundError());

    renderScreen();

    expect(await screen.findByText('Not subscribed')).toBeTruthy();
    expect(screen.getByText('Social Cup Membership')).toBeTruthy();
    // Matched as one combined string (not a substring regex) because the
    // Subscribe button's own label also contains "$24.99/month".
    expect(screen.getByText('$24.99/month · 30 drink credits every month')).toBeTruthy();

    const subscribeButton = screen.getByTestId('subscribe-button');
    expect(subscribeButton.props.accessibilityState.disabled).toBe(true);
  });

  it('shows an ACTIVE subscription with a Cancel Subscription action', async () => {
    mockGetMySubscription.mockResolvedValue(subscription({ status: 'ACTIVE' }));

    renderScreen();

    expect(await screen.findByText('Active')).toBeTruthy();
    expect(screen.getByTestId('cancel-subscription-button')).toBeTruthy();
    expect(screen.queryByText('Not subscribed')).toBeNull();
  });

  it('does not show a duplicate cancel action when cancellation is already scheduled', async () => {
    mockGetMySubscription.mockResolvedValue(subscription({ cancelAtPeriodEnd: true }));

    renderScreen();

    expect(await screen.findByText('Cancellation scheduled for the end of this billing period.')).toBeTruthy();
    expect(screen.queryByTestId('cancel-subscription-button')).toBeNull();
  });

  it('shows a CANCELLED state without a Subscribe panel or reactivation action', async () => {
    mockGetMySubscription.mockResolvedValue(subscription({ status: 'CANCELLED' }));

    renderScreen();

    expect(await screen.findByText('Cancelled')).toBeTruthy();
    expect(screen.queryByTestId('subscribe-button')).toBeNull();
    expect(screen.queryByTestId('cancel-subscription-button')).toBeNull();
  });

  it(
    'shows a genuine error state (not the 404 "not subscribed" state) for a real failure, with retry',
    async () => {
      mockGetMySubscription.mockRejectedValue(new Error('network down'));

      renderScreen();

      // useSubscriptionQuery retries a non-404 failure up to 2 times with the
      // library's default backoff before settling into isError, so this needs
      // more than findByText's default 1000ms timeout.
      expect(await screen.findByText('Retry', undefined, { timeout: 8000 })).toBeTruthy();
      expect(screen.queryByText('Not subscribed')).toBeNull();
    },
    10000
  );

  it('completes the subscribe flow: card completion enables the button, creates a PaymentMethod, then sends only its id to the backend', async () => {
    mockGetMySubscription.mockRejectedValue(notFoundError());
    mockCreatePaymentMethod.mockResolvedValue({ paymentMethod: { id: 'pm_123' }, error: null });
    mockSubscribe.mockResolvedValue(subscription());

    renderScreen();
    await screen.findByText('Not subscribed');

    const subscribeButton = screen.getByTestId('subscribe-button');
    expect(subscribeButton.props.accessibilityState.disabled).toBe(true);

    fireEvent(screen.getByTestId('card-field'), 'cardChange', { complete: true });
    expect(subscribeButton.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(subscribeButton);

    await waitFor(() => expect(mockCreatePaymentMethod).toHaveBeenCalledWith({ paymentMethodType: 'Card' }));
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledWith({ paymentMethodId: 'pm_123' }));
  });

  it('shows a Stripe PaymentMethod-creation error without calling the backend', async () => {
    mockGetMySubscription.mockRejectedValue(notFoundError());
    mockCreatePaymentMethod.mockResolvedValue({
      paymentMethod: undefined,
      error: { code: 'Failed', message: 'Your card was declined.' },
    });

    renderScreen();
    await screen.findByText('Not subscribed');

    fireEvent(screen.getByTestId('card-field'), 'cardChange', { complete: true });
    fireEvent.press(screen.getByTestId('subscribe-button'));

    expect(await screen.findByText('Your card was declined.')).toBeTruthy();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('shows a mapped error message when the backend rejects the subscription', async () => {
    mockGetMySubscription.mockRejectedValue(notFoundError());
    mockCreatePaymentMethod.mockResolvedValue({ paymentMethod: { id: 'pm_123' }, error: null });
    mockSubscribe.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'conflict' } },
      toJSON: () => ({}),
    });

    renderScreen();
    await screen.findByText('Not subscribed');

    fireEvent(screen.getByTestId('card-field'), 'cardChange', { complete: true });
    fireEvent.press(screen.getByTestId('subscribe-button'));

    expect(
      await screen.findByText("We couldn't complete your subscription. Check your card details and try again.")
    ).toBeTruthy();
  });

  it('cancels the subscription after the confirmation dialog is accepted', async () => {
    mockGetMySubscription.mockResolvedValue(subscription({ status: 'ACTIVE' }));
    mockCancelSubscription.mockResolvedValue(subscription({ status: 'ACTIVE', cancelAtPeriodEnd: true }));
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find((button) => button.style === 'destructive');
      destructive?.onPress?.();
    });

    renderScreen();
    fireEvent.press(await screen.findByTestId('cancel-subscription-button'));

    await waitFor(() => expect(mockCancelSubscription).toHaveBeenCalledTimes(1));
  });

  it('does not cancel when the confirmation dialog is dismissed', async () => {
    mockGetMySubscription.mockResolvedValue(subscription({ status: 'ACTIVE' }));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {
      // Simulates the member dismissing/choosing "Keep membership" - no
      // button callback invoked.
    });

    renderScreen();
    fireEvent.press(await screen.findByTestId('cancel-subscription-button'));

    expect(mockCancelSubscription).not.toHaveBeenCalled();
  });

  it('does not fetch subscription state while unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderScreen();

    expect(mockGetMySubscription).not.toHaveBeenCalled();
  });
});
