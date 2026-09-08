import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { reactivateMember, suspendMember } from '../../src/features/members/api';
import type { MemberDto } from '../../src/features/members/types';
import { AppRouter } from '../../src/routes/AppRouter';
import { MemberDetail } from '../../src/screens/MemberDetail/MemberDetail';

vi.mock('../../src/features/members/api');
vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockSuspendMember = vi.mocked(suspendMember);
const mockReactivateMember = vi.mocked(reactivateMember);
const mockUseAuth = vi.mocked(useAuth);

function adminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['ADMIN'],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

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

const ACTIVE_MEMBER: MemberDto = {
  id: 'member-1',
  email: 'grace@example.com',
  firstName: 'Grace',
  lastName: 'Hopper',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: '2026-01-01T00:00:00Z',
};

function renderCold() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/members/member-1']}>
        <Routes>
          <Route path="/members/:memberId" element={<MemberDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderWithState(member: MemberDto) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/members/member-1', state: { member } }]}>
        <Routes>
          <Route path="/members/:memberId" element={<MemberDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MemberDetail - cold arrival (no lookup endpoint exists)', () => {
  it('states plainly that member details are unavailable, with an Unknown status badge', () => {
    renderCold();

    expect(screen.getByText('Member member-1', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Unknown', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/no backend endpoint to look up a member by ID/i)).toBeInTheDocument();
  });

  it('offers both Suspend and Reactivate actions when status is unknown', () => {
    renderCold();

    expect(screen.getByText('Suspend Member')).toBeInTheDocument();
    expect(screen.getByText('Reactivate Member')).toBeInTheDocument();
  });

  it('never calls the suspend/reactivate API just from loading the screen', () => {
    renderCold();

    expect(mockSuspendMember).not.toHaveBeenCalled();
    expect(mockReactivateMember).not.toHaveBeenCalled();
  });
});

describe('MemberDetail - fresh arrival (member carried via navigation state)', () => {
  it('shows the member details and only the valid action for the known status', () => {
    renderWithState(ACTIVE_MEMBER);

    expect(screen.getByText('grace@example.com')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Suspend Member')).toBeInTheDocument();
    expect(screen.queryByText('Reactivate Member')).not.toBeInTheDocument();
  });

  it('shows only Reactivate for a suspended member', () => {
    renderWithState({ ...ACTIVE_MEMBER, status: 'SUSPENDED' });

    expect(screen.getByText('Reactivate Member')).toBeInTheDocument();
    expect(screen.queryByText('Suspend Member')).not.toBeInTheDocument();
  });
});

describe('MemberDetail - suspend action', () => {
  it('requires confirmation, showing member ID and requested action', () => {
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));

    expect(screen.getByText('Suspend member')).toBeInTheDocument();
    expect(screen.getByText('member-1', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('ACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(mockSuspendMember).not.toHaveBeenCalled();
  });

  it('cancels without calling the API', () => {
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Suspend member')).not.toBeInTheDocument();
    expect(mockSuspendMember).not.toHaveBeenCalled();
  });

  it('confirming calls suspendMember with exactly the member ID, and prevents duplicate submission', async () => {
    let resolveSuspend: (value: MemberDto) => void = () => {};
    mockSuspendMember.mockReturnValue(
      new Promise((resolve) => {
        resolveSuspend = resolve;
      })
    );
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(confirmButton).toBeDisabled());
    expect(mockSuspendMember).toHaveBeenCalledTimes(1);
    expect(mockSuspendMember).toHaveBeenCalledWith('member-1');

    resolveSuspend({ ...ACTIVE_MEMBER, status: 'SUSPENDED' });
    await screen.findByText('Member suspended successfully.');
  });

  it('shows success and updates the status badge only after the backend confirms it', async () => {
    mockSuspendMember.mockResolvedValue({ ...ACTIVE_MEMBER, status: 'SUSPENDED' });
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Member suspended successfully.')).toBeInTheDocument();
    expect(screen.getByText('SUSPENDED', { selector: 'span' })).toBeInTheDocument();
  });

  it('handles a 404 RESOURCE_NOT_FOUND without changing the displayed state', async () => {
    mockSuspendMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } },
      toJSON: () => ({}),
    });
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('No member exists with this ID.')).toBeInTheDocument();
    expect(screen.getByText('Suspend member')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE', { selector: 'span' })).toBeInTheDocument();
  });

  it('handles a 409 CONFLICT without changing the displayed state', async () => {
    mockSuspendMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'Member is already suspended' } },
      toJSON: () => ({}),
    });
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(
      await screen.findByText("This action could not be completed - the member's status may already have changed. Refresh and try again.")
    ).toBeInTheDocument();
    expect(screen.getByText('ACTIVE', { selector: 'span' })).toBeInTheDocument();
  });

  it('handles a generic server error without changing the displayed state', async () => {
    mockSuspendMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderWithState(ACTIVE_MEMBER);

    fireEvent.click(screen.getByText('Suspend Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});

describe('MemberDetail - reactivate action', () => {
  const SUSPENDED_MEMBER: MemberDto = { ...ACTIVE_MEMBER, status: 'SUSPENDED' };

  it('requires confirmation, showing member ID and requested action', () => {
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));

    expect(screen.getByText('Reactivate member')).toBeInTheDocument();
    expect(screen.getByText('SUSPENDED', { selector: 'strong' })).toBeInTheDocument();
    expect(mockReactivateMember).not.toHaveBeenCalled();
  });

  it('cancels without calling the API', () => {
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Reactivate member')).not.toBeInTheDocument();
    expect(mockReactivateMember).not.toHaveBeenCalled();
  });

  it('confirming calls reactivateMember with exactly the member ID', async () => {
    mockReactivateMember.mockResolvedValue({ ...SUSPENDED_MEMBER, status: 'ACTIVE' });
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(mockReactivateMember).toHaveBeenCalledWith('member-1'));
    expect(await screen.findByText('Member reactivated successfully.')).toBeInTheDocument();
  });

  it('shows a loading state on the confirm button while the request is in flight', async () => {
    let resolveReactivate: (value: MemberDto) => void = () => {};
    mockReactivateMember.mockReturnValue(
      new Promise((resolve) => {
        resolveReactivate = resolve;
      })
    );
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => expect(confirmButton).toBeDisabled());

    resolveReactivate({ ...SUSPENDED_MEMBER, status: 'ACTIVE' });
    await screen.findByText('Member reactivated successfully.');
  });

  it('handles a 404 RESOURCE_NOT_FOUND error', async () => {
    mockReactivateMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } },
      toJSON: () => ({}),
    });
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('No member exists with this ID.')).toBeInTheDocument();
  });

  it('handles a 409 CONFLICT error (not currently suspended)', async () => {
    mockReactivateMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'Member is not currently suspended' } },
      toJSON: () => ({}),
    });
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(
      await screen.findByText("This action could not be completed - the member's status may already have changed. Refresh and try again.")
    ).toBeInTheDocument();
  });

  it('handles a generic server error', async () => {
    mockReactivateMember.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderWithState(SUSPENDED_MEMBER);

    fireEvent.click(screen.getByText('Reactivate Member'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});

describe('MemberDetail - route protection for /members and /members/:memberId', () => {
  function renderRouteAt(path: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <AppRouter />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it('lets an ADMIN reach /members', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/members');

    expect(screen.getByText('Members', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /members, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderRouteAt('/members');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('Members', { selector: 'h1' })).not.toBeInTheDocument();
  });

  it('redirects an anonymous user away from /members to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/members');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('lets an ADMIN reach /members/:memberId', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/members/member-1');

    expect(screen.getByText('Member member-1', { selector: 'h1' })).toBeInTheDocument();
    expect(mockSuspendMember).not.toHaveBeenCalled();
    expect(mockReactivateMember).not.toHaveBeenCalled();
  });

  it('denies a MEMBER access to /members/:memberId, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderRouteAt('/members/member-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('Member member-1', { selector: 'h1' })).not.toBeInTheDocument();
  });

  it('redirects an anonymous user away from /members/:memberId to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/members/member-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
