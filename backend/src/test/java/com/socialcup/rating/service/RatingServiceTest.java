package com.socialcup.rating.service;

import com.socialcup.cafe.entity.Cafe;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RatingServiceTest {

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private DrinkRepository drinkRepository;

    @Mock
    private MemberRepository memberRepository;

    private RatingMapper ratingMapper;
    private RatingService ratingService;

    @BeforeEach
    void setUp() {
        ratingMapper = new RatingMapper();
        ratingService = new RatingService(ratingRepository, drinkRepository, memberRepository, ratingMapper);
    }

    private static Drink newDrink(UUID id) {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Blue Bottle Coffee");

        Drink drink = new Drink();
        drink.setId(id);
        drink.setCafe(cafe);
        drink.setName("Cortado");
        return drink;
    }

    private static Member newMember(UUID id) {
        Member member = new Member();
        member.setId(id);
        member.setFirstName("Ada");
        member.setLastName("Lovelace");
        return member;
    }

    @Test
    void createRating_success() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        Drink drink = newDrink(drinkId);
        Member member = newMember(memberId);

        CreateRatingRequest request = new CreateRatingRequest(5, "Excellent espresso!");

        when(drinkRepository.findByIdAndArchivedAtIsNull(drinkId)).thenReturn(Optional.of(drink));
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(ratingRepository.existsByMemberIdAndDrinkId(memberId, drinkId)).thenReturn(false);
        when(ratingRepository.save(any(DrinkRating.class))).thenAnswer(inv -> {
            DrinkRating r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        RatingResponse response = ratingService.createRating(drinkId, memberId, request);

        assertThat(response).isNotNull();
        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.note()).isEqualTo("Excellent espresso!");
        assertThat(response.drinkId()).isEqualTo(drinkId);
        assertThat(response.drinkName()).isEqualTo("Cortado");
        assertThat(response.cafeName()).isEqualTo("Blue Bottle Coffee");
        verify(ratingRepository).save(any(DrinkRating.class));
    }

    @Test
    void createRating_drinkNotFound_throwsResourceNotFoundException() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        when(drinkRepository.findByIdAndArchivedAtIsNull(drinkId)).thenReturn(Optional.empty());

        CreateRatingRequest request = new CreateRatingRequest(4, null);

        assertThatThrownBy(() -> ratingService.createRating(drinkId, memberId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Drink not found");
    }

    @Test
    void createRating_memberNotFound_throwsResourceNotFoundException() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        when(drinkRepository.findByIdAndArchivedAtIsNull(drinkId)).thenReturn(Optional.of(newDrink(drinkId)));
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.empty());

        CreateRatingRequest request = new CreateRatingRequest(4, null);

        assertThatThrownBy(() -> ratingService.createRating(drinkId, memberId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Member not found");
    }

    @Test
    void createRating_duplicate_throwsConflictException() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        when(drinkRepository.findByIdAndArchivedAtIsNull(drinkId)).thenReturn(Optional.of(newDrink(drinkId)));
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(newMember(memberId)));
        when(ratingRepository.existsByMemberIdAndDrinkId(memberId, drinkId)).thenReturn(true);

        CreateRatingRequest request = new CreateRatingRequest(4, null);

        assertThatThrownBy(() -> ratingService.createRating(drinkId, memberId, request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already rated");
    }

    @Test
    void updateRating_success() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        DrinkRating existing = new DrinkRating();
        existing.setId(UUID.randomUUID());
        existing.setMember(newMember(memberId));
        existing.setDrink(newDrink(drinkId));
        existing.setRating(3);
        existing.setNote("Meh");

        when(drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)).thenReturn(true);
        when(ratingRepository.findByMemberIdAndDrinkId(memberId, drinkId)).thenReturn(Optional.of(existing));
        when(ratingRepository.save(any(DrinkRating.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateRatingRequest request = new UpdateRatingRequest(5, "Actually great!");
        RatingResponse response = ratingService.updateRating(drinkId, memberId, request);

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.note()).isEqualTo("Actually great!");
    }

    @Test
    void updateRating_drinkArchived_throwsResourceNotFoundException() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        when(drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)).thenReturn(false);

        UpdateRatingRequest request = new UpdateRatingRequest(5, null);

        assertThatThrownBy(() -> ratingService.updateRating(drinkId, memberId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Drink not found");
    }

    @Test
    void updateRating_noExistingRating_throwsResourceNotFoundException() {
        UUID drinkId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        when(drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)).thenReturn(true);
        when(ratingRepository.findByMemberIdAndDrinkId(memberId, drinkId)).thenReturn(Optional.empty());

        UpdateRatingRequest request = new UpdateRatingRequest(5, null);

        assertThatThrownBy(() -> ratingService.updateRating(drinkId, memberId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Rating not found");
    }

    @Test
    void updateRating_onlyEverTouchesCallersOwnRating() {
        // Two different members each rate the same drink. Member B calling
        // update must only ever be able to find/mutate their OWN row - the
        // repository lookup is scoped by (memberId, drinkId), so there is no
        // path by which member B's update call could return member A's rating.
        UUID drinkId = UUID.randomUUID();
        UUID memberA = UUID.randomUUID();
        UUID memberB = UUID.randomUUID();

        when(drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)).thenReturn(true);
        when(ratingRepository.findByMemberIdAndDrinkId(memberB, drinkId)).thenReturn(Optional.empty());

        UpdateRatingRequest request = new UpdateRatingRequest(1, "trying to overwrite someone else's rating");

        assertThatThrownBy(() -> ratingService.updateRating(drinkId, memberB, request))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(ratingRepository).findByMemberIdAndDrinkId(memberB, drinkId);
    }

    @Test
    void getRatingsForDrink_drinkNotFound_throwsResourceNotFoundException() {
        UUID drinkId = UUID.randomUUID();
        when(drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)).thenReturn(false);

        Pageable pageable = PageRequest.of(0, 10);

        assertThatThrownBy(() -> ratingService.getRatingsForDrink(drinkId, pageable))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Drink not found");
    }

    @Test
    void getRatingsForDrink_returnsPageOfDrinkRatingResponses() {
        UUID drinkId = UUID.randomUUID();
        DrinkRating rating = new DrinkRating();
        rating.setId(UUID.randomUUID());
        rating.setDrink(newDrink(drinkId));
        rating.setMember(newMember(UUID.randomUUID()));
        rating.setRating(4);
        rating.setNote("Solid");

        Pageable pageable = PageRequest.of(0, 10);
        when(drinkRepository.existsByIdAndArchivedAtIsNull(drinkId)).thenReturn(true);
        when(ratingRepository.findAllByDrinkId(drinkId, pageable))
            .thenReturn(new PageImpl<>(List.of(rating), pageable, 1));

        PageResponse<DrinkRatingResponse> result = ratingService.getRatingsForDrink(drinkId, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().rating()).isEqualTo(4);
        assertThat(result.getContent().getFirst().author().firstName()).isEqualTo("Ada");
    }

    @Test
    void getRatingsForMember_returnsPageOfRatingResponses() {
        UUID memberId = UUID.randomUUID();
        DrinkRating rating = new DrinkRating();
        rating.setId(UUID.randomUUID());
        rating.setDrink(newDrink(UUID.randomUUID()));
        rating.setMember(newMember(memberId));
        rating.setRating(5);

        Pageable pageable = PageRequest.of(0, 10);
        when(ratingRepository.findAllByMemberId(memberId, pageable))
            .thenReturn(new PageImpl<>(List.of(rating), pageable, 1));

        PageResponse<RatingResponse> result = ratingService.getRatingsForMember(memberId, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().rating()).isEqualTo(5);
        assertThat(result.getContent().getFirst().drinkName()).isEqualTo("Cortado");
    }
}
