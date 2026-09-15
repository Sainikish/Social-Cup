import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import {
  addCafePhoto,
  getCafeByIdForAdmin,
  removeCafePhoto,
  resetCafePin,
  updateCafe,
  updateCafeStatus,
} from '../../src/features/cafes/api';
import type { AdminCafeDetailResponse } from '../../src/features/cafes/types';
import { AppRouter } from '../../src/routes/AppRouter';
import { CafeDetail } from '../../src/screens/CafeDetail/CafeDetail';

vi.mock('../../src/features/cafes/api');
vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockGetCafeByIdForAdmin = vi.mocked(getCafeByIdForAdmin);
const mockUpdateCafe = vi.mocked(updateCafe);
const mockUpdateCafeStatus = vi.mocked(updateCafeStatus);
const mockAddCafePhoto = vi.mocked(addCafePhoto);
const mockRemoveCafePhoto = vi.mocked(removeCafePhoto);
const mockResetCafePin = vi.mocked(resetCafePin);
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

// Both arrival paths yield exactly this shape now - GET /admin/cafes/{id}
// (cold) and the create/update/status mutation responses (fresh) are all
// AdminCafeDetailResponse, payoutRate always included.
const CAFE_DETAIL: AdminCafeDetailResponse = {
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
  payoutRate: 0.12,
  featured: false,
  vibeTags: null,
  description: null,
  status: 'ACTIVE',
  photos: [],
  drinks: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
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
        initialEntries={[{ pathname: '/cafes/cafe-1', state: { adminDetail: CAFE_DETAIL } }]}
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

describe('CafeDetail - cold load (via GET /admin/cafes/{id})', () => {
  it('shows a loading state, then the cafe once loaded, with its payout rate already known', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    expect(screen.getByText('Loading cafe…')).toBeInTheDocument();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    expect(screen.getByLabelText(/Payout rate/)).toHaveValue('0.12');
    expect(screen.queryByText(/not returned by the public cafe endpoint/i)).not.toBeInTheDocument();
  });

  it('shows an error state with retry when the fetch fails', async () => {
    mockGetCafeByIdForAdmin.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } },
      toJSON: () => ({}),
    });
    renderCold();

    expect(await screen.findByText('This cafe could not be found.')).toBeInTheDocument();
  });

  it('submits an update, resending fetched fields including the already-known payout rate', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    mockUpdateCafe.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Daily Grind Cafe' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateCafe).toHaveBeenCalled());
    const [id, payload] = mockUpdateCafe.mock.calls[0];
    expect(id).toBe('cafe-1');
    expect(payload.name).toBe('Daily Grind Cafe');
    expect(payload.payoutRate).toBe(0.12);
    expect(payload.openingHours).toEqual(CAFE_DETAIL.openingHours);
    expect(payload.photos).toEqual(CAFE_DETAIL.photos);
    expect(await screen.findByText('Cafe updated successfully.')).toBeInTheDocument();
  });
});

describe('CafeDetail - fresh load (admin detail via navigation state)', () => {
  it('does not call getCafeByIdForAdmin, and shows the known payout rate', async () => {
    renderWithAdminState();

    expect(await screen.findByText('Daily Grind', { selector: 'h1' })).toBeInTheDocument();
    expect(mockGetCafeByIdForAdmin).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Payout rate/)).toHaveValue('0.12');
  });
});

