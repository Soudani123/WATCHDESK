package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.repository.IncidentRepository;
import com.watchdesk.backend.service.AuditService;
import com.watchdesk.backend.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin("*")
public class IncidentController {

    @Autowired
    private IncidentRepository incidentRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AuditService auditService;

    @GetMapping
    public List<Incident> getAll() {
        return incidentRepo.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/open")
    public List<Incident> getOpen() {
        return incidentRepo.findActiveIncidents();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Incident> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        return incidentRepo.findById(id).map(incident -> {
            String previous = incident.getStatus();
            String status = body.getOrDefault("status", incident.getStatus());
            incident.setStatus(status);
            if ("RÉSOLU".equalsIgnoreCase(status) || "RESOLU".equalsIgnoreCase(status) || "Résolu".equalsIgnoreCase(status)) {
                incident.setStatus("RÉSOLU");
                incident.setResolvedAt(LocalDateTime.now());
            }
            Incident saved = incidentRepo.save(incident);
            auditService.log(
                    request,
                    "INCIDENT_STATUS",
                    "INCIDENT",
                    String.valueOf(id),
                    incident.getPcName(),
                    previous + " → " + saved.getStatus()
            );
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Incident> createIncident(@RequestBody Incident incident, HttpServletRequest request) {
        Incident savedIncident = incidentRepo.save(incident);

        if (savedIncident.getSeverity() != null && savedIncident.getSeverity().equalsIgnoreCase("Élevée")) {
            String pcName = savedIncident.getPcName() != null ? savedIncident.getPcName() : "Machine Inconnue";
            emailService.sendAlertEmail(pcName, savedIncident.getDescription());
        }

        auditService.log(
                request,
                "INCIDENT_CREATE",
                "INCIDENT",
                String.valueOf(savedIncident.getId()),
                savedIncident.getPcName(),
                savedIncident.getDescription()
        );

        return ResponseEntity.ok(savedIncident);
    }
}
