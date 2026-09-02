package com.watchdesk.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    private String password;
    private String fullName;
    private String authProvider;

    // 🟢 CHAMP AJOUTÉ POUR GÉRER LE RÔLE DANS LA BDD
    private String role;
    private Boolean enabled;
    private java.time.LocalDateTime lastLoginAt;

    // 2FA (TOTP) : le secret n'est enregistré qu'après confirmation du premier code
    private String twoFactorSecret;
    private Boolean twoFactorEnabled;

    // Constructeur sans argument
    public User() {}

    // Constructeur avec arguments
    public User(String email, String password, String fullName, String authProvider) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.authProvider = authProvider;
    }

    // Getters
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getFullName() { return fullName; }
    public String getAuthProvider() { return authProvider; }
    public String getRole() { return role; }
    public Boolean getEnabled() { return enabled; }
    public boolean isEnabled() { return enabled == null || enabled; }
    public java.time.LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public String getTwoFactorSecret() { return twoFactorSecret; }
    public Boolean getTwoFactorEnabled() { return twoFactorEnabled; }

    public boolean isTwoFactorEnabled() {
        return Boolean.TRUE.equals(twoFactorEnabled)
                && twoFactorSecret != null
                && !twoFactorSecret.isBlank();
    }

    public boolean isSuperAdminAccount() {
        if (email != null && email.equalsIgnoreCase("sana.soudani@esprit.tn")) return true;
        String r = role == null ? "" : role.toUpperCase().replace(" ", "_");
        return r.equals("SUPER_ADMIN");
    }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }
    public void setRole(String role) { this.role = role; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public void setLastLoginAt(java.time.LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }
    public void setTwoFactorEnabled(Boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }
}