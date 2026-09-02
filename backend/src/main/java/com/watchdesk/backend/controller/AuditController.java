package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.AuditLog;
import com.watchdesk.backend.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(origins = "*")
public class AuditController {

    private final AuditLogRepository repository;

    public AuditController(AuditLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        int safeSize = Math.min(Math.max(size, 1), 500);
        int safePage = Math.max(page, 0);
        Page<AuditLog> result = repository.search(
                blankToEmpty(action),
                blankToEmpty(actor),
                blankToEmpty(q),
                parseFrom(from),
                parseTo(to),
                PageRequest.of(safePage, safeSize)
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", result.getContent());
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        Page<AuditLog> result = repository.search(
                blankToEmpty(action),
                blankToEmpty(actor),
                blankToEmpty(q),
                parseFrom(from),
                parseTo(to),
                PageRequest.of(0, 5000)
        );
        List<AuditLog> rows = result.getContent();
        StringBuilder sb = new StringBuilder();
        sb.append("Date;Acteur;Email;Role;Action;Type cible;Cible;Details\n");
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (AuditLog a : rows) {
            sb.append(csv(a.getCreatedAt() != null ? a.getCreatedAt().format(fmt) : "")).append(';')
                    .append(csv(a.getActorName())).append(';')
                    .append(csv(a.getActorEmail())).append(';')
                    .append(csv(a.getActorRole())).append(';')
                    .append(csv(a.getAction())).append(';')
                    .append(csv(a.getTargetType())).append(';')
                    .append(csv(a.getTargetLabel() != null ? a.getTargetLabel() : a.getTargetId())).append(';')
                    .append(csv(a.getDetails())).append('\n');
        }
        byte[] bytes = ("\uFEFF" + sb).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"watchdesk-audit.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(bytes);
    }

    private static String blankToEmpty(String v) {
        return v == null ? "" : v.trim();
    }

    private static LocalDateTime parseFrom(String from) {
        if (from == null || from.isBlank()) return null;
        try {
            return LocalDate.parse(from.trim()).atStartOfDay();
        } catch (Exception e) {
            return null;
        }
    }

    private static LocalDateTime parseTo(String to) {
        if (to == null || to.isBlank()) return null;
        try {
            return LocalDate.parse(to.trim()).atTime(LocalTime.MAX);
        } catch (Exception e) {
            return null;
        }
    }

    private static String csv(String value) {
        if (value == null) return "";
        String v = value.replace("\"", "\"\"");
        if (v.contains(";") || v.contains("\"") || v.contains("\n") || v.contains("\r")) {
            return "\"" + v + "\"";
        }
        return v;
    }
}
