package com.watchdesk.backend.repository;

import com.watchdesk.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Recherche un utilisateur par son adresse e-mail
    Optional<User> findByEmail(String email);
}