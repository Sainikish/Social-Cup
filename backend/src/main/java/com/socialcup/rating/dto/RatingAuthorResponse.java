package com.socialcup.rating.dto;

import com.socialcup.user.entity.Member;

import java.util.UUID;

// Display-safe reviewer identity for a public drink-rating listing.
// Deliberately narrower than auth.dto.MemberDto (which additionally exposes
// email, status, roles, createdAt): those fields belong to a member viewing
// their own profile, not to anyone reading someone else's review.
public record RatingAuthorResponse(
    UUID id,
    String firstName,
    String lastName,
    String avatarUrl
) {
    public static RatingAuthorResponse fromEntity(Member member) {
        if (member == null) {
            return null;
        }
        return new RatingAuthorResponse(
            member.getId(),
            member.getFirstName(),
            member.getLastName(),
            member.getAvatarUrl()
        );
    }
}
