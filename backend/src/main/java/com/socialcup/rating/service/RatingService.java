package com.socialcup.rating.service;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.rating.dto.CreateRatingRequest;
import com.socialcup.rating.dto.DrinkRatingResponse;
import com.socialcup.rating.dto.RatingResponse;
import com.socialcup.rating.dto.UpdateRatingRequest;
import com.socialcup.rating.entity.DrinkRating;
import com.socialcup.rating.mapper.RatingMapper;
import com.socialcup.rating.repository.RatingRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class RatingService {

    private final RatingRepository ratingRepository;
    private final DrinkRepository drinkRepository;
    private final MemberRepository memberRepository;
    private final RatingMapper ratingMapper;

    public RatingService(RatingRepository ratingRepository,
                          DrinkRepository drinkRepository,
                          MemberRepository memberRepository,
                          RatingMapper ratingMapper) {
        this.ratingRepository = ratingRepository;
        this.drinkRepository = drinkRepository;
        this.memberRepository = memberRepository;
        this.ratingMapper = ratingMapper;
    }

    public RatingResponse createRating(UUID drinkId, UUID memberId, CreateRatingRequest request) {
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(drinkId)
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + drinkId));
        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));

        if (ratingRepository.existsByMemberIdAndDrinkId(memberId, drinkId)) {
            throw new ConflictException("You have already rated this drink");
        }

        DrinkRating drinkRating = ratingMapper.toEntity(request, member, drink);
        DrinkRating saved = ratingRepository.save(drinkRating);
        return ratingMapper.toResponse(saved);
    }

    // Ownership is enforced by scoping the lookup to (drinkId, memberId) taken
    // from the authenticated principal - there is no code path here that can
    // ever fetch or mutate another member's rating, by construction rather
    // than by an after-the-fact ownership comparison.
    public RatingResponse updateRating(UUID drinkId, UUID memberId, UpdateRatingRequest request) {
        if (!drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)) {
            throw new ResourceNotFoundException("Drink not found with id: " + drinkId);
        }

        DrinkRating drinkRating = ratingRepository.findByMemberIdAndDrinkId(memberId, drinkId)
            .orElseThrow(() -> new ResourceNotFoundException("Rating not found for this drink"));

        ratingMapper.updateEntity(drinkRating, request);
        DrinkRating updated = ratingRepository.save(drinkRating);
        return ratingMapper.toResponse(updated);
    }

    @Transactional(readOnly = true)
    public PageResponse<DrinkRatingResponse> getRatingsForDrink(UUID drinkId, Pageable pageable) {
        if (!drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)) {
            throw new ResourceNotFoundException("Drink not found with id: " + drinkId);
        }

        Page<DrinkRating> page = ratingRepository.findAllByDrinkId(drinkId, pageable);
        return PageResponse.of(page, ratingMapper::toDrinkRatingResponse);
    }

    @Transactional(readOnly = true)
    public PageResponse<RatingResponse> getRatingsForMember(UUID memberId, Pageable pageable) {
        Page<DrinkRating> page = ratingRepository.findAllByMemberId(memberId, pageable);
        return PageResponse.of(page, ratingMapper::toResponse);
    }
}
