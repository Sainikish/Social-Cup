import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { getPublicCafeById, updateCafe, updateCafeStatus } from '../../src/features/cafes/api';
import type { AdminCafeDetailResponse, CafeDetailResponse } from '../../src/features/cafes/types';
import { AppRouter } from '../../src/routes/AppRouter';
import { CafeDetail } from '../../src/screens/CafeDetail/CafeDetail';

vi.mock('../../src/features/cafes/api');
vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockGetPublicCafeById = vi.mocked(getPublicCafeById);
const mockUpdateCafe = vi.mocked(updateCafe);
const mockUpdateCafeStatus = vi.mocked(updateCafeStatus);
const mockUseAuth = vi.mocked(useAuth);

function adminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'member-1',
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

const PUBLIC_DETAIL: CafeDetailResponse = {
  id: 'cafe-1',
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: null,
  longitude: null,
  openingHours: [],
  phoneNumber: null,
  email: null,
  website: null,
  featured: false,
  vibeTags: null,
  description: null,
  status: 'ACTIVE',
  photos: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const ADMIN_DETAIL: AdminCafeDetailResponse = {
  ...PUBLIC_DETAIL,
  payoutRate: 0.12,
};

function renderCold() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cafes/cafe-1']}>
        <Routes>
          <Route path="/cafes/:id" element={<CafeDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderWithAdminState() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{ pathname: '/cafes/cafe-1', state: { adminDetail: ADMIN_DETAIL } }]}
      >
        <Routes>
          <Route path="/cafes/:id" element={<CafeDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CafeDetail - cold load (public endpoint only)', () => {
  it('shows a loading state, then the payout-rate-unknown notice once loaded', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    renderCold();

    expect(screen.getByText('Loading cafe…')).toBeInTheDocument();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    expect(screen.getByText(/not returned by the public cafe endpoint/i)).toBeInTheDocument();
  });

  it('shows an error state with retry when the public fetch fails', async () => {
    mockGetPublicCafeById.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } },
      toJSON: () => ({}),
    });
    renderCold();

    expect(await screen.findByText('This cafe could not be found.')).toBeInTheDocument();
  });

  it('submits an update, resending fetched fields and leaving payoutRate blank (unchanged)', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    mockUpdateCafe.mockResolvedValue(ADMIN_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Daily Grind Cafe' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateCafe).toHaveBeenCalled());
    const [id, payload] = mockUpdateCafe.mock.calls[0];
    expect(id).toBe('cafe-1');
    expect(payload.name).toBe('Daily Grind Cafe');
    expect(payload.payoutRate).toBeNull();
    expect(payload.openingHours).toEqual(PUBLIC_DETAIL.openingHours);
    expect(payload.photos).toEqual(PUBLIC_DETAIL.photos);
    expect(await screen.findByText('Cafe updated successfully.')).toBeInTheDocument();
  });
});

describe('CafeDetail - fresh load (admin detail via navigation state)', () => {
  it('does not call the public endpoint, and shows the known payout rate', async () => {
    renderWithAdminState();

    expect(await screen.findByText('Daily Grind', { selector: 'h1' })).toBeInTheDocument();
    expect(mockGetPublicCafeById).not.toHaveBeenCalled();
    expect(screen.queryByText(/not returned by the public cafe endpoint/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Payout rate/)).toHaveValue('0.12');
  });
});

describe('CafeDetail - status change', () => {
  it('requires confirmation before changing status, showing current and requested status', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));

    expect(screen.getByText('Change cafe status')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('INACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(mockUpdateCafeStatus).not.toHaveBeenCalled();
  });

  it('cancels without calling the API', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Change cafe status')).not.toBeInTheDocument();
    expect(mockUpdateCafeStatus).not.toHaveBeenCalled();
  });

  it('shows success only after the backend confirms the change, based on its response', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    mockUpdateCafeStatus.mockResolvedValue({ ...ADMIN_DETAIL, status: 'INACTIVE' });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Status updated to INACTIVE.')).toBeInTheDocument();
    expect(mockUpdateCafeStatus).toHaveBeenCalledWith('cafe-1', { status: 'INACTIVE' });
  });

  it('keeps the dialog open and shows an error on a failed status change, without assuming success', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    mockUpdateCafeStatus.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Change cafe status')).toBeInTheDocument();
    expect(screen.queryByText('Status updated to INACTIVE.')).not.toBeInTheDocument();
  });

  it('shows a loading state on the confirm button while the request is in flight', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    let resolveStatus: (value: AdminCafeDetailResponse) => void = () => {};
    mockUpdateCafeStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      })
    );
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => expect(confirmButton).toBeDisabled());

    resolveStatus({ ...ADMIN_DETAIL, status: 'INACTIVE' });
    await screen.findByText('Status updated to INACTIVE.');
  });
});

describe('CafeDetail - route protection for /cafes/:id', () => {
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

  it('lets an ADMIN reach /cafes/:id', async () => {
    mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/cafes/cafe-1');

    expect(await screen.findByText('Daily Grind', { selector: 'h1' })).toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes/:id, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderRouteAt('/cafes/cafe-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetPublicCafeById).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /cafes/:id to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/cafes/cafe-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetPublicCafeById).not.toHaveBeenCalled();
  });
});
