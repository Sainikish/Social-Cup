import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import { AppRouter } from '../../src/routes/AppRouter';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'unauthenticated',
    cafeId: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('route protection', () => {
  it('redirects an unauthenticated user away from /scanner to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ status: 'unauthenticated' }));

    renderAt('/scanner');

    expect(screen.getByText('Social Cup Barista')).toBeInTheDocument();
    expect(screen.queryByText('Scan a code')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated user away from /result to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ status: 'unauthenticated' }));

    renderAt('/result');

    expect(screen.getByText('Social Cup Barista')).toBeInTheDocument();
  });

  it('redirects an authenticated user away from /login to /scanner', () => {
    mockUseAuth.mockReturnValue(authValue({ status: 'authenticated', cafeId: 'cafe-1' }));

    renderAt('/login');

    expect(screen.getByText('Scan a code')).toBeInTheDocument();
    expect(screen.queryByText('Social Cup Barista')).not.toBeInTheDocument();
  });

  it('shows a checking/loading state rather than redirecting while session status is unresolved', () => {
    mockUseAuth.mockReturnValue(authValue({ status: 'checking' }));

    renderAt('/scanner');

    expect(screen.getByText('Checking session…')).toBeInTheDocument();
  });

  it('lets an authenticated user reach /scanner', () => {
    mockUseAuth.mockReturnValue(authValue({ status: 'authenticated', cafeId: 'cafe-1' }));

    renderAt('/scanner');

    expect(screen.getByText('Scan a code')).toBeInTheDocument();
  });
});