describe('CafeDetail - status change', () => {
  it('requires confirmation before changing status, showing current and requested status', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));

    expect(screen.getByText('Change cafe status')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('INACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(mockUpdateCafeStatus).not.toHaveBeenCalled();
  });

  it('cancels without calling the API', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Change cafe status')).not.toBeInTheDocument();
    expect(mockUpdateCafeStatus).not.toHaveBeenCalled();
  });

  it('shows success only after the backend confirms the change, based on its response', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    mockUpdateCafeStatus.mockResolvedValue({ ...CAFE_DETAIL, status: 'INACTIVE' });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Status updated to INACTIVE.')).toBeInTheDocument();
    expect(mockUpdateCafeStatus).toHaveBeenCalledWith('cafe-1', { status: 'INACTIVE' });
  });

  it('keeps the dialog open and shows an error on a failed status change, without assuming success', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
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
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
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

    resolveStatus({ ...CAFE_DETAIL, status: 'INACTIVE' });
    await screen.findByText('Status updated to INACTIVE.');
  });

  // Proves the archived-cafe-lockout fix at the UI level: a cafe already
  // ARCHIVED (found only via the admin cafe list, never public search) can
  // still be reactivated from here, not just archived.
  it('offers Set ACTIVE and Set INACTIVE (not Set ARCHIVED) for an already-archived cafe', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue({ ...CAFE_DETAIL, status: 'ARCHIVED' });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    expect(screen.getByText('Set ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Set INACTIVE')).toBeInTheDocument();
    expect(screen.queryByText('Set ARCHIVED')).not.toBeInTheDocument();
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
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/cafes/cafe-1');

    expect(await screen.findByText('Daily Grind', { selector: 'h1' })).toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes/:id, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderRouteAt('/cafes/cafe-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetCafeByIdForAdmin).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /cafes/:id to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/cafes/cafe-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetCafeByIdForAdmin).not.toHaveBeenCalled();
  });
});

describe('CafeDetail - photo management', () => {
  function selectFile(file: File) {
    const input = screen.getByLabelText('Upload cafe photo');
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('cold load: uploading a photo refetches the admin detail (no already-held detail to merge into)', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValueOnce(CAFE_DETAIL).mockResolvedValueOnce({
      ...CAFE_DETAIL,
      photos: [{ id: 'photo-1', photoUrl: 'https://example.test/new.jpg', caption: null, displayOrder: 0, isPrimary: true }],
    });
    mockAddCafePhoto.mockResolvedValue({
      id: 'photo-1',
      photoUrl: 'https://example.test/new.jpg',
      caption: null,
      displayOrder: 0,
      isPrimary: true,
    });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    selectFile(file);

    await waitFor(() => expect(mockAddCafePhoto).toHaveBeenCalledWith('cafe-1', file));
    await waitFor(() => expect(mockGetCafeByIdForAdmin).toHaveBeenCalledTimes(2));
    // The large "primary photo" display and the gallery thumbnail both render
    // the same photo once it's the only one.
    const images = await waitFor(() => {
      const found = screen.getAllByRole('img');
      expect(found).toHaveLength(2);
      return found;
    });
    expect(images.every((image) => image.getAttribute('src') === 'https://example.test/new.jpg')).toBe(true);
  });

  it('admin state: uploading a photo appends it to the gallery directly', async () => {
    mockAddCafePhoto.mockResolvedValue({
      id: 'photo-2',
      photoUrl: 'https://example.test/second.jpg',
      caption: null,
      displayOrder: 1,
      isPrimary: false,
    });
    renderWithAdminState();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    selectFile(file);

    await waitFor(() => expect(mockAddCafePhoto).toHaveBeenCalledWith('cafe-1', file));
    // The large "primary photo" display and the gallery thumbnail both render
    // the same photo once it's the only one.
    const images = await waitFor(() => {
      const found = screen.getAllByRole('img');
      expect(found).toHaveLength(2);
      return found;
    });
    expect(images.every((image) => image.getAttribute('src') === 'https://example.test/second.jpg')).toBe(true);
  });

  it('admin state: removing the primary photo promotes the next one', async () => {
    const withPhotos = {
      ...CAFE_DETAIL,
      photos: [
        { id: 'photo-1', photoUrl: 'https://example.test/primary.jpg', caption: null, displayOrder: 0, isPrimary: true },
        { id: 'photo-2', photoUrl: 'https://example.test/second.jpg', caption: null, displayOrder: 1, isPrimary: false },
      ],
    };
    mockRemoveCafePhoto.mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/cafes/cafe-1', state: { adminDetail: withPhotos } }]}>
          <Routes>
            <Route path="/cafes/:id" element={<CafeDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText('Daily Grind', { selector: 'h1' });
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(mockRemoveCafePhoto).toHaveBeenCalledWith('cafe-1', 'photo-1'));
    // Down to one remaining photo (promoted to primary): the large "primary
    // photo" display plus its one gallery thumbnail.
    const images = await waitFor(() => {
      const found = screen.getAllByRole('img');
      expect(found).toHaveLength(2);
      return found;
    });
    expect(images.every((image) => image.getAttribute('src') === 'https://example.test/second.jpg')).toBe(true);
  });

  it('shows an error message when the backend rejects the photo', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    mockAddCafePhoto.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { code: 'INVALID_PHOTO', message: 'bad photo' } },
      toJSON: () => ({}),
    });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    selectFile(new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' }));

    expect(
      await screen.findByText('Please choose a JPEG, PNG, or WebP image no larger than 5MB.')
    ).toBeInTheDocument();
  });
});

