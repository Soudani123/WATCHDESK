package com.watchdesk.backend.repository;

import com.watchdesk.backend.model.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    // Récupère les incidents les plus récents
    List<Incident> findAllByOrderByCreatedAtDesc();

    // Récupère les incidents actifs pour le Dashboard
    @Query("SELECT i FROM Incident i WHERE UPPER(i.status) IN ('OUVERT', 'NOUVEAU', 'EN COURS') ORDER BY i.createdAt DESC")
    List<Incident> findActiveIncidents();

    @Query("SELECT COUNT(i) FROM Incident i WHERE UPPER(i.status) IN ('OUVERT', 'NOUVEAU', 'EN COURS')")
    long countOpenIncidents();

    // Vérifie si un incident similaire existe déjà (Anti-doublon)
    @Query("SELECT COUNT(i) > 0 FROM Incident i WHERE i.pcName = :pcName " +
            "AND i.description LIKE %:problemType% " +
            "AND i.createdAt > :since AND i.status != 'Résolu'")
    boolean existsSimilarIncident(
            @Param("pcName") String pcName,
            @Param("problemType") String problemType,
            @Param("since") LocalDateTime since
    );

    Optional<Incident> findFirstByPcNameAndSourceAndEventIdAndStatusIgnoreCase(
            String pcName, String source, String eventId, String status);

    Optional<Incident> findFirstByPcNameAndSourceAndStatusIgnoreCase(
            String pcName, String source, String status);
}