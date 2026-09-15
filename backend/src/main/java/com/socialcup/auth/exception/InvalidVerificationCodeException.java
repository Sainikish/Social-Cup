package com.socialcup.auth.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

public class InvalidVerificationCodeException extends SocialCupException {

    public InvalidVerificationCodeException() {
        super("INVALID_VERIFICATION_CODE", "Invalid or expired code", HttpStatus.BAD_REQUEST);
    }
}
