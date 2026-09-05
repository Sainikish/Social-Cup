import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import LoginScreen from '../../app/(auth)/login';
import { useAuth } from '../../src/features/auth';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderLoginScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen', () => {
  it('logs in successfully with valid credentials', async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderLoginScreen();

    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'correct-password');
    fireEvent.press(screen.getByText('Log In'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct-password' });
    });
    expect(screen.queryByText(/Email is required/)).toBeNull();
    expect(screen.queryByText(/Incorrect email or password/)).toBeNull();
  });

  it('shows validation errors and never calls login when fields are empty', async () => {
    const mockLogin = jest.fn();
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderLoginScreen();

    fireEvent.press(screen.getByText('Log In'));

    expect(await screen.findByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows a user-facing message (not the raw backend error) when login is rejected', async () => {
    const apiError = {
      response: {
        status: 401,
        data: {
          timestamp: new Date().toISOString(),
          status: 401,
          error: 'Unauthorized',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          path: '/auth/login',
          requestId: 'req-1',
        },
      },
      isAxiosError: true,
      toJSON: () => ({}),
    };
    const mockLogin = jest.fn().mockRejectedValue(apiError);
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderLoginScreen();

    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-password');
    fireEvent.press(screen.getByText('Log In'));

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    // The technical backend code/message must never reach the UI directly.
    expect(screen.queryByText('INVALID_CREDENTIALS')).toBeNull();
    expect(screen.queryByText('Invalid email or password')).toBeNull();
  });
});
