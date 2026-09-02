package com.watchdesk.backend.repository;

import com.watchdesk.backend.model.Computer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ComputerRepository extends JpaRepository<Computer, Long> {

    Optional<Computer> findByIp(String ip);

    Optional<Computer> findByName(String name);

    // Méthodes de comptage utilisées par DashboardService
    long countByStatus(String status);
}