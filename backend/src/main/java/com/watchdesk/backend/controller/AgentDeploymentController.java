package com.watchdesk.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AgentDeploymentController {

    // 🟢 1. NOUVEAU ENDPOINT : Requis par ton interface pour simuler/générer le lien et la commande PowerShell
    @PostMapping("/generate-link")
    public ResponseEntity<?> generateInstallLink(@RequestBody Map<String, String> requestData) {
        String targetMachine = requestData.get("targetMachine");

        if (targetMachine == null || targetMachine.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nom ou IP de la machine cible absent"));
        }

        String installUrl = "http://localhost:8080/api/agent/download?token=wd-token-xyz-2026";

        // Commande d'installation silencieuse automatique PowerShell type "Pull Mode"
        String powershellCommand = String.format(
                "Invoke-Expression (New-Object Net.WebClient).DownloadString('%s'); " +
                        "& 'C:\\WatchDesk\\WatchDeskAgent.exe' --target %s",
                installUrl, targetMachine
        );

        Map<String, Object> response = new HashMap<>();
        response.put("targetMachine", targetMachine);
        response.put("expiresIn", "24h");
        response.put("installUrl", installUrl);
        response.put("powershellCommand", powershellCommand);

        return ResponseEntity.ok(response);
    }

    // 🟢 2. NOUVEAU ENDPOINT : Requis par ton interface lors du clic sur "Démarrer l'agent localement"
    @PostMapping("/deploy-local")
    public ResponseEntity<String> deployLocal() {
        try {
            System.out.println("Lancement de l'agent réel .NET sur la machine locale.");
            Runtime.getRuntime().exec("cmd.exe /c start /B C:\\WatchDesk\\WatchDeskAgent.exe");
            return ResponseEntity.ok("Succès ! L'agent local a été démarré en tâche de fond.");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors du lancement local : " + e.getMessage());
        }
    }

    // 🔵 3. TON ENDPOINT INITIAL : Déploiement WMI / Net Use automatique direct (Push Mode)
    @PostMapping("/deploy")
    public ResponseEntity<String> deployAgent(@RequestBody Map<String, String> requestData) {
        String targetMachine = requestData.get("targetMachine");
        String adminUser = requestData.get("adminUser");
        String adminPassword = requestData.get("adminPassword");

        if (targetMachine == null || adminUser == null || adminPassword == null) {
            return ResponseEntity.badRequest().body("Données de déploiement incomplètes.");
        }

        if (targetMachine.equals("127.0.0.1") || targetMachine.equalsIgnoreCase("localhost")) {
            return deployLocal();
        }

        try {
            System.out.println("=== DEBUT DU DEPLOIEMENT AUTOMATIQUE A DISTANCE ===");
            try {
                Runtime.getRuntime().exec("cmd.exe /c net use \\\\" + targetMachine + " /delete /y").waitFor();
            } catch (Exception e) { }

            String connectCmd = String.format("net use \\\\%s /user:%s %s", targetMachine, adminUser, adminPassword);
            executeCommand(connectCmd);

            String copyCmd = String.format("robocopy \"C:\\WatchDesk\" \"\\\\%s\\WatchDesk\" /E /IS", targetMachine);
            executeCommand(copyCmd);

            String runCmd = String.format("wmic /node:\"%s\" /user:\"%s\" /password:\"%s\" process call create \"C:\\WatchDesk\\WatchDeskAgent.exe\"",
                    targetMachine, adminUser, adminPassword);
            executeCommand(runCmd);

            Runtime.getRuntime().exec("cmd.exe /c net use \\\\" + targetMachine + " /delete /y");
            return ResponseEntity.ok("Succès ! L'agent a été copié et démarré automatiquement sur le PC distant (" + targetMachine + ").");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Échec du déploiement à distance : " + e.getMessage());
        }
    }

    private void executeCommand(String command) throws Exception {
        ProcessBuilder builder = new ProcessBuilder("cmd.exe", "/c", command);
        builder.redirectErrorStream(true);
        Process process = builder.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    System.out.println("[Windows Net] " + line);
                }
            }
        }
        process.waitFor();
    }
}