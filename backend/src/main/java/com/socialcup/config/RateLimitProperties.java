package com.socialcup.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.rate-limit")
@Data
public class RateLimitProperties {

    private boolean enabled = true;
    private int maxRequests = 100;
    private int windowSeconds = 60;

}
