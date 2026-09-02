package com.watchdesk.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.watchdesk.backend.model.AuditLog;
import com.watchdesk.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

@Service
public class AuditService {

    public static final String HEADER_USER = "X-WatchDesk-User";

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public record Actor(String email, String name, String role) {
        public static Actor anonymous() {
            return new Actor("systeme", "Système", "SYSTEM");
        }
    }

    public Actor resolveActor(HttpServletRequest request) {
        if (request == null) return Actor.anonymous();
        String raw = request.getHeader(HEADER_USER);
        if (raw == null || raw.isBlank()) return Actor.anonymous();
        try {
            String json = raw.trim();
            // Support base64-encoded JSON to avoid header encoding issues
            if (!json.startsWith("{")) {
                json = new String(Base64.getDecoder().decode(json), StandardCharsets.UTF_8);
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(json, Map.class);
            String email = str(map.get("email"));
            String name = str(map.get("fullName"));
            if (name == null || name.isBlank()) name = str(map.get("name"));
            String role = str(map.get("role"));
            if (email == null || email.isBlank()) email = "inconnu";
            if (name == null || name.isBlank()) name = email;
            if (role == null || role.isBlank()) role = "ADMIN";
            return new Actor(email, name, role.toUpperCase().replace(" ", "_"));
        } catch (Exception e) {
            return Actor.anonymous();
        }
    }

    public AuditLog log(Actor actor, String action, String targetType, String targetId, String targetLabel, String details) {
        AuditLog entry = new AuditLog();
        entry.setActorEmail(actor != null ? actor.email() : "systeme");
        entry.setActorName(actor != null ? actor.name() : "Système");
        entry.setActorRole(actor != null ? actor.role() : "SYSTEM");
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setTargetLabel(targetLabel);
        entry.setDetails(details);
        entry.setCreatedAt(LocalDateTime.now());
        return repository.save(entry);
    }

    public AuditLog log(HttpServletRequest request, String action, String targetType, String targetId, String targetLabel, String details) {
        return log(resolveActor(request), action, targetType, targetId, targetLabel, details);
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}
