import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import RegisterScreen from '../../app/(auth)/register';
import { useAuth } from '../../src/features/auth';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderRegisterScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterScreen', () => {
  it('registers successfully with valid fields, using only backend-supported fields', async () => {
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: jest.fn(),
      register: mockRegister,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderRegisterScreen();

    fireEvent.changeText(screen.getByLabelText('First name'), 'Ada');
    fireEvent.changeText(screen.getByLabelText('Last name'), 'Lovelace');
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'a-strong-password');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'a-strong-password',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });
  });

  it('shows validation errors and never calls register for an invalid email and short password', async () => {
    const mockRegister = jest.fn();
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: jest.fn(),
      register: mockRegister,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderRegisterScreen();

    fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    fireEvent.press(screen.getByText('Create Account'));

    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(screen.getByText('Password must be at least 8 characters long')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows a user-facing message when the backend reports the email is already registered', async () => {
    const apiError = {
      response: {
        status: 409,
        data: {
          timestamp: new Date().toISOString(),
          status: 409,
          error: 'Conflict',
          code: 'CONFLICT',
          message: 'Email already registered: ada@example.com',
          path: '/auth/register',
          requestId: 'req-2',
        },
      },
      isAxiosError: true,
      toJSON: () => ({}),
    };
    const mockRegister = jest.fn().mockRejectedValue(apiError);
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: jest.fn(),
      register: mockRegister,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderRegisterScreen();

    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'a-strong-password');
    fireEvent.press(screen.getByText('Create Account'));

    expect(await screen.findByText('An account with this email already exists.')).toBeTruthy();
    expect(screen.queryByText('CONFLICT')).toBeNull();
  });
});
