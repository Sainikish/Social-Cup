package com.socialcup.auth.dto;

import com.socialcup.security.Roles;
import com.socialcup.user.entity.Member;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MemberDto(
    UUID id,
    String email,
    String firstName,
    String lastName,
    String avatarUrl,
    String status,
    List<String> roles,
    Instant createdAt
) {
    public static MemberDto fromEntity(Member member) {
        return new MemberDto(
            member.getId(),
            member.getEmail(),
            member.getFirstName(),
            member.getLastName(),
            member.getAvatarUrl(),
            member.getStatus() != null ? member.getStatus().name() : null,
            List.of(member.getRole() != null ? member.getRole().name() : Roles.MEMBER),
            member.getCreatedAt()
        );
    }
}
