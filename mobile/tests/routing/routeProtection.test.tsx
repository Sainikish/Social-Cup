import path from 'node:path';

import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import * as authApi from '../../src/api/auth';
import * as cafesApi from '../../src/features/cafes/api';
import { getAccessToken, getRefreshToken } from '../../src/storage/authStorage';
import type { MemberDto } from '../../src/types/auth';

jest.mock('../../src/api/auth');
jest.mock('../../src/storage/authStorage');
jest.mock('../../src/features/cafes/api');

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockGetCurrentUser = authApi.getCurrentUser as jest.MockedFunction<typeof authApi.getCurrentUser>;
const mockGetFeaturedCafes = cafesApi.getFeaturedCafes as jest.MockedFunction<
  typeof cafesApi.getFeaturedCafes
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
});
