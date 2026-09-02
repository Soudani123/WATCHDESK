package com.watchdesk.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String machine;
    private String pcName;
    private String severity;
    private String description;
    private String status;

    /** MATERIEL, SYSTEME, APPLICATION, SECURITE, IA */
    private String source;

    @Column(name = "event_id")
    private String eventId;

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    // Getters
    public Long getId() { return id; }
    public String getMachine() { return machine; }
    public String getPcName() { return pcName; }
    public String getSeverity() { return severity; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public String getSource() { return source; }
    public String getEventId() { return eventId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setMachine(String machine) { this.machine = machine; }
    public void setPcName(String pcName) { this.pcName = pcName; }
    public void setSeverity(String severity) { this.severity = severity; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(String status) { this.status = status; }
    public void setSource(String source) { this.source = source; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}