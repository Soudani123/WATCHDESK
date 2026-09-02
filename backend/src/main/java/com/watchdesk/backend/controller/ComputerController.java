package com.watchdesk.backend.controller;

import com.watchdesk.backend.model.Computer;
import com.watchdesk.backend.model.Incident;
import com.watchdesk.backend.repository.ComputerRepository;
import com.watchdesk.backend.repository.IncidentRepository;
import com.watchdesk.backend.service.VulnerabilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/computers")
@CrossOrigin(origins = "*")
public class ComputerController {

    @Autowired
    private ComputerRepository computerRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private VulnerabilityService vulnerabilityService;

    @GetMapping
    public List<Computer> getAllComputers() {
        List<Computer> list = computerRepository.findAll();
        Map<String, Long> openByPc = incidentRepository.findActiveIncidents().stream()
                .filter(i -> i.getPcName() != null && !i.getPcName().isBlank())
                .collect(Collectors.groupingBy(Incident::getPcName, Collectors.counting()));
        Map<String, int[]> vulnByPc = vulnerabilityService.countsByPc();

        for (Computer pc : list) {
            int open = openByPc.getOrDefault(pc.getName(), 0L).intValue();
            pc.setOpenIncidentCount(open);
            pc.setFleetStatus(resolveFleetStatus(pc, open));
            int[] counts = vulnByPc.getOrDefault(pc.getName(), new int[]{0, 0});
            pc.setVulnCount(counts[0]);
            pc.setPatchCount(counts[1]);
        }
        return list;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Computer> getComputerById(@PathVariable Long id) {
        return computerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/ip/{ip}")
    public ResponseEntity<Computer> getComputerByIp(@PathVariable String ip) {
        return computerRepository.findByIp(ip)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<Computer> getComputerByName(@PathVariable String name) {
        return computerRepository.findByName(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private String resolveFleetStatus(Computer pc, int openIncidents) {
        if (pc.getLastSeen() == null || ChronoUnit.MINUTES.between(pc.getLastSeen(), LocalDateTime.now()) >= 3) {
            return "offline";
        }
        if (openIncidents > 0) {
            return "warning";
        }
        return "online";
    }
}
