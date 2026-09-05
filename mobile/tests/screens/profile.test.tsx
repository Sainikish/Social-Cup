import { fireEvent, render, screen } from '@testing-library/react-native';

import ProfileScreen from '../../app/(app)/profile/index';
import { useAuth } from '../../src/features/auth';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileScreen', () => {
  it('shows the signed-in member email', () => {
    const logout = jest.fn();
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'member-1',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        avatarUrl: null,
        status: 'ACTIVE',
        roles: ['MEMBER'],
        createdAt: new Date().toISOString(),
      },
      login: jest.fn(),
      register: jest.fn(),
      logout,
      initializeAuth: jest.fn(),
    });

    render(<ProfileScreen />);

    expect(screen.getByText('Signed in as ada@example.com')).toBeTruthy();
  });

  it('navigates to the drink diary when "My Drink Diary" is pressed', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'member-1',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        avatarUrl: null,
        status: 'ACTIVE',
        roles: ['MEMBER'],
        createdAt: new Date().toISOString(),
      },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    render(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('My Drink Diary'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/profile/diary');
  });

  it('still logs out correctly (regression: logout must not have moved out of AuthContext)', () => {
    const logout = jest.fn();
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'member-1',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        avatarUrl: null,
        status: 'ACTIVE',
        roles: ['MEMBER'],
        createdAt: new Date().toISOString(),
      },
      login: jest.fn(),
      register: jest.fn(),
      logout,
      initializeAuth: jest.fn(),
    });

    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Log Out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
