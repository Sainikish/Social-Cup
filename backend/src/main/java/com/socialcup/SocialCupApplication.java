package com.socialcup;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SocialCupApplication {

    public static void main(String[] args) {
        SpringApplication.run(SocialCupApplication.class, args);
    }

}
