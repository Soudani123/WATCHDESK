package com.watchdesk.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AgentReportDTO {

    private String ip;              // Clé unique de liaison
    private String machineName;
    private String username;
    private String pcName;
    private String cpuUsage;
    private Long ramUsedMB;
    private Long ramTotalMB;
    private String status;
    private LocalDateTime timestamp;
    private List<DiskInfo> disks;
    private List<IncidentDTO> incidents;

    // ========== LOGS WINDOWS SÉPARÉS ==========
    private String systemLogs;
    private String appLogs;
    private String securityLogs;

    // ========== MÉTADONNÉES DE RISQUE ==========
    private String appName;
    private String appVendor;
    private int riskScore;
    private String cve;

    // ========== GETTERS / SETTERS ==========
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }

    public String getMachineName() { return machineName; }
    public void setMachineName(String machineName) { this.machineName = machineName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPcName() { return pcName; }
    public void setPcName(String pcName) { this.pcName = pcName; }

    public String getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(String cpuUsage) { this.cpuUsage = cpuUsage; }

    public Long getRamUsedMB() { return ramUsedMB; }
    public void setRamUsedMB(Long ramUsedMB) { this.ramUsedMB = ramUsedMB; }

    public Long getRamTotalMB() { return ramTotalMB; }
    public void setRamTotalMB(Long ramTotalMB) { this.ramTotalMB = ramTotalMB; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public List<DiskInfo> getDisks() { return disks; }
    public void setDisks(List<DiskInfo> disks) { this.disks = disks; }

    public List<IncidentDTO> getIncidents() { return incidents; }
    public void setIncidents(List<IncidentDTO> incidents) { this.incidents = incidents; }

    public String getSystemLogs() { return systemLogs; }
    public void setSystemLogs(String systemLogs) { this.systemLogs = systemLogs; }

    public String getAppLogs() { return appLogs; }
    public void setAppLogs(String appLogs) { this.appLogs = appLogs; }

    public String getSecurityLogs() { return securityLogs; }
    public void setSecurityLogs(String securityLogs) { this.securityLogs = securityLogs; }

    public String getAppName() { return appName; }
    public void setAppName(String appName) { this.appName = appName; }

    public String getAppVendor() { return appVendor; }
    public void setAppVendor(String appVendor) { this.appVendor = appVendor; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public String getCve() { return cve; }
    public void setCve(String cve) { this.cve = cve; }

    // ========== CLASSE INTERNE DiskInfo ==========
    public static class DiskInfo {
        private String name;
        private Integer freeGB;
        private Integer totalGB;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Integer getFreeGB() { return freeGB; }
        public void setFreeGB(Integer freeGB) { this.freeGB = freeGB; }
        public Integer getTotalGB() { return totalGB; }
        public void setTotalGB(Integer totalGB) { this.totalGB = totalGB; }
    }

    // ========== CLASSE INTERNE IncidentDTO ==========
    public static class IncidentDTO {
        private String severity;
        private String description;
        private String status;

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}