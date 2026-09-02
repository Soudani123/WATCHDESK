package com.watchdesk.backend.repository;

import com.watchdesk.backend.model.Ticket; // adaptez le chemin vers votre modèle Ticket
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
}