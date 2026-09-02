package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.User;
import com.watchdesk.backend.repository.UserRepository;
import com.watchdesk.backend.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return userRepository.findAll().stream().map(this::toPublic).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String email = trim(body.get("email"));
        String fullName = trim(body.get("fullName"));
        String password = body.get("password");
        if (email == null || email.isBlank() || fullName == null || fullName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nom et e-mail obligatoires."));
        }
        if (password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mot de passe : 6 caractères minimum."));
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Cet e-mail existe déjà."));
        }

        User user = new User(email, passwordEncoder.encode(password), fullName, "LOCAL");
        if (email.equalsIgnoreCase("sana.soudani@esprit.tn")) {
            user.setRole("SUPER_ADMIN");
        } else {
            user.setRole(normalizeAssignableRole(body.get("role")));
        }
        user.setEnabled(true);
        User saved = userRepository.save(user);
        auditService.log(request, "USER_CREATE", "USER", String.valueOf(saved.getId()), saved.getEmail(),
                "Rôle " + saved.getRole());
        return ResponseEntity.ok(toPublic(saved));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        return userRepository.findById(id).map(user -> {
            if (user.isSuperAdminAccount()) {
                if (body.containsKey("role") && !"SUPER_ADMIN".equalsIgnoreCase(normalizeRole(body.get("role")))) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Le Super Admin ne peut pas changer de rôle."));
                }
                if (body.containsKey("enabled") && "false".equalsIgnoreCase(body.get("enabled"))) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Le Super Admin ne peut pas être désactivé."));
                }
            } else if (body.containsKey("role")) {
                user.setRole(normalizeAssignableRole(body.get("role")));
            }
            if (body.containsKey("fullName") && body.get("fullName") != null && !body.get("fullName").isBlank()) {
                user.setFullName(body.get("fullName").trim());
            }
            if (body.containsKey("enabled") && !user.isSuperAdminAccount()) {
                user.setEnabled(!"false".equalsIgnoreCase(body.get("enabled")));
            }
            String password = body.get("password");
            if (password != null && !password.isBlank()) {
                if (password.length() < 6) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Mot de passe : 6 caractères minimum."));
                }
                user.setPassword(passwordEncoder.encode(password));
            }
            User saved = userRepository.save(user);
            auditService.log(request, "USER_UPDATE", "USER", String.valueOf(saved.getId()), saved.getEmail(),
                    "role=" + saved.getRole() + ", enabled=" + saved.isEnabled());
            return ResponseEntity.ok(toPublic(saved));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpServletRequest request) {
        return userRepository.findById(id).map(user -> {
            if (user.isSuperAdminAccount()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Impossible de supprimer le Super Admin."));
            }
            String email = user.getEmail();
            userRepository.delete(user);
            auditService.log(request, "USER_DELETE", "USER", String.valueOf(id), email, "Compte supprimé");
            return ResponseEntity.ok(Map.of("status", "ok"));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Map<String, Object> toPublic(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("email", user.getEmail());
        map.put("fullName", user.getFullName());
        map.put("role", user.getRole());
        map.put("authProvider", user.getAuthProvider());
        map.put("enabled", user.isEnabled());
        map.put("lastLoginAt", user.getLastLoginAt());
        map.put("superAdmin", user.isSuperAdminAccount());
        return map;
    }

    private String normalizeAssignableRole(String role) {
        String r = normalizeRole(role);
        if ("SUPER_ADMIN".equals(r)) return "ADMIN";
        if ("LECTURE".equals(r)) return "LECTURE";
        return "ADMIN";
    }

    private String normalizeRole(String role) {
        if (role == null) return "ADMIN";
        String r = role.trim().toUpperCase().replace(" ", "_");
        if (r.equals("LECTURE") || r.equals("READ") || r.equals("VIEWER")) return "LECTURE";
        if (r.equals("SUPER_ADMIN") || r.equals("SUPERADMIN")) return "SUPER_ADMIN";
        return "ADMIN";
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
