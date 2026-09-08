package com.socialcup.admin.service;

import com.socialcup.admin.dto.AdminDashboardMetricsResponse;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.payout.repository.PayoutRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
import com.socialcup.user.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

// Phase 6E: read-only admin dashboard reporting. Every value is a single
// server-side COUNT/SUM against existing persisted data (Member/Cafe/Drink/
// Redemption/Payout) - nothing is loaded into memory to be summed in Java,
// nothing here accepts a value from the client, and no method in this class
// writes anything. Reuses the five existing repositories directly rather
// than duplicating any aggregation logic that already lives in
// PayoutService/RedemptionService.
@Service
public class AdminDashboardService {

    private final MemberRepository memberRepository;
    private final CafeRepository cafeRepository;
    private final DrinkRepository drinkRepository;
    private final RedemptionRepository redemptionRepository;
    private final PayoutRepository payoutRepository;

    public AdminDashboardService(MemberRepository memberRepository,
                                  CafeRepository cafeRepository,
                                  DrinkRepository drinkRepository,
                                  RedemptionRepository redemptionRepository,
                                  PayoutRepository payoutRepository) {
        this.memberRepository = memberRepository;
        this.cafeRepository = cafeRepository;
        this.drinkRepository = drinkRepository;
        this.redemptionRepository = redemptionRepository;
        this.payoutRepository = payoutRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardMetricsResponse getMetrics() {
        long totalMembers = memberRepository.countByDeletedAtIsNull();
        long totalActiveCafes = cafeRepository.countByStatusAndArchivedAtIsNull(CafeStatus.ACTIVE);
        long totalActiveDrinks = drinkRepository.countByStatusAndArchivedAtIsNull(DrinkStatus.ACTIVE);
        long totalRedemptions = redemptionRepository.count();
        long totalCreditsRedeemed = redemptionRepository.sumCreditsDeducted();
        BigDecimal totalPayoutAmountOwed = payoutRepository.sumAmountOwed();
        BigDecimal totalPayoutAmountPaid = payoutRepository.sumAmountPaid();

        return new AdminDashboardMetricsResponse(
            totalMembers,
            totalActiveCafes,
            totalActiveDrinks,
            totalRedemptions,
            totalCreditsRedeemed,
            totalPayoutAmountOwed,
            totalPayoutAmountPaid);
    }
}
