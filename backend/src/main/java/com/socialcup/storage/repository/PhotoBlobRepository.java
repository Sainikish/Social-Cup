package com.socialcup.storage.repository;

import com.socialcup.storage.entity.PhotoBlob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PhotoBlobRepository extends JpaRepository<PhotoBlob, UUID> {
}
