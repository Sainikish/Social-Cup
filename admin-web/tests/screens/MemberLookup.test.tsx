import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { searchMembers } from '../../src/features/members/api';
import type { MemberDto } from '../../src/features/members/types';
import { MemberLookup } from '../../src/screens/MemberLookup/MemberLookup';

vi.mock('../../src/features/members/api');

const mockSearchMembers = vi.mocked(searchMembers);

const SAMPLE_MEMBER: MemberDto = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: '2026-01-15T00:00:00Z',
  emailVerified: true,
};

function pageOf(content: MemberDto[], overrides: Partial<Record<string, unknown>> = {}) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/members']}>
        <Routes>
          <Route path="/members" element={<MemberLookup />} />
          <Route path="/members/:memberId" element={<div>Member Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MemberLookup', () => {
  it('shows a loading state before the data resolves', () => {
    mockSearchMembers.mockReturnValue(new Promise(() => {}));
    renderScreen();

    expect(screen.getByText('Loading members…')).toBeInTheDocument();
  });

  it('requests the first page with no filters on initial render', () => {
    mockSearchMembers.mockResolvedValue(pageOf([]));
    renderScreen();

    expect(mockSearchMembers).toHaveBeenCalledWith({ page: 0, size: 20 });
  });

  it('renders a professional empty state for an empty page, not an error', async () => {
    mockSearchMembers.mockResolvedValue(pageOf([]));
    renderScreen();

    expect(await screen.findByText('No members matched these filters.')).toBeInTheDocument();
  });

  it('renders an error state with retry on a failed fetch', async () => {
    mockSearchMembers.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('renders matching members in a table, linking each row to its detail screen', async () => {
    mockSearchMembers.mockResolvedValue(pageOf([SAMPLE_MEMBER]));
    renderScreen();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ada@example.com'));
    expect(screen.getByText('Member Detail Screen')).toBeInTheDocument();
  });

  it('applies the search query and status filter together', async () => {
    mockSearchMembers.mockResolvedValue(pageOf([]));
    renderScreen();
    await screen.findByText('No members matched these filters.');

    fireEvent.change(screen.getByLabelText('Search by email or name'), { target: { value: 'ada' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'SUSPENDED' } });
    fireEvent.click(screen.getByText('Search'));

    expect(mockSearchMembers).toHaveBeenLastCalledWith({ q: 'ada', status: 'SUSPENDED', page: 0, size: 20 });
  });

  it('reset clears the applied filters', async () => {
    mockSearchMembers.mockResolvedValue(pageOf([]));
    renderScreen();
    await screen.findByText('No members matched these filters.');

    fireEvent.change(screen.getByLabelText('Search by email or name'), { target: { value: 'ada' } });
    fireEvent.click(screen.getByText('Search'));
    fireEvent.click(screen.getByText('Reset'));

    expect(mockSearchMembers).toHaveBeenLastCalledWith({ page: 0, size: 20 });
  });
});
