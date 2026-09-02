package com.watchdesk.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alert_rules")
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private boolean enabled = true;
    private String severity = "ÉLEVÉE";

    @Column(columnDefinition = "TEXT")
    private String description;

    private int cooldownMinutes = 30;

    /** AND | OR */
    private String logic = "AND";

    /** JSON array of conditions */
    @Column(columnDefinition = "TEXT")
    private String conditionsJson;

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastFiredAt;

    public Long getId() { return id; }
    public String getName() { return name; }
    public boolean isEnabled() { return enabled; }
    public String getSeverity() { return severity; }
    public String getDescription() { return description; }
    public int getCooldownMinutes() { return cooldownMinutes; }
    public String getLogic() { return logic; }
    public String getConditionsJson() { return conditionsJson; }
    public String getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getLastFiredAt() { return lastFiredAt; }

    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setSeverity(String severity) { this.severity = severity; }
    public void setDescription(String description) { this.description = description; }
    public void setCooldownMinutes(int cooldownMinutes) { this.cooldownMinutes = cooldownMinutes; }
    public void setLogic(String logic) { this.logic = logic; }
    public void setConditionsJson(String conditionsJson) { this.conditionsJson = conditionsJson; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setLastFiredAt(LocalDateTime lastFiredAt) { this.lastFiredAt = lastFiredAt; }
}
