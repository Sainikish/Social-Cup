import type { ApiError, PageResponse } from '../src/types/api';

describe('shared API types', () => {
  it('PageResponse<T> matches the backend pagination contract', () => {
    const page: PageResponse<{ id: string }> = {
      content: [{ id: '1' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
      empty: false,
    };

    expect(page.content).toHaveLength(1);
    expect(page.empty).toBe(false);
  });

  it('ApiError matches the backend error contract, with code as the stable identifier', () => {
    const error: ApiError = {
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Drink not found',
      path: '/api/drinks/123',
      requestId: 'abc-123',
    };

    expect(error.code).toBe('RESOURCE_NOT_FOUND');
    expect(error.fieldErrors).toBeUndefined();
  });
});
