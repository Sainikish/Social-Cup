package com.socialcup.storage.service;

import com.socialcup.storage.entity.PhotoBlob;
import com.socialcup.storage.exception.InvalidPhotoException;
import com.socialcup.storage.exception.PhotoUploadException;
import com.socialcup.storage.repository.PhotoBlobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhotoStorageServiceTest {

    private static final String PUBLIC_BASE_URL = "https://social-cup-production.up.railway.app/api";

    @Mock
    private PhotoBlobRepository photoBlobRepository;

    private PhotoStorageService photoStorageService;

    @BeforeEach
    void setUp() {
        photoStorageService = new PhotoStorageService(photoBlobRepository, PUBLIC_BASE_URL);
    }

    private void stubSaveReturningGeneratedId() {
        when(photoBlobRepository.save(any(PhotoBlob.class))).thenAnswer(invocation -> {
            PhotoBlob blob = invocation.getArgument(0);
            blob.setId(UUID.randomUUID());
            return blob;
        });
    }

    @Test
    void uploadPhoto_success_returnsAUrlPointingAtThePhotoController() {
        stubSaveReturningGeneratedId();
        MultipartFile file = new MockMultipartFile("photo", "cafe.jpg", "image/jpeg", "some-bytes".getBytes());

        String url = photoStorageService.uploadPhoto(file, "cafes/cafe-1");

        assertThat(url).startsWith(PUBLIC_BASE_URL + "/photos/");
    }

    @Test
    void uploadPhoto_savesTheRightContentTypeAndBytes() {
        stubSaveReturningGeneratedId();
        byte[] bytes = "some-bytes".getBytes();
        MultipartFile file = new MockMultipartFile("photo", "drink.png", "image/png", bytes);

        photoStorageService.uploadPhoto(file, "drinks/drink-1");

        ArgumentCaptor<PhotoBlob> captor = ArgumentCaptor.forClass(PhotoBlob.class);
        verify(photoBlobRepository).save(captor.capture());
        assertThat(captor.getValue().getContentType()).isEqualTo("image/png");
        assertThat(captor.getValue().getData()).isEqualTo(bytes);
    }

    @Test
    void uploadPhoto_emptyFile_throwsInvalidPhotoException_withoutSaving() {
        MultipartFile file = new MockMultipartFile("photo", "cafe.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> photoStorageService.uploadPhoto(file, "cafes/cafe-1"))
            .isInstanceOf(InvalidPhotoException.class);
        verify(photoBlobRepository, never()).save(any());
    }

    @Test
    void uploadPhoto_tooLarge_throwsInvalidPhotoException_withoutSaving() {
        byte[] tooLarge = new byte[6 * 1024 * 1024];
        MultipartFile file = new MockMultipartFile("photo", "cafe.jpg", "image/jpeg", tooLarge);

        assertThatThrownBy(() -> photoStorageService.uploadPhoto(file, "cafes/cafe-1"))
            .isInstanceOf(InvalidPhotoException.class)
            .hasMessageContaining("5MB");
        verify(photoBlobRepository, never()).save(any());
    }

    @Test
    void uploadPhoto_disallowedContentType_throwsInvalidPhotoException_withoutSaving() {
        MultipartFile file = new MockMultipartFile("photo", "cafe.gif", "image/gif", "some-bytes".getBytes());

        assertThatThrownBy(() -> photoStorageService.uploadPhoto(file, "cafes/cafe-1"))
            .isInstanceOf(InvalidPhotoException.class)
            .hasMessageContaining("image/jpeg");
        verify(photoBlobRepository, never()).save(any());
    }

    @Test
    void uploadPhoto_missingContentType_throwsInvalidPhotoException() {
        MultipartFile file = new MockMultipartFile("photo", "cafe.jpg", null, "some-bytes".getBytes());

        assertThatThrownBy(() -> photoStorageService.uploadPhoto(file, "cafes/cafe-1"))
            .isInstanceOf(InvalidPhotoException.class);
    }

    @Test
    void uploadPhoto_fileCannotBeRead_propagatesAsPhotoUploadException() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(100L);
        when(file.getContentType()).thenReturn("image/jpeg");
        when(file.getBytes()).thenThrow(new IOException("disk error"));

        assertThatThrownBy(() -> photoStorageService.uploadPhoto(file, "cafes/cafe-1"))
            .isInstanceOf(PhotoUploadException.class)
            .hasMessageContaining("Unable to read");

        verify(photoBlobRepository, never()).save(any());
    }

}
