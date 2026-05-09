package com.github.danbel.abitovapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AbitovApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(AbitovApiApplication.class, args);
    }

}
