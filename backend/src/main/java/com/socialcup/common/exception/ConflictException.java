package com.socialcup.common.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends SocialCupException {

    public ConflictException(String message) {
        super("CONFLICT", message, HttpStatus.CONFLICT);
    }

}
