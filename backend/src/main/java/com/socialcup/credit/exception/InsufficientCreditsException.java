package com.socialcup.credit.exception;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

// Thrown when a deduction would take a member's balance below zero. 409, not
// 400/402 - the request itself is well-formed, it conflicts with the
// member's current balance state, the same relationship CONFLICT already has
// to "the request conflicts with an existing record" elsewhere in this
// codebase (see GlobalExceptionHandler).
public class InsufficientCreditsException extends SocialCupException {

    public InsufficientCreditsException(String message) {
        super("INSUFFICIENT_CREDITS", message, HttpStatus.CONFLICT);
    }

}
