package com.socialcup.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;

// Credentials are never read here directly - SesClient's default builder
// resolves them via the same AWS credential provider chain S3Config's
// S3Client already relies on (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env
// vars) - no custom credentials code needed.
@Configuration
public class SesConfig {

    @Bean
    public SesClient sesClient(AwsProperties awsProperties) {
        return SesClient.builder()
            .region(Region.of(awsProperties.getRegion()))
            .build();
    }

}
