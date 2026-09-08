import { apiClient } from '../../api/client';
import type { MemberDto } from './types';

// AdminMemberController exposes ONLY these two write endpoints - there is
// no GET here and none should ever be added: no admin member-list endpoint
// and no admin get-member-by-id endpoint exist on the backend. Do not add
// GET /admin/members or GET /admin/members/{memberId} - they do not exist.
const ADMIN_MEMBERS_PATH = '/admin/members';

// Neither endpoint takes a request body on the backend (no @RequestBody
// parameter on either controller method) - the actor's identity comes from
// the JWT, never from anything this app sends.
export async function suspendMember(memberId: string): Promise<MemberDto> {
  const response = await apiClient.post<MemberDto>(`${ADMIN_MEMBERS_PATH}/${memberId}/suspend`);
  return response.data;
}

export async function reactivateMember(memberId: string): Promise<MemberDto> {
  const response = await apiClient.post<MemberDto>(`${ADMIN_MEMBERS_PATH}/${memberId}/reactivate`);
  return response.data;
}
