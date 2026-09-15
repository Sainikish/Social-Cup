// Mirrors com.socialcup.user.entity.MemberStatus exactly.
export type MemberStatus = 'VISITOR' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';

// Mirrors com.socialcup.auth.dto.MemberDto exactly - the ONLY member shape
// that exists anywhere in the backend, returned by GET /auth/me, by
// GET /admin/members (search) and GET /admin/members/{id}, and by the
// admin suspend/reactivate responses alike.
export interface MemberDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: MemberStatus | null;
  roles: string[];
  createdAt: string;
  emailVerified: boolean;
}

// Mirrors com.socialcup.credit.dto.CreditBalanceResponse exactly.
export interface CreditBalanceResponse {
  balance: number;
}
