package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.Configuration;
import com.watchdesk.backend.service.AuditService;
import com.watchdesk.backend.service.ConfigurationService;
import com.watchdesk.backend.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/configuration")
@CrossOrigin(origins = "*")
public class ConfigurationController {

    @Autowired
    private ConfigurationService service;

    @Autowired
    private EmailService emailService;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private AuditService auditService;

    @GetMapping
    public ResponseEntity<Configuration> getConfiguration() {
        return ResponseEntity.ok(service.getConfiguration());
    }

    @PutMapping
    public ResponseEntity<Configuration> updateConfiguration(@RequestBody Configuration config, HttpServletRequest request) {
        Configuration updated = service.updateConfiguration(config);
        auditService.log(request, "CONFIG_UPDATE", "CONFIGURATION", "1", "Configuration globale",
                "maintenance=" + updated.isMaintenanceMode() + ", heartbeat=" + updated.getHeartbeatInterval());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/test-email")
    public ResponseEntity<Map<String, String>> testEmail(HttpServletRequest request) {
        try {
            emailService.sendTestEmail();
            auditService.log(request, "CONFIG_TEST_EMAIL", "CONFIGURATION", "1", "Test e-mail", "OK");
            return ResponseEntity.ok(Map.of("status", "ok", "message", "E-mail de test envoyé."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping("/test-slack")
    public ResponseEntity<Map<String, String>> testSlack() {
        Configuration config = service.getConfiguration();
        String webhook = config.getSlackWebhook();
        if (webhook == null || webhook.isBlank() || !webhook.startsWith("http")) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Webhook Slack manquant ou invalide."));
        }
        try {
            restTemplate.postForEntity(webhook, Map.of("text", "WatchDesk — test d'alerte parc. Ce canal est opérationnel."), String.class);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "Message Slack de test envoyé."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
