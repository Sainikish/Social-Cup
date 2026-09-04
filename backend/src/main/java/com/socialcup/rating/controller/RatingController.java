package com.socialcup.rating.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.rating.dto.CreateRatingRequest;
import com.socialcup.rating.dto.DrinkRatingResponse;
import com.socialcup.rating.dto.RatingResponse;
import com.socialcup.rating.dto.UpdateRatingRequest;
import com.socialcup.rating.service.RatingService;
import com.socialcup.security.CurrentUserResolver;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/drinks/{drinkId}/ratings")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping
    public ResponseEntity<RatingResponse> createRating(
            @PathVariable UUID drinkId,
            @Valid @RequestBody CreateRatingRequest request,
            Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        RatingResponse response = ratingService.createRating(drinkId, memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping
    public ResponseEntity<RatingResponse> updateRating(
            @PathVariable UUID drinkId,
            @Valid @RequestBody UpdateRatingRequest request,
            Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        RatingResponse response = ratingService.updateRating(drinkId, memberId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<DrinkRatingResponse>> getRatingsForDrink(
            @PathVariable UUID drinkId,
            Pageable pageable) {
        return ResponseEntity.ok(ratingService.getRatingsForDrink(drinkId, pageable));
    }
}
