package com.socialcup.drink.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.dto.UpdateDrinkRequest;
import com.socialcup.drink.dto.UpdateDrinkStatusRequest;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.mapper.DrinkMapper;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.rating.dto.DrinkRatingAggregate;
import com.socialcup.rating.service.RatingService;
import com.socialcup.storage.service.PhotoStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class DrinkService {

    private final DrinkRepository drinkRepository;
    private final CafeRepository cafeRepository;
    private final DrinkMapper drinkMapper;
    private final PhotoStorageService photoStorageService;
    private final RatingService ratingService;

    public DrinkService(DrinkRepository drinkRepository,
                        CafeRepository cafeRepository,
                        DrinkMapper drinkMapper,
                        PhotoStorageService photoStorageService,
                        RatingService ratingService) {
        this.drinkRepository = drinkRepository;
        this.cafeRepository = cafeRepository;
        this.drinkMapper = drinkMapper;
        this.photoStorageService = photoStorageService;
        this.ratingService = ratingService;
    }

    @Transactional(readOnly = true)
    public DrinkResponse getDrinkById(UUID id) {
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + id));
        return toResponseWithRating(drink);
    }

    @Transactional(readOnly = true)
    public PageResponse<DrinkResponse> getSignatureDrinks(Pageable pageable) {
        Page<Drink> page = drinkRepository.findAllBySignatureTrueAndStatusAndArchivedAtIsNull(DrinkStatus.ACTIVE, pageable);
        Map<UUID, DrinkRatingAggregate> aggregates = ratingService.getDrinkRatingAggregates(
            page.getContent().stream().map(Drink::getId).toList());
        return PageResponse.of(page, drink -> toResponse(drink, aggregates));
    }

    @Transactional(readOnly = true)
    public PageResponse<DrinkResponse> getDrinksByCafe(UUID cafeId, boolean includeInactive, Pageable pageable) {
        if (!cafeRepository.existsById(cafeId)) {
            throw new ResourceNotFoundException("Cafe not found with id: " + cafeId);
        }

        Page<Drink> page = includeInactive
            ? drinkRepository.findAllByCafeIdAndArchivedAtIsNull(cafeId, pageable)
            : drinkRepository.findAllByCafeIdAndStatusAndArchivedAtIsNull(cafeId, DrinkStatus.ACTIVE, pageable);

        Map<UUID, DrinkRatingAggregate> aggregates = ratingService.getDrinkRatingAggregates(
            page.getContent().stream().map(Drink::getId).toList());
        return PageResponse.of(page, drink -> toResponse(drink, aggregates));
    }

    @Transactional(readOnly = true)
    public List<DrinkResponse> getActiveDrinksForCafe(UUID cafeId) {
        List<Drink> drinks = drinkRepository.findAllByCafeIdAndStatusAndArchivedAtIsNull(cafeId, DrinkStatus.ACTIVE);
        Map<UUID, DrinkRatingAggregate> aggregates = ratingService.getDrinkRatingAggregates(
            drinks.stream().map(Drink::getId).toList());
        return drinks.stream()
            .map(drink -> toResponse(drink, aggregates))
            .toList();
    }

    public DrinkResponse createDrink(UUID cafeId, CreateDrinkRequest request) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(cafeId)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + cafeId));

        String trimmedName = request.name().trim();
        if (drinkRepository.existsByCafeIdAndNameIgnoreCaseAndArchivedAtIsNull(cafeId, trimmedName)) {
            throw new ConflictException("Drink with name '" + trimmedName + "' already exists for this cafe");
        }

        Drink drink = drinkMapper.toEntity(request, cafe);
        Drink savedDrink = drinkRepository.save(drink);
        // A brand-new drink can never already have ratings - skips the
        // otherwise-pointless round trip to RatingRepository that
        // toResponseWithRating(savedDrink) would make for a still-empty result.
        return drinkMapper.toResponse(savedDrink, null, 0);
    }

    public DrinkResponse updateDrink(UUID id, UpdateDrinkRequest request) {
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + id));

        String trimmedName = request.name().trim();
        if (drinkRepository.existsByCafeIdAndNameIgnoreCaseAndIdNotAndArchivedAtIsNull(drink.getCafe().getId(), trimmedName, id)) {
            throw new ConflictException("Drink with name '" + trimmedName + "' already exists for this cafe");
        }

        drinkMapper.updateEntity(drink, request);
        Drink updated = drinkRepository.save(drink);
        return toResponseWithRating(updated);
    }

    // Unlike a cafe's photo gallery, a drink has exactly one photoUrl field -
    // uploading a new one simply replaces it, there's no separate "remove"
    // path or primary-photo concept to maintain.
    public DrinkResponse updatePhoto(UUID id, MultipartFile photo) {
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + id));

        String photoUrl = photoStorageService.uploadPhoto(photo, "drinks/" + id);
        drink.setPhotoUrl(photoUrl);
        Drink updated = drinkRepository.save(drink);
        return toResponseWithRating(updated);
    }

    public DrinkResponse updateDrinkStatus(UUID id, UpdateDrinkStatusRequest request) {
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + id));

        drink.setStatus(request.status());
        if (request.status() == DrinkStatus.ARCHIVED) {
            drink.setArchivedAt(Instant.now());
        } else {
            drink.setArchivedAt(null);
        }

        Drink updated = drinkRepository.save(drink);
        return toResponseWithRating(updated);
    }

    // Single-drink counterpart of toResponse(Drink, Map) below, for the write
    // paths/getDrinkById that only ever have one drink in hand - still goes
    // through the same batched RatingRepository query (with a singleton
    // collection) rather than a dedicated single-drink query, so there is
    // only one code path to keep correct.
    private DrinkResponse toResponseWithRating(Drink drink) {
        Map<UUID, DrinkRatingAggregate> aggregates = ratingService.getDrinkRatingAggregates(List.of(drink.getId()));
        return toResponse(drink, aggregates);
    }

    private DrinkResponse toResponse(Drink drink, Map<UUID, DrinkRatingAggregate> aggregates) {
        DrinkRatingAggregate aggregate = aggregates.get(drink.getId());
        Double averageRating = aggregate != null ? roundToOneDecimal(aggregate.getAverageRating()) : null;
        long ratingCount = aggregate != null ? aggregate.getRatingCount() : 0L;
        return drinkMapper.toResponse(drink, averageRating, ratingCount);
    }

    // Ratings are 1-5 whole stars (see DrinkRating.rating), so a raw AVG()
    // reads like 4.333333333333333 - rounded to a single decimal place for
    // display, the same precision admin-web/mobile's star-rating UI already
    // shows elsewhere. HALF_UP matches the everyday "round half away from
    // zero" a human reading a star rating expects.
    private Double roundToOneDecimal(Double value) {
        if (value == null) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
