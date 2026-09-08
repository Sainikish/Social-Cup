import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { AdminAuditLogResponse, AuditLogListParams } from './types';

// Mirrors AdminAuditLogController exactly:
//   GET /admin/audit-log -> PageResponse<AdminAuditLogResponse>
// Read-only - there is no edit/delete endpoint for an audit log entry
// anywhere on the backend, and this app adds no such action. Every optional
// filter is passed through as-is (undefined when omitted); axios's default
// query-string serialization drops undefined values from the request rather
// than sending them as "actorId=undefined".
const ADMIN_AUDIT_LOG_PATH = '/admin/audit-log';

export async function getAuditLog(params: AuditLogListParams = {}): Promise<PageResponse<AdminAuditLogResponse>> {
  const response = await apiClient.get<PageResponse<AdminAuditLogResponse>>(ADMIN_AUDIT_LOG_PATH, {
    params: {
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      from: params.from,
      to: params.to,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort ?? 'createdAt,desc',
    },
  });
  return response.data;
}
