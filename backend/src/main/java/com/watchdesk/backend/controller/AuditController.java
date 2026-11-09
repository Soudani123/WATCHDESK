package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.AuditLog;
import com.watchdesk.backend.service.AuditService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(origins = "*")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String toDate
    ) {
        int safeSize = Math.min(Math.max(size, 1), 500);
        int safePage = Math.max(page, 0);
        Page<AuditLog> result = auditService.search(
                blankToNull(action),
                blankToNull(actor),
                blankToNull(q),
                parseFrom(firstNonBlank(from, fromDate)),
                parseToExclusive(firstNonBlank(to, toDate)),
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
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
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String toDate
    ) {
        Page<AuditLog> result = auditService.search(
                blankToNull(action),
                blankToNull(actor),
                blankToNull(q),
                parseFrom(firstNonBlank(from, fromDate)),
                parseToExclusive(firstNonBlank(to, toDate)),
                PageRequest.of(0, 5000, Sort.by(Sort.Direction.DESC, "createdAt"))
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

    private static String blankToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private static String firstNonBlank(String a, String b) {
        String first = blankToNull(a);
        return first != null ? first : blankToNull(b);
    }

    private static LocalDateTime parseFrom(String from) {
        LocalDateTime parsed = parseDateTime(from, false);
        if (parsed != null) return parsed;
        LocalDate day = parseDay(from);
        return day == null ? null : day.atStartOfDay();
    }

    /** Exclusive upper bound: next day 00:00 for a date-only value. */
    private static LocalDateTime parseToExclusive(String to) {
        LocalDateTime parsed = parseDateTime(to, true);
        if (parsed != null) return parsed;
        LocalDate day = parseDay(to);
        return day == null ? null : day.plusDays(1).atStartOfDay();
    }

    private static LocalDate parseDay(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String v = raw.trim();
            if (v.length() >= 10) {
                return LocalDate.parse(v.substring(0, 10));
            }
            return LocalDate.parse(v);
        } catch (Exception e) {
            return null;
        }
    }

    private static LocalDateTime parseDateTime(String raw, boolean exclusiveEnd) {
        if (raw == null || raw.isBlank()) return null;
        String v = raw.trim();
        if (v.length() <= 10) return null;
        try {
            if (v.endsWith("Z") || v.contains("+") || (v.length() > 11 && v.lastIndexOf('-') > 9)) {
                Instant instant = Instant.parse(v);
                LocalDateTime ldt = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
                return exclusiveEnd ? ldt.plusSeconds(1) : ldt;
            }
            LocalDateTime ldt = LocalDateTime.parse(v);
            return exclusiveEnd ? ldt.plusSeconds(1) : ldt;
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
