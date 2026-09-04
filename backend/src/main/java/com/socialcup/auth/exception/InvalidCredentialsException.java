package com.socialcup.auth.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends SocialCupException {

    public InvalidCredentialsException(String message) {
        super("INVALID_CREDENTIALS", message, HttpStatus.UNAUTHORIZED);
    }

    public InvalidCredentialsException() {
        this("Invalid email or password");
    }
}
