package com.socialcup.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends SocialCupException {

    public ResourceNotFoundException(String message) {
        super("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }

}
