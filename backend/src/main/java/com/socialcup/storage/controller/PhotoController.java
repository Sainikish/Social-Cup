package com.socialcup.storage.controller;

import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.storage.entity.PhotoBlob;
import com.socialcup.storage.repository.PhotoBlobRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

// Public (see SecurityConfig's PUBLIC_READ_ENDPOINTS): a mobile <Image> or a
// browser <img> tag requests this URL with no Authorization header, exactly
// like the cafe/drink photo URLs it replaces would have been on a public S3
// bucket - only the byte source changed, not who is allowed to fetch them.
@RestController
@RequestMapping("/photos")
public class PhotoController {

    private final PhotoBlobRepository photoBlobRepository;

    public PhotoController(PhotoBlobRepository photoBlobRepository) {
        this.photoBlobRepository = photoBlobRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable UUID id) {
        PhotoBlob blob = photoBlobRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + id));

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(blob.getContentType()))
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
            .body(blob.getData());
    }

}
