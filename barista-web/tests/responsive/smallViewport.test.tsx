import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import { LoginScreen } from '../../src/screens/LoginScreen';
import { RedemptionResultScreen } from '../../src/screens/RedemptionResultScreen';
import { ScannerScreen } from '../../src/screens/ScannerScreen';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'authenticated',
    cafeId: 'cafe-1',
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

// jsdom does not apply real CSS media queries/reflow, so this is a basic
// smoke check (matches the requested "basic small-viewport rendering
// tests"), not a visual regression test - it confirms every primary screen
// still renders its main content and CTA with a narrow viewport set, rather
// than asserting pixel layout.
function setSmallViewport() {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 640 });
  window.dispatchEvent(new Event('resize'));
}

function renderAtRoute(ui: ReactElement, initialEntry: string | { pathname: string; state?: unknown }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={ui} />
          <Route path="/scanner" element={ui} />
          <Route path="/result" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setSmallViewport();
  mockUseAuth.mockReturnValue(authValue());
});

describe('small-viewport rendering', () => {
  it('renders LoginScreen at a small viewport', () => {
    renderAtRoute(<LoginScreen />, '/login');
    expect(screen.getByText('Social Cup Barista')).toBeInTheDocument();
    expect(screen.getByText('Log In')).toBeInTheDocument();
  });

  it('renders ScannerScreen at a small viewport', () => {
    renderAtRoute(<ScannerScreen />, '/scanner');
    expect(screen.getByText('Scan a code')).toBeInTheDocument();
    expect(screen.getByText('Start Scanner')).toBeInTheDocument();
  });

  it('renders RedemptionResultScreen at a small viewport', () => {
    renderAtRoute(<RedemptionResultScreen />, {
      pathname: '/result',
      state: {
        outcome: {
          status: 'success',
          data: {
            redemptionId: 'r1',
            drinkId: 'd1',
            drinkName: 'Oat Milk Latte',
            creditsDeducted: 4,
            memberFirstName: 'Ada',
            redeemedAt: '2026-01-01T00:00:00Z',
          },
        },
      },
    });
    expect(screen.getByText('Redemption Successful')).toBeInTheDocument();
    expect(screen.getByText('Scan Next')).toBeInTheDocument();
  });
});
