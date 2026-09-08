package com.socialcup.payout.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.payout.dto.CalculatePayoutRequest;
import com.socialcup.payout.dto.MarkPayoutPaidRequest;
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
import org.springframework.dao.DataIntegrityViolationException;

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
    private static final UUID OTHER_CAFE_ID = UUID.randomUUID();
    private static final UUID PAYOUT_ID = UUID.randomUUID();

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

    private static Payout newPayout(UUID id, Cafe cafe, LocalDate start, LocalDate end, BigDecimal amountOwed) {
        Payout payout = new Payout();
        payout.setId(id);
        payout.setCafe(cafe);
        payout.setPeriodStart(start);
        payout.setPeriodEnd(end);
        payout.setTotalRedemptions(5);
        payout.setTotalCredits(10);
        payout.setAmountOwed(amountOwed);
        return payout;
    }

    @Test
    void calculatePayout_firstCalculation_succeeds() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(CAFE_ID, start, end)).thenReturn(false);
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of(
            newRedemption(4, "0.8000"),
            newRedemption(6, "0.5000")
        ));
        when(payoutRepository.saveAndFlush(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutResponse response = payoutService.calculatePayout(CAFE_ID, new CalculatePayoutRequest(start, end));

        assertThat(response.totalRedemptions()).isEqualTo(2);
        assertThat(response.totalCredits()).isEqualTo(10);
        assertThat(response.amountOwed()).isEqualByComparingTo("6.2000");
    }

    @Test
    void calculatePayout_exactSameCafeAndPeriod_isRejectedWithConflict() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(CAFE_ID, start, end)).thenReturn(true);

        assertThatThrownBy(() -> payoutService.calculatePayout(CAFE_ID, new CalculatePayoutRequest(start, end)))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already been calculated");

        verify(payoutRepository, never()).saveAndFlush(any());
        verify(redemptionRepository, never()).findAllByCafeIdAndCreatedAtBetween(any(), any(), any());
    }

    @Test
    void calculatePayout_sameCafeDifferentPeriod_succeeds() {
        LocalDate start1 = LocalDate.of(2026, 1, 1);
        LocalDate end1 = LocalDate.of(2026, 1, 31);
        LocalDate start2 = LocalDate.of(2026, 2, 1);
        LocalDate end2 = LocalDate.of(2026, 2, 28);

        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(CAFE_ID, start2, end2)).thenReturn(false);
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of());
        when(payoutRepository.saveAndFlush(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutResponse response = payoutService.calculatePayout(CAFE_ID, new CalculatePayoutRequest(start2, end2));

        assertThat(response.periodStart()).isEqualTo(start2);
        assertThat(response.periodEnd()).isEqualTo(end2);
    }

    @Test
    void calculatePayout_differentCafeSamePeriod_succeeds() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        when(cafeRepository.findById(OTHER_CAFE_ID)).thenReturn(Optional.of(newCafe(OTHER_CAFE_ID)));
        when(payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(OTHER_CAFE_ID, start, end)).thenReturn(false);
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of());
        when(payoutRepository.saveAndFlush(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutResponse response = payoutService.calculatePayout(OTHER_CAFE_ID, new CalculatePayoutRequest(start, end));

        assertThat(response.cafeId()).isEqualTo(OTHER_CAFE_ID);
        assertThat(response.periodStart()).isEqualTo(start);
        assertThat(response.periodEnd()).isEqualTo(end);
    }

    @Test
    void calculatePayout_concurrentDuplicateCalculation_throwsConflictExceptionOnDbConstraint() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(CAFE_ID, start, end)).thenReturn(false);
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of());
        when(payoutRepository.saveAndFlush(any(Payout.class)))
            .thenThrow(new DataIntegrityViolationException("uq_payout_cafe_period"));

        assertThatThrownBy(() -> payoutService.calculatePayout(CAFE_ID, new CalculatePayoutRequest(start, end)))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already been calculated");
    }

    @Test
    void calculatePayout_withNoRedemptionsInThePeriod_producesAZeroPayout_notAnError() {
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.of(newCafe(CAFE_ID)));
        when(payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(any(), any(), any())).thenReturn(false);
        when(redemptionRepository.findAllByCafeIdAndCreatedAtBetween(any(), any(), any())).thenReturn(List.of());
        when(payoutRepository.saveAndFlush(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutResponse response = payoutService.calculatePayout(
            CAFE_ID, new CalculatePayoutRequest(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)));

        assertThat(response.totalRedemptions()).isZero();
        assertThat(response.totalCredits()).isZero();
        assertThat(response.amountOwed()).isEqualByComparingTo("0");
    }

    @Test
    void calculatePayout_forUnknownCafe_throwsResourceNotFound() {
        when(cafeRepository.findById(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payoutService.calculatePayout(
                CAFE_ID, new CalculatePayoutRequest(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31))))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(payoutRepository, never()).saveAndFlush(any());
    }

    @Test
    void getPayoutsForCafe_forUnknownCafe_throwsResourceNotFound() {
        when(cafeRepository.existsById(CAFE_ID)).thenReturn(false);

        assertThatThrownBy(() -> payoutService.getPayoutsForCafe(CAFE_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAllPayouts_returnsAllPayoutsAcrossCafes() {
        Cafe cafe1 = newCafe(CAFE_ID);
        Cafe cafe2 = newCafe(OTHER_CAFE_ID);
        Payout p1 = newPayout(UUID.randomUUID(), cafe1, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("100.00"));
        Payout p2 = newPayout(UUID.randomUUID(), cafe2, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("200.00"));

        when(payoutRepository.findAll()).thenReturn(List.of(p1, p2));

        List<PayoutResponse> responses = payoutService.getAllPayouts();

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).cafeId()).isEqualTo(CAFE_ID);
        assertThat(responses.get(1).cafeId()).isEqualTo(OTHER_CAFE_ID);
    }

    @Test
    void markPayoutAsPaid_unpaidPayout_succeedsAndPersistsPaymentDetails() {
        Cafe cafe = newCafe(CAFE_ID);
        LocalDate periodStart = LocalDate.of(2026, 1, 1);
        LocalDate periodEnd = LocalDate.of(2026, 1, 31);
        Payout payout = newPayout(PAYOUT_ID, cafe, periodStart, periodEnd, new BigDecimal("150.00"));

        when(cafeRepository.existsById(CAFE_ID)).thenReturn(true);
        when(payoutRepository.findByIdAndCafeIdForUpdate(PAYOUT_ID, CAFE_ID)).thenReturn(Optional.of(payout));
        when(payoutRepository.save(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDate paymentDate = LocalDate.of(2026, 2, 5);
        MarkPayoutPaidRequest request = new MarkPayoutPaidRequest(new BigDecimal("150.00"), "ACH-REF-12345", paymentDate);

        PayoutResponse response = payoutService.markPayoutAsPaid(CAFE_ID, PAYOUT_ID, request);

        assertThat(response.amountPaid()).isEqualByComparingTo("150.00");
        assertThat(response.paymentReference()).isEqualTo("ACH-REF-12345");
        assertThat(response.paymentDate()).isEqualTo(paymentDate);
        // Ensure financial and identity fields were NOT modified
        assertThat(response.amountOwed()).isEqualByComparingTo("150.00");
        assertThat(response.totalRedemptions()).isEqualTo(5);
        assertThat(response.totalCredits()).isEqualTo(10);
        assertThat(response.periodStart()).isEqualTo(periodStart);
        assertThat(response.periodEnd()).isEqualTo(periodEnd);
        assertThat(response.cafeId()).isEqualTo(CAFE_ID);
    }

    @Test
    void markPayoutAsPaid_acquiresPessimisticWriteLock_notThePlainLookup() {
        // Structural guard for the concurrency fix: markPayoutAsPaid must go
        // through the locked repository method, never a lock-free lookup -
        // otherwise two concurrent calls could both observe amountPaid ==
        // null and both succeed (the defect this fix addresses).
        Cafe cafe = newCafe(CAFE_ID);
        Payout payout = newPayout(PAYOUT_ID, cafe, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("50.00"));

        when(cafeRepository.existsById(CAFE_ID)).thenReturn(true);
        when(payoutRepository.findByIdAndCafeIdForUpdate(PAYOUT_ID, CAFE_ID)).thenReturn(Optional.of(payout));
        when(payoutRepository.save(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

        payoutService.markPayoutAsPaid(
            CAFE_ID, PAYOUT_ID, new MarkPayoutPaidRequest(new BigDecimal("50.00"), "REF", LocalDate.of(2026, 2, 1)));

        verify(payoutRepository).findByIdAndCafeIdForUpdate(PAYOUT_ID, CAFE_ID);
    }

    @Test
    void markPayoutAsPaid_alreadyPaidPayout_throwsConflictException() {
        Cafe cafe = newCafe(CAFE_ID);
        Payout payout = newPayout(PAYOUT_ID, cafe, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("150.00"));
        payout.setAmountPaid(new BigDecimal("150.00"));
        payout.setPaymentReference("PREV-REF");
        payout.setPaymentDate(LocalDate.of(2026, 2, 1));

        when(cafeRepository.existsById(CAFE_ID)).thenReturn(true);
        when(payoutRepository.findByIdAndCafeIdForUpdate(PAYOUT_ID, CAFE_ID)).thenReturn(Optional.of(payout));

        MarkPayoutPaidRequest request = new MarkPayoutPaidRequest(new BigDecimal("150.00"), "NEW-REF", LocalDate.of(2026, 2, 5));

        assertThatThrownBy(() -> payoutService.markPayoutAsPaid(CAFE_ID, PAYOUT_ID, request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already been marked as paid");

        verify(payoutRepository, never()).save(any());
    }

    @Test
    void markPayoutAsPaid_unknownCafe_throwsResourceNotFound() {
        when(cafeRepository.existsById(CAFE_ID)).thenReturn(false);

        MarkPayoutPaidRequest request = new MarkPayoutPaidRequest(new BigDecimal("50.00"), "REF", LocalDate.of(2026, 2, 5));

        assertThatThrownBy(() -> payoutService.markPayoutAsPaid(CAFE_ID, PAYOUT_ID, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void markPayoutAsPaid_wrongCafeOrUnknownPayout_throwsResourceNotFound() {
        when(cafeRepository.existsById(CAFE_ID)).thenReturn(true);
        when(payoutRepository.findByIdAndCafeIdForUpdate(PAYOUT_ID, CAFE_ID)).thenReturn(Optional.empty());

        MarkPayoutPaidRequest request = new MarkPayoutPaidRequest(new BigDecimal("50.00"), "REF", LocalDate.of(2026, 2, 5));

        assertThatThrownBy(() -> payoutService.markPayoutAsPaid(CAFE_ID, PAYOUT_ID, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
