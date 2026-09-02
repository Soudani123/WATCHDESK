package com.watchdesk.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.watchdesk.backend.model.Computer;
import com.watchdesk.backend.model.Configuration;
import com.watchdesk.backend.repository.ComputerRepository;
import com.watchdesk.backend.service.AuditService;
import com.watchdesk.backend.service.ConfigurationService;
import com.watchdesk.backend.service.CorrelationRuleEngine;
import com.watchdesk.backend.service.EmailService;
import com.watchdesk.backend.service.IncidentAlertService;
import com.watchdesk.backend.service.VulnerabilityService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = "*")
public class AgentController {

    @Autowired
    private ConfigurationService configService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private ComputerRepository computerRepository;

    @Autowired
    private IncidentAlertService incidentAlertService;

    @Autowired
    private VulnerabilityService vulnerabilityService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuditService auditService;

    @Autowired
    private CorrelationRuleEngine correlationRuleEngine;

    private final Map<String, TaskRequest> pendingTasks = new ConcurrentHashMap<>();

    public static class TaskRequest {
        public String action;
        public String message;
        public Map<String, Object> details;

        public TaskRequest(String action, String message) {
            this(action, message, new HashMap<>());
        }

        public TaskRequest(String action, String message, Map<String, Object> details) {
            this.action = action;
            this.message = message;
            this.details = details != null ? details : new HashMap<>();
        }
    }

    @GetMapping("/check-tasks/{id}")
    public ResponseEntity<TaskRequest> checkTasks(@PathVariable String id) {
        TaskRequest task = pendingTasks.getOrDefault(id, new TaskRequest("NONE", ""));
        if (!"NONE".equalsIgnoreCase(task.action)) {
            pendingTasks.put(id, new TaskRequest("NONE", ""));
        }
        return ResponseEntity.ok(task);
    }

    @PostMapping("/trigger-update/{ip}")
    public ResponseEntity<String> triggerUpdate(@PathVariable String ip, HttpServletRequest request) {
        pendingTasks.put(ip, new TaskRequest("SCHEDULE_UPDATE", "Mise à jour demandée par l'administrateur"));
        auditService.log(request, "AGENT_UPDATE", "COMPUTER", ip, ip, "Planification mise à jour Windows");
        return ResponseEntity.ok("Mise à jour planifiée pour " + ip);
    }

    @PostMapping("/trigger-action/{ip}")
    public ResponseEntity<String> triggerAction(@PathVariable String ip, @RequestBody Map<String, Object> payload, HttpServletRequest request) {
        String action = payload.getOrDefault("action", "NONE").toString();
        String message = payload.getOrDefault("message", "Action administrateur").toString();
        pendingTasks.put(ip, new TaskRequest(action, message, payload));
        auditService.log(request, "AGENT_" + action, "COMPUTER", ip, ip, message);
        return ResponseEntity.ok("Action " + action + " enregistrée pour " + ip);
    }

