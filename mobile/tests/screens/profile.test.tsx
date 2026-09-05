import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';

import ProfileScreen from '../../app/(app)/profile/index';
import { useAuth, type AuthContextValue } from '../../src/features/auth';
import type { MemberDto } from '../../src/types/auth';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function member(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    id: 'member-1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['MEMBER'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function authAs(user: MemberDto, logout: () => Promise<void> = jest.fn()): void {
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user,
    login: jest.fn(),
    register: jest.fn(),
    logout,
    initializeAuth: jest.fn(),
  } satisfies AuthContextValue);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileScreen', () => {
  it('shows the first name, last name, and email from the authenticated member', () => {
    authAs(member());

    render(<ProfileScreen />);

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
  });

  it('shows an avatar image when avatarUrl is present', () => {
    authAs(member({ avatarUrl: 'https://example.com/ada.jpg' }));

    render(<ProfileScreen />);

    expect(screen.getByLabelText('Ada Lovelace avatar')).toBeTruthy();
  });

  it('falls back to an initial-letter avatar when there is no avatarUrl', () => {
    authAs(member({ avatarUrl: null }));

    render(<ProfileScreen />);

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to a broken-image placeholder if the avatar URL fails to load', () => {
    authAs(member({ avatarUrl: 'https://example.com/broken.jpg' }));

    render(<ProfileScreen />);
    fireEvent(screen.UNSAFE_getByType(Image), 'error');

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('omits the name line when the member has no first or last name, without crashing', () => {
    authAs(member({ firstName: null, lastName: null }));

    render(<ProfileScreen />);

    expect(screen.getByText('ada@example.com')).toBeTruthy();
  });

  it('shows the account status only when it is not the normal ACTIVE state', () => {
    authAs(member({ status: 'SUSPENDED' }));

    render(<ProfileScreen />);

    expect(screen.getByText('Account status')).toBeTruthy();
    expect(screen.getByText('Suspended')).toBeTruthy();
  });

  it('does not show an account status row for a normal ACTIVE member', () => {
    authAs(member({ status: 'ACTIVE' }));

    render(<ProfileScreen />);

    expect(screen.queryByText('Account status')).toBeNull();
  });

  it('communicates that account details are read-only', () => {
    authAs(member());

    render(<ProfileScreen />);

    expect(screen.getByText('Your account details are read-only here.')).toBeTruthy();
  });

  it('never renders the password or raw roles/JWT internals', () => {
    authAs(member());

    render(<ProfileScreen />);

    expect(screen.queryByText(/password/i)).toBeNull();
    expect(screen.queryByText('MEMBER')).toBeNull();
  });

  it('navigates to the drink diary when "My Drink Diary" is pressed', () => {
    authAs(member());

    render(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('My Drink Diary'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/profile/diary');
  });

  it('still logs out correctly (regression: logout must not have moved out of AuthContext)', () => {
    const logout = jest.fn();
    authAs(member(), logout);

    render(<ProfileScreen />);
    fireEvent.press(screen.getByLabelText('Sign out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
