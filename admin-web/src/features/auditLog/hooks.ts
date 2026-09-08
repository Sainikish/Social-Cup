import { useQuery } from '@tanstack/react-query';

import { getAuditLog } from './api';
import { auditLogKeys } from './queryKeys';
import type { AuditLogListParams } from './types';

export function useAuditLogQuery(params: AuditLogListParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => getAuditLog(params),
  });
}