    @PostMapping("/report")
    public ResponseEntity<String> receiveReport(@RequestBody Map<String, Object> report, HttpServletRequest request) {
        String computerName = (String) report.getOrDefault("pcName", report.getOrDefault("machineName", report.getOrDefault("name", "PC Inconnu")));
        String ip = getClientIp(request, report);

        double cpuVal = parseDoubleValue(report.get("cpuUsage"));
        double ramVal = parseRamPercentage(report);
        String appLogs = stringField(report, "appLogs", "AppLogs");
        String systemLogs = stringField(report, "systemLogs", "SystemLogs");
        String securityLogs = stringField(report, "securityLogs", "SecurityLogs");

        try {
            Computer pc = computerRepository.findByIp(ip)
                    .or(() -> computerName != null ? computerRepository.findByName(computerName) : Optional.empty())
                    .orElseGet(Computer::new);
            pc.setName(computerName);
            pc.setIp(ip);
            pc.setUsername((String) report.getOrDefault("username", report.getOrDefault("user", "Système")));
            pc.setCpuUsage(String.format("%.1f %%", cpuVal));
            pc.setStatus((String) report.getOrDefault("status", "online"));
            pc.setLastSeen(LocalDateTime.now());
            if (!appLogs.isBlank()) {
                pc.setAppLogs(appLogs);
            }
            if (!systemLogs.isBlank()) {
                pc.setSystemLogs(systemLogs);
            }
            if (!securityLogs.isBlank()) {
                pc.setSecurityLogs(securityLogs);
            }
            pc.setAppName((String) report.getOrDefault("appName", ""));
            pc.setAppVendor((String) report.getOrDefault("appVendor", ""));
            pc.setRiskSource((String) report.getOrDefault("riskSource", ""));
            String cve = stringField(report, "cve", "Cve");
            if ("Aucune".equalsIgnoreCase(cve.trim())) {
                cve = "";
            }
            pc.setCve(cve);

            String osVersion = stringField(report, "osVersion", "OsVersion");
            if (!osVersion.isBlank()) {
                pc.setOsVersion(osVersion);
            }
            String osBuild = stringField(report, "osBuild", "OsBuild");
            if (!osBuild.isBlank()) {
                pc.setOsBuild(osBuild);
            }
            if (report.containsKey("installedSoftware") || report.containsKey("InstalledSoftware")) {
                Object raw = report.get("installedSoftware") != null ? report.get("installedSoftware") : report.get("InstalledSoftware");
                String json = toJsonArray(raw);
                if (!isEmptyJson(json) || pc.getInstalledSoftware() == null) {
                    pc.setInstalledSoftware(json);
                }
            }
            if (report.containsKey("pendingUpdates") || report.containsKey("PendingUpdates")) {
                Object raw = report.get("pendingUpdates") != null ? report.get("pendingUpdates") : report.get("PendingUpdates");
                pc.setPendingUpdates(toJsonArray(raw));
            }

            Object ramUsed = report.get("ramUsedMB") != null ? report.get("ramUsedMB") : report.get("RamUsedMB");
            Object ramTotal = report.get("ramTotalMB") != null ? report.get("ramTotalMB") : report.get("RamTotalMB");
            if (ramUsed != null) {
                pc.setRamUsedMB((long) parseDoubleValue(ramUsed));
            }
            if (ramTotal != null) {
                pc.setRamTotalMB((long) parseDoubleValue(ramTotal));
            }

            if (report.containsKey("riskScore") && report.get("riskScore") != null) {
                try {
                    pc.setRiskScore(Integer.parseInt(report.get("riskScore").toString()));
                } catch (NumberFormatException nfe) {
                    pc.setRiskScore(0);
                }
            }

            computerRepository.save(pc);
            vulnerabilityService.invalidate();
        } catch (Exception e) {
            System.err.println("Erreur mise à jour base de données ordinateur : " + e.getMessage());
        }

        Configuration config = configService.getConfiguration();

        if (config != null && !config.isMaintenanceMode()) {
            int cpuWarn = config.getCpuWarning();
            int ramWarn = config.getRamWarning();
            boolean isCpuCritical = cpuVal >= config.getCpuCritical();
            boolean isRamCritical = ramVal >= config.getRamCritical();
            boolean newCriticalAlert = false;

            if (isCpuCritical) {
                newCriticalAlert |= incidentAlertService.createHardwareIncidentIfAbsent(
                        computerName, ip, "CPU",
                        String.format("CPU critique (%.1f%%) sur %s", cpuVal, computerName),
                        "ÉLEVÉE"
                );
            } else if (cpuVal >= cpuWarn) {
                incidentAlertService.createHardwareIncidentIfAbsent(
                        computerName, ip, "CPU",
                        String.format("CPU élevé (%.1f%%) sur %s", cpuVal, computerName),
                        "MOYENNE"
                );
            }
            if (isRamCritical) {
                newCriticalAlert |= incidentAlertService.createHardwareIncidentIfAbsent(
                        computerName, ip, "RAM",
                        String.format("RAM critique (%.1f%%) sur %s", ramVal, computerName),
                        "ÉLEVÉE"
                );
            } else if (ramVal >= ramWarn) {
                incidentAlertService.createHardwareIncidentIfAbsent(
                        computerName, ip, "RAM",
                        String.format("RAM élevée (%.1f%%) sur %s", ramVal, computerName),
                        "MOYENNE"
                );
            }

            Object disks = report.get("disks") != null ? report.get("disks") : report.get("Disks");
            if (disks instanceof java.util.List<?> list) {
                for (Object item : list) {
                    if (!(item instanceof Map<?, ?> disk)) continue;
                    Object freeObj = disk.get("freeGB") != null ? disk.get("freeGB") : disk.get("FreeGB");
                    Object nameObj = disk.get("name") != null ? disk.get("name") : disk.get("Name");
                    double free = parseDoubleValue(freeObj);
                    if (free > 0 && free < config.getDiskCriticalGb()) {
                        String diskName = nameObj == null ? "?" : nameObj.toString();
                        newCriticalAlert |= incidentAlertService.createHardwareIncidentIfAbsent(
                                computerName, ip, "DISQUE",
                                String.format("Disque %s critique (%.0f Go libres) sur %s", diskName, free, computerName),
                                "ÉLEVÉE"
                        );
                    }
                }
            }

            if (newCriticalAlert) {
                emailService.sendAlertEmail(
                        "Alerte WatchDesk : " + computerName,
                        String.format("Anomalie critique sur %s (%s) — CPU %.1f%% / RAM %.1f%%", computerName, ip, cpuVal, ramVal)
                );
            }

            try {
                incidentAlertService.createLogIncidentsFromText(computerName, ip, IncidentAlertService.SOURCE_SYSTEME, systemLogs);
                incidentAlertService.createLogIncidentsFromText(computerName, ip, IncidentAlertService.SOURCE_APPLICATION, appLogs);
                incidentAlertService.createLogIncidentsFromText(computerName, ip, IncidentAlertService.SOURCE_SECURITE, securityLogs);
            } catch (Exception e) {
                System.err.println("Erreur création incidents logs : " + e.getMessage());
            }

            try {
                Computer forRules = computerRepository.findByIp(ip)
                        .or(() -> computerRepository.findByName(computerName))
                        .orElse(null);
                if (forRules != null) {
                    correlationRuleEngine.evaluate(forRules, cpuVal, ramVal, securityLogs, systemLogs, appLogs);
                }
            } catch (Exception e) {
                System.err.println("Erreur moteur de règles : " + e.getMessage());
            }
        }

        return ResponseEntity.ok("Rapport reçu et traité");
    }