describe('CafeDetail - Phase 3 drinks integration', () => {
  it('shows an empty-drinks message and clearly states the active-drinks-only limitation when the cafe has none', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    expect(screen.getByText('No active drinks at this cafe yet.')).toBeInTheDocument();
    expect(screen.getByText('active drinks only', { exact: false })).toBeInTheDocument();
  });

  it('lists the cafe detail response\'s embedded active drinks, without a separate fetch', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue({
      ...CAFE_DETAIL,
      drinks: [
        {
          id: 'drink-1',
          cafeId: 'cafe-1',
          cafeName: 'Daily Grind',
          name: 'Iced Latte',
          type: 'Coffee',
          description: null,
          retailPrice: 4.5,
          creditPrice: 2,
          photoUrl: null,
          signature: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    expect(screen.getByText('Iced Latte', { exact: false })).toBeInTheDocument();
  });

  it('renders the primary photo when photos are present, and none when the list is empty', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue({
      ...CAFE_DETAIL,
      photos: [
        { id: 'photo-1', photoUrl: 'https://example.test/secondary.jpg', caption: null, displayOrder: 1, isPrimary: false },
        { id: 'photo-2', photoUrl: 'https://example.test/primary.jpg', caption: 'Storefront', displayOrder: 0, isPrimary: true },
      ],
    });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    // One large "primary photo" image plus one gallery thumbnail per photo.
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute('src', 'https://example.test/primary.jpg');
    const thumbnailSrcs = images.slice(1).map((image) => image.getAttribute('src'));
    expect(thumbnailSrcs).toEqual(
      expect.arrayContaining(['https://example.test/secondary.jpg', 'https://example.test/primary.jpg'])
    );
  });

  it('shows no photo when the cafe has none, rather than a fabricated placeholder', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('still renders cafe create/edit/status/search entry points unaffected by the new Drinks section', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    expect(screen.getByText('Manage Drinks')).toBeInTheDocument();
    expect(screen.getByText('Add Drink')).toBeInTheDocument();
    expect(screen.getByText('Manage Payouts')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Set INACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Set ARCHIVED')).toBeInTheDocument();
  });
});

describe('CafeDetail - Barista Access (PIN reset / scan link)', () => {
  it('shows a scan link built from the cafe id', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });

    expect(screen.getByText(/\/login\?cafe=cafe-1/)).toBeInTheDocument();
  });

  it('reveals a freshly reset PIN once, in a dismissable dialog, and never before the request resolves', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    mockResetCafePin.mockResolvedValue({ pin: '482913' });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    expect(screen.queryByText('482913')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Generate / Reset PIN'));

    expect(await screen.findByText('482913')).toBeInTheDocument();
    expect(mockResetCafePin).toHaveBeenCalledWith('cafe-1');

    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByText('482913')).not.toBeInTheDocument();
  });

  it('shows an error message when resetting the PIN fails, without opening the reveal dialog', async () => {
    mockGetCafeByIdForAdmin.mockResolvedValue(CAFE_DETAIL);
    mockResetCafePin.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderCold();

    await screen.findByText('Daily Grind', { selector: 'h1' });
    fireEvent.click(screen.getByText('Generate / Reset PIN'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByLabelText('New PIN')).not.toBeInTheDocument();
  });
});
