package com.watchdesk.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String actorEmail;
    private String actorName;
    private String actorRole;
    private String action;
    private String targetType;
    private String targetId;
    private String targetLabel;

    @Column(columnDefinition = "TEXT")
    private String details;

    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public String getActorEmail() { return actorEmail; }
    public String getActorName() { return actorName; }
    public String getActorRole() { return actorRole; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public String getTargetId() { return targetId; }
    public String getTargetLabel() { return targetLabel; }
    public String getDetails() { return details; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setId(Long id) { this.id = id; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }
    public void setAction(String action) { this.action = action; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public void setTargetLabel(String targetLabel) { this.targetLabel = targetLabel; }
    public void setDetails(String details) { this.details = details; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
