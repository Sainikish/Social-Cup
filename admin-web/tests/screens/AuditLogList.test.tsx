import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getAuditLog } from '../../src/features/auditLog/api';
import type { AdminAuditLogResponse } from '../../src/features/auditLog/types';
import { AuditLogList } from '../../src/screens/AuditLogList/AuditLogList';

vi.mock('../../src/features/auditLog/api');

const mockGetAuditLog = vi.mocked(getAuditLog);

const SAMPLE_ENTRY: AdminAuditLogResponse = {
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

const NO_ACTOR_ENTRY: AdminAuditLogResponse = {
  ...SAMPLE_ENTRY,
  id: 'audit-2',
  actorId: null,
  actorEmail: null,
};

function pageOf(content: AdminAuditLogResponse[], overrides: Partial<Record<string, unknown>> = {}) {
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
      <MemoryRouter initialEntries={['/audit-log']}>
        <Routes>
          <Route path="/audit-log" element={<AuditLogList />} />
          <Route path="/members/:memberId" element={<div>Member Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuditLogList', () => {
  it('shows a loading state before the data resolves', () => {
    mockGetAuditLog.mockReturnValue(new Promise(() => {}));
    renderScreen();

    expect(screen.getByText('Loading audit log…')).toBeInTheDocument();
  });

  it('requests the first page with default sort and no filters on initial render', () => {
    mockGetAuditLog.mockResolvedValue(pageOf([]));
    renderScreen();

    expect(mockGetAuditLog).toHaveBeenCalledWith({ page: 0, size: 20, sort: 'createdAt,desc' });
  });

  it('renders a professional empty state for an empty page, not an error', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([]));
    renderScreen();

    expect(await screen.findByText('No audit log entries found.')).toBeInTheDocument();
  });

  it('renders an error state with retry on a failed fetch', async () => {
    mockGetAuditLog.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('shows an access-denied message for a 403 response', async () => {
    mockGetAuditLog.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('You are not authorized to perform this action.')).toBeInTheDocument();
  });

  it('renders every backend-provided field, preserving oldValues/newValues exactly', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([SAMPLE_ENTRY]));
    renderScreen();

    expect(await screen.findByText('audit-1')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com').closest('a')).toHaveAttribute('href', '/members/admin-1');
    expect(screen.getByText('MEMBER_SUSPENDED')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
    expect(screen.getByText('member-1')).toBeInTheDocument();
    expect(screen.getByText('{"status":"ACTIVE"}')).toBeInTheDocument();
    expect(screen.getByText('{"status":"SUSPENDED"}')).toBeInTheDocument();
  });

  it('shows "—" (never a fabricated label) when actorId/actorEmail are null', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([NO_ACTOR_ENTRY]));
    renderScreen();

    await screen.findByText('audit-2');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('never calculates or displays a financial total not provided by the backend', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([SAMPLE_ENTRY]));
    renderScreen();

    await screen.findByText('audit-1');

    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
  });

  it('offers no edit or delete action', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([SAMPLE_ENTRY]));
    renderScreen();

    await screen.findByText('audit-1');

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('applies the actorId/entityType/entityId/from/to filters and resets to the first page', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No audit log entries found.');
    fireEvent.change(screen.getByLabelText('Actor ID'), { target: { value: 'admin-1' } });
    fireEvent.change(screen.getByLabelText('Entity Type'), { target: { value: 'member' } });
    fireEvent.change(screen.getByLabelText('Entity ID'), { target: { value: 'member-1' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByText('Apply Filters'));

    expect(mockGetAuditLog).toHaveBeenLastCalledWith({
      actorId: 'admin-1',
      entityType: 'member',
      entityId: 'member-1',
      from: '2026-01-01',
      to: '2026-01-31',
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
    });
  });

  it('shows a validation error and does not call the API again when "To" is before "From"', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No audit log entries found.');
    const callsBeforeSubmit = mockGetAuditLog.mock.calls.length;

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-31' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByText('Apply Filters'));

    expect(await screen.findByText('"To" cannot be before "From".')).toBeInTheDocument();
    expect(mockGetAuditLog.mock.calls.length).toBe(callsBeforeSubmit);
  });

  it('resets filters back to an unfiltered first-page request', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No audit log entries found.');
    fireEvent.change(screen.getByLabelText('Actor ID'), { target: { value: 'admin-1' } });
    fireEvent.click(screen.getByText('Apply Filters'));
    fireEvent.click(screen.getByText('Reset'));

    expect(mockGetAuditLog).toHaveBeenLastCalledWith({ page: 0, size: 20, sort: 'createdAt,desc' });
    expect((screen.getByLabelText('Actor ID') as HTMLInputElement).value).toBe('');
  });

  it('changing sort order requests the first page with the new sort', async () => {
    mockGetAuditLog.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No audit log entries found.');
    fireEvent.change(screen.getByLabelText('Sort by created date'), { target: { value: 'createdAt,asc' } });

    expect(mockGetAuditLog).toHaveBeenLastCalledWith({ page: 0, size: 20, sort: 'createdAt,asc' });
  });

  it('renders Pagination controls for a multi-page result and requests the next page', async () => {
    mockGetAuditLog.mockResolvedValue(
      pageOf([SAMPLE_ENTRY], { totalElements: 41, totalPages: 3, first: true, last: false })
    );
    renderScreen();

    await screen.findByText('audit-1');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    const previousButton = screen.getByText('Previous');
    const nextButton = screen.getByText('Next');
    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    expect(mockGetAuditLog).toHaveBeenLastCalledWith({ page: 1, size: 20, sort: 'createdAt,desc' });
  });

  it('disables the Next button on the last page', async () => {
    mockGetAuditLog.mockResolvedValue(
      pageOf([SAMPLE_ENTRY], { page: 2, totalElements: 41, totalPages: 3, first: false, last: true })
    );
    renderScreen();

    await screen.findByText('audit-1');

    expect(screen.getByText('Next')).toBeDisabled();
    expect(screen.getByText('Previous')).not.toBeDisabled();
  });
});
