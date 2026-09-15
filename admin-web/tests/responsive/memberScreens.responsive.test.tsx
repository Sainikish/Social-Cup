import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getMemberById, getMemberCreditBalance, searchMembers } from '../../src/features/members/api';
import type { MemberDto } from '../../src/features/members/types';
import { MemberDetail } from '../../src/screens/MemberDetail/MemberDetail';
import { MemberLookup } from '../../src/screens/MemberLookup/MemberLookup';

vi.mock('../../src/features/members/api');

const mockSearchMembers = vi.mocked(searchMembers);
const mockGetMemberById = vi.mocked(getMemberById);
const mockGetMemberCreditBalance = vi.mocked(getMemberCreditBalance);

const MEMBER: MemberDto = {
  id: 'member-1',
  email: 'grace@example.com',
  firstName: 'Grace',
  lastName: 'Hopper',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: '2026-01-01T00:00:00Z',
  emailVerified: true,
};

// jsdom does not perform real CSS layout - this verifies each member screen
// renders its key content without crashing at both the desktop-first
// target (1024px) and the smallest explicitly-supported width (768px).
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

function renderAt(width: number, path: string, routePath: string, ui: ReactElement, state?: unknown) {
  setViewportWidth(width);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const entry = state ? { pathname: path, state } : path;
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchMembers.mockResolvedValue({
    content: [MEMBER],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true,
    empty: false,
  });
  mockGetMemberById.mockResolvedValue(MEMBER);
  mockGetMemberCreditBalance.mockResolvedValue({ balance: 0 });
});

describe.each([1024, 768])('member screens at %ipx', (width) => {
  it('MemberLookup renders its key content', async () => {
    renderAt(width, '/members', '/members', <MemberLookup />);

    expect(screen.getByLabelText('Search by email or name')).toBeInTheDocument();
    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
  });

  it('MemberDetail renders once loaded when arriving cold', async () => {
    renderAt(width, '/members/member-1', '/members/:memberId', <MemberDetail />);

    expect(await screen.findByText('grace@example.com', { selector: 'h1' })).toBeInTheDocument();
  });

  it('MemberDetail renders with known details when arriving with state', () => {
    renderAt(width, '/members/member-1', '/members/:memberId', <MemberDetail />, { member: MEMBER });

    expect(screen.getByText('grace@example.com', { selector: 'h1' })).toBeInTheDocument();
  });
});
