import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import * as cafeLoginApi from '../../src/features/cafeLogin/api';
import type { CafeSummaryResponse } from '../../src/features/cafeLogin/types';
import { LoginScreen } from '../../src/screens/LoginScreen';
import type { PageResponse } from '../../src/types/api';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});
vi.mock('../../src/features/cafeLogin/api');

const mockUseAuth = vi.mocked(useAuth);
const mockSearchCafes = vi.mocked(cafeLoginApi.searchCafes);

const SAMPLE_CAFE: CafeSummaryResponse = {
  id: 'cafe-1',
  name: 'Blue Bottle Coffee',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: null,
  longitude: null,
  featured: false,
  status: 'ACTIVE',
  vibeTags: null,
  primaryPhotoUrl: null,
  distanceKm: null,
};

function cafePage(content: CafeSummaryResponse[]): PageResponse<CafeSummaryResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'unauthenticated',
    cafeId: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/scanner" element={<div>Scanner Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function selectCafeAndEnterPin(pin: string) {
  fireEvent.change(screen.getByLabelText('Cafe'), { target: { value: 'Blue' } });
  const option = await screen.findByText('Blue Bottle Coffee');
  fireEvent.click(option);
  fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchCafes.mockResolvedValue(cafePage([SAMPLE_CAFE]));
});

describe('LoginScreen', () => {
  it('logs in successfully (cafe selected via the picker + PIN) and navigates to /scanner', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    await selectCafeAndEnterPin('1234');
    fireEvent.click(screen.getByText('Log In'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('cafe-1', '1234'));
    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
  });

  it('shows a mapped error message on a failed login (wrong PIN), without navigating', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      toJSON: () => ({}),
    });
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    await selectCafeAndEnterPin('0000');
    fireEvent.click(screen.getByText('Log In'));

    expect(await screen.findByText('Incorrect cafe or PIN. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });

  it('shows a mapped message when the cafe is temporarily locked', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked' } },
      toJSON: () => ({}),
    });
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    await selectCafeAndEnterPin('1234');
    fireEvent.click(screen.getByText('Log In'));

    expect(
      await screen.findByText(
        'This cafe account is temporarily locked due to multiple failed attempts. Please wait and try again.'
      )
    ).toBeInTheDocument();
  });

  it('requires both a cafe and a PIN before submitting, without calling login', () => {
    const mockLogin = vi.fn();
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fireEvent.click(screen.getByText('Log In'));

    expect(screen.getByText('Please select a cafe and enter the PIN.')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
