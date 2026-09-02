package com.watchdesk.backend.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stocke les authentifications en attente de code TOTP. Le mot de passe est déjà validé
 * à ce stade, mais aucun JWT n'est délivré tant que le code à 6 chiffres n'est pas confirmé.
 */
@Service
public class TwoFactorChallengeService {

    private static final long TTL_SECONDS = 600;

    public static class Challenge {
        private final String email;
        private final String secret;
        private final boolean setupRequired;
        private final Instant expiresAt;

        Challenge(String email, String secret, boolean setupRequired, Instant expiresAt) {
            this.email = email;
            this.secret = secret;
            this.setupRequired = setupRequired;
            this.expiresAt = expiresAt;
        }

        public String getEmail() { return email; }
        public String getSecret() { return secret; }
        public boolean isSetupRequired() { return setupRequired; }
        public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
    }

    private final ConcurrentHashMap<String, Challenge> challenges = new ConcurrentHashMap<>();

    public String create(String email, String secret, boolean setupRequired) {
        purgeExpired();
        String id = UUID.randomUUID().toString();
        challenges.put(id, new Challenge(email, secret, setupRequired, Instant.now().plusSeconds(TTL_SECONDS)));
        return id;
    }

    public Optional<Challenge> find(String challengeId) {
        if (challengeId == null) return Optional.empty();
        Challenge challenge = challenges.get(challengeId);
        if (challenge == null) return Optional.empty();
        if (challenge.isExpired()) {
            challenges.remove(challengeId);
            return Optional.empty();
        }
        return Optional.of(challenge);
    }

    /** Un challenge est à usage unique : il est retiré dès que le code est accepté. */
    public void consume(String challengeId) {
        challenges.remove(challengeId);
    }

    private void purgeExpired() {
        challenges.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
}
