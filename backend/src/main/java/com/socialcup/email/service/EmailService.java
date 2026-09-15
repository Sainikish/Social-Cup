package com.socialcup.email.service;

import com.socialcup.config.AwsProperties;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.Body;
import software.amazon.awssdk.services.ses.model.Content;
import software.amazon.awssdk.services.ses.model.Destination;
import software.amazon.awssdk.services.ses.model.Message;
import software.amazon.awssdk.services.ses.model.SendEmailRequest;

// Sends transactional emails (verification/reset codes) via AWS SES. Every
// call site (AuthService) wraps these in its own try/catch and only logs a
// warning on failure - a real delivery failure (SES sender not verified yet,
// no AWS credentials configured, etc.) must never block registration or a
// password reset request from completing, since the code itself is already
// persisted and can be resent. See PhotoStorageService for the sibling
// pattern of resolving AWS credentials via the default provider chain, no
// custom credentials code here either.
@Service
public class EmailService {

    private static final String NO_REPLY_NOTE =
        "This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.";

    private final SesClient sesClient;
    private final AwsProperties awsProperties;

    public EmailService(SesClient sesClient, AwsProperties awsProperties) {
        this.sesClient = sesClient;
        this.awsProperties = awsProperties;
    }

    public void sendVerificationCode(String toEmail, String code) {
        send(toEmail, "Verify your Social Cup email",
            "Your verification code is " + code + ".\n\n" + NO_REPLY_NOTE);
    }

    public void sendPasswordResetCode(String toEmail, String code) {
        send(toEmail, "Reset your Social Cup password",
            "Your password reset code is " + code + ".\n\n" + NO_REPLY_NOTE);
    }

    private void send(String toEmail, String subject, String body) {
        sesClient.sendEmail(SendEmailRequest.builder()
            .source(awsProperties.getSes().getSenderEmail())
            .destination(Destination.builder().toAddresses(toEmail).build())
            .message(Message.builder()
                .subject(Content.builder().data(subject).build())
                .body(Body.builder().text(Content.builder().data(body).build()).build())
                .build())
            .build());
    }
}
