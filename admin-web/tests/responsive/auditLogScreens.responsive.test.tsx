import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getAuditLog } from '../../src/features/auditLog/api';
import type { AdminAuditLogResponse } from '../../src/features/auditLog/types';
import { AuditLogList } from '../../src/screens/AuditLogList/AuditLogList';

vi.mock('../../src/features/auditLog/api');

const mockGetAuditLog = vi.mocked(getAuditLog);

const ENTRY: AdminAuditLogResponse = {
  id: 'audit-1',
  actorId: 'admin-1',
  actorEmail: 'admin@example.com',
  action: 'MEMBER_SUSPENDED',
  entityType: 'member',
  entityId: 'member-1',
  oldValues: '{"status":"ACTIVE"}',
  newValues: '{"status":"SUSPENDED"}',
  createdAt: '2026-01-15T10:00:00Z',
};

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

function renderAt(width: number, path: string, routePath: string, ui: ReactElement) {
  setViewportWidth(width);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuditLog.mockResolvedValue({
    content: [ENTRY],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true,
    empty: false,
  });
});

describe.each([1024, 768])('audit log screens at %ipx', (width) => {
  it('AuditLogList renders its key content without crashing', async () => {
    renderAt(width, '/audit-log', '/audit-log', <AuditLogList />);

    expect(screen.getByText('Audit Log', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Filters', { selector: 'h2' })).toBeInTheDocument();
    expect(await screen.findByText('audit-1')).toBeInTheDocument();
  });
});
