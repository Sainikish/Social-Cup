package com.socialcup.auth.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

public class AccountLockedException extends SocialCupException {

    public AccountLockedException(String message) {
        super("ACCOUNT_LOCKED", message, HttpStatus.UNAUTHORIZED);
    }

    public AccountLockedException() {
        this("Account is temporarily locked due to multiple failed login attempts");
    }
}
