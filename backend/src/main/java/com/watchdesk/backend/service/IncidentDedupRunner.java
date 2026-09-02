package com.watchdesk.backend.service;

import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.repository.IncidentRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class IncidentDedupRunner implements ApplicationRunner {

    private final IncidentRepository incidentRepository;

    public IncidentDedupRunner(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Incident> open = incidentRepository.findActiveIncidents();
        open.sort(Comparator.comparing(Incident::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        Set<String> seen = new HashSet<>();
        int resolved = 0;

        for (Incident incident : open) {
            normalize(incident);
            String key = dedupKey(incident);
            if (!seen.add(key)) {
                incident.setStatus("RÉSOLU");
                incident.setResolvedAt(LocalDateTime.now());
                incidentRepository.save(incident);
                resolved++;
            } else if (incident.getSource() == null || incident.getSource().isBlank()) {
                incidentRepository.save(incident);
            }
        }

        if (resolved > 0) {
            System.out.println("[WatchDesk] Incidents doublons archivés : " + resolved);
        }
    }

    private void normalize(Incident incident) {
        String desc = incident.getDescription() == null ? "" : incident.getDescription().toLowerCase();
        if (incident.getSource() != null && !incident.getSource().isBlank()) {
            return;
        }
        if (desc.contains("surcharge ram") || desc.contains("ram critique") || desc.contains("seuil") && desc.contains("ram")) {
            incident.setSource("MATERIEL");
            incident.setEventId("RAM");
        } else if (desc.contains("cpu")) {
            incident.setSource("MATERIEL");
            incident.setEventId("CPU");
        } else if (desc.contains("ticket ia")) {
            incident.setSource("IA");
            incident.setEventId("TICKET");
        } else {
            incident.setSource("MATERIEL");
            incident.setEventId("GENERIQUE");
        }
    }

    private String dedupKey(Incident incident) {
        String pc = incident.getPcName() == null ? "" : incident.getPcName();
        String source = incident.getSource() == null ? "" : incident.getSource();
        String eventId = incident.getEventId() == null ? "" : incident.getEventId();
        String desc = incident.getDescription() == null ? "" : incident.getDescription().toLowerCase();
        if (desc.contains("ram")) {
            source = "MATERIEL";
            eventId = "RAM";
        } else if (desc.contains("cpu") && !desc.contains("ticket ia")) {
            source = "MATERIEL";
            eventId = "CPU";
        }
        return pc + "|" + source + "|" + eventId;
    }
}
