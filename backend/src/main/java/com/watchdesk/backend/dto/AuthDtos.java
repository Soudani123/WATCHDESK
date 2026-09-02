package com.watchdesk.backend.dto;

public class AuthDtos {

    // 1. DTO de connexion
    public static class LoginRequest {
        private String email;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    // 2. DTO d'inscription
    public static class RegisterRequest {
        private String email;
        private String password;
        private String fullName;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
    }

    // 3. DTO Google SSO
    public static class GoogleLoginRequest {
        private String idToken;

        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }
    }

    // 4. DTO de confirmation du code TOTP
    public static class TwoFactorVerifyRequest {
        private String challengeId;
        private String code;

        public String getChallengeId() { return challengeId; }
        public void setChallengeId(String challengeId) { this.challengeId = challengeId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
    }

    /**
     * Réponse renvoyée après un mot de passe (ou un jeton Google) valide :
     * aucun JWT, seulement de quoi afficher le QR ou le champ à 6 chiffres.
     */
    public static class TwoFactorChallengeResponse {
        private final boolean twoFactorRequired = true;
        private final String challengeId;
        private final boolean setupRequired;
        private final String email;
        private final String otpauthUri;
        private final String secret;

        public TwoFactorChallengeResponse(String challengeId, boolean setupRequired, String email,
                                          String otpauthUri, String secret) {
            this.challengeId = challengeId;
            this.setupRequired = setupRequired;
            this.email = email;
            this.otpauthUri = otpauthUri;
            this.secret = secret;
        }

        public boolean isTwoFactorRequired() { return twoFactorRequired; }
        public String getChallengeId() { return challengeId; }
        public boolean isSetupRequired() { return setupRequired; }
        public String getEmail() { return email; }
        public String getOtpauthUri() { return otpauthUri; }
        public String getSecret() { return secret; }
    }

    // 5. DTO de Réponse (bien imbriqué à l'intérieur de AuthDtos avec `static`)
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
}