package com.watchdesk.backend.service;

import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class IncidentAlertService {

    public static final String SOURCE_MATERIEL = "MATERIEL";
    public static final String SOURCE_SYSTEME = "SYSTEME";
    public static final String SOURCE_APPLICATION = "APPLICATION";
    public static final String SOURCE_SECURITE = "SECURITE";
    public static final String SOURCE_IA = "IA";

    private static final Set<String> IGNORED_EVENT_IDS = Set.of(
            "1005", "1008", "10016"
    );

    private static final Pattern LOG_HEADER = Pattern.compile(
            "^\\[([^\\]]+)\\]\\s*\\[(CRITIQUE|ERREUR)\\]\\s*\\[ID:(\\d+)\\]\\s*(.+)$"
    );

    private static final int MAX_NEW_LOG_INCIDENTS_PER_REPORT = 8;

    @Autowired
    private IncidentRepository incidentRepository;

    public boolean createHardwareIncidentIfAbsent(String pcName, String ip, String kind, String description) {
        return createHardwareIncidentIfAbsent(pcName, ip, kind, description, "ÉLEVÉE");
    }

    public boolean createHardwareIncidentIfAbsent(String pcName, String ip, String kind, String description, String severity) {
        Optional<Incident> existing = incidentRepository
                .findFirstByPcNameAndSourceAndEventIdAndStatusIgnoreCase(pcName, SOURCE_MATERIEL, kind, "OUVERT");
        if (existing.isPresent()) {
            Incident current = existing.get();
            if (severityRank(severity) > severityRank(current.getSeverity())) {
                current.setSeverity(severity);
                current.setDescription(description);
                incidentRepository.save(current);
            }
            return false;
        }

        Incident incident = new Incident();
        incident.setMachine(ip);
        incident.setPcName(pcName);
        incident.setSource(SOURCE_MATERIEL);
        incident.setEventId(kind);
        incident.setSeverity(severity);
        incident.setStatus("OUVERT");
        incident.setCreatedAt(LocalDateTime.now());
        incident.setDescription(description);
        incidentRepository.save(incident);
        return true;
    }

    private int severityRank(String severity) {
        String s = (severity == null ? "" : severity).toUpperCase();
        if (s.contains("CRIT") || s.contains("ÉLEV") || s.contains("ELEV")) return 3;
        if (s.contains("MOY")) return 2;
        return 1;
    }

    public void createLogIncidentsFromText(String pcName, String ip, String journalSource, String logText) {
        if (logText == null || logText.isBlank()) {
            return;
        }

        int created = 0;
        String[] lines = logText.split("\\r?\\n");
        for (int i = 0; i < lines.length && created < MAX_NEW_LOG_INCIDENTS_PER_REPORT; i++) {
            Matcher matcher = LOG_HEADER.matcher(lines[i].trim());
            if (!matcher.matches()) {
                continue;
            }

            String level = matcher.group(2);
            String eventId = matcher.group(3);
            String provider = matcher.group(4).trim();

            if (IGNORED_EVENT_IDS.contains(eventId)) {
                continue;
            }

            Optional<Incident> existing = incidentRepository
                    .findFirstByPcNameAndSourceAndEventIdAndStatusIgnoreCase(pcName, journalSource, eventId, "OUVERT");
            if (existing.isPresent()) {
                continue;
            }

            String excerpt = "";
            if (i + 1 < lines.length) {
                excerpt = lines[i + 1].trim();
                if (excerpt.startsWith("-")) {
                    excerpt = "";
                }
            }
            if (excerpt.length() > 180) {
                excerpt = excerpt.substring(0, 177) + "...";
            }

            String journalLabel = switch (journalSource) {
                case SOURCE_APPLICATION -> "Application";
                case SOURCE_SECURITE -> "Sécurité";
                default -> "Système";
            };

            Incident incident = new Incident();
            incident.setMachine(ip);
            incident.setPcName(pcName);
            incident.setSource(journalSource);
            incident.setEventId(eventId);
            incident.setSeverity("CRITIQUE".equals(level) ? "ÉLEVÉE" : "MOYENNE");
            incident.setStatus("OUVERT");
            incident.setCreatedAt(LocalDateTime.now());
            incident.setDescription(String.format(
                    "[%s] ID %s — %s%s",
                    journalLabel,
                    eventId,
                    provider,
                    excerpt.isBlank() ? "" : " — " + excerpt
            ));
            incidentRepository.save(incident);
            created++;
        }
    }
}
