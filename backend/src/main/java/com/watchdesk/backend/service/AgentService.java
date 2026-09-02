package com.watchdesk.backend.service;

import com.watchdesk.backend.dto.AgentReportDTO;
import com.watchdesk.backend.model.Computer;
import com.watchdesk.backend.repository.ComputerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AgentService {

    private static final String VALID_API_KEY = "watchdesk-secret-key-2026";

    @Autowired
    private ComputerRepository computerRepository;

    /**
     * Vérifie la clé API envoyée par l'agent C#.
     */
    public boolean validateApiKey(String apiKey) {
        return VALID_API_KEY.equals(apiKey);
    }

    /**
     * Traite le rapport reçu de l'agent :
     * - Recherche l'ordinateur par IP
     * - Met à jour s'il existe, sinon crée un nouvel enregistrement
     * - Persiste en base
     */
    public void processReport(AgentReportDTO dto) {
        if (dto.getIp() == null || dto.getIp().isBlank()) {
            throw new IllegalArgumentException("Le champ 'ip' est obligatoire dans le rapport agent.");
        }

        String computerName = dto.getPcName() != null ? dto.getPcName() : dto.getMachineName();
        Computer pc = computerRepository.findByIp(dto.getIp())
                .or(() -> computerName != null ? computerRepository.findByName(computerName) : Optional.empty())
                .orElseGet(Computer::new);

        // --- Champs d'identification ---
        pc.setIp(dto.getIp());
        pc.setName(computerName);
        pc.setUsername(dto.getUsername());

        // --- Métriques matérielles ---
        pc.setCpuUsage(dto.getCpuUsage());
        pc.setRamUsedMB(dto.getRamUsedMB());
        pc.setRamTotalMB(dto.getRamTotalMB());
        pc.setStatus(dto.getStatus());

        // --- Logs Windows séparés ---
        pc.setSystemLogs(dto.getSystemLogs());
        pc.setAppLogs(dto.getAppLogs());
        pc.setSecurityLogs(dto.getSecurityLogs());

        // --- Analyse de risque ---
        pc.setAppName(dto.getAppName());
        pc.setAppVendor(dto.getAppVendor());
        pc.setRiskScore(dto.getRiskScore());
        pc.setCve(dto.getCve());

        // --- Horodatage ---
        pc.setLastSeen(dto.getTimestamp() != null ? dto.getTimestamp() : LocalDateTime.now());

        computerRepository.save(pc);
    }
}