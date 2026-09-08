import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getPublicCafeById, searchCafes } from '../../src/features/cafes/api';
import type { CafeDetailResponse } from '../../src/features/cafes/types';
import { CafeCreate } from '../../src/screens/CafeCreate/CafeCreate';
import { CafeDetail } from '../../src/screens/CafeDetail/CafeDetail';
import { CafeList } from '../../src/screens/CafeList/CafeList';

vi.mock('../../src/features/cafes/api');

const mockSearchCafes = vi.mocked(searchCafes);
const mockGetPublicCafeById = vi.mocked(getPublicCafeById);

const PUBLIC_DETAIL: CafeDetailResponse = {
  id: 'cafe-1',
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: null,
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
  drinks: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// jsdom does not perform real CSS layout, so this cannot verify visual
// layout - it verifies each cafe screen renders its key content without
// crashing at both the desktop-first target (1024px) and the smallest
// explicitly-supported width (768px), by driving window.innerWidth and the
// matchMedia queries the CSS Modules' @media rules rely on.
function setViewportWidth(width: number) {
  window.innerWidth = width;
  window.matchMedia =
    window.matchMedia ??
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
}

function renderAt(width: number, path: string, ui: ReactElement, detailRoute = false) {
  setViewportWidth(width);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={detailRoute ? '/cafes/:id' : path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchCafes.mockResolvedValue({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
  });
  mockGetPublicCafeById.mockResolvedValue(PUBLIC_DETAIL);
});

describe.each([1024, 768])('cafe screens at %ipx', (width) => {
  it('CafeList renders its key content', () => {
    renderAt(width, '/cafes', <CafeList />);

    expect(screen.getByText('Cafes')).toBeInTheDocument();
    expect(screen.getByText('Create Cafe')).toBeInTheDocument();
  });

  it('CafeCreate renders its form', () => {
    renderAt(width, '/cafes/new', <CafeCreate />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
  });

  it('CafeDetail renders once loaded', async () => {
    renderAt(width, '/cafes/cafe-1', <CafeDetail />, true);

    expect(await screen.findByText('Daily Grind', { selector: 'h1' })).toBeInTheDocument();
  });
});
