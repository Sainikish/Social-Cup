package com.socialcup.auth.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

public class InvalidTokenException extends SocialCupException {

    public InvalidTokenException(String message) {
        super("INVALID_TOKEN", message, HttpStatus.UNAUTHORIZED);
    }

    public InvalidTokenException() {
        this("Invalid or expired token");
    }
}
