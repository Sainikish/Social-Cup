package com.socialcup.storage.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

// The uploaded file itself is unacceptable (missing, too large, wrong content
// type) - a client error (400), distinct from PhotoUploadException below,
// which means the file was valid but S3 itself failed.
public class InvalidPhotoException extends SocialCupException {

    public InvalidPhotoException(String message) {
        super("INVALID_PHOTO", message, HttpStatus.BAD_REQUEST);
    }

}
