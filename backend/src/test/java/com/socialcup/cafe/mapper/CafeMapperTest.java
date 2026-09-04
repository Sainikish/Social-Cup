package com.socialcup.cafe.mapper;

import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CafeDetailResponse;
import com.socialcup.cafe.dto.CafeHoursDto;
import com.socialcup.cafe.dto.CafePhotoDto;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafePhoto;
import com.socialcup.cafe.entity.CafeStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CafeMapperTest {

    private CafeMapper cafeMapper;

    @BeforeEach
    void setUp() {
        cafeMapper = new CafeMapper(new ObjectMapper());
    }

    @Test
    void toSummaryResponse_mapsCorrectlyWithPrimaryPhoto() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Artisan Roast");
        cafe.setAddress("123 Main St");
        cafe.setNeighbourhood("Downtown");
        cafe.setLatitude(new BigDecimal("40.7128"));
        cafe.setLongitude(new BigDecimal("-74.0060"));
        cafe.setFeatured(true);
        cafe.setStatus(CafeStatus.ACTIVE);
        cafe.setVibeTags("cozy,work-friendly");

        CafePhoto photo1 = new CafePhoto(cafe, "http://example.com/p1.jpg", "Interior", 1, false);
        CafePhoto photo2 = new CafePhoto(cafe, "http://example.com/p2.jpg", "Cover", 0, true);
        cafe.setPhotos(List.of(photo1, photo2));

        CafeSummaryResponse summary = cafeMapper.toSummaryResponse(cafe, 1.25);

        assertThat(summary.id()).isEqualTo(cafe.getId());
        assertThat(summary.name()).isEqualTo("Artisan Roast");
        assertThat(summary.neighbourhood()).isEqualTo("Downtown");
        assertThat(summary.primaryPhotoUrl()).isEqualTo("http://example.com/p2.jpg");
        assertThat(summary.distanceKm()).isEqualTo(1.25);
        assertThat(summary.featured()).isTrue();
    }

    @Test
    void toEntity_and_toDetailResponse_handlesHoursAndPhotos() {
        CafeHoursDto hoursDto = new CafeHoursDto(DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(18, 0), false);
        CafePhotoDto photoDto = new CafePhotoDto(null, "http://example.com/photo.jpg", "Main", 0, true);

        CreateCafeRequest request = new CreateCafeRequest(
            "Blue Bottle",
            "456 Market St",
            "SoHo",
            new BigDecimal("40.7200"),
            new BigDecimal("-74.0000"),
            List.of(hoursDto),
            "555-1234",
            "info@bluebottle.com",
            "https://bluebottle.com",
            new BigDecimal("0.8500"),
            true,
            "trendy",
            "Great specialty coffee",
            List.of(photoDto)
        );

        Cafe entity = cafeMapper.toEntity(request);

        assertThat(entity.getName()).isEqualTo("Blue Bottle");
        assertThat(entity.getNeighbourhood()).isEqualTo("SoHo");
        assertThat(entity.getPayoutRate()).isEqualTo(new BigDecimal("0.8500"));
        assertThat(entity.getPhotos()).hasSize(1);
        assertThat(entity.getPhotos().getFirst().getPhotoUrl()).isEqualTo("http://example.com/photo.jpg");

        CafeDetailResponse detail = cafeMapper.toDetailResponse(entity, List.of());
        assertThat(detail.name()).isEqualTo("Blue Bottle");
        assertThat(detail.openingHours()).hasSize(1);
        assertThat(detail.openingHours().getFirst().dayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
    }

    @Test
    void toDetailResponse_hasNoPayoutRateField() {
        // Compile-time proof, not just a runtime check: the public response type
        // has no payoutRate accessor at all for CafeController to accidentally expose.
        assertThat(CafeDetailResponse.class.getRecordComponents())
            .extracting(java.lang.reflect.RecordComponent::getName)
            .doesNotContain("payoutRate");
    }

    @Test
    void toAdminDetailResponse_includesPayoutRate() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Admin View Cafe");
        cafe.setAddress("1 Admin St");
        cafe.setPayoutRate(new BigDecimal("0.7500"));
        cafe.setStatus(CafeStatus.ACTIVE);

        AdminCafeDetailResponse adminDetail = cafeMapper.toAdminDetailResponse(cafe, List.of());

        assertThat(adminDetail.name()).isEqualTo("Admin View Cafe");
        assertThat(adminDetail.payoutRate()).isEqualTo(new BigDecimal("0.7500"));
    }

    @Test
    void updateEntity_updatesAllFields() {
        Cafe cafe = new Cafe();
        cafe.setName("Old Name");
        cafe.setAddress("Old Address");

        UpdateCafeRequest request = new UpdateCafeRequest(
            "Updated Name",
            "New Address",
            "Uptown",
            new BigDecimal("40.8000"),
            new BigDecimal("-73.9500"),
            List.of(),
            "555-9999",
            "new@cafe.com",
            "https://cafe.com",
            new BigDecimal("0.8000"),
            false,
            "quiet",
            "Updated description",
            List.of()
        );

        cafeMapper.updateEntity(cafe, request);

        assertThat(cafe.getName()).isEqualTo("Updated Name");
        assertThat(cafe.getAddress()).isEqualTo("New Address");
        assertThat(cafe.getNeighbourhood()).isEqualTo("Uptown");
        assertThat(cafe.getDescription()).isEqualTo("Updated description");
    }
}
