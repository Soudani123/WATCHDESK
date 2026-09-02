package com.watchdesk.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.watchdesk.backend.model.AlertRule;
import com.watchdesk.backend.model.Computer;
import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.model.RuleEvaluationState;
import com.watchdesk.backend.repository.AlertRuleRepository;
import com.watchdesk.backend.repository.IncidentRepository;
import com.watchdesk.backend.repository.RuleEvaluationStateRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CorrelationRuleEngine {

    public static final String SOURCE_REGLE = "REGLE";

    private static final Pattern FAILED_LOGIN = Pattern.compile(
            "(?i)(échec|echec|failed|failure).{0,40}(logon|login|connexion|authent)"
    );

    private final AlertRuleRepository ruleRepository;
    private final RuleEvaluationStateRepository stateRepository;
    private final IncidentRepository incidentRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public CorrelationRuleEngine(
            AlertRuleRepository ruleRepository,
            RuleEvaluationStateRepository stateRepository,
            IncidentRepository incidentRepository,
            AuditService auditService,
            ObjectMapper objectMapper
    ) {
        this.ruleRepository = ruleRepository;
        this.stateRepository = stateRepository;
        this.incidentRepository = incidentRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public void evaluate(Computer pc, double cpuVal, double ramVal, String securityLogs, String systemLogs, String appLogs) {
        if (pc == null || pc.getName() == null) return;
        List<AlertRule> rules = ruleRepository.findByEnabledTrue();
        if (rules.isEmpty()) return;

        String allLogs = (securityLogs == null ? "" : securityLogs) + "\n"
                + (systemLogs == null ? "" : systemLogs) + "\n"
                + (appLogs == null ? "" : appLogs);

        for (AlertRule rule : rules) {
            try {
                evaluateOne(rule, pc, cpuVal, ramVal, securityLogs, allLogs);
            } catch (Exception e) {
                System.err.println("Rule #" + rule.getId() + " error: " + e.getMessage());
            }
        }
    }

    private void evaluateOne(AlertRule rule, Computer pc, double cpuVal, double ramVal, String securityLogs, String allLogs) throws Exception {
        List<Map<String, Object>> conditions = parseConditions(rule.getConditionsJson());
        if (conditions.isEmpty()) return;

        boolean and = !"OR".equalsIgnoreCase(rule.getLogic());
        boolean matched = and;
        List<String> matchedLabels = new ArrayList<>();

        for (Map<String, Object> cond : conditions) {
            String type = str(cond.get("type"));
            boolean ok = evaluateCondition(rule.getId(), pc.getName(), type, cond, cpuVal, ramVal, securityLogs, allLogs, pc);
            String label = type + (cond.get("threshold") != null ? "≥" + cond.get("threshold") : "");
            if (ok) matchedLabels.add(label);
            if (and) {
                matched = matched && ok;
                if (!matched) break;
            } else {
                matched = matched || ok;
            }
        }

        if (!matched) return;

        // Cooldown
        if (rule.getLastFiredAt() != null && rule.getCooldownMinutes() > 0) {
            long mins = ChronoUnit.MINUTES.between(rule.getLastFiredAt(), LocalDateTime.now());
            if (mins < rule.getCooldownMinutes()) return;
        }

        String eventId = "RULE-" + rule.getId();
        Optional<Incident> existing = incidentRepository
                .findFirstByPcNameAndSourceAndEventIdAndStatusIgnoreCase(pc.getName(), SOURCE_REGLE, eventId, "OUVERT");
        if (existing.isPresent()) return;

        Incident incident = new Incident();
        incident.setPcName(pc.getName());
        incident.setMachine(pc.getIp());
        incident.setSource(SOURCE_REGLE);
        incident.setEventId(eventId);
        incident.setSeverity(rule.getSeverity() != null ? rule.getSeverity() : "ÉLEVÉE");
        incident.setStatus("OUVERT");
        incident.setCreatedAt(LocalDateTime.now());
        incident.setDescription("Règle « " + rule.getName() + " » : " + String.join(" + ", matchedLabels));
        incidentRepository.save(incident);

        rule.setLastFiredAt(LocalDateTime.now());
        ruleRepository.save(rule);

        auditService.log(
                AuditService.Actor.anonymous(),
                "RULE_FIRE",
                "RULE",
                String.valueOf(rule.getId()),
                rule.getName(),
                "Incident créé sur " + pc.getName()
        );
    }

    private boolean evaluateCondition(
            Long ruleId, String pcName, String type, Map<String, Object> cond,
            double cpuVal, double ramVal, String securityLogs, String allLogs, Computer pc
    ) {
        return switch (type == null ? "" : type.toUpperCase(Locale.ROOT)) {
            case "CPU_ABOVE" -> durationMetric(ruleId, pcName, "CPU_ABOVE", cpuVal, num(cond.get("threshold"), 90),
                    intVal(cond.get("durationMinutes"), 0));
            case "RAM_ABOVE" -> durationMetric(ruleId, pcName, "RAM_ABOVE", ramVal, num(cond.get("threshold"), 90),
                    intVal(cond.get("durationMinutes"), 0));
            case "OFFLINE_MINUTES" -> {
                int need = intVal(cond.get("threshold"), 3);
                long mins = pc.getLastSeen() == null ? 9999 : ChronoUnit.MINUTES.between(pc.getLastSeen(), LocalDateTime.now());
                // During report, PC is online — OFFLINE is for other evaluators; treat as false on live report
                yield mins >= need;
            }
            case "FAILED_LOGINS" -> {
                int need = intVal(cond.get("threshold"), 3);
                int count = countFailedLogins(securityLogs != null ? securityLogs : allLogs);
                yield bumpCounter(ruleId, pcName, "FAILED_LOGINS", count >= need ? count : 0) >= need || count >= need;
            }
            case "LOG_EVENT_ID" -> {
                String eventId = str(cond.get("eventId"));
                if (eventId == null || eventId.isBlank()) yield false;
                yield allLogs != null && allLogs.contains("[ID:" + eventId + "]");
            }
            default -> false;
        };
    }

    private boolean durationMetric(Long ruleId, String pcName, String key, double value, double threshold, int durationMinutes) {
        RuleEvaluationState state = stateRepository
                .findByRuleIdAndPcNameAndConditionKey(ruleId, pcName, key)
                .orElseGet(() -> {
                    RuleEvaluationState s = new RuleEvaluationState();
                    s.setRuleId(ruleId);
                    s.setPcName(pcName);
                    s.setConditionKey(key);
                    return s;
                });

        LocalDateTime now = LocalDateTime.now();
        if (value >= threshold) {
            if (state.getSince() == null) {
                state.setSince(now);
            }
            state.setUpdatedAt(now);
            stateRepository.save(state);
            if (durationMinutes <= 0) return true;
            long elapsed = ChronoUnit.MINUTES.between(state.getSince(), now);
            return elapsed >= durationMinutes;
        } else {
            state.setSince(null);
            state.setCounter(0);
            state.setUpdatedAt(now);
            stateRepository.save(state);
            return false;
        }
    }

    private int bumpCounter(Long ruleId, String pcName, String key, int observed) {
        RuleEvaluationState state = stateRepository
                .findByRuleIdAndPcNameAndConditionKey(ruleId, pcName, key)
                .orElseGet(() -> {
                    RuleEvaluationState s = new RuleEvaluationState();
                    s.setRuleId(ruleId);
                    s.setPcName(pcName);
                    s.setConditionKey(key);
                    return s;
                });
        if (observed > 0) {
            state.setCounter(Math.max(state.getCounter(), observed));
        }
        state.setUpdatedAt(LocalDateTime.now());
        stateRepository.save(state);
        return state.getCounter();
    }

    private int countFailedLogins(String logs) {
        if (logs == null || logs.isBlank()) return 0;
        int count = 0;
        for (String line : logs.split("\\r?\\n")) {
            if (FAILED_LOGIN.matcher(line).find() || line.toLowerCase(Locale.ROOT).contains("4625")) {
                count++;
            }
        }
        return count;
    }

    private List<Map<String, Object>> parseConditions(String json) throws Exception {
        if (json == null || json.isBlank()) return List.of();
        return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static double num(Object o, double def) {
        if (o == null) return def;
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return def; }
    }

    private static int intVal(Object o, int def) {
        if (o == null) return def;
        try { return (int) Double.parseDouble(o.toString()); } catch (Exception e) { return def; }
    }
}
