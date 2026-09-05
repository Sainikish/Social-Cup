import path from 'node:path';

import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { getAccessToken, getRefreshToken } from '../src/storage/authStorage';

jest.mock('../src/storage/authStorage');

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;

describe('application startup', () => {
  it('renders the root layout and lands on the login screen for a fresh, unauthenticated session', async () => {
    // A brand new install has no stored session - Phase 7.2's route guard
    // (see app/_layout.tsx) means "/" now redirects to (auth)/login rather
    // than straight into (app)/home, unlike Phase 7.1's guard-less version
    // of this same test.
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);

    renderRouter(path.join(__dirname, '..', 'app'), { initialUrl: '/' });

    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeTruthy();
    });
  });
});
