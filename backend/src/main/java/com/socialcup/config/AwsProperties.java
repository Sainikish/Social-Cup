package com.socialcup.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

// Binds the already-scaffolded app.aws.* keys (present since before this
// module was implemented - see application.yml) - mirrors StripeProperties'
// @Component @ConfigurationProperties(prefix=...) @Data shape. Only SES
// (transactional email) actually uses AWS here - cafe/drink photos moved
// off S3 entirely, see PhotoStorageService.
@Component
@ConfigurationProperties(prefix = "app.aws")
@Data
public class AwsProperties {

    private String region;
    private final Ses ses = new Ses();

    @Data
    public static class Ses {
        private String senderEmail;
    }

}
