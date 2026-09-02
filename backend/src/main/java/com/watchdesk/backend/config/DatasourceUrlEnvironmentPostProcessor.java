package com.watchdesk.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Render + Supabase : convertit une URI postgres:// en JDBC, force SSL,
 * et échoue clairement si l'URL pointe encore vers localhost.
 */
public class DatasourceUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty("spring.datasource.url", "");
        Map<String, Object> overrides = new LinkedHashMap<>();

        String jdbcUrl = toJdbcUrl(url);
        if (!jdbcUrl.equals(url)) {
            overrides.put("spring.datasource.url", jdbcUrl);
        }

        if (jdbcUrl.contains("supabase.co") && !jdbcUrl.contains("sslmode=")) {
            jdbcUrl = jdbcUrl + (jdbcUrl.contains("?") ? "&" : "?") + "sslmode=require";
            overrides.put("spring.datasource.url", jdbcUrl);
        }

        boolean onRender = "true".equalsIgnoreCase(environment.getProperty("RENDER"));
        if (onRender && (jdbcUrl.contains("localhost") || jdbcUrl.contains("127.0.0.1"))) {
            throw new IllegalStateException(
                    "SPRING_DATASOURCE_URL pointe vers localhost. "
                            + "Dans Render → Environment, utilise le Session pooler Supabase (IPv4), par ex. "
                            + "jdbc:postgresql://aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require "
                            + "avec SPRING_DATASOURCE_USERNAME=postgres.PROJECT_REF "
                            + "et SPRING_DATASOURCE_PASSWORD (le mot de passe choisi dans Supabase)."
            );
        }

        if (!overrides.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("watchdeskDatasourceFix", overrides));
        }
    }

    static String toJdbcUrl(String url) {
        if (url == null || url.isBlank()) {
            return url == null ? "" : url;
        }
        if (url.startsWith("jdbc:")) {
            return url;
        }
        if (url.startsWith("postgres://")) {
            return "jdbc:postgresql://" + url.substring("postgres://".length());
        }
        if (url.startsWith("postgresql://")) {
            return "jdbc:" + url;
        }
        return url;
    }
}
