import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';

import ProfileScreen from '../../app/(app)/profile/index';
import { useAuth, type AuthContextValue } from '../../src/features/auth';
import * as creditsApi from '../../src/features/credits/api';
import * as subscriptionApi from '../../src/features/subscription/api';
import type { SubscriptionResponse } from '../../src/features/subscription/types';
import type { MemberDto } from '../../src/types/auth';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

jest.mock('../../src/features/credits/api');
jest.mock('../../src/features/subscription/api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetMyCreditBalance = creditsApi.getMyCreditBalance as jest.MockedFunction<
  typeof creditsApi.getMyCreditBalance
>;
const mockGetMySubscription = subscriptionApi.getMySubscription as jest.MockedFunction<
  typeof subscriptionApi.getMySubscription
>;

function member(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    id: 'member-1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['MEMBER'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

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

function authAs(user: MemberDto, logout: () => Promise<void> = jest.fn()): void {
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user,
    login: jest.fn(),
    register: jest.fn(),
    logout,
    initializeAuth: jest.fn(),
  } satisfies AuthContextValue);
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Sensible defaults for the new membership card - individual tests below
  // override these where the credit/subscription state itself is what's
  // being tested; every pre-existing test in this file only cares about the
  // identity/logout/diary-navigation behavior above the membership card.
  mockGetMyCreditBalance.mockResolvedValue({ balance: 26 });
  mockGetMySubscription.mockRejectedValue(notFoundError());
});

describe('ProfileScreen', () => {
  it('shows the first name, last name, and email from the authenticated member', () => {
    authAs(member());

    renderScreen();

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
  });

  it('shows an avatar image when avatarUrl is present', () => {
    authAs(member({ avatarUrl: 'https://example.com/ada.jpg' }));

    renderScreen();

    expect(screen.getByLabelText('Ada Lovelace avatar')).toBeTruthy();
  });

  it('falls back to an initial-letter avatar when there is no avatarUrl', () => {
    authAs(member({ avatarUrl: null }));

    renderScreen();

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to a broken-image placeholder if the avatar URL fails to load', () => {
    authAs(member({ avatarUrl: 'https://example.com/broken.jpg' }));

    renderScreen();
    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('omits the name line when the member has no first or last name, without crashing', () => {
    authAs(member({ firstName: null, lastName: null }));

    renderScreen();

    expect(screen.getByText('ada@example.com')).toBeTruthy();
  });

  it('shows the account status only when it is not the normal ACTIVE state', () => {
    authAs(member({ status: 'SUSPENDED' }));

    renderScreen();

    expect(screen.getByText('Account status')).toBeTruthy();
    expect(screen.getByText('Suspended')).toBeTruthy();
  });

  it('does not show an account status row for a normal ACTIVE member', () => {
    authAs(member({ status: 'ACTIVE' }));

    renderScreen();

    expect(screen.queryByText('Account status')).toBeNull();
  });

  it('communicates that account details are read-only', () => {
    authAs(member());

    renderScreen();

    expect(screen.getByText('Your account details are read-only here.')).toBeTruthy();
  });

  it('never renders the password or raw roles/JWT internals', () => {
    authAs(member());

    renderScreen();

    expect(screen.queryByText(/password/i)).toBeNull();
    expect(screen.queryByText('MEMBER')).toBeNull();
  });

  it('navigates to the drink diary when "My Drink Diary" is pressed', () => {
    authAs(member());

    renderScreen();
    fireEvent.press(screen.getByLabelText('My Drink Diary'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/profile/diary');
  });

  it('still logs out correctly (regression: logout must not have moved out of AuthContext)', () => {
    const logout = jest.fn();
    authAs(member(), logout);

    renderScreen();
    fireEvent.press(screen.getByLabelText('Sign out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  describe('Membership card (Phase F)', () => {
    it('shows the credit balance once loaded', async () => {
      authAs(member());
      mockGetMyCreditBalance.mockResolvedValue({ balance: 26 });

      renderScreen();

      expect(await screen.findByText('26 credits')).toBeTruthy();
      expect(screen.getByText('Credit balance')).toBeTruthy();
    });

    it('shows the "Not subscribed" summary when the member has no subscription', async () => {
      authAs(member());
      mockGetMySubscription.mockRejectedValue(notFoundError());

      renderScreen();

      expect(await screen.findByText('Not subscribed')).toBeTruthy();
    });

    it('shows the Active membership summary when the member has an active subscription', async () => {
      authAs(member());
      mockGetMySubscription.mockResolvedValue(subscription({ status: 'ACTIVE' }));

      renderScreen();

      expect(await screen.findByText('Active')).toBeTruthy();
    });

    it('navigates to the subscription screen when "Manage Membership" is pressed', () => {
      authAs(member());

      renderScreen();
      fireEvent.press(screen.getByLabelText('Manage membership'));

      expect(mockPush).toHaveBeenCalledWith('/(app)/profile/subscription');
    });
  });
});
