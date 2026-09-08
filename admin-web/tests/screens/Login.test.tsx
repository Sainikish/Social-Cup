import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import { Login } from '../../src/screens/Login/Login';
import { AdminAccessRequiredError } from '../../src/utils/errors';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByText('Log In'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login', () => {
  it('renders Social Cup Admin branding and accessible labeled fields', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderScreen();

    expect(screen.getByText('Social Cup Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('Log In')).toBeInTheDocument();
  });

  it('shows validation errors for empty email and password, without calling login', () => {
    const mockLogin = vi.fn();
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fireEvent.click(screen.getByText('Log In'));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows a validation error for a malformed email', () => {
    const mockLogin = vi.fn();
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fillAndSubmit('not-an-email', 'password123');

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in successfully and navigates to /dashboard', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fillAndSubmit('admin@example.com', 'correct-horse-battery-staple');

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'correct-horse-battery-staple'));
    expect(await screen.findByText('Dashboard Screen')).toBeInTheDocument();
  });

  it('shows a loading state on the submit button while the login request is in flight', async () => {
    let resolveLogin: () => void = () => {};
    const mockLogin = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      })
    );
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    const submitButton = screen.getByText('Log In');
    fillAndSubmit('admin@example.com', 'correct-horse-battery-staple');

    await waitFor(() => expect(submitButton).toBeDisabled());

    resolveLogin();
    await screen.findByText('Dashboard Screen');
  });

  it('shows a mapped error message for invalid credentials, without navigating', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      toJSON: () => ({}),
    });
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fillAndSubmit('admin@example.com', 'wrong-password');

    expect(await screen.findByText('Incorrect email or password. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Screen')).not.toBeInTheDocument();
  });

  it('shows a mapped error message when the account is locked', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked' } },
      toJSON: () => ({}),
    });
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fillAndSubmit('admin@example.com', 'wrong-password');

    expect(
      await screen.findByText('This account is temporarily locked due to multiple failed attempts. Please wait and try again.')
    ).toBeInTheDocument();
  });

  it('shows "Admin access required" for valid credentials that are not an ADMIN, without navigating', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new AdminAccessRequiredError());
    mockUseAuth.mockReturnValue(authValue({ login: mockLogin }));

    renderScreen();
    fillAndSubmit('member@example.com', 'correct-password');

    expect(await screen.findByText('Admin access required.')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Screen')).not.toBeInTheDocument();
  });
});
