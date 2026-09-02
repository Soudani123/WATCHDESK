package com.watchdesk.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "computers")
public class Computer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String name;

    private String ip;
    private String username;

    @Column(name = "cpu_usage")
    private String cpuUsage;

    @Column(name = "ram_used_mb")
    private Long ramUsedMB;

    @Column(name = "ram_total_mb")
    private Long ramTotalMB;

    private String status;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(columnDefinition = "TEXT")
    private String securityLogs;

    @Column(columnDefinition = "TEXT")
    private String appLogs;

    @Column(columnDefinition = "TEXT")
    private String systemLogs;

    // 🟢 NOUVEAUX CHAMPS D'ANALYSE DE RISQUE APPLICATIF / ESET
    private String appName;
    private String appVendor;
    private String riskSource;
    private int riskScore;
    @Column(name = "cve")
    private String cve;

    @Column(name = "os_version")
    private String osVersion;

    @Column(name = "os_build")
    private String osBuild;

    @Column(name = "installed_software", columnDefinition = "TEXT")
    private String installedSoftware;

    @Column(name = "pending_updates", columnDefinition = "TEXT")
    private String pendingUpdates;

    @Transient
    private int openIncidentCount;

    @Transient
    private String fleetStatus;

    @Transient
    private int vulnCount;

    @Transient
    private int patchCount;

    // --- Getters ---
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getIp() { return ip; }
    public String getUsername() { return username; }
    public String getCpuUsage() { return cpuUsage; }
    public Long getRamUsedMB() { return ramUsedMB; }
    public Long getRamTotalMB() { return ramTotalMB; }
    public String getStatus() { return status; }
    public LocalDateTime getLastSeen() { return lastSeen; }
    public String getSecurityLogs() { return securityLogs; }
    public String getAppLogs() { return appLogs; }
    public String getSystemLogs() { return systemLogs; }
    public String getAppName() { return appName; }
    public String getAppVendor() { return appVendor; }
    public String getRiskSource() { return riskSource; }
    public int getRiskScore() { return riskScore; }
    public String getCve() { return cve; }
    public String getOsVersion() { return osVersion; }
    public String getOsBuild() { return osBuild; }
    public String getInstalledSoftware() { return installedSoftware; }
    public String getPendingUpdates() { return pendingUpdates; }
    public int getOpenIncidentCount() { return openIncidentCount; }
    public String getFleetStatus() { return fleetStatus; }
    public int getVulnCount() { return vulnCount; }
    public int getPatchCount() { return patchCount; }

    // --- Setters ---
    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setIp(String ip) { this.ip = ip; }
    public void setUsername(String username) { this.username = username; }
    public void setCpuUsage(String cpuUsage) { this.cpuUsage = cpuUsage; }
    public void setRamUsedMB(Long ramUsedMB) { this.ramUsedMB = ramUsedMB; }
    public void setRamTotalMB(Long ramTotalMB) { this.ramTotalMB = ramTotalMB; }
    public void setStatus(String status) { this.status = status; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
    public void setSecurityLogs(String securityLogs) { this.securityLogs = securityLogs; }
    public void setAppLogs(String appLogs) { this.appLogs = appLogs; }
    public void setSystemLogs(String systemLogs) { this.systemLogs = systemLogs; }
    public void setAppName(String appName) { this.appName = appName; }
    public void setAppVendor(String appVendor) { this.appVendor = appVendor; }
    public void setRiskSource(String riskSource) { this.riskSource = riskSource; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }
    public void setCve(String cve) { this.cve = cve; }
    public void setOsVersion(String osVersion) { this.osVersion = osVersion; }
    public void setOsBuild(String osBuild) { this.osBuild = osBuild; }
    public void setInstalledSoftware(String installedSoftware) { this.installedSoftware = installedSoftware; }
    public void setPendingUpdates(String pendingUpdates) { this.pendingUpdates = pendingUpdates; }
    public void setOpenIncidentCount(int openIncidentCount) { this.openIncidentCount = openIncidentCount; }
    public void setFleetStatus(String fleetStatus) { this.fleetStatus = fleetStatus; }
    public void setVulnCount(int vulnCount) { this.vulnCount = vulnCount; }
    public void setPatchCount(int patchCount) { this.patchCount = patchCount; }
}