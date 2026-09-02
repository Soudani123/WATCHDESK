package com.watchdesk.backend.repository;

import com.watchdesk.backend.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:action IS NULL OR :action = '' OR UPPER(a.action) = UPPER(:action))
          AND (:actor IS NULL OR :actor = '' OR LOWER(a.actorEmail) LIKE LOWER(CONCAT('%', :actor, '%'))
               OR LOWER(a.actorName) LIKE LOWER(CONCAT('%', :actor, '%')))
          AND (:q IS NULL OR :q = '' OR LOWER(a.details) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(a.targetLabel) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(a.action) LIKE LOWER(CONCAT('%', :q, '%')))
          AND (:fromDate IS NULL OR a.createdAt >= :fromDate)
          AND (:toDate IS NULL OR a.createdAt <= :toDate)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> search(
            @Param("action") String action,
            @Param("actor") String actor,
            @Param("q") String q,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
}
