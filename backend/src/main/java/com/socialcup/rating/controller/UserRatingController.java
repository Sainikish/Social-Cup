package com.socialcup.rating.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.rating.dto.RatingResponse;
import com.socialcup.rating.service.RatingService;
import com.socialcup.security.CurrentUserResolver;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/users/me")
public class UserRatingController {

    private final RatingService ratingService;

    public UserRatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @GetMapping("/ratings")
    public ResponseEntity<PageResponse<RatingResponse>> getMyRatings(Pageable pageable, Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        return ResponseEntity.ok(ratingService.getRatingsForMember(memberId, pageable));
    }

    // The drink diary is the same DrinkRating data as /users/me/ratings - see
    // RatingService.getRatingsForMember - presented as a chronological journal
    // (newest first by default) rather than duplicated into a separate entity,
    // table, or query. A caller can still request a different sort explicitly;
    // this only changes the default when none is given.
    @GetMapping("/diary")
    public ResponseEntity<PageResponse<RatingResponse>> getMyDiary(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        return ResponseEntity.ok(ratingService.getRatingsForMember(memberId, pageable));
    }
}
