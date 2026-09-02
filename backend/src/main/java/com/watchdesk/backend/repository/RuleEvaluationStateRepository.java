package com.watchdesk.backend.repository;

import com.watchdesk.backend.model.RuleEvaluationState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RuleEvaluationStateRepository extends JpaRepository<RuleEvaluationState, Long> {
    Optional<RuleEvaluationState> findByRuleIdAndPcNameAndConditionKey(Long ruleId, String pcName, String conditionKey);
}
