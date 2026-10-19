package com.watchdesk.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Appelle l'API Gemini (generateContent) avec repli de modèles.
 * Les modèles 3.x « thinking » mettent souvent le texte utile dans une part
 * autre que la première : on concatène toutes les parts textuelles.
 */
@Service
public class GeminiService {

    private static final String GENERATE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    // Un rendu « thinking » peut dépasser la minute : sans bornes, la requête
    // navigateur côté expire avant et affiche une erreur incompréhensible.
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(75);

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final List<String> models;

    public GeminiService(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${gemini.api.model:gemini-3.8-flash}") String primaryModel,
            @Value("${gemini.api.fallback-models:gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-2.5-flash}")
            String fallbackModels
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        this.restTemplate = new RestTemplate(factory);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.models = new ArrayList<>();
        addModel(this.models, primaryModel);
        if (fallbackModels != null) {
            for (String m : fallbackModels.split(",")) {
                addModel(this.models, m);
            }
        }
    }

    
public String generate(String prompt) {
    if (apiKey.isBlank()) {
        return "L'assistant IA n'est pas configuré : clé Gemini absente "
                + "(variable GEMINI_API_KEY ou application-local.properties).";
    }

    String lastError = "Aucun modèle Gemini n'a répondu.";

    for (String model : models) {
        try {
            String text = callModel(model, prompt, false);

            if (text == null || text.isBlank()) {
                try {
                    text = callModel(model, prompt, true);
                } catch (HttpStatusCodeException retryEx) {
                    // Réessayer sans thinkingConfig uniquement si le modèle
                    // refuse ce paramètre.
                    if (retryEx.getStatusCode().value() != 400) {
                        throw retryEx;
                    }
                }
            }

            if (text != null && !text.isBlank()) {
                return text;
            }

            lastError = "Le modèle " + model + " a renvoyé une réponse vide.";

        } catch (HttpStatusCodeException ex) {
            int code = ex.getStatusCode().value();
            lastError = summarizeHttpError(model, ex);

            // Passer au modèle suivant si le modèle est indisponible,
            // surchargé, limité en requêtes ou non utilisable.
            if (code == 400 || code == 403 || code == 404
                    || code == 429 || code == 500
                    || code == 502 || code == 503 || code == 504) {
                continue;
            }

            // Pour les autres erreurs, arrêter et signaler le problème.
            return "Erreur Gemini (" + model + ") : " + lastError;

        } catch (ResourceAccessException ex) {
            return "Impossible d'atteindre l'API Gemini depuis le serveur ("
                    + ex.getMessage() + "). Vérifiez le réseau/proxy du backend.";
        } catch (Exception ex) {
            lastError = ex.getMessage() == null
                    ? ex.getClass().getSimpleName()
                    : ex.getMessage();

            return "Erreur lors de l'appel Gemini : " + lastError;
        }
    }

    return "Impossible d'obtenir une réponse de Gemini après "
            + models.size() + " modèle(s). "
            + "Causes fréquentes : quota journalier dépassé (429) ou clé sans accès aux "
            + "modèles demandés. Dernière erreur : " + lastError;
}


    @SuppressWarnings("unchecked")
    private String callModel(String model, String prompt, boolean disableThinking) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        if (disableThinking) {
            // Sinon les modèles « thinking » mettent souvent le texte dans une part suivante.
            body.put("generationConfig", Map.of(
                    "thinkingConfig", Map.of("thinkingBudget", 0)
            ));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        ResponseEntity<Map> response = restTemplate.exchange(
                String.format(GENERATE_URL, model),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        return extractText(response.getBody());
    }

    @SuppressWarnings("unchecked")
    static String extractText(Map<?, ?> body) {
        if (body == null || !body.containsKey("candidates")) {
            return null;
        }
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        if (content == null) {
            return null;
        }
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null) {
            return null;
        }
        StringBuilder out = new StringBuilder();
        for (Map<String, Object> part : parts) {
            if (part == null) continue;
            if (Boolean.TRUE.equals(part.get("thought"))) continue;
            Object text = part.get("text");
            if (text != null && !text.toString().isBlank()) {
                if (out.length() > 0) out.append("\n");
                out.append(text);
            }
        }
        return out.length() == 0 ? null : out.toString().trim();
    }

    private static String summarizeHttpError(String model, HttpStatusCodeException ex) {
        String raw = ex.getResponseBodyAsString();
        String snippet = raw == null ? "" : raw.replaceAll("\\s+", " ");
        if (snippet.length() > 280) {
            snippet = snippet.substring(0, 277) + "...";
        }
        return ex.getStatusCode().value() + " sur " + model
                + (snippet.isBlank() ? "" : " — " + snippet);
    }

    private static void addModel(List<String> models, String name) {
        if (name == null) return;
        String trimmed = name.trim();
        if (trimmed.isEmpty() || models.contains(trimmed)) return;
        models.add(trimmed);
    }
}
