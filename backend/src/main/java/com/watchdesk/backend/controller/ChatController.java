package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.Computer;
import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.repository.ComputerRepository;
import com.watchdesk.backend.repository.IncidentRepository;
import com.watchdesk.backend.service.AuditService;
import com.watchdesk.backend.service.ConfigurationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private static final Pattern INCIDENT_ID = Pattern.compile("(?:incident\\s*#?|#)\\s*(\\d+)", Pattern.CASE_INSENSITIVE);

    @Autowired
    private IncidentRepository incidentRepo;

    @Autowired
    private ComputerRepository computerRepository;

    @Autowired
    private ConfigurationService configurationService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${gemini.api.key}")
    private String apiKey;

    @PostMapping("/ask")
    public Map<String, Object> askGemini(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        try {
            String userMessage = payload.getOrDefault("message", "");
            String lowerMessage = userMessage.toLowerCase(Locale.ROOT);
            boolean isCveQuestion = userMessage.matches("(?is).*CVE-\\d{4}-\\d+.*");

            auditService.log(request, "CHAT_ASK", "CHAT", null, "Assistant IA",
                    userMessage.length() > 200 ? userMessage.substring(0, 197) + "..." : userMessage);

            String ticketCreationContext = "";
            Map<String, Object> structuredData = null;

            boolean wantsTicket = !isCveQuestion && (
                    lowerMessage.contains("créer un ticket")
                    || lowerMessage.contains("creer un ticket")
                    || lowerMessage.contains("ouvre un ticket")
                    || lowerMessage.contains("créer un incident")
                    || lowerMessage.contains("creer un incident")
            );

            if (wantsTicket) {
                String pcName = "DESKTOP-QNE3RTF";
                Matcher pcMatcher = Pattern
                        .compile("PC\\s+([A-Za-z0-9._-]+)", Pattern.CASE_INSENSITIVE)
                        .matcher(userMessage);
                if (pcMatcher.find()) {
                    pcName = pcMatcher.group(1);
                }

                String ticketBody = userMessage.length() > 280 ? userMessage.substring(0, 277) + "..." : userMessage;

                Incident newIncident = new Incident();
                newIncident.setPcName(pcName);
                newIncident.setSource("IA");
                newIncident.setEventId("TICKET");
                newIncident.setDescription("Ticket IA : " + ticketBody);
                newIncident.setSeverity("MOYENNE");
                newIncident.setStatus("OUVERT");
                newIncident.setCreatedAt(LocalDateTime.now());

                Incident savedIncident = incidentRepo.save(newIncident);
                auditService.log(request, "INCIDENT_CREATE", "INCIDENT",
                        String.valueOf(savedIncident.getId()), pcName, "Ticket créé via ChatBot");

                ticketCreationContext = String.format(
                        " [ACTION EFFECTUÉE : L'incident a été enregistré sous l'ID réel #%d en BDD. Tu DOIS impérativement donner à l'utilisateur la référence #%d et l'informer qu'il est visible dans la Liste des Incidents.]",
                        savedIncident.getId(), savedIncident.getId()
                );
            }

            // --- Outils déterministes parc ---
            ToolResult tool = runFleetTools(userMessage, lowerMessage);
            if (tool != null) {
                structuredData = tool.data();
                ticketCreationContext += " " + tool.promptHint();
            }

            List<Computer> computers = computerRepository.findAll();
            int offlineMin = configurationService.getConfiguration().getOfflineMinutes();
            long online = computers.stream().filter(c -> minutesSince(c.getLastSeen()) < offlineMin).count();
            long offline = computers.size() - online;
            List<String> topCpu = computers.stream()
                    .sorted((a, b) -> Double.compare(parseCpu(b), parseCpu(a)))
                    .limit(5)
                    .map(c -> c.getName() + " (" + String.format(Locale.ROOT, "%.0f", parseCpu(c)) + "%)")
                    .toList();
            long pendingUpdatesPcs = computers.stream()
                    .filter(c -> c.getPendingUpdates() != null && !c.getPendingUpdates().isBlank()
                            && !"[]".equals(c.getPendingUpdates().trim())
                            && !"null".equalsIgnoreCase(c.getPendingUpdates().trim()))
                    .count();

            List<Incident> recentIncidents = incidentRepo.findAll();
            StringBuilder context = new StringBuilder("Tu es l'assistant IA de WatchDesk. Sois concis et précis. Réponds en français. ");
            if (isCveQuestion) {
                context.append("L'utilisateur te donne un identifiant CVE. Explique la vulnérabilité (produits concernés, gravité, impact, correctifs recommandés). ");
            }
            context.append(String.format(
                    Locale.ROOT,
                    "Snapshot parc : %d PC, %d en ligne, %d hors ligne, %d avec mises à jour en attente. Top CPU : %s. ",
                    computers.size(), online, offline, pendingUpdatesPcs, String.join(", ", topCpu)
            ));
            context.append("Contexte incidents récents : ");
            recentIncidents.stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(3)
                    .forEach(inc -> context.append(String.format("[%s sur %s (#%d)] ",
                            inc.getDescription(), inc.getPcName(), inc.getId())));

            String fullPrompt = context.toString() + ticketCreationContext + ". Question : " + userMessage;

            String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey;

            Map<String, Object> textPart = Map.of("text", fullPrompt);
            Map<String, Object> parts = Map.of("parts", List.of(textPart));
            Map<String, Object> contents = Map.of("contents", List.of(parts));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(contents, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(geminiUrl, entity, Map.class);

            String aiReply = "Aucune réponse générée par l'assistant.";
            if (response.getBody() != null && response.getBody().containsKey("candidates")) {
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map firstCandidate = (Map) candidates.get(0);
                    Map content = (Map) firstCandidate.get("content");
                    if (content != null) {
                        List partsList = (List) content.get("parts");
                        if (partsList != null && !partsList.isEmpty()) {
                            Map firstPart = (Map) partsList.get(0);
                            Object text = firstPart.get("text");
                            if (text != null) aiReply = text.toString();
                        }
                    }
                }
            }

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("reply", aiReply);
            if (structuredData != null) {
                out.put("data", structuredData);
            }
            return out;

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("reply", "Erreur lors de la génération de la réponse : " + e.getMessage());
        }
    }

    private record ToolResult(String promptHint, Map<String, Object> data) {}

    private ToolResult runFleetTools(String userMessage, String lower) {
        int offlineMin = configurationService.getConfiguration().getOfflineMinutes();
        List<Computer> all = computerRepository.findAll();

        // Résumé incident #N
        Matcher idMatcher = INCIDENT_ID.matcher(userMessage);
        boolean wantsSummary = lower.contains("résume") || lower.contains("resume") || lower.contains("résumé") || lower.contains("synthese") || lower.contains("synthèse");
        if (wantsSummary && idMatcher.find()) {
            Long id = Long.parseLong(idMatcher.group(1));
            return summarizeIncident(id);
        }
        if (wantsSummary && (lower.contains("plus critique") || lower.contains("le plus critique"))) {
            Optional<Incident> crit = incidentRepo.findActiveIncidents().stream()
                    .sorted((a, b) -> Integer.compare(sevRank(b.getSeverity()), sevRank(a.getSeverity())))
                    .findFirst();
            if (crit.isPresent()) return summarizeIncident(crit.get().getId());
        }

        // PC sans mises à jour / pending updates
        if ((lower.contains("mise à jour") || lower.contains("mise a jour") || lower.contains("windows update") || lower.contains("patch"))
                && (lower.contains("pas") || lower.contains("sans") || lower.contains("manque") || lower.contains("attente") || lower.contains("pending"))) {
            List<Map<String, String>> rows = all.stream()
                    .filter(c -> hasPendingUpdates(c))
                    .map(c -> Map.of(
                            "name", nullToDash(c.getName()),
                            "ip", nullToDash(c.getIp()),
                            "detail", truncate(c.getPendingUpdates(), 80)
                    ))
                    .collect(Collectors.toList());
            Map<String, Object> data = Map.of("type", "computers", "title", "PC avec mises à jour en attente", "rows", rows);
            return new ToolResult(
                    "[DONNÉES PARC : " + rows.size() + " PC ont des mises à jour Windows en attente. Liste fournie dans data.rows. Résume clairement.]",
                    data
            );
        }

        // PC hors ligne
        if (lower.contains("hors ligne") || lower.contains("offline") || lower.contains("déconnect")) {
            List<Map<String, String>> rows = all.stream()
                    .filter(c -> minutesSince(c.getLastSeen()) >= offlineMin)
                    .map(c -> Map.of(
                            "name", nullToDash(c.getName()),
                            "ip", nullToDash(c.getIp()),
                            "detail", c.getLastSeen() == null ? "Jamais vu" : "Vu il y a " + minutesSince(c.getLastSeen()) + " min"
                    ))
                    .collect(Collectors.toList());
            Map<String, Object> data = Map.of("type", "computers", "title", "PC hors ligne", "rows", rows);
            return new ToolResult(
                    "[DONNÉES PARC : " + rows.size() + " PC hors ligne (seuil " + offlineMin + " min). Liste dans data.rows.]",
                    data
            );
        }

        // CPU élevé
        if (lower.contains("cpu") && (lower.contains("élev") || lower.contains("haut") || lower.contains("critique") || lower.contains(">"))) {
            List<Map<String, String>> rows = all.stream()
                    .filter(c -> parseCpu(c) >= 80)
                    .sorted((a, b) -> Double.compare(parseCpu(b), parseCpu(a)))
                    .map(c -> Map.of(
                            "name", nullToDash(c.getName()),
                            "ip", nullToDash(c.getIp()),
                            "detail", String.format(Locale.ROOT, "CPU %.0f%%", parseCpu(c))
                    ))
                    .collect(Collectors.toList());
            Map<String, Object> data = Map.of("type", "computers", "title", "PC CPU ≥ 80%", "rows", rows);
            return new ToolResult(
                    "[DONNÉES PARC : " + rows.size() + " PC avec CPU ≥ 80%. Liste dans data.rows.]",
                    data
            );
        }

        return null;
    }

    private ToolResult summarizeIncident(Long id) {
        Optional<Incident> opt = incidentRepo.findById(id);
        if (opt.isEmpty()) {
            Map<String, Object> data = Map.of("type", "summary", "title", "Incident introuvable", "rows", List.of());
            return new ToolResult("[Incident #" + id + " introuvable en base.]", data);
        }
        Incident inc = opt.get();
        Optional<Computer> pc = Optional.empty();
        if (inc.getPcName() != null) {
            pc = computerRepository.findByName(inc.getPcName());
        }
        if (pc.isEmpty() && inc.getMachine() != null) {
            pc = computerRepository.findByIp(inc.getMachine());
        }

        StringBuilder hint = new StringBuilder();
        hint.append("[RÉSUMÉ DEMANDÉ pour incident #").append(id).append(". ");
        hint.append("PC=").append(inc.getPcName());
        hint.append(", sévérité=").append(inc.getSeverity());
        hint.append(", statut=").append(inc.getStatus());
        hint.append(", source=").append(inc.getSource());
        hint.append(", desc=").append(inc.getDescription());
        pc.ifPresent(c -> {
            hint.append(". Contexte machine : CPU=").append(c.getCpuUsage());
            hint.append(", lastSeen=").append(c.getLastSeen());
            hint.append(", OS=").append(c.getOsVersion());
            if (c.getSecurityLogs() != null && !c.getSecurityLogs().isBlank()) {
                hint.append(", extrait logs sécurité: ").append(truncate(c.getSecurityLogs(), 300));
            }
        });
        hint.append(". Produis un résumé clair : cause probable, impact, actions recommandées.]");

        List<Map<String, String>> rows = List.of(
                Map.of("name", "ID", "ip", String.valueOf(id), "detail", nullToDash(inc.getStatus())),
                Map.of("name", "PC", "ip", nullToDash(inc.getPcName()), "detail", nullToDash(inc.getSeverity())),
                Map.of("name", "Source", "ip", nullToDash(inc.getSource()), "detail", truncate(inc.getDescription(), 120))
        );
        Map<String, Object> data = Map.of("type", "summary", "title", "Résumé incident #" + id, "rows", rows);
        return new ToolResult(hint.toString(), data);
    }

    private boolean hasPendingUpdates(Computer c) {
        String p = c.getPendingUpdates();
        if (p == null || p.isBlank()) return false;
        String t = p.trim();
        return !"[]".equals(t) && !"null".equalsIgnoreCase(t) && !"{}".equals(t);
    }

    private static long minutesSince(LocalDateTime lastSeen) {
        if (lastSeen == null) return 9999;
        return ChronoUnit.MINUTES.between(lastSeen, LocalDateTime.now());
    }

    private static double parseCpu(Computer c) {
        if (c == null || c.getCpuUsage() == null) return 0;
        try {
            return Double.parseDouble(c.getCpuUsage().replace("%", "").replace(",", ".").trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private static int sevRank(String severity) {
        String s = (severity == null ? "" : severity).toUpperCase(Locale.ROOT);
        if (s.contains("CRIT") || s.contains("ÉLEV") || s.contains("ELEV")) return 3;
        if (s.contains("MOY")) return 2;
        return 1;
    }

    private static String nullToDash(String s) {
        return s == null || s.isBlank() ? "—" : s;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 3) + "...";
    }
}
