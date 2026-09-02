package com.watchdesk.backend.controller;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = "*")
public class AgentDownloadController {

    private static final String PACKAGED_EXE = "agent/WatchDeskAgent.exe";

    private static final List<String> EXE_CANDIDATES = List.of(
            "C:/Users/User/Desktop/ALL-FILES/Monitoring-agent/MonitoringAgent/bin/Release/net10.0-windows/win-x64/publish/MonitoringAgent.exe",
            "C:/Users/User/Desktop/ALL-FILES/Monitoring-agent/MonitoringAgent/bin/Debug/net10.0-windows/MonitoringAgent.exe",
            "C:/WatchDesk/WatchDeskAgent.exe"
    );

    @GetMapping("/download")
    public ResponseEntity<?> downloadAgent(
            @RequestParam(defaultValue = "http://localhost:8080") String serverUrl,
            @RequestParam(defaultValue = "watchdesk-secret-key-2026") String apiKey) throws IOException {

        String cleanUrl = serverUrl == null ? "http://localhost:8080" : serverUrl.trim().replaceAll("/+$", "");
        byte[] exeBytes = loadExeBytes();
        if (exeBytes == null || exeBytes.length == 0) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body("Agent Windows introuvable sur le serveur. Redeployez le backend avec WatchDeskAgent.exe.");
        }

        Path tempZip = Files.createTempFile("WatchDeskAgent", ".zip");
        try (FileOutputStream fos = new FileOutputStream(tempZip.toFile());
             ZipOutputStream zos = new ZipOutputStream(fos)) {

            addToZip(zos, "WatchDeskAgent.exe", exeBytes);

            String appsettings = "{\n" +
                    "  \"ServerUrl\": \"" + cleanUrl + "\",\n" +
                    "  \"ApiKey\": \"" + apiKey + "\",\n" +
                    "  \"ReportIntervalSeconds\": 10\n" +
                    "}\n";
            addToZip(zos, "appsettings.json", appsettings.getBytes(StandardCharsets.UTF_8));

            String installBat = "@echo off\r\n"
                    + "chcp 65001 >nul\r\n"
                    + "title Installation WatchDesk Agent\r\n"
                    + "echo ========================================\r\n"
                    + "echo  Installation WatchDesk Agent\r\n"
                    + "echo  Serveur : " + cleanUrl + "\r\n"
                    + "echo ========================================\r\n"
                    + "net session >nul 2>&1\r\n"
                    + "if %errorlevel% neq 0 (\r\n"
                    + "    echo ERREUR : cliquez droit puis Executer en tant qu'administrateur.\r\n"
                    + "    pause\r\n"
                    + "    exit /b 1\r\n"
                    + ")\r\n"
                    + "mkdir \"C:\\WatchDesk\" 2>nul\r\n"
                    + "copy /Y \"%~dp0WatchDeskAgent.exe\" \"C:\\WatchDesk\\\"\r\n"
                    + "copy /Y \"%~dp0appsettings.json\" \"C:\\WatchDesk\\\"\r\n"
                    + "sc stop WatchDeskAgent >nul 2>&1\r\n"
                    + "sc delete WatchDeskAgent >nul 2>&1\r\n"
                    + "timeout /t 2 >nul\r\n"
                    + "sc create WatchDeskAgent binPath= \"C:\\WatchDesk\\WatchDeskAgent.exe --server " + cleanUrl + "\" start= auto DisplayName= \"WatchDesk Monitoring Agent\"\r\n"
                    + "sc start WatchDeskAgent\r\n"
                    + "echo Installation terminee. L'agent envoie vers " + cleanUrl + "\r\n"
                    + "pause\r\n";
            addToZip(zos, "install.bat", installBat.getBytes(StandardCharsets.UTF_8));

            String readme = "WatchDesk Agent\r\nServeur: " + cleanUrl + "\r\n1. Extraire le ZIP\r\n2. Clic droit sur install.bat -> Executer en tant qu'administrateur\r\n";
            addToZip(zos, "LISEZMOI.txt", readme.getBytes(StandardCharsets.UTF_8));
        }

        byte[] zipBytes = Files.readAllBytes(tempZip);
        Files.delete(tempZip);
        ByteArrayResource resource = new ByteArrayResource(zipBytes);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=WatchDeskAgent_Install.zip")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(zipBytes.length)
                .body(resource);
    }

    private byte[] loadExeBytes() throws IOException {
        ClassPathResource packaged = new ClassPathResource(PACKAGED_EXE);
        if (packaged.exists()) {
            try (InputStream in = packaged.getInputStream()) {
                return in.readAllBytes();
            }
        }
        for (String path : EXE_CANDIDATES) {
            File file = new File(path);
            if (file.isFile()) {
                return Files.readAllBytes(file.toPath());
            }
        }
        return null;
    }

    private void addToZip(ZipOutputStream zos, String fileName, byte[] content) throws IOException {
        ZipEntry entry = new ZipEntry(fileName);
        zos.putNextEntry(entry);
        zos.write(content);
        zos.closeEntry();
    }
}
