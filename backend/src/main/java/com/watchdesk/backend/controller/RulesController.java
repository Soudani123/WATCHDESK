package com.watchdesk.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.watchdesk.backend.model.AlertRule;
import com.watchdesk.backend.repository.AlertRuleRepository;
import com.watchdesk.backend.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/rules")
@CrossOrigin(origins = "*")
public class RulesController {

    private final AlertRuleRepository repository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public RulesController(AlertRuleRepository repository, AuditService auditService, ObjectMapper objectMapper) {
        this.repository = repository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return repository.findAll().stream()
                .sorted(Comparator.comparing(AlertRule::getId).reversed())
                .map(this::toDto)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            AlertRule rule = fromBody(new AlertRule(), body, request);
            rule.setCreatedAt(LocalDateTime.now());
            rule.setUpdatedAt(LocalDateTime.now());
            AlertRule saved = repository.save(rule);
            auditService.log(request, "RULE_CREATE", "RULE", String.valueOf(saved.getId()), saved.getName(), saved.getConditionsJson());
            return ResponseEntity.ok(toDto(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return repository.findById(id).map(rule -> {
            try {
                fromBody(rule, body, request);
                rule.setUpdatedAt(LocalDateTime.now());
                AlertRule saved = repository.save(rule);
                auditService.log(request, "RULE_UPDATE", "RULE", String.valueOf(saved.getId()), saved.getName(), saved.getConditionsJson());
                return ResponseEntity.ok(toDto(saved));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/enabled")
    public ResponseEntity<?> toggle(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return repository.findById(id).map(rule -> {
            boolean enabled = body.get("enabled") == null || Boolean.parseBoolean(body.get("enabled").toString());
            rule.setEnabled(enabled);
            rule.setUpdatedAt(LocalDateTime.now());
            AlertRule saved = repository.save(rule);
            auditService.log(request, "RULE_TOGGLE", "RULE", String.valueOf(id), saved.getName(), "enabled=" + enabled);
            return ResponseEntity.ok(toDto(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpServletRequest request) {
        return repository.findById(id).map(rule -> {
            String name = rule.getName();
            repository.delete(rule);
            auditService.log(request, "RULE_DELETE", "RULE", String.valueOf(id), name, "Supprimée");
            return ResponseEntity.ok(Map.of("status", "ok"));
        }).orElse(ResponseEntity.notFound().build());
    }

    private AlertRule fromBody(AlertRule rule, Map<String, Object> body, HttpServletRequest request) throws Exception {
        if (body.get("name") != null) rule.setName(body.get("name").toString().trim());
        if (rule.getName() == null || rule.getName().isBlank()) {
            throw new IllegalArgumentException("Nom de règle obligatoire.");
        }
        if (body.get("severity") != null) rule.setSeverity(body.get("severity").toString());
        if (body.get("description") != null) rule.setDescription(body.get("description").toString());
        if (body.get("logic") != null) rule.setLogic(body.get("logic").toString().toUpperCase(Locale.ROOT));
        if (body.get("enabled") != null) rule.setEnabled(Boolean.parseBoolean(body.get("enabled").toString()));
        if (body.get("cooldownMinutes") != null) {
            rule.setCooldownMinutes(Integer.parseInt(body.get("cooldownMinutes").toString()));
        }
        Object conditions = body.get("conditions");
        if (conditions != null) {
            rule.setConditionsJson(objectMapper.writeValueAsString(conditions));
        } else if (body.get("conditionsJson") != null) {
            rule.setConditionsJson(body.get("conditionsJson").toString());
        }
        if (rule.getConditionsJson() == null || rule.getConditionsJson().isBlank() || "[]".equals(rule.getConditionsJson())) {
            throw new IllegalArgumentException("Au moins une condition est requise.");
        }
        AuditService.Actor actor = auditService.resolveActor(request);
        if (rule.getCreatedBy() == null) {
            rule.setCreatedBy(actor.email());
        }
        return rule;
    }

    private Map<String, Object> toDto(AlertRule rule) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", rule.getId());
        map.put("name", rule.getName());
        map.put("enabled", rule.isEnabled());
        map.put("severity", rule.getSeverity());
        map.put("description", rule.getDescription());
        map.put("cooldownMinutes", rule.getCooldownMinutes());
        map.put("logic", rule.getLogic());
        map.put("createdBy", rule.getCreatedBy());
        map.put("createdAt", rule.getCreatedAt());
        map.put("updatedAt", rule.getUpdatedAt());
        map.put("lastFiredAt", rule.getLastFiredAt());
        try {
            map.put("conditions", objectMapper.readValue(rule.getConditionsJson(), List.class));
        } catch (Exception e) {
            map.put("conditions", List.of());
            map.put("conditionsJson", rule.getConditionsJson());
        }
        return map;
    }
}
