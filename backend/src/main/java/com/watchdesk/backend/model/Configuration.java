package com.watchdesk.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "configurations")
public class Configuration {

    @Id
    private Long id = 1L;

    private int cpuCritical;
    private int ramCritical;
    private boolean maintenanceMode;
    private String maintenanceDuration;
    private String adminEmail;
    private boolean enableEmail;
    private String slackWebhook;
    private boolean enableSlack;
    private int heartbeatInterval;
    private Integer cpuWarning;
    private Integer ramWarning;
    private Integer diskCriticalGb;
    private Integer offlineMinutes;

    // Constructeur sans argument
    public Configuration() {}

    // Constructeur avec tous les arguments
    public Configuration(Long id, int cpuCritical, int ramCritical, boolean maintenanceMode,
                         String maintenanceDuration, String adminEmail, boolean enableEmail,
                         String slackWebhook, boolean enableSlack, int heartbeatInterval) {
        this.id = id;
        this.cpuCritical = cpuCritical;
        this.ramCritical = ramCritical;
        this.maintenanceMode = maintenanceMode;
        this.maintenanceDuration = maintenanceDuration;
        this.adminEmail = adminEmail;
        this.enableEmail = enableEmail;
        this.slackWebhook = slackWebhook;
        this.enableSlack = enableSlack;
        this.heartbeatInterval = heartbeatInterval;
    }

    // Getters
    public Long getId() { return id; }
    public int getCpuCritical() { return cpuCritical; }
    public int getRamCritical() { return ramCritical; }
    public boolean isMaintenanceMode() { return maintenanceMode; }
    public String getMaintenanceDuration() { return maintenanceDuration; }
    public String getAdminEmail() { return adminEmail; }
    public boolean isEnableEmail() { return enableEmail; }
    public String getSlackWebhook() { return slackWebhook; }
    public boolean isEnableSlack() { return enableSlack; }
    public int getHeartbeatInterval() { return heartbeatInterval <= 0 ? 10 : heartbeatInterval; }
    public int getCpuWarning() { return cpuWarning == null || cpuWarning <= 0 ? 75 : cpuWarning; }
    public int getRamWarning() { return ramWarning == null || ramWarning <= 0 ? 80 : ramWarning; }
    public int getDiskCriticalGb() { return diskCriticalGb == null || diskCriticalGb <= 0 ? 10 : diskCriticalGb; }
    public int getOfflineMinutes() { return offlineMinutes == null || offlineMinutes <= 0 ? 3 : offlineMinutes; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setCpuCritical(int cpuCritical) { this.cpuCritical = cpuCritical; }
    public void setRamCritical(int ramCritical) { this.ramCritical = ramCritical; }
    public void setMaintenanceMode(boolean maintenanceMode) { this.maintenanceMode = maintenanceMode; }
    public void setMaintenanceDuration(String maintenanceDuration) { this.maintenanceDuration = maintenanceDuration; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public void setEnableEmail(boolean enableEmail) { this.enableEmail = enableEmail; }
    public void setSlackWebhook(String slackWebhook) { this.slackWebhook = slackWebhook; }
    public void setEnableSlack(boolean enableSlack) { this.enableSlack = enableSlack; }
    public void setHeartbeatInterval(int heartbeatInterval) { this.heartbeatInterval = heartbeatInterval; }
    public void setCpuWarning(Integer cpuWarning) { this.cpuWarning = cpuWarning; }
    public void setRamWarning(Integer ramWarning) { this.ramWarning = ramWarning; }
    public void setDiskCriticalGb(Integer diskCriticalGb) { this.diskCriticalGb = diskCriticalGb; }
    public void setOfflineMinutes(Integer offlineMinutes) { this.offlineMinutes = offlineMinutes; }
}