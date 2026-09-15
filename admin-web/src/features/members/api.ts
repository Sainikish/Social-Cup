import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { CreditBalanceResponse, MemberDto, MemberStatus } from './types';

// Mirrors AdminMemberController exactly:
//   GET    /admin/members                -> PageResponse<MemberDto> (search)
//   GET    /admin/members/{memberId}      -> MemberDto
//   GET    /admin/members/{memberId}/credits -> CreditBalanceResponse
//   POST   /admin/members/{memberId}/suspend    -> MemberDto
//   POST   /admin/members/{memberId}/reactivate -> MemberDto
const ADMIN_MEMBERS_PATH = '/admin/members';

export interface MemberSearchParams {
  q?: string;
  status?: MemberStatus;
  page?: number;
  size?: number;
}

export async function searchMembers(params: MemberSearchParams = {}): Promise<PageResponse<MemberDto>> {
  const response = await apiClient.get<PageResponse<MemberDto>>(ADMIN_MEMBERS_PATH, {
    params: {
      q: params.q,
      status: params.status,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return response.data;
}

export async function getMemberById(memberId: string): Promise<MemberDto> {
  const response = await apiClient.get<MemberDto>(`${ADMIN_MEMBERS_PATH}/${memberId}`);
  return response.data;
}

export async function getMemberCreditBalance(memberId: string): Promise<CreditBalanceResponse> {
  const response = await apiClient.get<CreditBalanceResponse>(`${ADMIN_MEMBERS_PATH}/${memberId}/credits`);
  return response.data;
}

// Neither write endpoint takes a request body on the backend (no
// @RequestBody parameter on either controller method) - the actor's
// identity comes from the JWT, never from anything this app sends.
export async function suspendMember(memberId: string): Promise<MemberDto> {
  const response = await apiClient.post<MemberDto>(`${ADMIN_MEMBERS_PATH}/${memberId}/suspend`);
  return response.data;
}

export async function reactivateMember(memberId: string): Promise<MemberDto> {
  const response = await apiClient.post<MemberDto>(`${ADMIN_MEMBERS_PATH}/${memberId}/reactivate`);
  return response.data;
}
