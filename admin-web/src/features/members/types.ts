// Mirrors com.socialcup.user.entity.MemberStatus exactly.
export type MemberStatus = 'VISITOR' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';

// Mirrors com.socialcup.auth.dto.MemberDto exactly - the ONLY member shape
// that exists anywhere in the backend. Unlike Cafe/Drink, there is no
// separate admin-facing detail DTO and no public GET-by-id endpoint at
// all: this exact shape is returned only by GET /auth/me (the caller's own
// record) and by the admin suspend/reactivate responses (the acted-on
// member's record). It is never available for an arbitrary member except
// as the result of acting on them.
export interface MemberDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: MemberStatus | null;
  roles: string[];
  createdAt: string;
}
