package com.watchdesk.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rule_evaluation_states", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"rule_id", "pc_name", "condition_key"})
})
public class RuleEvaluationState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "pc_name")
    private String pcName;

    @Column(name = "condition_key")
    private String conditionKey;

    private LocalDateTime since;
    private int counter;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public Long getRuleId() { return ruleId; }
    public String getPcName() { return pcName; }
    public String getConditionKey() { return conditionKey; }
    public LocalDateTime getSince() { return since; }
    public int getCounter() { return counter; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(Long id) { this.id = id; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }
    public void setPcName(String pcName) { this.pcName = pcName; }
    public void setConditionKey(String conditionKey) { this.conditionKey = conditionKey; }
    public void setSince(LocalDateTime since) { this.since = since; }
    public void setCounter(int counter) { this.counter = counter; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
