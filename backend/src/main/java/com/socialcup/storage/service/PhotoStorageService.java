package com.socialcup.storage.service;

import com.socialcup.storage.entity.PhotoBlob;
import com.socialcup.storage.exception.InvalidPhotoException;
import com.socialcup.storage.exception.PhotoUploadException;
import com.socialcup.storage.repository.PhotoBlobRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

// The one place either CafeService or DrinkService uploads a photo - neither
// module talks to PhotoBlobRepository directly, so the validation rules and
// URL scheme stay in exactly one place regardless of which entity the photo
// belongs to. Stored as a row in this same Postgres database (streamed back
// by PhotoController) rather than S3: this project runs entirely on
// Railway, with no AWS account provisioned to hold a bucket.
@Service
public class PhotoStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    // A Set (not a Map to some now-unused "extension") in a fixed, readable
    // order so validation error messages list a stable order rather than
    // whatever HashSet iteration happens to produce.
    private static final Set<String> ALLOWED_CONTENT_TYPES =
        new java.util.LinkedHashSet<>(Set.of("image/jpeg", "image/png", "image/webp"));

    private final PhotoBlobRepository photoBlobRepository;
    private final String publicBaseUrl;

    public PhotoStorageService(PhotoBlobRepository photoBlobRepository,
                                @Value("${app.public-base-url}") String publicBaseUrl) {
        this.photoBlobRepository = photoBlobRepository;
        this.publicBaseUrl = publicBaseUrl;
    }

    // The keyPrefix parameter (e.g. "cafes/{cafeId}") is kept purely so
    // CafeService/DrinkService call sites don't need to change - a blob row
    // has no notion of "folders", it's addressed by its own generated id.
    public String uploadPhoto(MultipartFile file, String keyPrefix) {
        validate(file);

        PhotoBlob blob = new PhotoBlob();
        blob.setContentType(file.getContentType());
        try {
            blob.setData(file.getBytes());
        } catch (IOException e) {
            throw new PhotoUploadException("Unable to read the uploaded file", e);
        }

        blob = photoBlobRepository.save(blob);
        return publicBaseUrl + "/photos/" + blob.getId();
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidPhotoException("A photo file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidPhotoException("Photo must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new InvalidPhotoException(
                "Photo must be one of: " + String.join(", ", ALLOWED_CONTENT_TYPES));
        }
    }

}
