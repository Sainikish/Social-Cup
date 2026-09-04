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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DrinkService {

    private final DrinkRepository drinkRepository;
    private final CafeRepository cafeRepository;
    private final DrinkMapper drinkMapper;

    public DrinkService(DrinkRepository drinkRepository,
                        CafeRepository cafeRepository,
                        DrinkMapper drinkMapper) {
        this.drinkRepository = drinkRepository;
        this.cafeRepository = cafeRepository;
        this.drinkMapper = drinkMapper;
    }

    @Transactional(readOnly = true)
    public DrinkResponse getDrinkById(UUID id) {
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + id));
        return drinkMapper.toResponse(drink);
    }

    @Transactional(readOnly = true)
    public PageResponse<DrinkResponse> getSignatureDrinks(Pageable pageable) {
        Page<Drink> page = drinkRepository.findAllBySignatureTrueAndStatusAndArchivedAtIsNull(DrinkStatus.ACTIVE, pageable);
        return PageResponse.of(page, drinkMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public PageResponse<DrinkResponse> getDrinksByCafe(UUID cafeId, boolean includeInactive, Pageable pageable) {
        if (!cafeRepository.existsById(cafeId)) {
            throw new ResourceNotFoundException("Cafe not found with id: " + cafeId);
        }

        Page<Drink> page = includeInactive
            ? drinkRepository.findAllByCafeIdAndArchivedAtIsNull(cafeId, pageable)
            : drinkRepository.findAllByCafeIdAndStatusAndArchivedAtIsNull(cafeId, DrinkStatus.ACTIVE, pageable);

        return PageResponse.of(page, drinkMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<DrinkResponse> getActiveDrinksForCafe(UUID cafeId) {
        return drinkRepository.findAllByCafeIdAndStatusAndArchivedAtIsNull(cafeId, DrinkStatus.ACTIVE)
            .stream()
            .map(drinkMapper::toResponse)
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
        return drinkMapper.toResponse(savedDrink);
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
        return drinkMapper.toResponse(updated);
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
        return drinkMapper.toResponse(updated);
    }
}
