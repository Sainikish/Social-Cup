import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import { Dashboard } from '../../src/screens/Dashboard/Dashboard';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: 'member-1',
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: null,
      status: 'ACTIVE',
      roles: ['ADMIN'],
      createdAt: '2026-01-01T00:00:00Z',
    },
    login: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  it('renders the Social Cup Admin placeholder for an authenticated ADMIN, with no invented metrics', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Social Cup Admin')).toBeInTheDocument();
    expect(screen.getByText('More of the dashboard is coming in later implementation phases.')).toBeInTheDocument();
    expect(screen.getByText('Signed in as admin@example.com')).toBeInTheDocument();
  });

  it('calls logout when "Log out" is pressed', () => {
    const logout = vi.fn();
    mockUseAuth.mockReturnValue(authValue({ logout }));

    renderDashboard();
    fireEvent.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('links to /cafes via the "Manage Cafes" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Cafes')).toBeInTheDocument();
  });

  it('links to /members via the "Manage Members" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Members')).toBeInTheDocument();
  });

  it('links to /subscriptions via the "Manage Subscriptions" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Subscriptions')).toBeInTheDocument();
  });

  it('links to /payouts via the "Manage Payouts" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Payouts')).toBeInTheDocument();
  });
});
