package com.watchdesk.backend.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeminiServiceTest {

    @Test
    void extractTextSkipsThoughtParts() {
        Map<String, Object> body = Map.of(
                "candidates", List.of(Map.of(
                        "content", Map.of("parts", List.of(
                                Map.of("thought", true, "text", "raisonnement interne"),
                                Map.of("text", "Réponse utile")
                        ))
                ))
        );
        assertEquals("Réponse utile", GeminiService.extractText(body));
    }
}
