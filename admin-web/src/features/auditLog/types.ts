// Mirrors com.socialcup.admin.dto.AdminAuditLogResponse exactly - every value
// here is read verbatim from the backend's already-persisted AuditLog row
// (and its nullable actor association). Nothing here is recalculated
// client-side, and there is no request DTO anywhere in this feature -
// GET /admin/audit-log is the only endpoint, and it is read-only.
// actorId/actorEmail are both null when the acting member has since been
// deleted (actor_id is ON DELETE SET NULL on the backend) - never fabricated.
// oldValues/newValues are raw JSON text exactly as the backend returns them;
// this app never parses, reformats, or recalculates anything from them.
export interface AdminAuditLogResponse {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  createdAt: string;
}

// Every one of these mirrors an optional @RequestParam on
// AdminAuditLogController.getAuditLog - actorId is a UUID string,
// entityType/entityId are exact-match strings, from/to are ISO yyyy-MM-dd
// dates (to is inclusive of the whole day, per the backend's exclusive-
// upper-bound conversion). All are genuinely optional; omitting one omits
// it from the request entirely rather than sending it as an empty string.
export interface AuditLogFilters {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
}

// Adds the backend's pagination/sort params to the filters above - default
// sort is "createdAt,desc" at the API layer below so the newest events show
// first without the caller having to specify it every time.
export interface AuditLogListParams extends AuditLogFilters {
  page?: number;
  size?: number;
  sort?: string;
}
