import path from 'node:path';

import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import * as authApi from '../../src/api/auth';
import * as cafesApi from '../../src/features/cafes/api';
import * as creditsApi from '../../src/features/credits/api';
import * as subscriptionApi from '../../src/features/subscription/api';
import { getAccessToken, getRefreshToken } from '../../src/storage/authStorage';
import type { MemberDto } from '../../src/types/auth';

jest.mock('../../src/api/auth');
jest.mock('../../src/storage/authStorage');
jest.mock('../../src/features/cafes/api');
jest.mock('../../src/features/credits/api');
jest.mock('../../src/features/subscription/api');

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockGetCurrentUser = authApi.getCurrentUser as jest.MockedFunction<typeof authApi.getCurrentUser>;
const mockGetFeaturedCafes = cafesApi.getFeaturedCafes as jest.MockedFunction<
  typeof cafesApi.getFeaturedCafes
>;
const mockGetMyCreditBalance = creditsApi.getMyCreditBalance as jest.MockedFunction<
  typeof creditsApi.getMyCreditBalance
>;
const mockGetMySubscription = subscriptionApi.getMySubscription as jest.MockedFunction<
  typeof subscriptionApi.getMySubscription
>;

const SAMPLE_USER: MemberDto = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: new Date().toISOString(),
};

const APP_DIR = path.join(__dirname, '..', '..', 'app');

beforeEach(() => {
  // The authenticated landing screen (Home) now fetches featured cafes for
  // real (Phase 7.3) - this must never depend on a live backend, so it's
  // mocked here just like the auth modules already are.
  mockGetFeaturedCafes.mockResolvedValue({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
  });
  // The Profile screen (Phase F) now fetches the member's credit balance and
  // subscription status - not the concern of these route-protection tests,
  // so both are stubbed to a resolved, unsubscribed default.
  mockGetMyCreditBalance.mockResolvedValue({ balance: 0 });
  mockGetMySubscription.mockRejectedValue({
    isAxiosError: true,
    response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'No subscription found' } },
    toJSON: () => ({}),
  });
});

describe('route protection', () => {
  it('lets an authenticated user reach protected (app) routes rather than (auth)', async () => {
    mockGetAccessToken.mockResolvedValue('valid-access-token');
    mockGetRefreshToken.mockResolvedValue('valid-refresh-token');
    mockGetCurrentUser.mockResolvedValue(SAMPLE_USER);

    renderRouter(APP_DIR, { initialUrl: '/(auth)/login' });

    await waitFor(() => {
      expect(screen.getByText('Discover Social Cup')).toBeTruthy();
    });
    expect(screen.queryByText('Welcome back')).toBeNull();
  });

  it('redirects an unauthenticated user away from protected (app) routes to login', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);

    renderRouter(APP_DIR, { initialUrl: '/(app)/home' });

    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeTruthy();
    });
    expect(screen.queryByText('Discover Social Cup')).toBeNull();
  });

  it('clears protected navigation state and returns to login when signing out from a nested (app) route', async () => {
    mockGetAccessToken.mockResolvedValue('valid-access-token');
    mockGetRefreshToken.mockResolvedValue('valid-refresh-token');
    mockGetCurrentUser.mockResolvedValue(SAMPLE_USER);

    // Profile is a nested Stack screen (its own header, distinct from the
    // Home tab root) - starting here rather than at Home is what proves
    // Stack.Protected tears down the ENTIRE (app) subtree on sign-out,
    // regardless of how deep the user was when they logged out.
    renderRouter(APP_DIR, { initialUrl: '/(app)/profile' });

    await waitFor(() => {
      expect(screen.getByText('ada@example.com')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Sign out'));

    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeTruthy();
    });
    expect(screen.queryByText('ada@example.com')).toBeNull();
  });
});
