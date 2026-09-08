import { apiClient } from '../../../src/api/client';
import { getAuditLog } from '../../../src/features/auditLog/api';
import type { AdminAuditLogResponse } from '../../../src/features/auditLog/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);

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

const EMPTY_PAGE = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('audit log api', () => {
  it('getAuditLog with no filters calls GET /admin/audit-log with only page/size/sort defaults', async () => {
    mockGet.mockResolvedValue({ data: EMPTY_PAGE });

    await getAuditLog();

    expect(mockGet).toHaveBeenCalledWith('/admin/audit-log', {
      params: {
        actorId: undefined,
        entityType: undefined,
        entityId: undefined,
        from: undefined,
        to: undefined,
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      },
    });
  });

  it('getAuditLog passes every filter and pagination param through exactly', async () => {
    mockGet.mockResolvedValue({ data: EMPTY_PAGE });

    await getAuditLog({
      actorId: 'admin-1',
      entityType: 'member',
      entityId: 'member-1',
      from: '2026-01-01',
      to: '2026-01-31',
      page: 2,
      size: 50,
      sort: 'createdAt,asc',
    });

    expect(mockGet).toHaveBeenCalledWith('/admin/audit-log', {
      params: {
        actorId: 'admin-1',
        entityType: 'member',
        entityId: 'member-1',
        from: '2026-01-01',
        to: '2026-01-31',
        page: 2,
        size: 50,
        sort: 'createdAt,asc',
      },
    });
  });

  it('getAuditLog returns the PageResponse content, including oldValues/newValues, unchanged', async () => {
    mockGet.mockResolvedValue({
      data: { ...EMPTY_PAGE, content: [SAMPLE_ENTRY], totalElements: 1, totalPages: 1, empty: false },
    });

    const result = await getAuditLog();

    expect(result.content).toEqual([SAMPLE_ENTRY]);
    expect(result.content[0].oldValues).toBe('{"status":"ACTIVE"}');
    expect(result.content[0].newValues).toBe('{"status":"SUSPENDED"}');
  });

  it('getAuditLog propagates a 403 ACCESS_DENIED error unchanged', async () => {
    const forbiddenError = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(forbiddenError);

    await expect(getAuditLog()).rejects.toBe(forbiddenError);
  });

  it('getAuditLog propagates a 400 TYPE_MISMATCH error unchanged for an invalid filter', async () => {
    const typeMismatchError = {
      isAxiosError: true,
      response: { status: 400, data: { code: 'TYPE_MISMATCH', message: "Parameter 'actorId' has an invalid value" } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(typeMismatchError);

    await expect(getAuditLog({ actorId: 'not-a-uuid' })).rejects.toBe(typeMismatchError);
  });
});
