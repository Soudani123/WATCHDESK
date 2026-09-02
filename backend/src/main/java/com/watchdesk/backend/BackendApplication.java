package com.watchdesk.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    // Ajoute ceci pour permettre l'utilisation de RestTemplate
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}