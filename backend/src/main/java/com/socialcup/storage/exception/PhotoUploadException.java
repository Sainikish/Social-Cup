package com.socialcup.storage.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

// The uploaded file was valid, but the upstream S3 call itself failed (or the
// file couldn't even be read off the request) - a failure of a dependency
// this server doesn't control, not the caller's fault, hence 502 rather than
// a 4xx or the generic 500 catch-all.
public class PhotoUploadException extends SocialCupException {

    public PhotoUploadException(String message, Throwable cause) {
        super("PHOTO_UPLOAD_FAILED", message, HttpStatus.BAD_GATEWAY, cause);
    }

}
