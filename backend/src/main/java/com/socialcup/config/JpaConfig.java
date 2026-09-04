package com.socialcup.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

// The "no-persistence" profile is for tests that boot the full context (web layer,
// security, actuator) without a database: @ConditionalOnBean(DataSource.class) would
// look correct but isn't reliable here, since regular @Configuration classes are
// condition-evaluated before Boot's deferred auto-configuration registers that bean.
@Configuration
@Profile("!no-persistence")
@EnableJpaRepositories(basePackages = "com.socialcup")
@EnableJpaAuditing
public class JpaConfig {

}
