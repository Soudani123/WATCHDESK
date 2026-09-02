package com.watchdesk.backend.service;

import com.watchdesk.backend.model.Computer;
import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.watchdesk.backend.repository.ComputerRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    @Autowired
    private ComputerRepository computerRepo;

    @Autowired
    private IncidentRepository incidentRepo;

    public Map<String, Object> getDashboardData() {
        Map<String, Object> result = new HashMap<>();

        long total = computerRepo.count();
        long online = computerRepo.countByStatus("online");
        long offline = computerRepo.countByStatus("offline");
        long warning = computerRepo.countByStatus("warning");
        long activeIncidents = incidentRepo.countOpenIncidents();
        Map<String, Object> kpi = new HashMap<>();
        kpi.put("total", String.valueOf(total));
        kpi.put("online", String.valueOf(online));
        kpi.put("offline", String.valueOf(offline));
        kpi.put("incidents", String.valueOf(activeIncidents));
        result.put("kpi", kpi);

        List<Incident> incidents = incidentRepo.findActiveIncidents();
        List<Map<String, Object>> incidentsFormatted = incidents.stream()
                .limit(5)
                .map(i -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", i.getId());
                    m.put("severity", i.getSeverity());
                    m.put("pc", i.getPcName());
                    m.put("desc", i.getDescription());

                    // 🛡️ SÉCURITÉ LIGNE 51 : Évite le plantage si createdAt est null
                    if (i.getCreatedAt() != null) {
                        m.put("time", i.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm")));
                    } else {
                        m.put("time", LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))); // Heure actuelle par défaut
                    }

                    m.put("status", i.getStatus());
                    return m;
                }).toList();
        result.put("incidents", incidentsFormatted);

        List<Computer> computers = computerRepo.findAll();
        List<Map<String, Object>> computersFormatted = computers.stream()
                .limit(5)
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", c.getName());
                    m.put("ip", c.getIp());
                    m.put("user", c.getUsername());

                    // 🛡️ SÉCURITÉ LIGNE 66 : Évite le plantage si lastSeen est null
                    if (c.getLastSeen() != null) {
                        long minutes = ChronoUnit.MINUTES.between(c.getLastSeen(), LocalDateTime.now());
                        m.put("lastSeen", "Il y a " + minutes + " min");
                        m.put("lastHeartbeat", c.getLastSeen().toString());
                    } else {
                        m.put("lastSeen", "Jamais connecté");
                    }

                    m.put("status", c.getStatus());
                    return m;
                }).toList();
        result.put("computers", computersFormatted);

        Map<String, Object> health = new HashMap<>();
        health.put("healthy", (int) online);
        health.put("warning", (int) warning);
        health.put("error", (int) offline);
        result.put("health", health);

        return result;
    }
}