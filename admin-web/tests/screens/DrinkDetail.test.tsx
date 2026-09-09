import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { getPublicDrinkById, updateDrink, updateDrinkStatus } from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import { AppRouter } from '../../src/routes/AppRouter';
import { DrinkDetail } from '../../src/screens/DrinkDetail/DrinkDetail';

vi.mock('../../src/features/drinks/api');
vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockGetPublicDrinkById = vi.mocked(getPublicDrinkById);
const mockUpdateDrink = vi.mocked(updateDrink);
const mockUpdateDrinkStatus = vi.mocked(updateDrinkStatus);
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

const DRINK: DrinkResponse = {
  id: 'drink-1',
  cafeId: 'cafe-1',
  cafeName: 'Daily Grind',
  name: 'Iced Latte',
  type: 'Coffee',
  description: 'Espresso over ice.',
  retailPrice: 4.5,
  creditPrice: 2,
  photoUrl: null,
  signature: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderCold() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/drinks/drink-1']}>
        <Routes>
          <Route path="/drinks/:drinkId" element={<DrinkDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderWithState() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/drinks/drink-1', state: { drink: DRINK, cafeName: 'Daily Grind' } }]}>
        <Routes>
          <Route path="/drinks/:drinkId" element={<DrinkDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DrinkDetail - cold load (public endpoint only)', () => {
  it('shows a loading state, then the drink once loaded', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    renderCold();

    expect(screen.getByText('Loading drink…')).toBeInTheDocument();

    expect(await screen.findByText('Iced Latte', { selector: 'h1' })).toBeInTheDocument();
  });

  it('renders the photo when photoUrl is present, and none when it is null', async () => {
    mockGetPublicDrinkById.mockResolvedValue({ ...DRINK, photoUrl: 'https://example.test/drink.jpg' });
    renderCold();

    const image = await screen.findByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.test/drink.jpg');
  });

  it('shows no photo when the drink has none, rather than a fabricated placeholder', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows an error state with retry when the public fetch fails', async () => {
    mockGetPublicDrinkById.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } },
      toJSON: () => ({}),
    });
    renderCold();

    expect(await screen.findByText('This drink could not be found.')).toBeInTheDocument();
  });

  it('submits an update with the full form payload', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    mockUpdateDrink.mockResolvedValue({ ...DRINK, name: 'Iced Oat Latte' });
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Iced Oat Latte' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateDrink).toHaveBeenCalled());
    const [id, payload] = mockUpdateDrink.mock.calls[0];
    expect(id).toBe('drink-1');
    expect(payload.name).toBe('Iced Oat Latte');
    expect(payload.retailPrice).toBe(4.5);
    expect(payload.creditPrice).toBe(2);
    expect(await screen.findByText('Drink updated successfully.')).toBeInTheDocument();
  });
});

describe('DrinkDetail - fresh load (via navigation state)', () => {
  it('does not call the public endpoint', async () => {
    renderWithState();

    expect(await screen.findByText('Iced Latte', { selector: 'h1' })).toBeInTheDocument();
    expect(mockGetPublicDrinkById).not.toHaveBeenCalled();
  });
});

describe('DrinkDetail - status change', () => {
  it('requires confirmation, showing current and requested status', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));

    expect(screen.getByText('Change drink status')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('INACTIVE', { selector: 'strong' })).toBeInTheDocument();
    expect(mockUpdateDrinkStatus).not.toHaveBeenCalled();
  });

  it('warns that archiving is permanent when requesting ARCHIVED', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set ARCHIVED'));

    expect(screen.getByText(/Archiving a drink is permanent/)).toBeInTheDocument();
  });

  it('cancels without calling the API', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Change drink status')).not.toBeInTheDocument();
    expect(mockUpdateDrinkStatus).not.toHaveBeenCalled();
  });

  it('shows success only after the backend confirms the change', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    mockUpdateDrinkStatus.mockResolvedValue({ ...DRINK, status: 'INACTIVE' });
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Status updated to INACTIVE.')).toBeInTheDocument();
    expect(mockUpdateDrinkStatus).toHaveBeenCalledWith('drink-1', { status: 'INACTIVE' });
  });

  it('keeps the dialog open and shows an error on a failed status change, without assuming success', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    mockUpdateDrinkStatus.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Change drink status')).toBeInTheDocument();
    expect(screen.queryByText('Status updated to INACTIVE.')).not.toBeInTheDocument();
  });

  it('shows a loading state on the confirm button while the request is in flight', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    let resolveStatus: (value: DrinkResponse) => void = () => {};
    mockUpdateDrinkStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      })
    );
    renderCold();

    await screen.findByText('Iced Latte', { selector: 'h1' });
    fireEvent.click(screen.getByText('Set INACTIVE'));
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => expect(confirmButton).toBeDisabled());

    resolveStatus({ ...DRINK, status: 'INACTIVE' });
    await screen.findByText('Status updated to INACTIVE.');
  });
});

describe('DrinkDetail - route protection for /drinks/:drinkId', () => {
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

  it('lets an ADMIN reach /drinks/:drinkId', async () => {
    mockGetPublicDrinkById.mockResolvedValue(DRINK);
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/drinks/drink-1');

    expect(await screen.findByText('Iced Latte', { selector: 'h1' })).toBeInTheDocument();
  });

  it('denies a MEMBER access to /drinks/:drinkId, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderRouteAt('/drinks/drink-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetPublicDrinkById).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /drinks/:drinkId to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/drinks/drink-1');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetPublicDrinkById).not.toHaveBeenCalled();
  });
});
