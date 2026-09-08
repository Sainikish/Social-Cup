import { apiClient } from '../../../src/api/client';
import { reactivateMember, suspendMember } from '../../../src/features/members/api';
import type { MemberDto } from '../../../src/features/members/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { post: vi.fn() } };
});

const mockPost = vi.mocked(apiClient.post);

const SAMPLE_MEMBER: MemberDto = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'SUSPENDED',
  roles: ['MEMBER'],
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('members api', () => {
  it('suspendMember calls POST /admin/members/{id}/suspend with no request body', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_MEMBER });

    const result = await suspendMember('member-1');

    expect(mockPost).toHaveBeenCalledWith('/admin/members/member-1/suspend');
    expect(mockPost.mock.calls[0]).toHaveLength(1);
    expect(result).toEqual(SAMPLE_MEMBER);
  });

  it('reactivateMember calls POST /admin/members/{id}/reactivate with no request body', async () => {
    mockPost.mockResolvedValue({ data: { ...SAMPLE_MEMBER, status: 'ACTIVE' } });

    const result = await reactivateMember('member-1');

    expect(mockPost).toHaveBeenCalledWith('/admin/members/member-1/reactivate');
    expect(mockPost.mock.calls[0]).toHaveLength(1);
    expect(result.status).toBe('ACTIVE');
  });

  it('suspendMember propagates a 404 RESOURCE_NOT_FOUND error unchanged', async () => {
    const notFoundError = {
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Member not found with id: member-1' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(notFoundError);

    await expect(suspendMember('member-1')).rejects.toBe(notFoundError);
  });

  it('suspendMember propagates a 409 CONFLICT (already suspended) error unchanged', async () => {
    const conflictError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'Member is already suspended' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(conflictError);

    await expect(suspendMember('member-1')).rejects.toBe(conflictError);
  });

  it('reactivateMember propagates a 409 CONFLICT (not currently suspended) error unchanged', async () => {
    const conflictError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'Member is not currently suspended' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(conflictError);

    await expect(reactivateMember('member-1')).rejects.toBe(conflictError);
  });

  it('reactivateMember propagates a generic server error unchanged', async () => {
    const serverError = {
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(serverError);

    await expect(reactivateMember('member-1')).rejects.toBe(serverError);
  });
});
