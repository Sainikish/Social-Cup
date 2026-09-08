import type { AuditLogListParams } from './types';

// `all` is the invalidation root; `list` is keyed on the full params object
// (filters + page/size/sort) so every distinct filter/page combination gets
// its own cache entry.
export const auditLogKeys = {
  all: ['auditLog'] as const,
  list: (params: AuditLogListParams) => [...auditLogKeys.all, 'list', params] as const,
};
