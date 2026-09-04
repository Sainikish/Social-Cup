package com.socialcup.config;

import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.common.web.RateLimitFilter;
import com.socialcup.common.web.RateLimiter;
import com.socialcup.common.web.RequestIdFilter;
import com.socialcup.common.web.RequestLoggingFilter;
import com.socialcup.security.JwtAuthenticationFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import java.time.Clock;
import java.time.Duration;

@Configuration
public class WebConfig {

    @Bean
    public FilterRegistrationBean<RequestIdFilter> requestIdFilter() {
        FilterRegistrationBean<RequestIdFilter> registration = new FilterRegistrationBean<>(new RequestIdFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }

    @Bean
    public FilterRegistrationBean<RequestLoggingFilter> requestLoggingFilter() {
        FilterRegistrationBean<RequestLoggingFilter> registration = new FilterRegistrationBean<>(new RequestLoggingFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        registration.addUrlPatterns("/*");
        return registration;
    }

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilter(RateLimitProperties properties,
                                                                     ApiErrorResponseWriter responseWriter) {
        RateLimiter limiter = new RateLimiter(properties.getMaxRequests(), Duration.ofSeconds(properties.getWindowSeconds()),
            Clock.systemUTC());
        RateLimitFilter filter = new RateLimitFilter(limiter, responseWriter, properties.isEnabled(), properties.getWindowSeconds());
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        registration.addUrlPatterns("/*");
        return registration;
    }

    // JwtAuthenticationFilter is a @Component so SecurityConfig can constructor-inject
    // it into addFilterBefore(...). Without this, Boot would also auto-register it as a
    // plain servlet filter, running it a second time outside the security chain.
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtAuthenticationFilterRegistration(
            JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

}
