package com.socialcup.payout.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.payout.dto.CalculatePayoutRequest;
import com.socialcup.payout.dto.PayoutResponse;
import com.socialcup.payout.entity.Payout;
import com.socialcup.payout.repository.PayoutRepository;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.repository.RedemptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayoutServiceTest {

    private static final UUID CAFE_ID = UUID.randomUUID();

    @Mock
    private PayoutRepository payoutRepository;

    @Mock
    private CafeRepository cafeRepository;

    @Mock
    private RedemptionRepository redemptionRepository;

    private PayoutService payoutService;

    @BeforeEach
    void setUp() {
        payoutService = new PayoutService(payoutRepository, cafeRepository, redemptionRepository);
    }

    private static Cafe newCafe(UUID id) {
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Blue Bottle Coffee");
        return cafe;
    }

    private static Redemption newRedemption(int creditsDeducted, String payoutRate) {
        Redemption redemption = new Redemption();
        redemption.setCreditsDeducted(creditsDeducted);
        redemption.setPayoutRate(new BigDecimal(payoutRate));
        return redemption;
    }

    @Test
    void calculatePayout_aggregatesRedemptions_usingEachOnesOwnSnapshottedPayoutRate() {
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of(
            newRedemption(4, "0.8000"),
            newRedemption(6, "0.5000")
        ));
        when(payoutRepository.save(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutResponse response = payoutService.calculatePayout(
            CAFE_ID, new CalculatePayoutRequest(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)));

        assertThat(response.totalRedemptions()).isEqualTo(2);
        assertThat(response.totalCredits()).isEqualTo(10);
        // 4*0.8000 + 6*0.5000 = 3.2000 + 3.0000 = 6.2000
        assertThat(response.amountOwed()).isEqualByComparingTo("6.2000");
    }

    @Test
    void calculatePayout_withNoRedemptionsInThePeriod_producesAZeroPayout_notAnError() {
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of());
        when(payoutRepository.save(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutResponse response = payoutService.calculatePayout(
            CAFE_ID, new CalculatePayoutRequest(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)));

        assertThat(response.totalRedemptions()).isZero();
        assertThat(response.totalCredits()).isZero();
        assertThat(response.amountOwed()).isEqualByComparingTo("0");
    }

    @Test
    void calculatePayout_persistsThePeriodBoundaries_asGiven() {
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of());
        ArgumentCaptor<Payout> captor = ArgumentCaptor.forClass(Payout.class);
        when(payoutRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        payoutService.calculatePayout(
            CAFE_ID, new CalculatePayoutRequest(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)));

        assertThat(captor.getValue().getPeriodStart()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(captor.getValue().getPeriodEnd()).isEqualTo(LocalDate.of(2026, 1, 31));
        assertThat(captor.getValue().getCafe().getId()).isEqualTo(CAFE_ID);
    }

    @Test
    void calculatePayout_forUnknownCafe_throwsResourceNotFound() {
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payoutService.calculatePayout(
                CAFE_ID, new CalculatePayoutRequest(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31))))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(payoutRepository, never()).save(any());
    }

    @Test
    void getPayoutsForCafe_forUnknownCafe_throwsResourceNotFound() {
        when(cafeRepository.existsById(CAFE_ID)).thenReturn(false);

        assertThatThrownBy(() -> payoutService.getPayoutsForCafe(CAFE_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
