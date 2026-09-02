package com.watchdesk.backend.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.watchdesk.backend.dto.AuthDtos.*;
import com.watchdesk.backend.model.User;
import com.watchdesk.backend.repository.UserRepository;
import com.watchdesk.backend.service.JwtService;
import com.watchdesk.backend.service.TotpService;
import com.watchdesk.backend.service.TwoFactorChallengeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TotpService totpService;
    private final TwoFactorChallengeService challengeService;

    @Value("${google.client.id}")
    private String googleClientId;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                          TotpService totpService, TwoFactorChallengeService challengeService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.totpService = totpService;
        this.challengeService = challengeService;
    }

    // DTO de réponse locale incluant le rôle
    public static class AuthResponse {
        private String token;
        private String email;
        private String fullName;
        private String role;

        public AuthResponse(String token, String email, String fullName, String role) {
            this.token = token;
            this.email = email;
            this.fullName = fullName;
            this.role = role;
        }

        public String getToken() { return token; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
    }

    // 1. Connexion par e-mail / mot de passe
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        var userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur non trouvé.");
        }

        User user = userOpt.get();
        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Compte désactivé. Contactez le Super Admin.");
        }
        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Mot de passe incorrect.");
        }

        assignRoleIfNeeded(user);

        // Le mot de passe seul ne suffit pas : on passe la main au second facteur
        return ResponseEntity.ok(startTwoFactorChallenge(user));
    }

    // Inscription publique fermée : les comptes se créent dans Administrateurs
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("L'inscription est fermée. Demandez un compte au Super Admin.");
    }

    // 3. Connexion Google SSO
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token Google invalide ou expiré.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            var existing = userRepository.findByEmail(email);
            if (existing.isEmpty()) {
                if ("sana.soudani@esprit.tn".equalsIgnoreCase(email)) {
                    User created = new User(email, null, name, "GOOGLE");
                    assignRoleIfNeeded(created);
                    existing = userRepository.findByEmail(email);
                } else {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Aucun compte WatchDesk pour cet e-mail. Demandez un accès au Super Admin.");
                }
            }
            User user = existing.get();

            assignRoleIfNeeded(user);
            if (!user.isEnabled()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Compte désactivé. Contactez le Super Admin.");
            }

            return ResponseEntity.ok(startTwoFactorChallenge(user));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur de vérification Google : " + e.getMessage());
        }
    }

    // 4. Confirmation du code à 6 chiffres : c'est ici, et seulement ici, que le JWT est délivré
    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verifyTwoFactor(@RequestBody TwoFactorVerifyRequest request) {
        var challengeOpt = challengeService.find(request.getChallengeId());
        if (challengeOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Session de connexion expirée. Recommencez la connexion.");
        }

        var challenge = challengeOpt.get();
        if (!totpService.verifyCode(challenge.getSecret(), request.getCode())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Code incorrect ou expiré.");
        }

        var userOpt = userRepository.findByEmail(challenge.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utilisateur non trouvé.");
        }
        User user = userOpt.get();
        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Compte désactivé. Contactez le Super Admin.");
        }

        // Première activation : le secret n'est persisté qu'après un code confirmé
        if (challenge.isSetupRequired()) {
            user.setTwoFactorSecret(challenge.getSecret());
            user.setTwoFactorEnabled(true);
        }

        challengeService.consume(request.getChallengeId());
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getFullName(), user.getRole()));
    }

    /**
     * Prépare le second facteur. Le secret TOTP est réutilisé d'une tentative à l'autre
     * (sinon Authenticator garde l'ancienne clé et le code est toujours refusé).
     * twoFactorEnabled reste false tant qu'un code n'a pas été confirmé.
     */
    private TwoFactorChallengeResponse startTwoFactorChallenge(User user) {
        if (user.isTwoFactorEnabled()) {
            String challengeId = challengeService.create(user.getEmail(), user.getTwoFactorSecret(), false);
            return new TwoFactorChallengeResponse(challengeId, false, user.getEmail(), null, null);
        }

        String secret = user.getTwoFactorSecret();
        if (secret == null || secret.isBlank()) {
            secret = totpService.generateSecret();
            user.setTwoFactorSecret(secret);
            user.setTwoFactorEnabled(false);
            userRepository.save(user);
        }
        String challengeId = challengeService.create(user.getEmail(), secret, true);
        return new TwoFactorChallengeResponse(
                challengeId, true, user.getEmail(),
                totpService.buildOtpAuthUri(user.getEmail(), secret),
                secret);
    }

    // Règle métier : Affectation dynamique et persistance du rôle
    private void assignRoleIfNeeded(User user) {
        if ("sana.soudani@esprit.tn".equalsIgnoreCase(user.getEmail())) {
            user.setRole("SUPER_ADMIN");
        } else if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("ADMIN");
        }
        userRepository.save(user);
    }
}