    @GetMapping("/runtime-config")
    public Map<String, Object> runtimeConfig() {
        Configuration config = configService.getConfiguration();
        Map<String, Object> body = new HashMap<>();
        body.put("heartbeatSeconds", config != null ? config.getHeartbeatInterval() : 10);
        body.put("offlineMinutes", config != null ? config.getOfflineMinutes() : 3);
        return body;
    }

    @PostMapping("/report-update-status")
    public ResponseEntity<String> reportStatus(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok("Statut enregistré");
    }

    private String toJsonArray(Object value) {
        if (value == null) return "[]";
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }

    private boolean isEmptyJson(String json) {
        if (json == null) return true;
        String t = json.trim();
        return t.isEmpty() || "[]".equals(t) || "null".equalsIgnoreCase(t);
    }

    private String getClientIp(HttpServletRequest request, Map<String, Object> report) {
        String[] keys = {"ip", "ipAddress", "clientIp", "IpAddress"};
        for (String key : keys) {
            if (report.containsKey(key) && report.get(key) != null) {
                String ipStr = report.get(key).toString().trim();
                if (!ipStr.isEmpty() && !"0.0.0.0".equals(ipStr)) {
                    return ipStr;
                }
            }
        }
        String remoteAddr = request.getHeader("X-Forwarded-For");
        if (remoteAddr == null || remoteAddr.isEmpty() || "unknown".equalsIgnoreCase(remoteAddr)) {
            remoteAddr = request.getRemoteAddr();
        } else {
            remoteAddr = remoteAddr.split(",")[0].trim();
        }
        return ("0:0:0:0:0:0:0:1".equals(remoteAddr) || "127.0.0.1".equals(remoteAddr)) ? "127.0.0.1" : remoteAddr;
    }

    private String stringField(Map<String, Object> report, String camel, String pascal) {
        Object value = report.get(camel) != null ? report.get(camel) : report.get(pascal);
        return value == null ? "" : value.toString();
    }

    private double parseDoubleValue(Object value) {
        if (value == null) return 0.0;
        try {
            return Double.parseDouble(value.toString().replace("%", "").replace(",", ".").trim());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double parseRamPercentage(Map<String, Object> report) {
        try {
            double used = parseDoubleValue(report.get("ramUsedMB"));
            double total = parseDoubleValue(report.get("ramTotalMB"));
            return total > 0 ? (used / total) * 100.0 : parseDoubleValue(report.get("ramUsage"));
        } catch (Exception e) {
            return 0.0;
        }
    }
}